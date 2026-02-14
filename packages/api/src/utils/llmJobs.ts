/**
 * LLM Jobs — Thin HTTP client that delegates to the devloops-llm service.
 *
 * Instead of running LLM inference in-process (which times out on Vercel),
 * this module enqueues jobs on the standalone LLM backend via REST calls.
 * The LLM service writes results directly to the shared Postgres DB.
 *
 * Falls back to local execution if LLM_SERVICE_URL is not configured
 * (for local development without the separate service).
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

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Runs the ingest pipeline asynchronously by delegating to the LLM service.
 *
 * If LLM_SERVICE_URL is not set, falls back to local in-process execution
 * (for local dev without the separate service running).
 */
export function runIngestPipelineAsync(
  db: dbClient,
  threadId: number,
  currentState: ThreadStateJson | null,
  newMessageText: string,
  metadata?: Record<string, unknown>,
): void {
  if (!isLlmServiceConfigured()) {
    // Fallback: run locally (original behavior for local dev)
    console.warn(
      "[LLM] LLM_SERVICE_URL not set — running pipeline in-process (not recommended for production)",
    );
    import("./llmJobsLocal").then(({ runIngestPipelineAsyncLocal }) => {
      runIngestPipelineAsyncLocal(db, threadId, currentState, newMessageText, metadata);
    });
    return;
  }

  console.log(`[LLM Service] Enqueuing ingest job for thread ${threadId}`);

  // Mark AI processing immediately (the LLM service will clear it when done)
  feedbackThreadRepo
    .setAiProcessing(db, threadId)
    .catch((err) => {
      console.error(`[LLM Service] setAiProcessing failed for thread ${threadId}:`, err);
    });

  enqueueJob("/jobs/ingest", {
    threadId,
    currentState,
    messageText: newMessageText,
    metadata,
  })
    .then((result) => {
      console.log(
        `[LLM Service] Ingest job enqueued: ${result.jobId} (thread ${threadId})`,
      );
    })
    .catch((err) => {
      console.error(
        `[LLM Service] Failed to enqueue ingest job for thread ${threadId}:`,
        err,
      );
      // Clear AI processing flag since the job wasn't enqueued
      feedbackThreadRepo
        .clearAiProcessing(db, threadId)
        .catch(() => {});
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
