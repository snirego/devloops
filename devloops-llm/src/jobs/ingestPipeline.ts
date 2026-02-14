/**
 * Full ingest pipeline orchestrator: Job A → Job B → (optional) Job C.
 *
 * 1. Update ThreadState via LLM          (Job A)
 * 2. Run gatekeeper to decide next step  (Job B)
 * 3. If gatekeeper says yes, generate WorkItem via LLM (Job C)
 *
 * Also handles:
 *  - Setting/clearing aiProcessingSince on the thread
 *  - Creating system messages when WorkItems are suggested
 *  - Updating thread status based on gatekeeper result
 */

import { eq } from "drizzle-orm";

import type { DbClient } from "../db/client.js";
import type { ThreadStateJson } from "../db/schema.js";
import { feedbackThreads, feedbackMessages } from "../db/schema.js";
import { getLogger } from "../utils/logger.js";
import { generateUID } from "../utils/uid.js";
import { runThreadStateUpdate, LlmUnavailableError } from "./threadStateUpdate.js";
import { runGatekeeper, type GatekeeperResult } from "./gatekeeper.js";
import { runWorkItemGenerator } from "./workItemGenerator.js";

export interface IngestPipelineResult {
  threadState: ThreadStateJson;
  gatekeeper: GatekeeperResult;
  workItem: { publicId: string; id: number } | null;
}

/**
 * Marks a thread as "AI is processing".
 */
async function setAiProcessing(db: DbClient, threadId: number): Promise<void> {
  await db
    .update(feedbackThreads)
    .set({ aiProcessingSince: new Date() })
    .where(eq(feedbackThreads.id, threadId));
}

/**
 * Clears the AI processing flag.
 */
async function clearAiProcessing(
  db: DbClient,
  threadId: number,
): Promise<void> {
  await db
    .update(feedbackThreads)
    .set({ aiProcessingSince: null })
    .where(eq(feedbackThreads.id, threadId));
}

/**
 * Updates the thread status.
 */
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

/**
 * Run the complete ingest pipeline.
 *
 * This is called by the BullMQ worker for each ingest job.
 */
export async function runIngestPipeline(
  db: DbClient,
  threadId: number,
  currentState: ThreadStateJson | null,
  newMessageText: string,
  metadata?: Record<string, unknown>,
): Promise<IngestPipelineResult> {
  const logger = getLogger();

  // Mark AI processing
  await setAiProcessing(db, threadId);

  try {
    // ── Job A: ThreadState update ──────────────────────────────────────
    logger.info({ threadId }, "Pipeline: starting Job A (ThreadState update)");

    let updatedState: ThreadStateJson;
    try {
      updatedState = await runThreadStateUpdate(
        db,
        threadId,
        currentState,
        newMessageText,
        metadata,
      );
    } catch (err) {
      if (err instanceof LlmUnavailableError) {
        // LLM is unreachable — throw so BullMQ retries the job
        logger.warn(
          { threadId, err: err.message },
          "Pipeline: LLM unavailable — job will be retried",
        );
        throw err;
      }
      throw err;
    }

    // ── Job B: Gatekeeper ──────────────────────────────────────────────
    logger.info({ threadId }, "Pipeline: starting Job B (Gatekeeper)");
    const gatekeeperResult = runGatekeeper(updatedState);

    // Update thread status
    await updateThreadStatus(db, threadId, gatekeeperResult.threadStatus);

    // ── Job C: WorkItem generation (conditional) ───────────────────────
    let workItem: { publicId: string; id: number } | null = null;

    if (
      gatekeeperResult.shouldCreateWorkItem &&
      gatekeeperResult.workItemType
    ) {
      logger.info(
        { threadId, workItemType: gatekeeperResult.workItemType },
        "Pipeline: starting Job C (WorkItem generation)",
      );

      workItem = await runWorkItemGenerator(
        db,
        threadId,
        updatedState,
        gatekeeperResult.workItemType,
      );

      // Create a system message about the WorkItem suggestion
      if (workItem) {
        await db.insert(feedbackMessages).values({
          publicId: generateUID(),
          threadId,
          source: "api",
          senderType: "internal",
          senderName: "DevLoops AI",
          visibility: "internal",
          rawText: `AI suggested a work item: "${gatekeeperResult.reason}". Check the Work Items board for details.`,
          metadataJson: {
            type: "system_workitem_suggestion",
            workItemPublicId: workItem.publicId,
          },
        });
      }
    }

    logger.info(
      {
        threadId,
        workItemCreated: !!workItem,
        gatekeeperAction: gatekeeperResult.reason,
      },
      "Pipeline: completed",
    );

    return { threadState: updatedState, gatekeeper: gatekeeperResult, workItem };
  } finally {
    // Always clear AI processing flag
    await clearAiProcessing(db, threadId).catch((err) => {
      logger.error(
        { threadId, err },
        "Failed to clear aiProcessingSince flag",
      );
    });
  }
}
