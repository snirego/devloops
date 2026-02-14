/**
 * BullMQ worker pool.
 *
 * Starts one worker per queue:
 *   - llm-ingest worker:   processes full ingest pipeline jobs (legacy)
 *   - llm-workitem worker: processes standalone WorkItem generation jobs
 *   - llm-pipeline worker: polls pipeline_job table for pending jobs (smart pipeline)
 *
 * Features:
 *   - Configurable concurrency
 *   - Graceful shutdown (waits for active jobs)
 *   - Structured logging for every job lifecycle event
 */

import { Worker, type Job } from "bullmq";
import { sql } from "drizzle-orm";

import { getConfig } from "../config.js";
import { getDb, type DbClient } from "../db/client.js";
import { pipelineJobs } from "../db/schema.js";
import { getLogger } from "../utils/logger.js";
import { getRedis } from "./connection.js";
import {
  INGEST_QUEUE,
  WORKITEM_QUEUE,
  PIPELINE_QUEUE,
  type IngestJobData,
  type IngestJobResult,
  type WorkItemJobData,
  type WorkItemJobResult,
  type PipelinePollerJobData,
  type PipelinePollerJobResult,
} from "./queues.js";
import { runIngestPipeline } from "../jobs/ingestPipeline.js";
import { runWorkItemGenerator } from "../jobs/workItemGenerator.js";
import { runSmartPipeline } from "../jobs/smartPipeline.js";

let _ingestWorker: Worker | null = null;
let _workItemWorker: Worker | null = null;
let _pipelineWorker: Worker | null = null;

// ─── Ingest Job Processor (Legacy) ──────────────────────────────────────────

async function processIngestJob(
  job: Job<IngestJobData, IngestJobResult>,
): Promise<IngestJobResult> {
  const logger = getLogger();
  const db: DbClient = getDb();
  const { threadId, currentState, messageText, metadata } = job.data;

  logger.info(
    { jobId: job.id, threadId, attempt: job.attemptsMade },
    "Processing ingest job",
  );

  await job.updateProgress(10);

  const result = await runIngestPipeline(
    db,
    threadId,
    currentState,
    messageText,
    metadata,
  );

  await job.updateProgress(100);

  logger.info(
    {
      jobId: job.id,
      threadId,
      workItemCreated: !!result.workItem,
    },
    "Ingest job completed",
  );

  return result;
}

// ─── WorkItem Job Processor ──────────────────────────────────────────────────

async function processWorkItemJob(
  job: Job<WorkItemJobData, WorkItemJobResult>,
): Promise<WorkItemJobResult> {
  const logger = getLogger();
  const db: DbClient = getDb();
  const { threadId, threadState, workItemType } = job.data;

  logger.info(
    { jobId: job.id, threadId, workItemType, attempt: job.attemptsMade },
    "Processing work-item job",
  );

  await job.updateProgress(10);

  const result = await runWorkItemGenerator(db, threadId, threadState, workItemType);

  if (!result) {
    throw new Error(
      `WorkItem generation failed for thread ${threadId}. LLM did not return valid output.`,
    );
  }

  await job.updateProgress(100);

  logger.info(
    { jobId: job.id, threadId, workItemId: result.id },
    "Work-item job completed",
  );

  return result;
}

// ─── Pipeline Poller Processor ───────────────────────────────────────────────

/**
 * Polls the pipeline_job table for pending jobs and processes them.
 *
 * This is the heart of the durable smart pipeline: a BullMQ repeatable job
 * runs every few seconds, claims pending rows from Postgres using
 * SELECT ... FOR UPDATE SKIP LOCKED, and processes each through the
 * smart pipeline orchestrator.
 */
async function processPipelinePollerJob(
  job: Job<PipelinePollerJobData, PipelinePollerJobResult>,
): Promise<PipelinePollerJobResult> {
  const logger = getLogger();
  const db: DbClient = getDb();
  const config = getConfig();

  // Claim up to concurrency limit of pending jobs
  const claimLimit = Math.max(1, Math.min(config.LLM_MAX_CONCURRENCY, 5));

  const result = await db.execute(sql`
    UPDATE pipeline_job
    SET
      status = 'processing',
      attempts = attempts + 1,
      "claimedAt" = NOW(),
      "updatedAt" = NOW()
    WHERE id IN (
      SELECT id FROM pipeline_job
      WHERE status = 'pending'
        AND attempts < "maxAttempts"
      ORDER BY "createdAt" ASC
      LIMIT ${claimLimit}
      FOR UPDATE SKIP LOCKED
    )
    RETURNING id, "publicId", "threadId", "triggerMessageId", attempts
  `);

  const claimed = result.rows as Array<{
    id: number;
    publicId: string;
    threadId: number;
    triggerMessageId: number | null;
    attempts: number;
  }>;

  if (claimed.length === 0) {
    // No pending jobs — this is normal, happens every poll cycle
    return { jobsClaimed: 0, jobsProcessed: 0, errors: 0 };
  }

  logger.info(
    { claimed: claimed.length },
    "[PipelinePoller] Claimed pipeline jobs",
  );

  let processed = 0;
  let errors = 0;

  // Process each claimed job
  for (const claimedJob of claimed) {
    try {
      await runSmartPipeline(db, claimedJob);
      processed++;
    } catch (err) {
      errors++;
      logger.error(
        { jobId: claimedJob.id, threadId: claimedJob.threadId, err },
        "[PipelinePoller] Error processing pipeline job",
      );

      // Mark as failed if runSmartPipeline didn't catch it
      await db
        .update(pipelineJobs)
        .set({
          status: "failed",
          errorMessage: err instanceof Error ? err.message : String(err),
          updatedAt: new Date(),
        })
        .where(sql`${pipelineJobs.id} = ${claimedJob.id} AND ${pipelineJobs.status} = 'processing'`);
    }
  }

  logger.info(
    { claimed: claimed.length, processed, errors },
    "[PipelinePoller] Poll cycle complete",
  );

  return { jobsClaimed: claimed.length, jobsProcessed: processed, errors };
}

