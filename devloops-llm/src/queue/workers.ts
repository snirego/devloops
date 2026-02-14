/**
 * BullMQ worker pool.
 *
 * Starts one worker per queue:
 *   - llm-ingest worker:   processes full ingest pipeline jobs
 *   - llm-workitem worker: processes standalone WorkItem generation jobs
 *
 * Features:
 *   - Configurable concurrency
 *   - Graceful shutdown (waits for active jobs)
 *   - Structured logging for every job lifecycle event
 */

import { Worker, type Job } from "bullmq";

import { getConfig } from "../config.js";
import { getDb, type DbClient } from "../db/client.js";
import { getLogger } from "../utils/logger.js";
import { getRedis } from "./connection.js";
import {
  INGEST_QUEUE,
  WORKITEM_QUEUE,
  type IngestJobData,
  type IngestJobResult,
  type WorkItemJobData,
  type WorkItemJobResult,
} from "./queues.js";
import { runIngestPipeline } from "../jobs/ingestPipeline.js";
import { runWorkItemGenerator } from "../jobs/workItemGenerator.js";

let _ingestWorker: Worker | null = null;
let _workItemWorker: Worker | null = null;

// ─── Ingest Job Processor ────────────────────────────────────────────────────

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

// ─── Lifecycle ───────────────────────────────────────────────────────────────

export function startWorkers(): void {
  const config = getConfig();
  const logger = getLogger();
  const connection = getRedis();

  // Ingest worker
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

  // WorkItem worker
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

  logger.info(
    { concurrency: config.LLM_MAX_CONCURRENCY, rateLimit: config.RATE_LIMIT_MAX },
    "BullMQ workers started",
  );
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

  await Promise.all(promises);
  logger.info("All workers shut down");
}
