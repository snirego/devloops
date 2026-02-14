/**
 * LLM Jobs — Durable pipeline job system backed by Postgres.
 *
 * Two modes of operation:
 *   1. DB-backed (pipeline_job table exists): writes a durable row to Postgres,
 *      devloops-llm polls and processes it. Survives deploys/crashes.
 *   2. HTTP fallback (pipeline_job table not yet migrated): enqueues directly
 *      on the devloops-llm service via REST. Original behavior.
 *   3. Local fallback (LLM_SERVICE_URL not set): runs in-process.
 *
 * The system auto-detects which mode to use on the first call and caches the
 * result so subsequent calls don't pay the detection cost.
 */

import type { dbClient } from "@kan/db/client";
import type { ThreadStateJson } from "@kan/db/schema";
import * as feedbackThreadRepo from "@kan/db/repository/feedbackThread.repo";

// ─── Re-exports for backward compatibility ──────────────────────────────────

export { EMPTY_THREAD_STATE } from "./llmJobsLocal";

export type { GatekeeperResult } from "./llmJobsLocal";

// ─── LLM Service HTTP Client ────────────────────────────────────────────────

function getLlmServiceConfig() {
  return {
    url: process.env.LLM_SERVICE_URL ?? "",
    secret: process.env.LLM_SERVICE_SECRET ?? "",
  };
}

function isLlmServiceConfigured(): boolean {
  const config = getLlmServiceConfig();
  return !!(config.url && config.secret);
}

interface EnqueueResult {
  jobId: string;
  queue: string;
  status: string;
}

