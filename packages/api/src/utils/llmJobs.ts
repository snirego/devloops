/**
 * LLM Jobs — Durable pipeline job system backed by Postgres.
 *
 * Instead of fire-and-forget HTTP calls with an in-memory debounce
 * (which were lost on Vercel cold start, redeploy, or crash),
 * this module writes a `pipeline_job` row to the database.
 *
 * The devloops-llm service polls the `pipeline_job` table and
 * processes jobs using BullMQ workers. Results are written directly
 * to the shared Postgres DB and surfaced via Supabase Realtime.
 *
 * Falls back to local execution if LLM_SERVICE_URL is not configured
 * (for local development without the separate service running).
 */

import type { dbClient } from "@kan/db/client";
import type { ThreadStateJson } from "@kan/db/schema";
import * as feedbackThreadRepo from "@kan/db/repository/feedbackThread.repo";
import * as pipelineJobRepo from "@kan/db/repository/pipelineJob.repo";

// ─── Re-exports for backward compatibility ──────────────────────────────────

export { EMPTY_THREAD_STATE } from "./llmJobsLocal";

export type { GatekeeperResult } from "./llmJobsLocal";

// ─── LLM Service HTTP Client (kept for sync pipeline + workitem gen) ────────

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

// ─── Per-Thread Debounce (lightweight, with DB-backed durability) ────────────
// When a user sends multiple messages rapidly (e.g. 3 messages in 5 seconds),
// we debounce so that only the last message triggers a pipeline_job row.
// Unlike the old approach, the job is ALWAYS written to DB — the debounce
// just prevents multiple rows for rapid-fire messages.

interface PendingWrite {
  timer: ReturnType<typeof setTimeout>;
  threadId: number;
  triggerMessageId: number | null;
}

const pendingWrites = new Map<number, PendingWrite>();
const DEBOUNCE_MS = 2_000; // 2 seconds after last message

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Enqueue an ingest pipeline job by writing a `pipeline_job` row to Postgres.
 *
 * The devloops-llm service polls this table and processes jobs. This approach
 * is durable across page reloads, server restarts, and deploys.
 *
 * Includes a per-thread debounce: if multiple messages arrive within 2s,
 * only the last one creates a pipeline_job row.
 *
 * @param triggerMessageId - The id of the message that triggered this pipeline
 *                           (optional, used for auditing)
 */
export function runIngestPipelineAsync(
  db: dbClient,
  threadId: number,
  _currentState: ThreadStateJson | null,
  _newMessageText: string,
  _metadata?: Record<string, unknown>,
  triggerMessageId?: number,
): void {
  // If LLM service is not configured, fall back to local execution
  if (!isLlmServiceConfigured()) {
    console.warn(
      "[LLM] LLM_SERVICE_URL not set — running pipeline in-process (not recommended for production)",
    );
    import("./llmJobsLocal").then(({ runIngestPipelineAsyncLocal }) => {
      runIngestPipelineAsyncLocal(db, threadId, _currentState, _newMessageText, _metadata);
    });
    return;
  }

  // Clear any pending debounced write for this thread
  const existing = pendingWrites.get(threadId);
  if (existing) {
    clearTimeout(existing.timer);
  }

  // Debounce: wait DEBOUNCE_MS after last message, then write pipeline_job row
  const timer = setTimeout(() => {
    pendingWrites.delete(threadId);
    writePipelineJob(db, threadId, triggerMessageId ?? null);
  }, DEBOUNCE_MS);

  pendingWrites.set(threadId, {
    timer,
    threadId,
    triggerMessageId: triggerMessageId ?? null,
  });
}

/**
 * Write a pipeline_job row to Postgres (called after debounce).
 *
 * This is the durable intent — even if the server crashes right after,
 * the row is in the DB and devloops-llm will pick it up.
 */
async function writePipelineJob(
  db: dbClient,
  threadId: number,
  triggerMessageId: number | null,
): Promise<void> {
  try {
    // Mark AI processing immediately so the UI shows the spinner
    await feedbackThreadRepo.setAiProcessing(db, threadId).catch((err) => {
      console.error(`[Pipeline] setAiProcessing failed for thread ${threadId}:`, err);
    });

    // Create the durable pipeline job row
    const job = await pipelineJobRepo.create(db, {
      threadId,
      triggerMessageId,
    });

    // Cancel any older pending jobs for this thread (superseded by new message)
    await pipelineJobRepo.cancelStaleForThread(db, threadId, job.id);

    console.log(
      `[Pipeline] Job created: ${job.publicId} for thread ${threadId}`,
    );
  } catch (err) {
    console.error(
      `[Pipeline] Failed to create pipeline job for thread ${threadId}:`,
      err,
    );
    // Clear AI processing flag since the job wasn't created
    feedbackThreadRepo.clearAiProcessing(db, threadId).catch(() => {});
  }
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
