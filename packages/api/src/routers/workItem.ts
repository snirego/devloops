import { TRPCError } from "@trpc/server";
import { z } from "zod";

import type {
  ExecutionJson,
  LinksJson,
  PromptBundleJson,
  ThreadStateJson,
  WorkItemStatus,
} from "@kan/db/schema";
import * as auditLogRepo from "@kan/db/repository/auditLog.repo";
import * as workItemRepo from "@kan/db/repository/workItem.repo";

import { createTRPCRouter, publicProcedure } from "../trpc";
import { createGitHubIssue, isGitHubConfigured } from "../utils/github";

// ── Status transition validation ─────────────────────────────────────────────

const VALID_TRANSITIONS: Record<WorkItemStatus, WorkItemStatus[]> = {
  Draft: ["PendingApproval", "Canceled"],
  PendingApproval: ["Approved", "Rejected", "OnHold", "Canceled"],
  Approved: ["InProgress", "OnHold", "Canceled"],
  Rejected: ["PendingApproval", "Canceled"],
  OnHold: ["PendingApproval", "Approved", "Canceled"],
  InProgress: ["NeedsReview", "Done", "Failed", "OnHold", "Canceled"],
  NeedsReview: ["InProgress", "Done", "Failed", "Canceled"],
  Done: [],
  Failed: ["InProgress", "PendingApproval", "Canceled"],
  Canceled: [],
};

function assertValidTransition(
  current: WorkItemStatus,
  next: WorkItemStatus,
): void {
  const allowed = VALID_TRANSITIONS[current];
  if (!allowed || !allowed.includes(next)) {
    throw new TRPCError({
      message: `Invalid status transition: ${current} → ${next}`,
      code: "BAD_REQUEST",
    });
  }
}

