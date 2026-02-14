/**
 * Job A: Update ThreadState cumulatively from conversation context.
 *
 * Two modes:
 *   1. Single-message mode (original): receives one new message text
 *   2. Full-context mode (smart pipeline): receives ALL messages for the thread
 *
 * Calls the LLM with the current thread state + messages,
 * validates the output, and persists to Postgres.
 */

import { eq, asc } from "drizzle-orm";

import type { DbClient } from "../db/client.js";
import type { ThreadStateJson } from "../db/schema.js";
import { feedbackThreads, feedbackMessages, auditLogs } from "../db/schema.js";
import { llmJsonCompletion } from "../llm/client.js";
import { getLogger } from "../utils/logger.js";

// ─── Error type for network-level LLM failures ──────────────────────────────

/**
 * Thrown when the LLM request fails at the network/provider level
 * (fetch failed, circuit breaker open, timeout, DNS error).
 *
 * The smart pipeline and legacy ingest pipeline check for this to decide
 * whether to retry the job instead of proceeding with stale state.
 */
export class LlmUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LlmUnavailableError";
  }
}

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

const THREAD_STATE_SYSTEM_PROMPT = `You are a developer-first support intelligence engine for a software product.
You analyze conversation messages from end-users and maintain a cumulative ThreadState that reflects the ENTIRE conversation.

Your PRIMARY GOAL is to convert user feedback into actionable work items (bug reports or feature requests).

CLASSIFICATION RULES:
- If the user describes something broken, not working, or unexpected → intent = "Bug", recommend CreateBugWorkItem
- If the user asks for new functionality, wants to be able to do something, or suggests an improvement → intent = "Feature", recommend CreateFeatureWorkItem
- If the user's message is clearly actionable (bug report or feature request), set confidence to 0.8-0.9 even if brief. A single clear sentence like "I want X" or "Y is broken" IS enough.
- Only use AskQuestions when the intent is genuinely AMBIGUOUS (you can't tell if it's a bug or feature) or when critical details are missing that would make the work item useless (e.g., "it doesn't work" with zero context about what "it" is).
- Use NoTicket ONLY for: greetings, thank-you messages, off-topic chatter, or messages that are clearly not feedback. When in doubt between NoTicket and creating a work item, prefer creating a work item.
- If user introduces a completely unrelated second topic, set recommendation.action to "SplitIntoTwo".

CONFIDENCE GUIDELINES:
- 0.9 = Clear, specific request with enough detail to act on (e.g., "Add a comments feature to cards")
- 0.8 = Clear intent but light on specifics (e.g., "I want to add comments")
- 0.7 = Reasonable intent but needs some clarification
- 0.5-0.6 = Ambiguous, ask questions
- Below 0.5 = Very unclear, ask questions or NoTicket

CUMULATIVE STATE RULES:
- Keep ALL previous facts, repro steps, environment info. Never lose data.
- Update fields cumulatively — add to arrays, refine summaries.
- Move answered questions from openQuestions to resolvedQuestions.
- When you set action to AskQuestions, populate openQuestions with specific, clear questions.
- Consider the full conversation flow: if you previously asked questions and the user responded, evaluate whether the answers are sufficient to upgrade confidence.
- Populate workItemCandidates with at least one entry whenever intent is Bug or Feature.

OUTPUT FORMAT — STRICT:
- Respond with ONLY a valid JSON object. Nothing else.
- All property names MUST be double-quoted.
- All string values MUST be double-quoted.
- Do NOT use single quotes. Do NOT use unquoted keys.
- Do NOT wrap in markdown code fences.
- Do NOT include any text before or after the JSON.`;

// ─── Build User Prompt (single message mode — backward compat) ──────────────

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

// ─── Build User Prompt (full conversation mode — smart pipeline) ────────────

export interface ConversationMessage {
  senderType: "user" | "internal";
  senderName: string | null;
  rawText: string;
  createdAt: Date | string;
}

