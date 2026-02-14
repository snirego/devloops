/**
 * Job submission REST endpoints.
 *
 *   POST /jobs/ingest             — enqueue a full ingest pipeline job
 *   POST /jobs/generate-workitem  — enqueue a standalone WorkItem generation job
 *   GET  /jobs/:id/status         — poll job status
 */

import type { FastifyInstance } from "fastify";
import { z } from "zod";

import { authMiddleware } from "../middleware/auth.js";
import {
  getIngestQueue,
  getWorkItemQueue,
  type IngestJobData,
  type WorkItemJobData,
} from "../queue/queues.js";
import { getLogger } from "../utils/logger.js";

// ─── Request schemas ─────────────────────────────────────────────────────────

const ingestBodySchema = z.object({
  threadId: z.number().int().positive(),
  currentState: z.any().nullable(),
  messageText: z.string().min(1).max(50_000),
  metadata: z.record(z.unknown()).optional(),
});

const workItemBodySchema = z.object({
  threadId: z.number().int().positive(),
  threadState: z.any(),
  workItemType: z.enum(["Bug", "Feature", "Chore", "Docs"]),
});

// ─── Register ────────────────────────────────────────────────────────────────

export async function registerJobRoutes(app: FastifyInstance): Promise<void> {
  const logger = getLogger();

  // ── POST /jobs/ingest ──────────────────────────────────────────────
  app.post(
    "/jobs/ingest",
    { preHandler: authMiddleware },
    async (request, reply) => {
      const parseResult = ingestBodySchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply.code(400).send({
          error: "Invalid request body",
          details: parseResult.error.issues,
        });
      }

      const { threadId, currentState, messageText, metadata } =
        parseResult.data;

      const jobData: IngestJobData = {
        threadId,
        currentState,
        messageText,
        metadata,
      };

      // Use threadId as job ID for deduplication:
      // If a job for the same thread is already queued but not yet
      // processing, BullMQ will replace it with the latest message.
      const jobId = `ingest-${threadId}-${Date.now()}`;

      const job = await getIngestQueue().add("ingest", jobData, {
        jobId,
        priority: 1, // default priority
      });

      logger.info(
        { jobId: job.id, threadId },
        "Ingest job enqueued",
      );

      return reply.code(202).send({
        jobId: job.id,
        queue: "llm-ingest",
        status: "queued",
      });
    },
  );

  // ── POST /jobs/generate-workitem ───────────────────────────────────
  app.post(
    "/jobs/generate-workitem",
    { preHandler: authMiddleware },
    async (request, reply) => {
      const parseResult = workItemBodySchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply.code(400).send({
          error: "Invalid request body",
          details: parseResult.error.issues,
        });
      }

      const { threadId, threadState, workItemType } = parseResult.data;

      const jobData: WorkItemJobData = {
        threadId,
        threadState,
        workItemType,
      };

      const jobId = `workitem-${threadId}-${Date.now()}`;

      const job = await getWorkItemQueue().add("generate", jobData, {
        jobId,
        // P0 items get higher priority (lower number = higher priority)
        priority: threadState?.recommendation?.confidence >= 0.9 ? 0 : 1,
      });

      logger.info(
        { jobId: job.id, threadId, workItemType },
        "Work-item job enqueued",
      );

      return reply.code(202).send({
        jobId: job.id,
        queue: "llm-workitem",
        status: "queued",
      });
    },
  );

  // ── GET /jobs/:queue/:id/status ────────────────────────────────────
  app.get(
    "/jobs/:queue/:id/status",
    { preHandler: authMiddleware },
    async (request, reply) => {
      const { queue, id } = request.params as { queue: string; id: string };

      let targetQueue;
      if (queue === "llm-ingest" || queue === "ingest") {
        targetQueue = getIngestQueue();
      } else if (queue === "llm-workitem" || queue === "workitem") {
        targetQueue = getWorkItemQueue();
      } else {
        return reply.code(400).send({ error: `Unknown queue: ${queue}` });
      }

      const job = await targetQueue.getJob(id);
      if (!job) {
        return reply.code(404).send({ error: "Job not found" });
      }

      const state = await job.getState();
      const progress = job.progress;

      return reply.send({
        jobId: job.id,
        queue: queue,
        status: state,
        progress,
        result: state === "completed" ? job.returnvalue : undefined,
        failedReason: state === "failed" ? job.failedReason : undefined,
        attemptsMade: job.attemptsMade,
        timestamp: job.timestamp,
        finishedOn: job.finishedOn,
      });
    },
  );
}
