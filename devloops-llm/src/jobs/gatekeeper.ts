/**
 * Job B: Smart Ticket Gatekeeper.
 *
 * Context-aware pure function — examines the ThreadState AND the thread's
 * current status to decide whether a WorkItem should be created, whether
 * to ask the user for more details, or to do nothing.
 *
 * Enhancements over the original:
 *   - Awareness of WaitingOnUser status (user answering prior questions)
 *   - AI response text generation for AskQuestions action
 *   - Improved SplitIntoTwo handling
 *   - Confidence boosting when resuming from a waiting state
 */

import type { ThreadStateJson } from "../db/schema.js";

export interface GatekeeperResult {
  shouldCreateWorkItem: boolean;
  workItemType?: "Bug" | "Feature" | "Chore" | "Docs";
  threadStatus: "Open" | "WaitingOnUser" | "Resolved" | "Closed";
  reason: string;
  /** Optional AI-generated message to post back to the thread */
  aiResponseText?: string;
}

export interface GatekeeperContext {
  /** Current thread status before gatekeeper runs */
  currentThreadStatus?: "Open" | "WaitingOnUser" | "Resolved" | "Closed";
  /** Whether this message is in response to AI-asked questions */
  isFollowUp?: boolean;
}

/**
 * Format open questions into a user-friendly message.
 */
function formatQuestionsMessage(
  openQuestions: string[],
  summary: string,
): string {
  if (openQuestions.length === 0) {
    return "I need a bit more information to understand the issue fully. Could you provide more details?";
  }

  const header =
    "I'd like to help you with this, but I need a few more details to make sure I get it right:";
  const questions = openQuestions
    .map((q, i) => `${i + 1}. ${q}`)
    .join("\n");

  return `${header}\n\n${questions}\n\nPlease share whatever you can — it'll help me create an accurate work item for the team.`;
}

/**
 * Run the gatekeeper logic.
 *
 * @param threadState - The updated ThreadState from Job A
 * @param context     - Optional context about the thread's current state
 */
export function runGatekeeper(
  threadState: ThreadStateJson,
  context?: GatekeeperContext,
): GatekeeperResult {
  const rec = threadState.recommendation;
  const isReturningFromWaiting =
    context?.currentThreadStatus === "WaitingOnUser" || context?.isFollowUp;

  // ── No recommendation or explicitly NoTicket ──────────────────────────
  if (!rec || rec.action === "NoTicket") {
    return {
      shouldCreateWorkItem: false,
      threadStatus: "Open",
      reason: rec?.reason ?? "No ticket needed",
    };
  }

  // ── AskQuestions ──────────────────────────────────────────────────────
  if (rec.action === "AskQuestions") {
    // If the user is replying to previous questions but we still need more,
    // post the remaining open questions
    const aiResponseText = formatQuestionsMessage(
      threadState.openQuestions ?? [],
      threadState.summary ?? "",
    );

    return {
      shouldCreateWorkItem: false,
      threadStatus: "WaitingOnUser",
      reason: rec.reason,
      aiResponseText,
    };
  }

  // ── CreateBugWorkItem / CreateFeatureWorkItem ─────────────────────────
  if (
    rec.action === "CreateBugWorkItem" ||
    rec.action === "CreateFeatureWorkItem"
  ) {
    // When the user is responding to our questions, we apply a lower
    // confidence threshold since we explicitly asked for this info
    const confidenceThreshold = isReturningFromWaiting ? 0.5 : 0.7;

    if (rec.confidence >= confidenceThreshold) {
      const type = rec.action === "CreateBugWorkItem" ? "Bug" : "Feature";
      return {
        shouldCreateWorkItem: true,
        workItemType: type,
        threadStatus: "Open",
        reason: rec.reason,
      };
    }

    // Confidence too low — ask for more details instead of creating
    const aiResponseText = formatQuestionsMessage(
      threadState.openQuestions ?? [],
      threadState.summary ?? "",
    );

    return {
      shouldCreateWorkItem: false,
      threadStatus: "WaitingOnUser",
      reason: `Recommendation confidence (${rec.confidence.toFixed(2)}) below threshold (${isReturningFromWaiting ? "0.50" : "0.70"}) — asking for more details`,
      aiResponseText,
    };
  }

  // ── SplitIntoTwo ──────────────────────────────────────────────────────
  if (rec.action === "SplitIntoTwo") {
    const candidates = threadState.workItemCandidates ?? [];
    const topCandidate = candidates[0];

    if (topCandidate) {
      const confidenceThreshold = isReturningFromWaiting ? 0.5 : 0.7;

      if (topCandidate.confidence >= confidenceThreshold) {
        const validTypes = ["Bug", "Feature", "Chore", "Docs"] as const;
        const validType = validTypes.includes(
          topCandidate.type as (typeof validTypes)[number],
        )
          ? (topCandidate.type as "Bug" | "Feature" | "Chore" | "Docs")
          : "Bug";

        // Build response noting there may be a second item
        const additionalNote =
          candidates.length > 1
            ? `\n\nNote: I've identified ${candidates.length} potential items from this conversation. I'll create the most important one first ("${topCandidate.shortTitle}").`
            : "";

        return {
          shouldCreateWorkItem: true,
          workItemType: validType,
          threadStatus: "Open",
          reason: `Split recommended: creating first item — ${topCandidate.shortTitle}`,
          aiResponseText: additionalNote || undefined,
        };
      }
    }

    // Not enough confidence for automatic split
    const aiResponseText = formatQuestionsMessage(
      threadState.openQuestions ?? [],
      threadState.summary ?? "",
    );

    return {
      shouldCreateWorkItem: false,
      threadStatus: "WaitingOnUser",
      reason:
        "Split recommended but confidence too low for automatic creation — asking for more details",
      aiResponseText,
    };
  }

  // ── Fallback: confidence too low ──────────────────────────────────────
  return {
    shouldCreateWorkItem: false,
    threadStatus: "Open",
    reason: `Recommendation confidence (${rec.confidence}) below threshold (0.7)`,
  };
}