async function enqueueJob(
  path: string,
  body: Record<string, unknown>,
): Promise<EnqueueResult> {
  const config = getLlmServiceConfig();
  const url = `${config.url}${path}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Secret": config.secret,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      throw new Error(
        `LLM service returned ${response.status}: ${text.slice(0, 300)}`,
      );
    }

    return (await response.json()) as EnqueueResult;
  } finally {
    clearTimeout(timeout);
  }
}

// ─── Pipeline Job Table Detection ────────────────────────────────────────────
// Auto-detect whether the pipeline_job table exists. Cached after first check.

let _pipelineTableAvailable: boolean | null = null;

async function isPipelineTableAvailable(db: dbClient): Promise<boolean> {
  if (_pipelineTableAvailable !== null) return _pipelineTableAvailable;

  try {
    const pipelineJobRepo = await import("@kan/db/repository/pipelineJob.repo");
    // Try a lightweight query — if the table doesn't exist this will throw
    await pipelineJobRepo.countPending(db);
    _pipelineTableAvailable = true;
    console.log("[Pipeline] pipeline_job table detected — using DB-backed mode");
  } catch {
    _pipelineTableAvailable = false;
    console.log("[Pipeline] pipeline_job table not found — using HTTP fallback mode");
  }

  return _pipelineTableAvailable;
}

// ─── Per-Thread Debounce ─────────────────────────────────────────────────────

interface PendingWrite {
  timer: ReturnType<typeof setTimeout>;
  threadId: number;
  currentState: ThreadStateJson | null;
  messageText: string;
  metadata?: Record<string, unknown>;
  triggerMessageId: number | null;
}

const pendingWrites = new Map<number, PendingWrite>();
const DEBOUNCE_MS = 2_000;

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Enqueue an ingest pipeline job. Auto-detects the best mode:
 *   1. DB-backed (pipeline_job table) — durable, survives crashes
 *   2. HTTP fallback (devloops-llm REST) — original behavior
 *   3. Local in-process — for dev without the LLM service
 */
export function runIngestPipelineAsync(
  db: dbClient,
  threadId: number,
  currentState: ThreadStateJson | null,
  newMessageText: string,
  metadata?: Record<string, unknown>,
  triggerMessageId?: number,
): void {
  // If LLM service is not configured, fall back to local execution
  if (!isLlmServiceConfigured()) {
    console.warn(
      "[LLM] LLM_SERVICE_URL not set — running pipeline in-process (not recommended for production)",
    );
    import("./llmJobsLocal").then(({ runIngestPipelineAsyncLocal }) => {
      runIngestPipelineAsyncLocal(db, threadId, currentState, newMessageText, metadata);
    });
    return;
  }

  // Clear any pending debounced write for this thread
  const existing = pendingWrites.get(threadId);
  if (existing) {
    clearTimeout(existing.timer);
  }

  // Debounce: wait DEBOUNCE_MS after last message, then dispatch
  const timer = setTimeout(() => {
    pendingWrites.delete(threadId);
    dispatchPipelineJob(db, threadId, currentState, newMessageText, metadata, triggerMessageId ?? null);
  }, DEBOUNCE_MS);

  pendingWrites.set(threadId, {
    timer,
    threadId,
    currentState,
    messageText: newMessageText,
    metadata,
    triggerMessageId: triggerMessageId ?? null,
  });
}

/**
 * Dispatch a pipeline job — tries DB-backed mode first, falls back to HTTP.
 */
async function dispatchPipelineJob(
  db: dbClient,
  threadId: number,
  currentState: ThreadStateJson | null,
  messageText: string,
  metadata: Record<string, unknown> | undefined,
  triggerMessageId: number | null,
): Promise<void> {
  // Mark AI processing immediately so the UI shows the spinner
  await feedbackThreadRepo.setAiProcessing(db, threadId).catch((err) => {
    console.error(`[Pipeline] setAiProcessing failed for thread ${threadId}:`, err);
  });

  // Try DB-backed mode first
  const useDbMode = await isPipelineTableAvailable(db);

  if (useDbMode) {
    try {
      const pipelineJobRepo = await import("@kan/db/repository/pipelineJob.repo");

      const job = await pipelineJobRepo.create(db, {
        threadId,
        triggerMessageId,
      });

      // Cancel any older pending jobs for this thread (superseded)
      await pipelineJobRepo.cancelStaleForThread(db, threadId, job.id);

      console.log(
        `[Pipeline] DB job created: ${job.publicId} for thread ${threadId}`,
      );
      return;
    } catch (err) {
      console.error(
        `[Pipeline] DB mode failed for thread ${threadId}, falling back to HTTP:`,
        err,
      );
      // Mark table as unavailable so subsequent calls skip straight to HTTP
      _pipelineTableAvailable = false;
    }
  }

  // HTTP fallback — enqueue directly on devloops-llm service
  try {
    const result = await enqueueJob("/jobs/ingest", {
      threadId,
      currentState,
      messageText,
      metadata,
    });

    console.log(
      `[Pipeline] HTTP job enqueued: ${result.jobId} for thread ${threadId}`,
    );

    // Monitor the job in the background so we can clear aiProcessingSince
    // when it completes or fails. This is essential when the devloops-llm
    // service writes to the same DB (production) but the originating app
    // is running locally — Supabase Realtime may not fire on the local
    // client, so we poll the LLM service directly.
    monitorHttpJob(db, threadId, result.jobId);
  } catch (err) {
    console.error(
      `[Pipeline] Failed to enqueue job for thread ${threadId}:`,
      err,
    );
    // Clear AI processing flag since the job wasn't created
    feedbackThreadRepo.clearAiProcessing(db, threadId).catch(() => {});
  }
}

/**
 * Background monitor for an HTTP-enqueued job.
 *
 * Polls the LLM service status endpoint until the job completes or fails,
 * then clears aiProcessingSince on the thread. This is the safety net
 * that ensures the UI spinner stops, even if Supabase Realtime doesn't
 * deliver the update (e.g. local dev hitting production LLM service).
 */
function monitorHttpJob(
  db: dbClient,
  threadId: number,
  jobId: string,
): void {
  const config = getLlmServiceConfig();
  const maxPollMs = 180_000; // 3 minutes max
  const pollIntervalMs = 4_000;
  const startTime = Date.now();

  const poll = async () => {
    while (Date.now() - startTime < maxPollMs) {
      await new Promise((r) => setTimeout(r, pollIntervalMs));

      try {
        const res = await fetch(
          `${config.url}/jobs/ingest/${jobId}/status`,
          {
            headers: { "X-API-Secret": config.secret },
            signal: AbortSignal.timeout(5_000),
          },
        );

        if (!res.ok) continue;

        const data = (await res.json()) as {
          status: string;
          result?: unknown;
          failedReason?: string;
        };

        if (data.status === "completed") {
          console.log(
            `[Pipeline] HTTP job ${jobId} completed for thread ${threadId}`,
          );
          // The LLM service's ingestPipeline already clears aiProcessingSince,
          // but clear it again from this side as a safety net.
          await feedbackThreadRepo.clearAiProcessing(db, threadId).catch(() => {});
          return;
        }

        if (data.status === "failed") {
          console.error(
            `[Pipeline] HTTP job ${jobId} failed for thread ${threadId}: ${data.failedReason}`,
          );
          await feedbackThreadRepo.clearAiProcessing(db, threadId).catch(() => {});
          return;
        }

        // Still processing — continue polling
      } catch {
        // Network error — continue polling
      }
    }

    // Timed out — clear the flag so the UI doesn't hang forever
    console.warn(
      `[Pipeline] HTTP job ${jobId} monitor timed out for thread ${threadId} — clearing AI flag`,
    );
    await feedbackThreadRepo.clearAiProcessing(db, threadId).catch(() => {});
  };

  // Fire-and-forget — don't block the caller
  poll().catch((err) => {
    console.error(`[Pipeline] Job monitor error for thread ${threadId}:`, err);
    feedbackThreadRepo.clearAiProcessing(db, threadId).catch(() => {});
  });
}

/**
 * Runs the full ingest pipeline synchronously (blocking).
 *
 * Used by the feedbackThread.ingest endpoint which needs to return results.
 * Delegates to the LLM service and polls for completion.
 */
export async function runIngestPipeline(
  db: dbClient,
  threadId: number,
  currentState: ThreadStateJson | null,
  newMessageText: string,
  metadata?: Record<string, unknown>,
): Promise<{
  threadState: ThreadStateJson;
  gatekeeper: { shouldCreateWorkItem: boolean; workItemType?: string; threadStatus: string; reason: string };
  workItem: { publicId: string } | null;
}> {
  if (!isLlmServiceConfigured()) {
    // Fallback: run locally
    const { runIngestPipeline: localPipeline } = await import("./llmJobsLocal");
    return localPipeline(db, threadId, currentState, newMessageText, metadata);
  }

  // Enqueue and poll for completion
  const enqueueResult = await enqueueJob("/jobs/ingest", {
    threadId,
    currentState,
    messageText: newMessageText,
    metadata,
  });

  // Poll for up to 120 seconds
  const config = getLlmServiceConfig();
  const maxPollMs = 120_000;
  const pollIntervalMs = 2_000;
  const startTime = Date.now();

  while (Date.now() - startTime < maxPollMs) {
    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));

    try {
      const statusRes = await fetch(
        `${config.url}/jobs/ingest/${enqueueResult.jobId}/status`,
        {
          headers: { "X-API-Secret": config.secret },
          signal: AbortSignal.timeout(5_000),
        },
      );

      if (!statusRes.ok) continue;

      const status = (await statusRes.json()) as {
        status: string;
        result?: {
          threadState: ThreadStateJson;
          gatekeeper: { shouldCreateWorkItem: boolean; workItemType?: string; threadStatus: string; reason: string };
          workItem: { publicId: string; id: number } | null;
        };
        failedReason?: string;
      };

      if (status.status === "completed" && status.result) {
        return {
          threadState: status.result.threadState,
          gatekeeper: status.result.gatekeeper,
          workItem: status.result.workItem
            ? { publicId: status.result.workItem.publicId }
            : null,
        };
      }

      if (status.status === "failed") {
        throw new Error(
          `LLM pipeline failed: ${status.failedReason ?? "Unknown error"}`,
        );
      }
    } catch (err) {
      if (err instanceof Error && err.message.startsWith("LLM pipeline failed")) {
        throw err;
      }
      // Network error polling — retry
    }
  }

  throw new Error("LLM pipeline timed out after 120s");
}

/**
 * Enqueue a standalone WorkItem generation job on the LLM service.
 */
export async function runWorkItemGenerator(
  db: dbClient,
  threadId: number,
  threadState: ThreadStateJson,
  workItemType: "Bug" | "Feature" | "Chore" | "Docs",
): Promise<{ publicId: string; id: number } | null> {
  if (!isLlmServiceConfigured()) {
    const { runWorkItemGenerator: localGen } = await import("./llmJobsLocal");
    return localGen(db, threadId, threadState, workItemType);
  }

  const enqueueResult = await enqueueJob("/jobs/generate-workitem", {
    threadId,
    threadState,
    workItemType,
  });

  // Poll for up to 120 seconds
  const config = getLlmServiceConfig();
  const maxPollMs = 120_000;
  const pollIntervalMs = 2_000;
  const startTime = Date.now();

  while (Date.now() - startTime < maxPollMs) {
    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));

    try {
      const statusRes = await fetch(
        `${config.url}/jobs/workitem/${enqueueResult.jobId}/status`,
        {
          headers: { "X-API-Secret": config.secret },
          signal: AbortSignal.timeout(5_000),
        },
      );

      if (!statusRes.ok) continue;

      const status = (await statusRes.json()) as {
        status: string;
        result?: { publicId: string; id: number };
        failedReason?: string;
      };

      if (status.status === "completed" && status.result) {
        return status.result;
      }

      if (status.status === "failed") {
        console.error(`[LLM Service] WorkItem generation failed: ${status.failedReason}`);
        return null;
      }
    } catch {
      // Network error — retry poll
    }
  }

  console.error("[LLM Service] WorkItem generation timed out");
  return null;
}
