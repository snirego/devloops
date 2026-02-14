import { TRPCError } from "@trpc/server";
import { z } from "zod";

import type { ThreadStateJson } from "@kan/db/schema";
import * as auditLogRepo from "@kan/db/repository/auditLog.repo";
import * as chatSessionRepo from "@kan/db/repository/chatSession.repo";
import * as feedbackMessageRepo from "@kan/db/repository/feedbackMessage.repo";
import * as feedbackThreadRepo from "@kan/db/repository/feedbackThread.repo";

import { createTRPCRouter, protectedProcedure, publicProcedure } from "../trpc";
import { runIngestPipelineAsync } from "../utils/llmJobs";

export const chatRouter = createTRPCRouter({
  // ── Send a message (dashboard — authenticated) ─────────────────────────
  send: protectedProcedure
    .input(
      z.object({
        threadPublicId: z.string(),
        rawText: z.string().min(1).max(50000),
        visibility: z.enum(["public", "internal"]).default("public"),
        publicId: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const thread = await feedbackThreadRepo.getByPublicId(
        ctx.db,
        input.threadPublicId,
      );
      if (!thread) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: `Thread not found: ${input.threadPublicId}`,
        });
      }

      const message = await feedbackMessageRepo.create(ctx.db, {
        threadId: thread.id,
        source: "api",
        senderType: "internal",
        senderName: ctx.user?.name ?? ctx.user?.email ?? "Team",
        visibility: input.visibility,
        rawText: input.rawText,
        metadataJson: { userId: ctx.user?.id },
        publicId: input.publicId,
      });

      // Run LLM analysis asynchronously on public messages
      if (input.visibility === "public") {
        runIngestPipelineAsync(
          ctx.db,
          thread.id,
          (thread.threadStateJson as ThreadStateJson) ?? null,
          input.rawText,
          { userId: ctx.user?.id, source: "dashboard" },
        );
      } else {
        // For internal notes, just update thread activity
        if (thread.threadStateJson) {
          await feedbackThreadRepo.updateThreadState(
            ctx.db,
            thread.id,
            thread.threadStateJson as ThreadStateJson,
          );
        }
      }

      return {
        messagePublicId: message.publicId,
        threadPublicId: thread.publicId,
      };
    }),

  // ── Send internal note (team-only, hidden from external users) ─────────
  sendInternalNote: protectedProcedure
    .input(
      z.object({
        threadPublicId: z.string(),
        rawText: z.string().min(1).max(50000),
        publicId: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const thread = await feedbackThreadRepo.getByPublicId(
        ctx.db,
        input.threadPublicId,
      );
      if (!thread) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: `Thread not found: ${input.threadPublicId}`,
        });
      }

      const message = await feedbackMessageRepo.create(ctx.db, {
        threadId: thread.id,
        source: "api",
        senderType: "internal",
        senderName: ctx.user?.name ?? ctx.user?.email ?? "Team",
        visibility: "internal",
        rawText: input.rawText,
        metadataJson: { userId: ctx.user?.id, isInternalNote: true },
        publicId: input.publicId,
      });

      return {
        messagePublicId: message.publicId,
        threadPublicId: thread.publicId,
      };
    }),

  // ── Create a new chat thread (dashboard) ───────────────────────────────
  createThread: protectedProcedure
    .input(
      z.object({
        title: z.string().min(1).max(500).optional(),
        customerId: z.string().optional(),
        type: z.enum(["external", "team"]).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const isExternal = input.type === "external";
      const thread = await feedbackThreadRepo.create(ctx.db, {
        primarySource: isExternal ? "widget" : "api",
        customerId: input.customerId,
        title: input.title,
      });

      await auditLogRepo.create(ctx.db, {
        entityType: "Thread",
        entityId: thread.id,
        action: "created_from_chat",
        detailsJson: { userId: ctx.user?.id },
      });

      return { threadPublicId: thread.publicId };
    }),

  // ── List threads with latest message preview ───────────────────────────
  listThreads: protectedProcedure
    .input(
      z
        .object({
          limit: z.number().min(1).max(100).optional(),
          offset: z.number().min(0).optional(),
          status: z.string().optional(),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      return feedbackThreadRepo.listAll(ctx.db, {
        status: input?.status,
        limit: input?.limit ?? 50,
        offset: input?.offset ?? 0,
      });
    }),

  // ── Get thread messages (all, including internal) ──────────────────────
  getMessages: protectedProcedure
    .input(z.object({ threadPublicId: z.string() }))
    .query(async ({ ctx, input }) => {
      const thread = await feedbackThreadRepo.getByPublicId(
        ctx.db,
        input.threadPublicId,
      );
      if (!thread) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: `Thread not found: ${input.threadPublicId}`,
        });
      }

      const messages = await feedbackMessageRepo.getByThreadId(
        ctx.db,
        thread.id,
      );

      return {
        thread,
        messages,
      };
    }),

  // ── Get thread metadata only (no messages — lightweight for refetch) ──
  getThread: protectedProcedure
    .input(z.object({ threadPublicId: z.string() }))
    .query(async ({ ctx, input }) => {
      const thread = await feedbackThreadRepo.getByPublicId(
        ctx.db,
        input.threadPublicId,
      );
      if (!thread) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: `Thread not found: ${input.threadPublicId}`,
        });
      }
      return thread;
    }),

  // ── Edit a message ───────────────────────────────────────────────────
  editMessage: protectedProcedure
    .input(
      z.object({
        messagePublicId: z.string(),
        rawText: z.string().min(1).max(50000),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const message = await feedbackMessageRepo.getByPublicId(
        ctx.db,
        input.messagePublicId,
      );
      if (!message) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: `Message not found: ${input.messagePublicId}`,
        });
      }

      const updated = await feedbackMessageRepo.updateText(
        ctx.db,
        message.id,
        input.rawText,
      );

      await auditLogRepo.create(ctx.db, {
        entityType: "Message",
        entityId: message.id,
        action: "edited",
        detailsJson: {
          userId: ctx.user?.id,
          oldText: message.rawText,
          newText: input.rawText,
        },
      });

      return { ok: true, publicId: updated?.publicId };
    }),

  // ── Delete a message ──────────────────────────────────────────────────
  deleteMessage: protectedProcedure
    .input(z.object({ messagePublicId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const message = await feedbackMessageRepo.getByPublicId(
        ctx.db,
        input.messagePublicId,
      );
      if (!message) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: `Message not found: ${input.messagePublicId}`,
        });
      }

      await feedbackMessageRepo.deleteById(ctx.db, message.id);

      await auditLogRepo.create(ctx.db, {
        entityType: "Message",
        entityId: message.id,
        action: "deleted",
        detailsJson: { userId: ctx.user?.id, text: message.rawText },
      });

      return { ok: true };
    }),

  // ── Delete a thread (cascades messages, sessions, work items) ─────────
  deleteThread: protectedProcedure
    .input(z.object({ threadPublicId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const thread = await feedbackThreadRepo.getByPublicId(
        ctx.db,
        input.threadPublicId,
      );
      if (!thread) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: `Thread not found: ${input.threadPublicId}`,
        });
      }

      await feedbackThreadRepo.deleteById(ctx.db, thread.id);

      await auditLogRepo.create(ctx.db, {
        entityType: "Thread",
        entityId: thread.id,
        action: "deleted",
        detailsJson: { userId: ctx.user?.id, title: thread.title },
      });

      return { ok: true };
    }),

  // ── Create a WorkItem from a specific message (LLM-driven) ─────────────
  createWorkItemFromMessage: protectedProcedure
    .input(
      z.object({
        messagePublicId: z.string(),
        type: z.enum(["Bug", "Feature", "Chore", "Docs"]).default("Feature"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const message = await feedbackMessageRepo.getByPublicId(
        ctx.db,
        input.messagePublicId,
      );
      if (!message) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: `Message not found: ${input.messagePublicId}`,
        });
      }

      const thread = await feedbackThreadRepo.getById(ctx.db, message.threadId);
      if (!thread) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Thread not found for this message",
        });
      }

      // Use thread state if available, otherwise build a minimal one from the message
      const { runWorkItemGenerator, EMPTY_THREAD_STATE } = await import(
        "../utils/llmJobs"
      );

      const threadState =
        (thread.threadStateJson as ThreadStateJson) ?? {
          ...EMPTY_THREAD_STATE,
          summary: message.rawText.slice(0, 500),
          userGoal: message.rawText.slice(0, 300),
          intent: input.type === "Bug" ? "Bug" : "Feature",
          recommendation: {
            action:
              input.type === "Bug"
                ? "CreateBugWorkItem"
                : "CreateFeatureWorkItem",
            reason: `Manually triggered from message by team member`,
            confidence: 1.0,
          },
        };

      const workItem = await runWorkItemGenerator(
        ctx.db,
        thread.id,
        threadState,
        input.type,
      );

      if (!workItem) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            "LLM failed to generate a work item. Check that the LLM endpoint is running.",
        });
      }

      // Post a system message about the created work item (internal only — not visible to external users)
      await feedbackMessageRepo.create(ctx.db, {
        threadId: thread.id,
        source: "api",
        senderType: "internal",
        senderName: "DevLoops AI",
        visibility: "internal",
        rawText: `Work item created: "${input.type}" from message. Check the Work Items board.`,
        metadataJson: {
          type: "system_workitem_suggestion",
          workItemPublicId: workItem.publicId,
          triggeredBy: ctx.user?.id,
          sourceMessagePublicId: input.messagePublicId,
        },
      });

      return {
        workItemPublicId: workItem.publicId,
        workItemId: workItem.id,
      };
    }),

  // ── Update thread status (close, reopen, etc.) ─────────────────────────
  updateStatus: protectedProcedure
    .input(
      z.object({
        threadPublicId: z.string(),
        status: z.enum(["Open", "WaitingOnUser", "Resolved", "Closed"]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const thread = await feedbackThreadRepo.getByPublicId(
        ctx.db,
        input.threadPublicId,
      );
      if (!thread) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: `Thread not found: ${input.threadPublicId}`,
        });
      }

      await feedbackThreadRepo.updateStatus(ctx.db, thread.id, input.status);

      await auditLogRepo.create(ctx.db, {
        entityType: "Thread",
        entityId: thread.id,
        action: `status_changed_to_${input.status}`,
        detailsJson: { userId: ctx.user?.id, from: thread.status, to: input.status },
      });

      return { ok: true };
    }),

  // ── Update thread title ────────────────────────────────────────────────
  updateTitle: protectedProcedure
    .input(
      z.object({
        threadPublicId: z.string(),
        title: z.string().min(1).max(500),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const thread = await feedbackThreadRepo.getByPublicId(
        ctx.db,
        input.threadPublicId,
      );
      if (!thread) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: `Thread not found: ${input.threadPublicId}`,
        });
      }

      await feedbackThreadRepo.updateTitle(ctx.db, thread.id, input.title);
      return { ok: true };
    }),

  // ── List threads with active AI processing ──────────────────────────────
  aiProcessing: protectedProcedure.query(async ({ ctx }) => {
    return feedbackThreadRepo.listAiProcessing(ctx.db);
  }),
});