// ─── Lifecycle ───────────────────────────────────────────────────────────────

export function startWorkers(): void {
  const config = getConfig();
  const logger = getLogger();
  const connection = getRedis();

  // ── Ingest worker (legacy) ──────────────────────────────────────────
  _ingestWorker = new Worker(
    INGEST_QUEUE,
    processIngestJob as never,
    {
      connection: connection as never,
      concurrency: config.LLM_MAX_CONCURRENCY,
      limiter: {
        max: config.RATE_LIMIT_MAX,
        duration: 60_000, // per minute
      },
    },
  );

  _ingestWorker.on("failed", (job, err) => {
    logger.error(
      {
        jobId: job?.id,
        threadId: job?.data.threadId,
        attempt: job?.attemptsMade,
        err,
      },
      "Ingest job failed",
    );
  });

  _ingestWorker.on("stalled", (jobId) => {
    logger.warn({ jobId }, "Ingest job stalled");
  });

  _ingestWorker.on("error", (err) => {
    logger.error({ err }, "Ingest worker error");
  });

  // ── WorkItem worker ─────────────────────────────────────────────────
  _workItemWorker = new Worker(
    WORKITEM_QUEUE,
    processWorkItemJob as never,
    {
      connection: connection as never,
      concurrency: config.LLM_MAX_CONCURRENCY,
      limiter: {
        max: config.RATE_LIMIT_MAX,
        duration: 60_000,
      },
    },
  );

  _workItemWorker.on("failed", (job, err) => {
    logger.error(
      {
        jobId: job?.id,
        threadId: job?.data.threadId,
        attempt: job?.attemptsMade,
        err,
      },
      "Work-item job failed",
    );
  });

  _workItemWorker.on("stalled", (jobId) => {
    logger.warn({ jobId }, "Work-item job stalled");
  });

  _workItemWorker.on("error", (err) => {
    logger.error({ err }, "Work-item worker error");
  });

  // ── Pipeline Poller worker ──────────────────────────────────────────
  _pipelineWorker = new Worker(
    PIPELINE_QUEUE,
    processPipelinePollerJob as never,
    {
      connection: connection as never,
      // Only one concurrent poller — it claims multiple jobs per poll
      concurrency: 1,
    },
  );

  _pipelineWorker.on("failed", (job, err) => {
    logger.error(
      { jobId: job?.id, err },
      "Pipeline poller job failed",
    );
  });

  _pipelineWorker.on("error", (err) => {
    logger.error({ err }, "Pipeline poller worker error");
  });

  logger.info(
    { concurrency: config.LLM_MAX_CONCURRENCY, rateLimit: config.RATE_LIMIT_MAX },
    "BullMQ workers started (ingest + workitem + pipeline)",
  );
}

/**
 * Set up the repeatable pipeline poller job.
 *
 * This creates a BullMQ repeatable job that fires every 3 seconds,
 * triggering the pipeline poller to check for pending pipeline_job rows.
 */
export async function setupPipelinePoller(): Promise<void> {
  const logger = getLogger();

  // Import here to avoid circular dependency
  const { getPipelineQueue } = await import("./queues.js");
  const queue = getPipelineQueue();

  // Remove any existing repeatable jobs with this name (idempotent)
  const existing = await queue.getRepeatableJobs();
  for (const job of existing) {
    if (job.name === "pipeline-poll") {
      await queue.removeRepeatableByKey(job.key);
    }
  }

  // Add the repeatable poller: every 3 seconds
  await queue.add(
    "pipeline-poll",
    { trigger: "scheduled" } satisfies PipelinePollerJobData,
    {
      repeat: {
        every: 3_000, // Poll every 3 seconds
      },
      // Only keep a small number of completed poller jobs
      removeOnComplete: { age: 300, count: 100 },
      removeOnFail: { age: 3_600, count: 500 },
    },
  );

  logger.info("Pipeline poller repeatable job registered (every 3s)");
}

export async function closeWorkers(): Promise<void> {
  const logger = getLogger();
  logger.info("Shutting down workers (waiting for active jobs)...");

  const promises: Promise<void>[] = [];

  if (_ingestWorker) {
    promises.push(_ingestWorker.close());
    _ingestWorker = null;
  }
  if (_workItemWorker) {
    promises.push(_workItemWorker.close());
    _workItemWorker = null;
  }
  if (_pipelineWorker) {
    promises.push(_pipelineWorker.close());
    _pipelineWorker = null;
  }

  await Promise.all(promises);
  logger.info("All workers shut down");
}
