/**
 * Smart Pipeline Orchestrator.
 *
 * Processes a single `pipeline_job` row through the full analysis pipeline:
 *
 *   1. Load full thread context (all messages, current threadState, thread status)
 *   2. Run Job A: ThreadState update with full conversation history
 *   3. Run Job B: Enhanced context-aware Gatekeeper
 *   4. Based on gatekeeper result:
 *      - AskQuestions  → post AI message, mark job waiting_for_input
 *      - Create*       → run Job C (WorkItem + PromptBundle), mark completed
 *      - NoTicket      → mark completed (no_action)
 *
 * This orchestrator is called by the BullMQ pipeline worker, which polls
 * the `pipeline_job` table for pending rows.
 *
 * Designed for durability:
 *   - All state lives in Postgres (survives crashes/restarts)
 *   - AI processing flag on thread provides UI feedback
 *   - Audit log entries for observability
 *   - Graceful error handling with retry support
 */

import { eq } from "drizzle-orm";

import type { DbClient } from "../db/client.js";
import type { ThreadStateJson, PipelineJobResultJson } from "../db/schema.js";
import {
  feedbackThreads,
  feedbackMessages,
  pipelineJobs,
  auditLogs,
} from "../db/schema.js";
import { getLogger } from "../utils/logger.js";
import { generateUID } from "../utils/uid.js";
import { runThreadStateUpdateFullContext, LlmUnavailableError } from "./threadStateUpdate.js";
import { runGatekeeper, type GatekeeperResult, type GatekeeperContext } from "./gatekeeper.js";
import { runWorkItemGenerator } from "./workItemGenerator.js";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface SmartPipelineResult {
  threadState: ThreadStateJson;
  gatekeeper: GatekeeperResult;
  workItem: { publicId: string; id: number } | null;
  pipelineJobStatus: "completed" | "waiting_for_input" | "failed";
}

interface ClaimedJob {
  id: number;
  publicId: string;
  threadId: number;
  triggerMessageId: number | null;
  attempts: number;
}

// ─── Pipeline Job Status Helpers ─────────────────────────────────────────────

async function markJobWaitingForInput(
  db: DbClient,
  jobId: number,
  result: PipelineJobResultJson,
): Promise<void> {
  await db
    .update(pipelineJobs)
    .set({
      status: "waiting_for_input",
      gatekeeperAction: result.gatekeeperAction,
      resultJson: result,
      updatedAt: new Date(),
    })
    .where(eq(pipelineJobs.id, jobId));
}

