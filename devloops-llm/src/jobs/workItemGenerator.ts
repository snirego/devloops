/**
 * Job C: Generate a complete WorkItem package with prompts.
 *
 * Calls the LLM to produce a structured WorkItem from the ThreadState,
 * validates the output, and persists to Postgres.
 */

import { eq } from "drizzle-orm";

import type { DbClient } from "../db/client.js";
import type { EstimatedEffortJson, PromptBundleJson, ThreadStateJson } from "../db/schema.js";
import { workItems, auditLogs } from "../db/schema.js";
import { llmJsonCompletion } from "../llm/client.js";
import { getLogger } from "../utils/logger.js";
import { generateUID } from "../utils/uid.js";

// ─── Output type ─────────────────────────────────────────────────────────────

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

// ─── Validator ───────────────────────────────────────────────────────────────

function validateWorkItemGenOutput(parsed: unknown): WorkItemGenOutput {
  const obj = parsed as Record<string, unknown>;
  if (!obj || typeof obj !== "object") throw new Error("Expected object");
  if (typeof obj.title !== "string" || obj.title.length === 0)
    throw new Error("title must be non-empty string");

  const validTypes = ["Bug", "Feature", "Chore", "Docs"];
  if (!validTypes.includes(obj.type as string)) obj.type = "Bug";

  const validPriorities = ["P0", "P1", "P2", "P3"];
  if (!validPriorities.includes(obj.priority as string)) obj.priority = "P2";

  if (typeof obj.severity !== "number" || obj.severity < 1 || obj.severity > 5)
    obj.severity = 3;

  const validRisk = ["Low", "Medium", "High"];
  if (!validRisk.includes(obj.riskLevel as string)) obj.riskLevel = "Medium";

  if (!Array.isArray(obj.acceptanceCriteria)) obj.acceptanceCriteria = [];
  if (!Array.isArray(obj.labels)) obj.labels = [];

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
    if (!Array.isArray(pb.suspectedFiles)) pb.suspectedFiles = [];
    if (!Array.isArray(pb.testsToRun)) pb.testsToRun = [];
    if (!Array.isArray(pb.commands)) pb.commands = [];
  }

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
    if (!validSizes.includes(ef.tShirt as string)) ef.tShirt = "M";
  }

  return obj as unknown as WorkItemGenOutput;
}

// ─── System Prompt ───────────────────────────────────────────────────────────

const WORKITEM_GEN_SYSTEM_PROMPT = `You generate work items as JSON. Respond with ONLY a JSON object. No markdown, no explanation, no code fences.

EXAMPLE OUTPUT:
{"title":"Fix login timeout","type":"Bug","structuredDescription":"Users report...","acceptanceCriteria":["Login completes in <3s","Error message shown on timeout"],"priority":"P1","severity":3,"riskLevel":"Medium","estimatedEffort":{"tShirt":"S","hoursMin":2,"hoursMax":6,"confidence":0.7},"promptBundle":{"cursorPrompt":"Fix the login timeout issue...","agentSystemPrompt":"Do not modify auth keys...","agentTaskPrompt":"Investigate the login handler...","suspectedFiles":["src/auth/login.ts"],"testsToRun":["npm test -- auth"],"commands":["npm run dev"]},"labels":["auth","bug"]}

Rules: All keys double-quoted. All strings double-quoted. No comments. No trailing commas. Just valid JSON.`;

// ─── Build User Prompt ───────────────────────────────────────────────────────

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

  return `Create a "${workItemType}" work item from this conversation:

Summary: ${summary}
${goal ? `User goal: ${goal}` : ""}
Intent: ${intent}
${steps ? `Repro steps: ${steps}` : ""}
${expected ? `Expected: ${expected}` : ""}
${actual ? `Actual: ${actual}` : ""}

Return a JSON object with these exact keys: title, type, structuredDescription, acceptanceCriteria (string array), priority (P0-P3), severity (1-5), riskLevel (Low/Medium/High), estimatedEffort ({tShirt, hoursMin, hoursMax, confidence}), promptBundle ({cursorPrompt, agentSystemPrompt, agentTaskPrompt, suspectedFiles, testsToRun, commands}), labels (string array).`;
}

// ─── Execute ─────────────────────────────────────────────────────────────────

export async function runWorkItemGenerator(
  db: DbClient,
  threadId: number,
  threadState: ThreadStateJson,
  workItemType: "Bug" | "Feature" | "Chore" | "Docs",
): Promise<{ publicId: string; id: number } | null> {
  const logger = getLogger();

  const result = await llmJsonCompletion({
    systemPrompt: WORKITEM_GEN_SYSTEM_PROMPT,
    userPrompt: buildWorkItemGenPrompt(threadState, workItemType),
    validate: validateWorkItemGenOutput,
    temperature: 0.3,
    maxTokens: 4096,
    maxRetries: 2,
  });

  if (!result.ok) {
    logger.error(
      { threadId, error: result.error },
      "[Job C] WorkItem generation failed",
    );

    await db.insert(auditLogs).values({
      entityType: "Thread",
      entityId: threadId,
      action: "workitem_generation_failed",
      detailsJson: {
        error: result.error,
        rawContent: result.rawContent ?? null,
      },
    });

    return null;
  }

  const gen = result.data;
  const publicId = generateUID();

  const [item] = await db
    .insert(workItems)
    .values({
      publicId,
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
      linksJson: {
        githubRepo: "",
        githubIssueUrl: null,
        githubPrUrl: null,
        branch: null,
      },
      executionJson: {
        agentMode: "none",
        agentJobId: null,
        lastRunAt: null,
        runLogsUrl: null,
        artifactsJson: null,
      },
    })
    .returning();

  const workItem = item!;

  await db.insert(auditLogs).values({
    entityType: "WorkItem",
    entityId: workItem.id,
    action: "created",
    detailsJson: {
      threadId,
      type: gen.type,
      title: gen.title,
      priority: gen.priority,
      confidence: threadState.recommendation.confidence,
    },
  });

  logger.info(
    { threadId, workItemId: workItem.id, publicId: workItem.publicId },
    "[Job C] WorkItem created",
  );

  return { publicId: workItem.publicId, id: workItem.id };
}
