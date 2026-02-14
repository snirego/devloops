/**
 * Local LLM Jobs — Original in-process execution.
 *
 * This is the fallback used when LLM_SERVICE_URL is not configured
 * (local development). In production, use the devloops-llm service.
 */

import type { dbClient } from "@kan/db/client";
import type {
  EstimatedEffortJson,
  PromptBundleJson,
  ThreadStateJson,
} from "@kan/db/schema";
import * as auditLogRepo from "@kan/db/repository/auditLog.repo";
import * as feedbackThreadRepo from "@kan/db/repository/feedbackThread.repo";
import * as workItemRepo from "@kan/db/repository/workItem.repo";

import { llmJsonCompletion } from "./llm";

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

// ─── Validators ──────────────────────────────────────────────────────────────

function validateThreadState(parsed: unknown): ThreadStateJson {
  const obj = parsed as Record<string, unknown>;
  if (!obj || typeof obj !== "object") throw new Error("Expected object");
  if (typeof obj.summary !== "string") throw new Error("summary must be string");

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

interface WorkItemGenOutput {
  title: string;
  type: "Bug" | "Feature" | "Chore" | "Docs";
  structuredDescription: string;
  acceptanceCriteria: string[];
  priority: "P0" | "P1" | "P2" | "P3";
  severity: number;
  riskLevel: "Low" | "Medium" | "High";
  estimatedEffort: EstimatedEffortJson;
  promptBundle: PromptBundleJson;
  labels: string[];
}

function validateWorkItemGenOutput(parsed: unknown): WorkItemGenOutput {
  const obj = parsed as Record<string, unknown>;
  if (!obj || typeof obj !== "object") throw new Error("Expected object");

  // Title: required, coerce if possible
  if (typeof obj.title !== "string" || obj.title.trim().length === 0) {
    // Try to find any string field that could serve as a title
    const fallback = typeof obj.name === "string" ? obj.name
      : typeof obj.summary === "string" ? obj.summary
      : null;
    if (fallback && fallback.trim().length > 0) {
      obj.title = fallback.trim().slice(0, 200);
    } else {
      throw new Error("title must be non-empty string");
    }
  }

  // Type: coerce to valid value
  const validTypes = ["Bug", "Feature", "Chore", "Docs"];
  if (!validTypes.includes(obj.type as string)) {
    // Try case-insensitive match
    const typeStr = String(obj.type ?? "").toLowerCase();
    const matched = validTypes.find((t) => t.toLowerCase() === typeStr);
    obj.type = matched ?? "Feature";
  }

  // Priority: coerce, handle common alternatives like "High"/"Low"
  const validPriorities = ["P0", "P1", "P2", "P3"];
  if (!validPriorities.includes(obj.priority as string)) {
    const pStr = String(obj.priority ?? "").toLowerCase();
    if (pStr.includes("critical") || pStr.includes("urgent") || pStr === "high" || pStr === "p0") obj.priority = "P0";
    else if (pStr.includes("high") || pStr === "p1") obj.priority = "P1";
    else if (pStr.includes("low") || pStr === "p3") obj.priority = "P3";
    else obj.priority = "P2";
  }

  // Severity: coerce to 1-5
  if (typeof obj.severity === "string") {
    const parsed = parseInt(obj.severity, 10);
    obj.severity = isNaN(parsed) ? 3 : Math.max(1, Math.min(5, parsed));
  }
  if (typeof obj.severity !== "number" || obj.severity < 1 || obj.severity > 5)
    obj.severity = 3;

  // Risk level: coerce
  const validRisk = ["Low", "Medium", "High"];
  if (!validRisk.includes(obj.riskLevel as string)) {
    const rStr = String(obj.riskLevel ?? "").toLowerCase();
    const matched = validRisk.find((r) => r.toLowerCase() === rStr);
    obj.riskLevel = matched ?? (rStr === "none" ? "Low" : "Medium");
  }

  // Structured description: coerce
  if (typeof obj.structuredDescription !== "string") {
    obj.structuredDescription = typeof obj.description === "string" ? obj.description : "";
  }

  // Acceptance criteria: coerce objects to strings if needed
  if (!Array.isArray(obj.acceptanceCriteria)) {
    obj.acceptanceCriteria = [];
  } else {
    obj.acceptanceCriteria = (obj.acceptanceCriteria as unknown[]).map((item) => {
      if (typeof item === "string") return item;
      if (item && typeof item === "object") {
        const o = item as Record<string, unknown>;
        return String(o.name ?? o.description ?? o.text ?? JSON.stringify(item));
      }
      return String(item);
    });
  }

  if (!Array.isArray(obj.labels)) obj.labels = [];

  // Prompt bundle: coerce
  const pb = obj.promptBundle as Record<string, unknown> | undefined;
  if (!pb || typeof pb !== "object") {
    obj.promptBundle = {
      cursorPrompt: "",
      agentSystemPrompt: "",
      agentTaskPrompt: "",
      suspectedFiles: [],
      testsToRun: [],
      commands: [],
    };
  } else {
    if (typeof pb.cursorPrompt !== "string") pb.cursorPrompt = "";
    if (typeof pb.agentSystemPrompt !== "string") pb.agentSystemPrompt = "";
    if (typeof pb.agentTaskPrompt !== "string") pb.agentTaskPrompt = "";
    if (!Array.isArray(pb.suspectedFiles)) pb.suspectedFiles = [];
    if (!Array.isArray(pb.testsToRun)) pb.testsToRun = [];
    if (!Array.isArray(pb.commands)) pb.commands = [];
  }

  // Estimated effort: coerce
  const ef = obj.estimatedEffort as Record<string, unknown> | undefined;
  if (!ef || typeof ef !== "object") {
    obj.estimatedEffort = {
      tShirt: "M",
      hoursMin: 2,
      hoursMax: 8,
      confidence: 0.5,
    };
  } else {
    const validSizes = ["XS", "S", "M", "L", "XL"];
    if (!validSizes.includes(ef.tShirt as string)) {
      const sStr = String(ef.tShirt ?? "").toUpperCase();
      ef.tShirt = validSizes.includes(sStr) ? sStr : "M";
    }
    if (typeof ef.hoursMin !== "number") ef.hoursMin = 2;
    if (typeof ef.hoursMax !== "number") ef.hoursMax = 8;
    if (typeof ef.confidence !== "number") ef.confidence = 0.5;
  }

  return obj as unknown as WorkItemGenOutput;
}

// ─── Prompts ─────────────────────────────────────────────────────────────────

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

const WORKITEM_GEN_SYSTEM_PROMPT = `You are a JSON generator. You MUST respond with ONLY a raw JSON object.
NEVER wrap in markdown code fences. NEVER add any text before or after the JSON.

STRICT RULES:
- All property names MUST be double-quoted
- All string values MUST be double-quoted
- "type" MUST be one of: "Bug", "Feature", "Chore", "Docs"
- "priority" MUST be one of: "P0", "P1", "P2", "P3"
- "severity" MUST be a number from 1 to 5
- "riskLevel" MUST be one of: "Low", "Medium", "High"
- "acceptanceCriteria" MUST be an array of strings (NOT objects)
- "labels" MUST be an array of strings
- "estimatedEffort" MUST have keys: "tShirt" (XS/S/M/L/XL), "hoursMin" (number), "hoursMax" (number), "confidence" (0-1)
- "promptBundle" MUST have keys: "cursorPrompt" (string), "agentSystemPrompt" (string), "agentTaskPrompt" (string), "suspectedFiles" (string[]), "testsToRun" (string[]), "commands" (string[])
- No comments, no trailing commas

EXAMPLE (copy this structure exactly):
{"title":"Fix login timeout","type":"Bug","structuredDescription":"Users report login timing out after 30 seconds.","acceptanceCriteria":["Login completes in under 3 seconds","Error message shown on timeout"],"priority":"P1","severity":3,"riskLevel":"Medium","estimatedEffort":{"tShirt":"S","hoursMin":2,"hoursMax":6,"confidence":0.7},"promptBundle":{"cursorPrompt":"Fix the login timeout issue","agentSystemPrompt":"Do not modify auth keys","agentTaskPrompt":"Investigate the login handler","suspectedFiles":["src/auth/login.ts"],"testsToRun":["npm test -- auth"],"commands":["npm run dev"]},"labels":["auth","bug"]}`;

function buildThreadStateUserPrompt(
  currentState: ThreadStateJson,
  newMessageText: string,
  metadata?: Record<string, unknown>,
): string {
  return JSON.stringify({
    instruction:
      "Update the ThreadState below with the new message. Keep it cumulative. Return the full updated ThreadState as JSON.",
    currentThreadState: currentState,
    newMessage: { text: newMessageText, metadata: metadata ?? {} },
    outputSchema: {
      summary: "string — overall conversation summary",
      userGoal: "string|null",
      intent: "Bug|Feature|Performance|Billing|Other",
      knownEnvironment: "{ device?, os?, browser?, appVersion?, hardware?, network? }",
      reproSteps: "string[]",
      expectedBehavior: "string|null",
      actualBehavior: "string|null",
      openQuestions: "string[]",
      resolvedQuestions: "string[]",
      signals: "{ sentiment?, urgency?, impactGuess? }",
      workItemCandidates: "array of { type, shortTitle, reason, confidence }",
      recommendation:
        "{ action: NoTicket|AskQuestions|CreateBugWorkItem|CreateFeatureWorkItem|SplitIntoTwo, reason: string, confidence: 0-1 }",
      duplicateHint:
        "{ possibleDuplicate: boolean, matchedWorkItemId: number|null, matchedTicketUrl: string|null }",
    },
  });
}

function buildWorkItemGenPrompt(
  threadState: ThreadStateJson,
  workItemType: "Bug" | "Feature" | "Chore" | "Docs",
): string {
  const summary = threadState.summary || "No summary available";
  const goal = threadState.userGoal || "";
  const intent = threadState.intent || workItemType;
  const steps = (threadState.reproSteps || []).join("; ");
  const expected = threadState.expectedBehavior || "";
  const actual = threadState.actualBehavior || "";

  const context = [
    `Type: ${workItemType}`,
    `Summary: ${summary}`,
    goal ? `User goal: ${goal}` : null,
    `Intent: ${intent}`,
    steps ? `Repro steps: ${steps}` : null,
    expected ? `Expected: ${expected}` : null,
    actual ? `Actual: ${actual}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  return `${context}

Respond with a single JSON object. The "type" field MUST be "${workItemType}". Do NOT use markdown fences.`;
}

// ─── Job Execution ───────────────────────────────────────────────────────────

async function runThreadStateUpdate(
  db: dbClient,
  threadId: number,
  currentState: ThreadStateJson | null,
  newMessageText: string,
  metadata?: Record<string, unknown>,
): Promise<ThreadStateJson> {
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
    console.error("[LLM Job A] ThreadState update failed:", result.error);
    await auditLogRepo.create(db, {
      entityType: "Thread",
      entityId: threadId,
      action: "threadstate_update_failed",
      detailsJson: { error: result.error, rawContent: result.rawContent ?? null },
    });
    return state;
  }

  const updatedState = result.data;
  await feedbackThreadRepo.updateThreadState(db, threadId, updatedState);

  await auditLogRepo.create(db, {
    entityType: "Thread",
    entityId: threadId,
    action: "threadstate_updated",
    detailsJson: { recommendation: updatedState.recommendation },
  });

  return updatedState;
}

export interface GatekeeperResult {
  shouldCreateWorkItem: boolean;
  workItemType?: "Bug" | "Feature" | "Chore" | "Docs";
  threadStatus: "Open" | "WaitingOnUser" | "Resolved" | "Closed";
  reason: string;
}

function runGatekeeper(threadState: ThreadStateJson): GatekeeperResult {
  const rec = threadState.recommendation;

  if (!rec || rec.action === "NoTicket") {
    return { shouldCreateWorkItem: false, threadStatus: "Open", reason: rec?.reason ?? "No ticket needed" };
  }
  if (rec.action === "AskQuestions") {
    return { shouldCreateWorkItem: false, threadStatus: "WaitingOnUser", reason: rec.reason };
  }
  if ((rec.action === "CreateBugWorkItem" || rec.action === "CreateFeatureWorkItem") && rec.confidence >= 0.7) {
    return {
      shouldCreateWorkItem: true,
      workItemType: rec.action === "CreateBugWorkItem" ? "Bug" : "Feature",
      threadStatus: "Open",
      reason: rec.reason,
    };
  }
  if (rec.action === "SplitIntoTwo") {
    const top = threadState.workItemCandidates?.[0];
    if (top && top.confidence >= 0.7) {
      const validType = (["Bug", "Feature", "Chore", "Docs"] as const).includes(
        top.type as "Bug" | "Feature" | "Chore" | "Docs",
      )
        ? (top.type as "Bug" | "Feature" | "Chore" | "Docs")
        : "Bug";
      return { shouldCreateWorkItem: true, workItemType: validType, threadStatus: "Open", reason: `Split: ${top.shortTitle}` };
    }
    return { shouldCreateWorkItem: false, threadStatus: "Open", reason: "Split confidence too low" };
  }
  return { shouldCreateWorkItem: false, threadStatus: "Open", reason: `Confidence (${rec.confidence}) below 0.7` };
}

export async function runWorkItemGenerator(
  db: dbClient,
  threadId: number,
  threadState: ThreadStateJson,
  workItemType: "Bug" | "Feature" | "Chore" | "Docs",
): Promise<{ publicId: string; id: number } | null> {
  const result = await llmJsonCompletion({
    systemPrompt: WORKITEM_GEN_SYSTEM_PROMPT,
    userPrompt: buildWorkItemGenPrompt(threadState, workItemType),
    validate: validateWorkItemGenOutput,
    temperature: 0.2,
    maxTokens: 4096,
    maxRetries: 3,
  });

  if (!result.ok) {
    console.error("[LLM Job C] WorkItem generation failed:", result.error);
    await auditLogRepo.create(db, {
      entityType: "Thread",
      entityId: threadId,
      action: "workitem_generation_failed",
      detailsJson: { error: result.error, rawContent: result.rawContent ?? null },
    });
    return null;
  }

  const gen = result.data;
  const workItem = await workItemRepo.create(db, {
    threadId,
    type: gen.type,
    title: gen.title,
    structuredDescription: gen.structuredDescription,
    acceptanceCriteriaJson: gen.acceptanceCriteria,
    priority: gen.priority,
    severity: gen.severity,
    confidenceScore: threadState.recommendation.confidence,
    riskLevel: gen.riskLevel,
    status: "PendingApproval",
    labelsJson: gen.labels,
    estimatedEffortJson: gen.estimatedEffort,
    promptBundleJson: gen.promptBundle,
    linksJson: { githubRepo: "", githubIssueUrl: null, githubPrUrl: null, branch: null },
    executionJson: { agentMode: "none", agentJobId: null, lastRunAt: null, runLogsUrl: null, artifactsJson: null },
  });

  await auditLogRepo.create(db, {
    entityType: "WorkItem",
    entityId: workItem.id,
    action: "created",
    detailsJson: { threadId, type: gen.type, title: gen.title, priority: gen.priority, confidence: threadState.recommendation.confidence },
  });

  return { publicId: workItem.publicId, id: workItem.id };
}

export async function runIngestPipeline(
  db: dbClient,
  threadId: number,
  currentState: ThreadStateJson | null,
  newMessageText: string,
  metadata?: Record<string, unknown>,
): Promise<{
  threadState: ThreadStateJson;
  gatekeeper: GatekeeperResult;
  workItem: { publicId: string; id: number } | null;
}> {
  const updatedState = await runThreadStateUpdate(db, threadId, currentState, newMessageText, metadata);
  const gatekeeperResult = runGatekeeper(updatedState);
  await feedbackThreadRepo.updateStatus(db, threadId, gatekeeperResult.threadStatus);

  let workItem: { publicId: string; id: number } | null = null;
  if (gatekeeperResult.shouldCreateWorkItem && gatekeeperResult.workItemType) {
    workItem = await runWorkItemGenerator(db, threadId, updatedState, gatekeeperResult.workItemType);
  }

  return { threadState: updatedState, gatekeeper: gatekeeperResult, workItem };
}

export function runIngestPipelineAsyncLocal(
  db: dbClient,
  threadId: number,
  currentState: ThreadStateJson | null,
  newMessageText: string,
  metadata?: Record<string, unknown>,
): void {
  feedbackThreadRepo.setAiProcessing(db, threadId).catch(() => {});

  runIngestPipeline(db, threadId, currentState, newMessageText, metadata)
    .then(async (result) => {
      await feedbackThreadRepo.clearAiProcessing(db, threadId).catch(() => {});
      if (result.workItem) {
        const feedbackMessageRepo = await import("@kan/db/repository/feedbackMessage.repo");
        await feedbackMessageRepo.create(db, {
          threadId,
          source: "api",
          senderType: "internal",
          senderName: "DevLoops AI",
          visibility: "internal",
          rawText: `AI suggested a work item: "${result.gatekeeper.reason}". Check the Work Items board for details.`,
          metadataJson: { type: "system_workitem_suggestion", workItemPublicId: result.workItem.publicId },
        });
      }
    })
    .catch(async () => {
      await feedbackThreadRepo.clearAiProcessing(db, threadId).catch(() => {});
    });
}
