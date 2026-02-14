/**
 * BullMQ queue definitions.
 *
 * Three queues:
 *   - llm-ingest:   Full pipeline (ThreadState → Gatekeeper → WorkItem) [legacy]
 *   - llm-workitem: Standalone WorkItem generation (manual trigger)
 *   - llm-pipeline: Smart pipeline — polls pipeline_job table for pending jobs
 *
 * All share the same Redis connection and have:
 *   - Rate limiting to protect the LLM provider
 *   - Exponential backoff retries
 *   - Dead-letter on final failure
 *   - Automatic stale job cleanup (24 h)
 */

import { Queue } from "bullmq";

import { getConfig } from "../config.js";
import { getRedis } from "./connection.js";
import type { ThreadStateJson } from "../db/schema.js";

// ─── Job payload types ───────────────────────────────────────────────────────

export interface IngestJobData {
  threadId: number;
  currentState: ThreadStateJson | null;
  messageText: string;
  metadata?: Record<string, unknown>;
}

export interface WorkItemJobData {
  threadId: number;
  threadState: ThreadStateJson;
  workItemType: "Bug" | "Feature" | "Chore" | "Docs";
}

/** Pipeline poller job — no payload, just a trigger to poll the DB */
export interface PipelinePollerJobData {
  trigger: "scheduled";
}

// ─── Job result types ────────────────────────────────────────────────────────

export interface IngestJobResult {
  threadState: ThreadStateJson;
  gatekeeper: {
    shouldCreateWorkItem: boolean;
    workItemType?: "Bug" | "Feature" | "Chore" | "Docs";
    threadStatus: "Open" | "WaitingOnUser" | "Resolved" | "Closed";
    reason: string;
  };
  workItem: { publicId: string; id: number } | null;
}

export interface WorkItemJobResult {
  publicId: string;
  id: number;
}

export interface PipelinePollerJobResult {
  jobsClaimed: number;
  jobsProcessed: number;
  errors: number;
}

// ─── Queue names ─────────────────────────────────────────────────────────────

export const INGEST_QUEUE = "llm-ingest";
export const WORKITEM_QUEUE = "llm-workitem";
export const PIPELINE_QUEUE = "llm-pipeline";

// ─── Queue instances ─────────────────────────────────────────────────────────

let _ingestQueue: Queue | null = null;
let _workItemQueue: Queue | null = null;
let _pipelineQueue: Queue | null = null;

export function getIngestQueue(): Queue {
  if (_ingestQueue) return _ingestQueue;

  const config = getConfig();

  _ingestQueue = new Queue(INGEST_QUEUE, {
    connection: getRedis() as never,
    defaultJobOptions: {
      attempts: config.JOB_MAX_RETRIES + 1,
      backoff: { type: "exponential", delay: 2_000 },
      removeOnComplete: { age: 86_400, count: 5_000 },
      removeOnFail: { age: 86_400 * 7, count: 10_000 },
    },
  });

  return _ingestQueue;
}

export function getWorkItemQueue(): Queue {
  if (_workItemQueue) return _workItemQueue;

  const config = getConfig();

  _workItemQueue = new Queue(WORKITEM_QUEUE, {
    connection: getRedis() as never,
    defaultJobOptions: {
      attempts: config.JOB_MAX_RETRIES + 1,
      backoff: { type: "exponential", delay: 2_000 },
      removeOnComplete: { age: 86_400, count: 5_000 },
      removeOnFail: { age: 86_400 * 7, count: 10_000 },
    },
  });

  return _workItemQueue;
}

export function getPipelineQueue(): Queue {
  if (_pipelineQueue) return _pipelineQueue;

  _pipelineQueue = new Queue(PIPELINE_QUEUE, {
    connection: getRedis() as never,
    defaultJobOptions: {
      // Pipeline poller jobs are lightweight — they just poll the DB.
      // The actual heavy work happens in-process after claiming a row.
      attempts: 1,
      removeOnComplete: { age: 3_600, count: 1_000 },
      removeOnFail: { age: 86_400, count: 5_000 },
    },
  });

  return _pipelineQueue;
}

export async function closeQueues(): Promise<void> {
  if (_ingestQueue) {
    await _ingestQueue.close();
    _ingestQueue = null;
  }
  if (_workItemQueue) {
    await _workItemQueue.close();
    _workItemQueue = null;
  }
  if (_pipelineQueue) {
    await _pipelineQueue.close();
    _pipelineQueue = null;
  }
}
