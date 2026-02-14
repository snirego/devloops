/**
 * Job B: Ticket Gatekeeper.
 *
 * Pure function — examines the ThreadState and decides whether a WorkItem
 * should be created.  No LLM call, no DB writes.
 */

import type { ThreadStateJson } from "../db/schema.js";

export interface GatekeeperResult {
  shouldCreateWorkItem: boolean;
  workItemType?: "Bug" | "Feature" | "Chore" | "Docs";
  threadStatus: "Open" | "WaitingOnUser" | "Resolved" | "Closed";
  reason: string;
}

export function runGatekeeper(threadState: ThreadStateJson): GatekeeperResult {
  const rec = threadState.recommendation;

  if (!rec || rec.action === "NoTicket") {
    return {
      shouldCreateWorkItem: false,
      threadStatus: "Open",
      reason: rec?.reason ?? "No ticket needed",
    };
  }

  if (rec.action === "AskQuestions") {
    return {
      shouldCreateWorkItem: false,
      threadStatus: "WaitingOnUser",
      reason: rec.reason,
    };
  }

  if (
    (rec.action === "CreateBugWorkItem" ||
      rec.action === "CreateFeatureWorkItem") &&
    rec.confidence >= 0.7
  ) {
    const type = rec.action === "CreateBugWorkItem" ? "Bug" : "Feature";
    return {
      shouldCreateWorkItem: true,
      workItemType: type,
      threadStatus: "Open",
      reason: rec.reason,
    };
  }

  if (rec.action === "SplitIntoTwo") {
    const topCandidate = threadState.workItemCandidates?.[0];
    if (topCandidate && topCandidate.confidence >= 0.7) {
      const validType = (
        ["Bug", "Feature", "Chore", "Docs"] as const
      ).includes(
        topCandidate.type as "Bug" | "Feature" | "Chore" | "Docs",
      )
        ? (topCandidate.type as "Bug" | "Feature" | "Chore" | "Docs")
        : "Bug";
      return {
        shouldCreateWorkItem: true,
        workItemType: validType,
        threadStatus: "Open",
        reason: `Split recommended: creating first item — ${topCandidate.shortTitle}`,
      };
    }
    return {
      shouldCreateWorkItem: false,
      threadStatus: "Open",
      reason: "Split recommended but confidence too low for automatic creation",
    };
  }

  return {
    shouldCreateWorkItem: false,
    threadStatus: "Open",
    reason: `Recommendation confidence (${rec.confidence}) below threshold (0.7)`,
  };
}
