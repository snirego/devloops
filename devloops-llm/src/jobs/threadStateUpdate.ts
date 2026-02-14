/**
 * Job A: Update ThreadState cumulatively from a new message.
 *
 * Calls the LLM with the current thread state + new message,
 * validates the output, and persists to Postgres.
 */

import { eq } from "drizzle-orm";

import type { DbClient } from "../db/client.js";
import type { ThreadStateJson } from "../db/schema.js";
import { feedbackThreads, auditLogs } from "../db/schema.js";
import { llmJsonCompletion } from "../llm/client.js";
import { getLogger } from "../utils/logger.js";

// ─── Default empty ThreadState ───────────────────────────────────────────────

export const EMPTY_THREAD_STATE: ThreadStateJson = {
  summary: "",
  userGoal: null,
  intent: "Other",
  knownEnvironment: {},
  reproSteps: [],
  expectedBehavior: null,
  actualBehavior: null,
  openQuestions: [],
  resolvedQuestions: [],
  signals: {},
  workItemCandidates: [],
  recommendation: {
    action: "NoTicket",
    reason: "Insufficient information",
    confidence: 0,
  },
  duplicateHint: {
    possibleDuplicate: false,
    matchedWorkItemId: null,
    matchedTicketUrl: null,
  },
};

// ─── Validator ───────────────────────────────────────────────────────────────

function validateThreadState(parsed: unknown): ThreadStateJson {
  const obj = parsed as Record<string, unknown>;
  if (!obj || typeof obj !== "object") throw new Error("Expected object");
  if (typeof obj.summary !== "string")
    throw new Error("summary must be string");

  const validActions = [
    "NoTicket",
    "AskQuestions",
    "CreateBugWorkItem",
    "CreateFeatureWorkItem",
    "SplitIntoTwo",
  ];

  const rec = obj.recommendation as Record<string, unknown> | undefined;
  if (!rec || !validActions.includes(rec.action as string)) {
    if (rec) rec.action = "NoTicket";
  }

  if (!Array.isArray(obj.reproSteps)) obj.reproSteps = [];
  if (!Array.isArray(obj.openQuestions)) obj.openQuestions = [];
  if (!Array.isArray(obj.resolvedQuestions)) obj.resolvedQuestions = [];
  if (!Array.isArray(obj.workItemCandidates)) obj.workItemCandidates = [];

  if (!obj.knownEnvironment || typeof obj.knownEnvironment !== "object")
    obj.knownEnvironment = {};
  if (!obj.signals || typeof obj.signals !== "object") obj.signals = {};
  if (!obj.recommendation || typeof obj.recommendation !== "object")
    obj.recommendation = EMPTY_THREAD_STATE.recommendation;
  if (!obj.duplicateHint || typeof obj.duplicateHint !== "object")
    obj.duplicateHint = EMPTY_THREAD_STATE.duplicateHint;

  return obj as unknown as ThreadStateJson;
}

// ─── System Prompt ───────────────────────────────────────────────────────────

const THREAD_STATE_SYSTEM_PROMPT = `You are a developer-first support intelligence engine.
You analyze conversation messages and maintain a cumulative ThreadState that reflects the ENTIRE conversation, not just the latest message.

CRITICAL RULES:
- Keep ALL previous facts, repro steps, environment info. Never lose data.
- Update fields cumulatively — add to arrays, refine summaries.
- Move answered questions from openQuestions to resolvedQuestions.
- If user introduces a completely unrelated topic, set recommendation.action to "SplitIntoTwo".
- Be conservative with CreateBugWorkItem/CreateFeatureWorkItem — only when you have enough info and confidence >= 0.7.
- Default recommendation is NoTicket or AskQuestions.

OUTPUT FORMAT — STRICT:
- Respond with ONLY a valid JSON object. Nothing else.
- All property names MUST be double-quoted.
- All string values MUST be double-quoted.
- Do NOT use single quotes. Do NOT use unquoted keys.
- Do NOT wrap in markdown code fences.
- Do NOT include any text before or after the JSON.`;

// ─── Build User Prompt ───────────────────────────────────────────────────────

function buildThreadStateUserPrompt(
  currentState: ThreadStateJson,
  newMessageText: string,
  metadata?: Record<string, unknown>,
): string {
  return JSON.stringify({
    instruction:
      "Update the ThreadState below with the new message. Keep it cumulative. Return the full updated ThreadState as JSON.",
    currentThreadState: currentState,
    newMessage: {
      text: newMessageText,
      metadata: metadata ?? {},
    },
    outputSchema: {
      summary: "string — overall conversation summary",
      userGoal: "string|null",
      intent: "Bug|Feature|Performance|Billing|Other",
      knownEnvironment:
        "{ device?, os?, browser?, appVersion?, hardware?, network? }",
      reproSteps: "string[]",
      expectedBehavior: "string|null",
      actualBehavior: "string|null",
      openQuestions: "string[]",
      resolvedQuestions: "string[]",
      signals: "{ sentiment?, urgency?, impactGuess? }",
      workItemCandidates:
        "array of { type, shortTitle, reason, confidence }",
      recommendation:
        "{ action: NoTicket|AskQuestions|CreateBugWorkItem|CreateFeatureWorkItem|SplitIntoTwo, reason: string, confidence: 0-1 }",
      duplicateHint:
        "{ possibleDuplicate: boolean, matchedWorkItemId: number|null, matchedTicketUrl: string|null }",
    },
  });
}

// ─── Execute ─────────────────────────────────────────────────────────────────

export async function runThreadStateUpdate(
  db: DbClient,
  threadId: number,
  currentState: ThreadStateJson | null,
  newMessageText: string,
  metadata?: Record<string, unknown>,
): Promise<ThreadStateJson> {
  const logger = getLogger();
  const state = currentState ?? EMPTY_THREAD_STATE;

  const result = await llmJsonCompletion({
    systemPrompt: THREAD_STATE_SYSTEM_PROMPT,
    userPrompt: buildThreadStateUserPrompt(state, newMessageText, metadata),
    validate: validateThreadState,
    temperature: 0.1,
    maxTokens: 4096,
    maxRetries: 1,
  });

  if (!result.ok) {
    logger.error(
      { threadId, error: result.error },
      "[Job A] ThreadState update failed",
    );

    await db.insert(auditLogs).values({
      entityType: "Thread",
      entityId: threadId,
      action: "threadstate_update_failed",
      detailsJson: {
        error: result.error,
        rawContent: result.rawContent ?? null,
      },
    });

    return state;
  }

  const updatedState = result.data;

  await db
    .update(feedbackThreads)
    .set({
      threadStateJson: updatedState,
      updatedAt: new Date(),
      lastActivityAt: new Date(),
    })
    .where(eq(feedbackThreads.id, threadId));

  await db.insert(auditLogs).values({
    entityType: "Thread",
    entityId: threadId,
    action: "threadstate_updated",
    detailsJson: { recommendation: updatedState.recommendation },
  });

  return updatedState;
}