function buildFullContextUserPrompt(
  currentState: ThreadStateJson,
  messages: ConversationMessage[],
): string {
  // Format conversation as a readable history
  const conversationHistory = messages.map((m, i) => ({
    index: i + 1,
    from: m.senderType === "user" ? (m.senderName ?? "User") : (m.senderName ?? "Team"),
    role: m.senderType,
    text: m.rawText,
  }));

  return JSON.stringify({
    instruction:
      "Analyze the FULL conversation history below and produce an updated ThreadState. Consider ALL messages cumulatively. If questions were asked by the AI and the user has responded, evaluate whether the information is now sufficient. Return the full updated ThreadState as JSON.",
    currentThreadState: currentState,
    conversationHistory,
    messageCount: messages.length,
    outputSchema: {
      summary: "string — overall conversation summary",
      userGoal: "string|null",
      intent: "Bug|Feature|Performance|Billing|Other",
      knownEnvironment:
        "{ device?, os?, browser?, appVersion?, hardware?, network? }",
      reproSteps: "string[]",
      expectedBehavior: "string|null",
      actualBehavior: "string|null",
      openQuestions: "string[] — questions that still need answers",
      resolvedQuestions: "string[] — questions that have been answered",
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

// ─── Load all messages for a thread ──────────────────────────────────────────

export async function loadThreadMessages(
  db: DbClient,
  threadId: number,
): Promise<ConversationMessage[]> {
  const msgs = await db
    .select({
      senderType: feedbackMessages.senderType,
      senderName: feedbackMessages.senderName,
      rawText: feedbackMessages.rawText,
      createdAt: feedbackMessages.createdAt,
    })
    .from(feedbackMessages)
    .where(eq(feedbackMessages.threadId, threadId))
    .orderBy(asc(feedbackMessages.createdAt));

  return msgs as ConversationMessage[];
}

// ─── Execute (single message mode — backward compatible) ─────────────────────

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

    // If the error is a network-level failure, throw so the caller can retry
    const isNetworkError =
      result.error.includes("fetch failed") ||
      result.error.includes("Circuit breaker") ||
      result.error.includes("timed out") ||
      result.error.includes("ECONNREFUSED") ||
      result.error.includes("ENOTFOUND");

    if (isNetworkError) {
      throw new LlmUnavailableError(result.error);
    }

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

// ─── Execute (full-context mode — smart pipeline) ────────────────────────────

/**
 * Run ThreadState update using the FULL conversation history.
 *
 * This mode loads all messages from the thread and passes them to the LLM
 * as a complete conversation, ensuring no context is lost even after
 * page reloads or when picking up waiting_for_input threads.
 */
export async function runThreadStateUpdateFullContext(
  db: DbClient,
  threadId: number,
  currentState: ThreadStateJson | null,
): Promise<ThreadStateJson> {
  const logger = getLogger();
  const state = currentState ?? EMPTY_THREAD_STATE;

  // Load ALL messages for this thread
  const messages = await loadThreadMessages(db, threadId);

  if (messages.length === 0) {
    logger.warn({ threadId }, "[Job A] No messages found for thread — returning current state");
    return state;
  }

  logger.info(
    { threadId, messageCount: messages.length },
    "[Job A] Running full-context ThreadState update",
  );

  const result = await llmJsonCompletion({
    systemPrompt: THREAD_STATE_SYSTEM_PROMPT,
    userPrompt: buildFullContextUserPrompt(state, messages),
    validate: validateThreadState,
    temperature: 0.1,
    maxTokens: 4096,
    maxRetries: 1,
  });

  if (!result.ok) {
    logger.error(
      { threadId, error: result.error },
      "[Job A] Full-context ThreadState update failed",
    );

    await db.insert(auditLogs).values({
      entityType: "Thread",
      entityId: threadId,
      action: "threadstate_update_failed",
      detailsJson: {
        error: result.error,
        rawContent: result.rawContent ?? null,
        mode: "full_context",
        messageCount: messages.length,
      },
    });

    // If the error is a network/fetch failure, throw so the pipeline can retry
    // instead of silently proceeding with stale state
    const isNetworkError =
      result.error.includes("fetch failed") ||
      result.error.includes("Circuit breaker") ||
      result.error.includes("timed out") ||
      result.error.includes("ECONNREFUSED") ||
      result.error.includes("ENOTFOUND");

    if (isNetworkError) {
      throw new LlmUnavailableError(result.error);
    }

    // For parse/validation errors, return the old state (the LLM responded but
    // with garbage — retrying likely won't help, let the gatekeeper decide)
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
    detailsJson: {
      recommendation: updatedState.recommendation,
      mode: "full_context",
      messageCount: messages.length,
    },
  });

  return updatedState;
}