async function markJobCompleted(
  db: DbClient,
  jobId: number,
  result: PipelineJobResultJson,
): Promise<void> {
  await db
    .update(pipelineJobs)
    .set({
      status: "completed",
      gatekeeperAction: result.gatekeeperAction,
      resultJson: result,
      completedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(pipelineJobs.id, jobId));
}

async function markJobFailed(
  db: DbClient,
  jobId: number,
  errorMessage: string,
): Promise<void> {
  await db
    .update(pipelineJobs)
    .set({
      status: "failed",
      errorMessage,
      updatedAt: new Date(),
    })
    .where(eq(pipelineJobs.id, jobId));
}

// ─── Thread Helpers ──────────────────────────────────────────────────────────

async function setAiProcessing(db: DbClient, threadId: number): Promise<void> {
  await db
    .update(feedbackThreads)
    .set({ aiProcessingSince: new Date() })
    .where(eq(feedbackThreads.id, threadId));
}

async function clearAiProcessing(
  db: DbClient,
  threadId: number,
): Promise<void> {
  await db
    .update(feedbackThreads)
    .set({ aiProcessingSince: null })
    .where(eq(feedbackThreads.id, threadId));
}

async function updateThreadStatus(
  db: DbClient,
  threadId: number,
  status: "Open" | "WaitingOnUser" | "Resolved" | "Closed",
): Promise<void> {
  await db
    .update(feedbackThreads)
    .set({ status, updatedAt: new Date() })
    .where(eq(feedbackThreads.id, threadId));
}

async function loadThread(db: DbClient, threadId: number) {
  return db.query.feedbackThreads.findFirst({
    where: eq(feedbackThreads.id, threadId),
  });
}

// ─── Main Orchestrator ───────────────────────────────────────────────────────

/**
 * Process a single claimed pipeline job through the full analysis pipeline.
 *
 * @param db  - Drizzle DB client
 * @param job - The claimed pipeline_job row
 */
export async function runSmartPipeline(
  db: DbClient,
  job: ClaimedJob,
): Promise<SmartPipelineResult> {
  const logger = getLogger();

  logger.info(
    { jobId: job.id, jobPublicId: job.publicId, threadId: job.threadId, attempt: job.attempts },
    "[SmartPipeline] Starting",
  );

  // Mark AI processing on the thread
  await setAiProcessing(db, job.threadId);

  try {
    // ── Load thread context ───────────────────────────────────────────
    const thread = await loadThread(db, job.threadId);

    if (!thread) {
      const error = `Thread ${job.threadId} not found`;
      logger.error({ threadId: job.threadId }, `[SmartPipeline] ${error}`);
      await markJobFailed(db, job.id, error);
      return {
        threadState: {} as ThreadStateJson,
        gatekeeper: {
          shouldCreateWorkItem: false,
          threadStatus: "Open",
          reason: error,
        },
        workItem: null,
        pipelineJobStatus: "failed",
      };
    }

    const currentState = thread.threadStateJson as ThreadStateJson | null;
    const currentThreadStatus = thread.status as
      | "Open"
      | "WaitingOnUser"
      | "Resolved"
      | "Closed";

    // ── Job A: Full-context ThreadState update ────────────────────────
    logger.info({ threadId: job.threadId }, "[SmartPipeline] Job A: ThreadState update (full context)");

    let updatedState: ThreadStateJson;
    try {
      updatedState = await runThreadStateUpdateFullContext(
        db,
        job.threadId,
        currentState,
      );
    } catch (err) {
      if (err instanceof LlmUnavailableError) {
        // LLM is unreachable — mark job as failed (will be retried on next poll)
        // Do NOT proceed with stale state
        const errMsg = `LLM unavailable during ThreadState update: ${err.message}`;
        logger.warn(
          { threadId: job.threadId, jobId: job.id, err: err.message },
          "[SmartPipeline] LLM unreachable — marking job for retry",
        );
        await markJobFailed(db, job.id, errMsg);
        return {
          threadState: currentState ?? ({} as ThreadStateJson),
          gatekeeper: {
            shouldCreateWorkItem: false,
            threadStatus: currentThreadStatus,
            reason: errMsg,
          },
          workItem: null,
          pipelineJobStatus: "failed",
        };
      }
      throw err; // Re-throw non-LLM errors for the outer catch
    }

    // ── Job B: Smart Gatekeeper ──────────────────────────────────────
    logger.info({ threadId: job.threadId }, "[SmartPipeline] Job B: Gatekeeper");
    const gatekeeperContext: GatekeeperContext = {
      currentThreadStatus,
      isFollowUp: currentThreadStatus === "WaitingOnUser",
    };
    const gatekeeperResult = runGatekeeper(updatedState, gatekeeperContext);

    // Update thread status based on gatekeeper decision
    await updateThreadStatus(db, job.threadId, gatekeeperResult.threadStatus);

    // ── Handle AskQuestions: post AI message, mark waiting ──────────
    if (
      !gatekeeperResult.shouldCreateWorkItem &&
      gatekeeperResult.aiResponseText &&
      gatekeeperResult.threadStatus === "WaitingOnUser"
    ) {
      logger.info(
        { threadId: job.threadId },
        "[SmartPipeline] Gatekeeper: AskQuestions — posting AI message",
      );

      // Post the AI's questions as a public message
      await db.insert(feedbackMessages).values({
        publicId: generateUID(),
        threadId: job.threadId,
        source: "api",
        senderType: "internal",
        senderName: "DevLoops AI",
        visibility: "public",
        rawText: gatekeeperResult.aiResponseText,
        metadataJson: {
          type: "ai_questions",
          pipelineJobId: job.id,
          pipelineJobPublicId: job.publicId,
        },
      });

      // Audit log
      await db.insert(auditLogs).values({
        entityType: "Thread",
        entityId: job.threadId,
        action: "ai_asked_questions",
        detailsJson: {
          pipelineJobId: job.id,
          openQuestions: updatedState.openQuestions,
          reason: gatekeeperResult.reason,
        },
      });

      const resultJson: PipelineJobResultJson = {
        gatekeeperAction: "AskQuestions",
        reason: gatekeeperResult.reason,
        aiResponseText: gatekeeperResult.aiResponseText,
        threadStatus: "WaitingOnUser",
      };

      await markJobWaitingForInput(db, job.id, resultJson);

      logger.info(
        { threadId: job.threadId, jobId: job.id },
        "[SmartPipeline] Completed — waiting for user input",
      );

      return {
        threadState: updatedState,
        gatekeeper: gatekeeperResult,
        workItem: null,
        pipelineJobStatus: "waiting_for_input",
      };
    }

    // ── Handle CreateWorkItem: run Job C ─────────────────────────────
    let workItem: { publicId: string; id: number } | null = null;

    if (
      gatekeeperResult.shouldCreateWorkItem &&
      gatekeeperResult.workItemType
    ) {
      logger.info(
        { threadId: job.threadId, workItemType: gatekeeperResult.workItemType },
        "[SmartPipeline] Job C: WorkItem generation",
      );

      workItem = await runWorkItemGenerator(
        db,
        job.threadId,
        updatedState,
        gatekeeperResult.workItemType,
      );

      // Post a system message about the WorkItem
      if (workItem) {
        await db.insert(feedbackMessages).values({
          publicId: generateUID(),
          threadId: job.threadId,
          source: "api",
          senderType: "internal",
          senderName: "DevLoops AI",
          visibility: "internal",
          rawText: `AI created a work item: "${gatekeeperResult.workItemType}" — ${gatekeeperResult.reason}. Check the Work Items board for details.`,
          metadataJson: {
            type: "system_workitem_created",
            workItemPublicId: workItem.publicId,
            workItemId: workItem.id,
            pipelineJobId: job.id,
          },
        });

        // If the gatekeeper had an additional note (e.g. SplitIntoTwo), post it too
        if (gatekeeperResult.aiResponseText) {
          await db.insert(feedbackMessages).values({
            publicId: generateUID(),
            threadId: job.threadId,
            source: "api",
            senderType: "internal",
            senderName: "DevLoops AI",
            visibility: "public",
            rawText: gatekeeperResult.aiResponseText,
            metadataJson: {
              type: "ai_note",
              pipelineJobId: job.id,
            },
          });
        }
      }
    }

    // ── Mark job completed ───────────────────────────────────────────
    const resultJson: PipelineJobResultJson = {
      gatekeeperAction: gatekeeperResult.shouldCreateWorkItem
        ? `Create${gatekeeperResult.workItemType}WorkItem`
        : "NoTicket",
      reason: gatekeeperResult.reason,
      workItemPublicId: workItem?.publicId,
      workItemId: workItem?.id,
      threadStatus: gatekeeperResult.threadStatus,
    };

    await markJobCompleted(db, job.id, resultJson);

    // Audit log — include the LLM's recommendation for debugging
    await db.insert(auditLogs).values({
      entityType: "Thread",
      entityId: job.threadId,
      action: "smart_pipeline_completed",
      detailsJson: {
        pipelineJobId: job.id,
        gatekeeperAction: resultJson.gatekeeperAction,
        workItemCreated: !!workItem,
        workItemPublicId: workItem?.publicId,
        llmRecommendation: updatedState.recommendation,
        llmIntent: updatedState.intent,
        llmSummary: updatedState.summary,
        llmWorkItemCandidates: updatedState.workItemCandidates,
      },
    });

    logger.info(
      {
        threadId: job.threadId,
        jobId: job.id,
        workItemCreated: !!workItem,
        gatekeeperAction: resultJson.gatekeeperAction,
      },
      "[SmartPipeline] Completed",
    );

    return {
      threadState: updatedState,
      gatekeeper: gatekeeperResult,
      workItem,
      pipelineJobStatus: "completed",
    };
  } catch (err) {
    const errorMessage =
      err instanceof Error ? err.message : String(err);

    logger.error(
      { jobId: job.id, threadId: job.threadId, err },
      "[SmartPipeline] Fatal error",
    );

    await markJobFailed(db, job.id, errorMessage).catch((e) => {
      logger.error({ err: e }, "[SmartPipeline] Failed to mark job as failed");
    });

    return {
      threadState: {} as ThreadStateJson,
      gatekeeper: {
        shouldCreateWorkItem: false,
        threadStatus: "Open",
        reason: `Pipeline error: ${errorMessage}`,
      },
      workItem: null,
      pipelineJobStatus: "failed",
    };
  } finally {
    // Always clear AI processing flag
    await clearAiProcessing(db, job.threadId).catch((err) => {
      logger.error(
        { threadId: job.threadId, err },
        "[SmartPipeline] Failed to clear aiProcessingSince",
      );
    });
  }
}
