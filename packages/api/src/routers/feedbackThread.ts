import { TRPCError } from "@trpc/server";
import { z } from "zod";

import type { ThreadStateJson } from "@kan/db/schema";
import * as auditLogRepo from "@kan/db/repository/auditLog.repo";
import * as feedbackMessageRepo from "@kan/db/repository/feedbackMessage.repo";
import * as feedbackThreadRepo from "@kan/db/repository/feedbackThread.repo";

import { createTRPCRouter, protectedProcedure, publicProcedure } from "../trpc";
import { llmHealthCheck } from "../utils/llm";
import { runIngestPipeline, runIngestPipelineAsync } from "../utils/llmJobs";

export const feedbackThreadRouter = createTRPCRouter({
  // ── Ingest: POST /ingest ──────────────────────────────────────────────────
  ingest: publicProcedure
    .meta({
      openapi: {
        summary: "Ingest a feedback message",
        method: "POST",
        path: "/feedback/ingest",
        description:
          "Ingests a message, assigns it to a Thread (existing or new), updates ThreadState via LLM, and optionally creates a WorkItem.",
        tags: ["Feedback"],
      },
    })
    .input(
      z.object({
        source: z
          .enum(["widget", "email", "whatsapp", "slack", "api"])
          .default("api"),
        customerId: z.string().optional(),
        customerHandle: z.string().optional(),
        externalMessageId: z.string().optional(),
        externalThreadId: z.string().optional(),
        rawText: z.string().min(1).max(50000),
        metadata: z.record(z.unknown()).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const effectiveCustomerId = input.customerId ?? input.customerHandle;

      // ── Threading logic ──────────────────────────────────────────────
      let thread = await feedbackThreadRepo.findExistingThread(ctx.db, {
        customerId: effectiveCustomerId,
        externalThreadId: input.externalThreadId,
      });

      let isNewThread = false;
      if (!thread) {
        thread = await feedbackThreadRepo.create(ctx.db, {
          primarySource: input.source,
          customerId: effectiveCustomerId,
        });
        isNewThread = true;

        await auditLogRepo.create(ctx.db, {
          entityType: "Thread",
          entityId: thread.id,
          action: "created",
          detailsJson: {
            source: input.source,
            customerId: effectiveCustomerId,
          },
        });
      }

      // ── Create Message ───────────────────────────────────────────────
      const message = await feedbackMessageRepo.create(ctx.db, {
        threadId: thread.id,
        source: input.source,
        externalMessageId: input.externalMessageId,
        externalThreadId: input.externalThreadId,
        senderType: "user",
        rawText: input.rawText,
        metadataJson: input.metadata as Record<string, unknown>,
      });

      await auditLogRepo.create(ctx.db, {
        entityType: "Message",
        entityId: message.id,
        action: "created",
        detailsJson: { threadId: thread.id },
      });

      // ── Run LLM Pipeline (ThreadState → Gatekeeper → WorkItem) ─────
      const currentState = thread.threadStateJson as ThreadStateJson | null;

      const pipelineResult = await runIngestPipeline(
        ctx.db,
        thread.id,
        currentState,
        input.rawText,
        input.metadata as Record<string, unknown>,
      );

      return {
        threadPublicId: thread.publicId,
        messagePublicId: message.publicId,
        isNewThread,
        threadState: pipelineResult.threadState,
        gatekeeper: pipelineResult.gatekeeper,
        workItem: pipelineResult.workItem
          ? { publicId: pipelineResult.workItem.publicId }
          : null,
      };
    }),

  // ── Chat Ingest: non-blocking version for real-time chat ────────────────
  chatIngest: publicProcedure
    .input(
      z.object({
        source: z
          .enum(["widget", "email", "whatsapp", "slack", "api"])
          .default("widget"),
        customerId: z.string().optional(),
        threadPublicId: z.string().optional(),
        senderType: z.enum(["user", "internal"]).default("user"),
        senderName: z.string().optional(),
        visibility: z.enum(["public", "internal"]).default("public"),
        rawText: z.string().min(1).max(50000),
        metadata: z.record(z.unknown()).optional(),
        publicId: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Find or create thread
      let thread = input.threadPublicId
        ? await feedbackThreadRepo.getByPublicId(ctx.db, input.threadPublicId)
        : undefined;

      let isNewThread = false;
      if (!thread) {
        if (input.customerId) {
          thread = await feedbackThreadRepo.findExistingThread(ctx.db, {
            customerId: input.customerId,
          }) ?? undefined;
        }
        if (!thread) {
          thread = await feedbackThreadRepo.create(ctx.db, {
            primarySource: input.source,
            customerId: input.customerId,
            title: input.rawText.slice(0, 100),
          });
          isNewThread = true;
        }
      }

      // Create message immediately
      const message = await feedbackMessageRepo.create(ctx.db, {
        threadId: thread.id,
        source: input.source,
        senderType: input.senderType,
        senderName: input.senderName,
        visibility: input.visibility,
        rawText: input.rawText,
        metadataJson: input.metadata as Record<string, unknown>,
        publicId: input.publicId,
      });

      // Update thread last activity
      if (thread.threadStateJson) {
        await feedbackThreadRepo.updateThreadState(
          ctx.db,
          thread.id,
          thread.threadStateJson as ThreadStateJson,
        );
      }

      // Fire-and-forget LLM pipeline (only for user messages)
      if (input.senderType === "user" && input.visibility === "public") {
        runIngestPipelineAsync(
          ctx.db,
          thread.id,
          (thread.threadStateJson as ThreadStateJson) ?? null,
          input.rawText,
          input.metadata as Record<string, unknown>,
        );
      }

      return {
        threadPublicId: thread.publicId,
        messagePublicId: message.publicId,
        isNewThread,
      };
    }),

  // ── Get Thread by publicId ────────────────────────────────────────────────
  byPublicId: publicProcedure
    .meta({
      openapi: {
        summary: "Get a feedback thread",
        method: "GET",
        path: "/feedback/threads/{publicId}",
        description: "Retrieves a feedback thread with messages and work items",
        tags: ["Feedback"],
      },
    })
    .input(z.object({ publicId: z.string().min(12) }))
    .query(async ({ ctx, input }) => {
      const thread = await feedbackThreadRepo.getByPublicIdWithMessages(
        ctx.db,
        input.publicId,
      );

      if (!thread) {
        throw new TRPCError({
          message: `Thread not found: ${input.publicId}`,
          code: "NOT_FOUND",
        });
      }

      return thread;
    }),

  // ── List all threads ──────────────────────────────────────────────────────
  list: publicProcedure
    .meta({
      openapi: {
        summary: "List feedback threads",
        method: "GET",
        path: "/feedback/threads",
        description: "Lists all feedback threads",
        tags: ["Feedback"],
      },
    })
    .input(
      z
        .object({
          status: z.string().optional(),
          limit: z.number().min(1).max(100).optional(),
          offset: z.number().min(0).optional(),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      return feedbackThreadRepo.listAll(ctx.db, input);
    }),

  // ── LLM Health Check ─────────────────────────────────────────────────────
  llmHealth: publicProcedure
    .meta({
      openapi: {
        summary: "Check LLM health",
        method: "GET",
        path: "/feedback/llm-health",
        description: "Checks if the local LLM endpoint is reachable",
        tags: ["Feedback"],
      },
    })
    .query(async () => {
      return llmHealthCheck();
    }),
});