export const workItemRouter = createTRPCRouter({
  // ── Get by publicId ───────────────────────────────────────────────────────
  byPublicId: publicProcedure
    .meta({
      openapi: {
        summary: "Get a work item",
        method: "GET",
        path: "/workitems/{publicId}",
        description: "Retrieves a work item with its thread",
        tags: ["WorkItems"],
      },
    })
    .input(z.object({ publicId: z.string().min(12) }))
    .query(async ({ ctx, input }) => {
      const item = await workItemRepo.getByPublicIdWithThread(
        ctx.db,
        input.publicId,
      );
      if (!item) {
        throw new TRPCError({
          message: `WorkItem not found: ${input.publicId}`,
          code: "NOT_FOUND",
        });
      }
      return item;
    }),

  // ── List work items ───────────────────────────────────────────────────────
  list: publicProcedure
    .meta({
      openapi: {
        summary: "List work items",
        method: "GET",
        path: "/workitems",
        description: "Lists work items, optionally filtered by status",
        tags: ["WorkItems"],
      },
    })
    .input(
      z
        .object({
          workspacePublicId: z.string().optional(),
          statuses: z
            .array(
              z.enum([
                "Draft",
                "PendingApproval",
                "Approved",
                "Rejected",
                "OnHold",
                "InProgress",
                "NeedsReview",
                "Done",
                "Failed",
                "Canceled",
              ]),
            )
            .optional(),
          limit: z.number().min(1).max(200).optional(),
          offset: z.number().min(0).optional(),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      let workspaceId: number | undefined;
      if (input?.workspacePublicId) {
        const workspaceRepo = await import("@kan/db/repository/workspace.repo");
        const ws = await workspaceRepo.getByPublicId(ctx.db, input.workspacePublicId);
        if (ws) workspaceId = ws.id;
      }
      return workItemRepo.listAll(ctx.db, {
        ...input,
        workspaceId,
      });
    }),

  // ── Status Workflow Endpoints ─────────────────────────────────────────────

  approve: publicProcedure
    .meta({
      openapi: {
        summary: "Approve a work item",
        method: "POST",
        path: "/workitems/{publicId}/approve",
        tags: ["WorkItems"],
        protect: true,
      },
    })
    .input(z.object({ publicId: z.string().min(12) }))
    .mutation(async ({ ctx, input }) => {
      const item = await workItemRepo.getByPublicId(ctx.db, input.publicId);
      if (!item) throw new TRPCError({ message: "Not found", code: "NOT_FOUND" });
      assertValidTransition(item.status, "Approved");

      const updated = await workItemRepo.updateStatus(
        ctx.db,
        item.id,
        "Approved",
      );

      await auditLogRepo.create(ctx.db, {
        entityType: "WorkItem",
        entityId: item.id,
        action: "approved",
      });

      return updated;
    }),

  reject: publicProcedure
    .meta({
      openapi: {
        summary: "Reject a work item",
        method: "POST",
        path: "/workitems/{publicId}/reject",
        tags: ["WorkItems"],
        protect: true,
      },
    })
    .input(
      z.object({
        publicId: z.string().min(12),
        reason: z.string().min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const item = await workItemRepo.getByPublicId(ctx.db, input.publicId);
      if (!item) throw new TRPCError({ message: "Not found", code: "NOT_FOUND" });
      assertValidTransition(item.status, "Rejected");

      const updated = await workItemRepo.updateStatus(
        ctx.db,
        item.id,
        "Rejected",
        input.reason,
      );

      await auditLogRepo.create(ctx.db, {
        entityType: "WorkItem",
        entityId: item.id,
        action: "rejected",
        detailsJson: { reason: input.reason },
      });

      return updated;
    }),

  hold: publicProcedure
    .meta({
      openapi: {
        summary: "Put a work item on hold",
        method: "POST",
        path: "/workitems/{publicId}/hold",
        tags: ["WorkItems"],
        protect: true,
      },
    })
    .input(
      z.object({
        publicId: z.string().min(12),
        reason: z.string().min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const item = await workItemRepo.getByPublicId(ctx.db, input.publicId);
      if (!item) throw new TRPCError({ message: "Not found", code: "NOT_FOUND" });
      assertValidTransition(item.status, "OnHold");

      const updated = await workItemRepo.updateStatus(
        ctx.db,
        item.id,
        "OnHold",
        input.reason,
      );

      await auditLogRepo.create(ctx.db, {
        entityType: "WorkItem",
        entityId: item.id,
        action: "on_hold",
        detailsJson: { reason: input.reason },
      });

      return updated;
    }),

  start: publicProcedure
    .meta({
      openapi: {
        summary: "Start a work item",
        method: "POST",
        path: "/workitems/{publicId}/start",
        tags: ["WorkItems"],
        protect: true,
      },
    })
    .input(z.object({ publicId: z.string().min(12) }))
    .mutation(async ({ ctx, input }) => {
      const item = await workItemRepo.getByPublicId(ctx.db, input.publicId);
      if (!item) throw new TRPCError({ message: "Not found", code: "NOT_FOUND" });
      assertValidTransition(item.status, "InProgress");

      const updated = await workItemRepo.updateStatus(
        ctx.db,
        item.id,
        "InProgress",
      );

      await auditLogRepo.create(ctx.db, {
        entityType: "WorkItem",
        entityId: item.id,
        action: "started",
      });

      return updated;
    }),

  markNeedsReview: publicProcedure
    .meta({
      openapi: {
        summary: "Mark a work item as needs review",
        method: "POST",
        path: "/workitems/{publicId}/mark-needs-review",
        tags: ["WorkItems"],
        protect: true,
      },
    })
    .input(z.object({ publicId: z.string().min(12) }))
    .mutation(async ({ ctx, input }) => {
      const item = await workItemRepo.getByPublicId(ctx.db, input.publicId);
      if (!item) throw new TRPCError({ message: "Not found", code: "NOT_FOUND" });
      assertValidTransition(item.status, "NeedsReview");

      const updated = await workItemRepo.updateStatus(
        ctx.db,
        item.id,
        "NeedsReview",
      );

      await auditLogRepo.create(ctx.db, {
        entityType: "WorkItem",
        entityId: item.id,
        action: "needs_review",
      });

      return updated;
    }),

  markDone: publicProcedure
    .meta({
      openapi: {
        summary: "Mark a work item as done",
        method: "POST",
        path: "/workitems/{publicId}/mark-done",
        tags: ["WorkItems"],
        protect: true,
      },
    })
    .input(z.object({ publicId: z.string().min(12) }))
    .mutation(async ({ ctx, input }) => {
      const item = await workItemRepo.getByPublicId(ctx.db, input.publicId);
      if (!item) throw new TRPCError({ message: "Not found", code: "NOT_FOUND" });
      assertValidTransition(item.status, "Done");

      const updated = await workItemRepo.updateStatus(ctx.db, item.id, "Done");

      await auditLogRepo.create(ctx.db, {
        entityType: "WorkItem",
        entityId: item.id,
        action: "done",
      });

      return updated;
    }),

  markFailed: publicProcedure
    .meta({
      openapi: {
        summary: "Mark a work item as failed",
        method: "POST",
        path: "/workitems/{publicId}/mark-failed",
        tags: ["WorkItems"],
        protect: true,
      },
    })
    .input(
      z.object({
        publicId: z.string().min(12),
        reason: z.string().min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const item = await workItemRepo.getByPublicId(ctx.db, input.publicId);
      if (!item) throw new TRPCError({ message: "Not found", code: "NOT_FOUND" });
      assertValidTransition(item.status, "Failed");

      const updated = await workItemRepo.updateStatus(
        ctx.db,
        item.id,
        "Failed",
        input.reason,
      );

      await auditLogRepo.create(ctx.db, {
        entityType: "WorkItem",
        entityId: item.id,
        action: "failed",
        detailsJson: { reason: input.reason },
      });

      return updated;
    }),

  cancel: publicProcedure
    .meta({
      openapi: {
        summary: "Cancel a work item",
        method: "POST",
        path: "/workitems/{publicId}/cancel",
        tags: ["WorkItems"],
        protect: true,
      },
    })
    .input(z.object({ publicId: z.string().min(12) }))
    .mutation(async ({ ctx, input }) => {
      const item = await workItemRepo.getByPublicId(ctx.db, input.publicId);
      if (!item) throw new TRPCError({ message: "Not found", code: "NOT_FOUND" });
      assertValidTransition(item.status, "Canceled");

      const updated = await workItemRepo.updateStatus(
        ctx.db,
        item.id,
        "Canceled",
      );

      await auditLogRepo.create(ctx.db, {
        entityType: "WorkItem",
        entityId: item.id,
        action: "canceled",
      });

      return updated;
    }),

  // ── Inline field updates (Trello-style) ──────────────────────────────────
  updateFields: publicProcedure
    .meta({
      openapi: {
        summary: "Update work item fields",
        method: "PATCH",
        path: "/workitems/{publicId}",
        tags: ["WorkItems"],
        protect: true,
      },
    })
    .input(
      z.object({
        publicId: z.string().min(12),
        title: z.string().min(1).max(500).optional(),
        structuredDescription: z.string().nullable().optional(),
        type: z.enum(["Bug", "Feature", "Chore", "Docs"]).optional(),
        priority: z.enum(["P0", "P1", "P2", "P3"]).optional(),
        riskLevel: z.enum(["Low", "Medium", "High"]).optional(),
        acceptanceCriteria: z.array(z.string()).nullable().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const item = await workItemRepo.getByPublicId(ctx.db, input.publicId);
      if (!item)
        throw new TRPCError({ message: "Not found", code: "NOT_FOUND" });

      const fields: Parameters<typeof workItemRepo.updateFields>[2] = {};
      if (input.title !== undefined) fields.title = input.title;
      if (input.structuredDescription !== undefined)
        fields.structuredDescription = input.structuredDescription;
      if (input.type !== undefined) fields.type = input.type;
      if (input.priority !== undefined) fields.priority = input.priority;
      if (input.riskLevel !== undefined) fields.riskLevel = input.riskLevel;
      if (input.acceptanceCriteria !== undefined)
        fields.acceptanceCriteriaJson = input.acceptanceCriteria;

      const updated = await workItemRepo.updateFields(
        ctx.db,
        item.id,
        fields,
      );

      await auditLogRepo.create(ctx.db, {
        entityType: "WorkItem",
        entityId: item.id,
        action: "fields_updated",
        detailsJson: { fields: Object.keys(fields) },
      });

      return updated;
    }),

  // ── Update prompt bundle ──────────────────────────────────────────────────
  updatePromptBundle: publicProcedure
    .meta({
      openapi: {
        summary: "Update work item prompt bundle",
        method: "POST",
        path: "/workitems/{publicId}/update-prompt",
        tags: ["WorkItems"],
      },
    })
    .input(
      z.object({
        publicId: z.string().min(12),
        promptBundle: z.object({
          cursorPrompt: z.string(),
          agentSystemPrompt: z.string(),
          agentTaskPrompt: z.string(),
          suspectedFiles: z.array(z.string()),
          testsToRun: z.array(z.string()),
          commands: z.array(z.string()),
        }),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const item = await workItemRepo.getByPublicId(ctx.db, input.publicId);
      if (!item) throw new TRPCError({ message: "Not found", code: "NOT_FOUND" });

      const updated = await workItemRepo.updatePromptBundle(
        ctx.db,
        item.id,
        input.promptBundle,
      );

      await auditLogRepo.create(ctx.db, {
        entityType: "WorkItem",
        entityId: item.id,
        action: "prompt_bundle_updated",
      });

      return updated;
    }),

  // ── GitHub Issue Creation ─────────────────────────────────────────────────
  createGithubIssue: publicProcedure
    .meta({
      openapi: {
        summary: "Create GitHub issue from work item",
        method: "POST",
        path: "/workitems/{publicId}/create-github-issue",
        tags: ["WorkItems"],
        protect: true,
      },
    })
    .input(z.object({ publicId: z.string().min(12) }))
    .mutation(async ({ ctx, input }) => {
      const item = await workItemRepo.getByPublicIdWithThread(
        ctx.db,
        input.publicId,
      );
      if (!item)
        throw new TRPCError({ message: "Not found", code: "NOT_FOUND" });

      if (item.status !== "Approved" && item.status !== "InProgress") {
        throw new TRPCError({
          message: "WorkItem must be Approved or InProgress to create a GitHub issue",
          code: "BAD_REQUEST",
        });
      }

      if (!isGitHubConfigured()) {
        throw new TRPCError({
          message:
            "GitHub not configured. Set GITHUB_TOKEN, GITHUB_REPO_OWNER, GITHUB_REPO_NAME env vars.",
          code: "PRECONDITION_FAILED",
        });
      }

      const threadState =
        (item.thread?.threadStateJson as ThreadStateJson) ?? null;
      if (!threadState) {
        throw new TRPCError({
          message: "Thread has no state",
          code: "PRECONDITION_FAILED",
        });
      }

      const result = await createGitHubIssue({
        title: item.title,
        structuredDescription: item.structuredDescription ?? "",
        acceptanceCriteria:
          (item.acceptanceCriteriaJson as string[]) ?? [],
        threadState,
        promptBundle: item.promptBundleJson as PromptBundleJson | null,
        workItemPublicId: item.publicId,
      });

      const currentLinks = (item.linksJson as LinksJson) ?? {
        githubRepo: "",
        githubIssueUrl: null,
        githubPrUrl: null,
        branch: null,
      };

      const updated = await workItemRepo.updateLinks(ctx.db, item.id, {
        ...currentLinks,
        githubIssueUrl: result.url,
        githubRepo: `${process.env.GITHUB_REPO_OWNER}/${process.env.GITHUB_REPO_NAME}`,
      });

      await auditLogRepo.create(ctx.db, {
        entityType: "WorkItem",
        entityId: item.id,
        action: "github_issue_created",
        detailsJson: { url: result.url, number: result.number },
      });

      return { ...updated, githubIssueUrl: result.url };
    }),

  // ── Prepare Agent (stub) ──────────────────────────────────────────────────
  prepareAgent: publicProcedure
    .meta({
      openapi: {
        summary: "Prepare work item for agent execution",
        method: "POST",
        path: "/workitems/{publicId}/prepare-agent",
        tags: ["WorkItems"],
        protect: true,
      },
    })
    .input(z.object({ publicId: z.string().min(12) }))
    .mutation(async ({ ctx, input }) => {
      const item = await workItemRepo.getByPublicId(ctx.db, input.publicId);
      if (!item)
        throw new TRPCError({ message: "Not found", code: "NOT_FOUND" });

      if (item.status !== "Approved") {
        throw new TRPCError({
          message: "WorkItem must be Approved to prepare for agent",
          code: "BAD_REQUEST",
        });
      }

      if (!item.promptBundleJson) {
        throw new TRPCError({
          message: "WorkItem has no prompt bundle",
          code: "PRECONDITION_FAILED",
        });
      }

      const updated = await workItemRepo.updateExecution(ctx.db, item.id, {
        agentMode: "cloud_agent",
        agentJobId: null,
        lastRunAt: null,
        runLogsUrl: null,
        artifactsJson: null,
      });

      await auditLogRepo.create(ctx.db, {
        entityType: "WorkItem",
        entityId: item.id,
        action: "agent_prepared",
      });

      return updated;
    }),

  // ── GitHub configured check ───────────────────────────────────────────────
  githubStatus: publicProcedure
    .meta({
      openapi: {
        summary: "Check GitHub configuration",
        method: "GET",
        path: "/workitems/github-status",
        tags: ["WorkItems"],
      },
    })
    .query(() => {
      return { configured: isGitHubConfigured() };
    }),

  // ── Pipeline / AI Activity Logs ──────────────────────────────────────────
  logs: publicProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(500).optional(),
        offset: z.number().min(0).optional(),
        filter: z
          .enum(["all", "pipeline", "workitem", "errors"])
          .optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const filter = input.filter ?? "all";

      let entityTypes: Array<"Thread" | "Message" | "WorkItem"> | undefined;
      let actions: string[] | undefined;

      if (filter === "pipeline") {
        entityTypes = ["Thread"];
        actions = [
          "threadstate_updated",
          "threadstate_update_failed",
          "ai_asked_questions",
          "smart_pipeline_completed",
        ];
      } else if (filter === "workitem") {
        entityTypes = ["WorkItem"];
      } else if (filter === "errors") {
        actions = [
          "threadstate_update_failed",
          "workitem_generation_failed",
        ];
      }

      const logs = await auditLogRepo.listRecent(ctx.db, {
        entityTypes,
        actions,
        limit: input.limit ?? 100,
        offset: input.offset ?? 0,
      });

      return logs;
    }),
});
