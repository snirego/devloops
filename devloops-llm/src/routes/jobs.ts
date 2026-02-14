/**
 * Job submission REST endpoints.
 *
 *   POST /jobs/ingest                      — enqueue a full ingest pipeline job (legacy)
 *   POST /jobs/generate-workitem           — enqueue a standalone WorkItem generation job
 *   GET  /jobs/:queue/:id/status           — poll BullMQ job status
 *   GET  /pipeline/jobs/:publicId          — get pipeline job status by publicId
 *   GET  /pipeline/stats                   — pipeline job statistics
 */

import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { eq, sql } from "drizzle-orm";

import { authMiddleware } from "../middleware/auth.js";
import { getDb } from "../db/client.js";
import { pipelineJobs } from "../db/schema.js";
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

  // ═══════════════════════════════════════════════════════════════════════
  // Pipeline Job Endpoints (DB-backed smart pipeline)
  // ═══════════════════════════════════════════════════════════════════════

  // ── GET /pipeline/jobs/:publicId ──────────────────────────────────
  app.get(
    "/pipeline/jobs/:publicId",
    { preHandler: authMiddleware },
    async (request, reply) => {
      const { publicId } = request.params as { publicId: string };
      const db = getDb();

      const job = await db.query.pipelineJobs.findFirst({
        where: eq(pipelineJobs.publicId, publicId),
      });

      if (!job) {
        return reply.code(404).send({ error: "Pipeline job not found" });
      }

      return reply.send({
        id: job.id,
        publicId: job.publicId,
        threadId: job.threadId,
        status: job.status,
        gatekeeperAction: job.gatekeeperAction,
        resultJson: job.resultJson,
        errorMessage: job.errorMessage,
        attempts: job.attempts,
        maxAttempts: job.maxAttempts,
        claimedAt: job.claimedAt,
        completedAt: job.completedAt,
        createdAt: job.createdAt,
        updatedAt: job.updatedAt,
      });
    },
  );

  // ── GET /pipeline/jobs/thread/:threadId ───────────────────────────
  app.get(
    "/pipeline/jobs/thread/:threadId",
    { preHandler: authMiddleware },
    async (request, reply) => {
      const { threadId } = request.params as { threadId: string };
      const db = getDb();

      const jobs = await db.query.pipelineJobs.findMany({
        where: eq(pipelineJobs.threadId, Number(threadId)),
        orderBy: (pj, { desc }) => [desc(pj.createdAt)],
        limit: 20,
      });

      return reply.send({ jobs });
    },
  );

  // ── GET /pipeline/stats ───────────────────────────────────────────
  app.get(
    "/pipeline/stats",
    { preHandler: authMiddleware },
    async (_request, reply) => {
      const db = getDb();

      const result = await db.execute(sql`
        SELECT
          status,
          COUNT(*) as count,
          MIN("createdAt") as oldest,
          MAX("createdAt") as newest
        FROM pipeline_job
        GROUP BY status
        ORDER BY status
      `);

      const stats = result.rows as Array<{
        status: string;
        count: string;
        oldest: string;
        newest: string;
      }>;

      return reply.send({
        stats: stats.map((s) => ({
          status: s.status,
          count: Number(s.count),
          oldest: s.oldest,
          newest: s.newest,
        })),
      });
    },
  );
}
