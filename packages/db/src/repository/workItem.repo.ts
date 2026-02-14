import { and, desc, eq, inArray } from "drizzle-orm";

import type { dbClient } from "@kan/db/client";
import type {
  EstimatedEffortJson,
  ExecutionJson,
  LinksJson,
  PromptBundleJson,
  WorkItemStatus,
} from "@kan/db/schema";
import { workItems } from "@kan/db/schema";
import { generateUID } from "@kan/shared/utils";

export const create = async (
  db: dbClient,
  input: {
    threadId: number;
    type: "Bug" | "Feature" | "Chore" | "Docs";
    title: string;
    structuredDescription?: string;
    acceptanceCriteriaJson?: string[];
    priority: "P0" | "P1" | "P2" | "P3";
    severity: number;
    confidenceScore: number;
    riskLevel: "Low" | "Medium" | "High";
    status?: WorkItemStatus;
    labelsJson?: string[];
    estimatedEffortJson?: EstimatedEffortJson;
    promptBundleJson?: PromptBundleJson;
    linksJson?: LinksJson;
    executionJson?: ExecutionJson;
  },
) => {
  const [item] = await db
    .insert(workItems)
    .values({
      publicId: generateUID(),
      threadId: input.threadId,
      type: input.type,
      title: input.title,
      structuredDescription: input.structuredDescription ?? null,
      acceptanceCriteriaJson: input.acceptanceCriteriaJson ?? null,
      priority: input.priority,
      severity: input.severity,
      confidenceScore: input.confidenceScore,
      riskLevel: input.riskLevel,
      status: input.status ?? "PendingApproval",
      labelsJson: input.labelsJson ?? null,
      estimatedEffortJson: input.estimatedEffortJson ?? null,
      promptBundleJson: input.promptBundleJson ?? null,
      linksJson: input.linksJson ?? null,
      executionJson: input.executionJson ?? {
        agentMode: "none",
        agentJobId: null,
        lastRunAt: null,
        runLogsUrl: null,
        artifactsJson: null,
      },
    })
    .returning();

  return item!;
};

export const getById = async (db: dbClient, id: number) => {
  return db.query.workItems.findFirst({
    where: eq(workItems.id, id),
    with: { thread: true },
  });
};

export const getByPublicId = async (db: dbClient, publicId: string) => {
  return db.query.workItems.findFirst({
    where: eq(workItems.publicId, publicId),
    with: { thread: true },
  });
};

export const getByPublicIdWithThread = async (
  db: dbClient,
  publicId: string,
) => {
  const item = await db.query.workItems.findFirst({
    where: eq(workItems.publicId, publicId),
    with: {
      thread: {
        with: {
          messages: true,
        },
      },
    },
  });
  return item;
};

export const updateStatus = async (
  db: dbClient,
  id: number,
  status: WorkItemStatus,
  reason?: string,
) => {
  const updates: Record<string, unknown> = {
    status,
    updatedAt: new Date(),
  };
  if (reason !== undefined) updates.reason = reason;

  const [updated] = await db
    .update(workItems)
    .set(updates)
    .where(eq(workItems.id, id))
    .returning();

  return updated;
};

export const updateLinks = async (
  db: dbClient,
  id: number,
  linksJson: LinksJson,
) => {
  const [updated] = await db
    .update(workItems)
    .set({ linksJson, updatedAt: new Date() })
    .where(eq(workItems.id, id))
    .returning();

  return updated;
};

export const updateExecution = async (
  db: dbClient,
  id: number,
  executionJson: ExecutionJson,
) => {
  const [updated] = await db
    .update(workItems)
    .set({ executionJson, updatedAt: new Date() })
    .where(eq(workItems.id, id))
    .returning();

  return updated;
};

export const updatePromptBundle = async (
  db: dbClient,
  id: number,
  promptBundleJson: PromptBundleJson,
) => {
  const [updated] = await db
    .update(workItems)
    .set({ promptBundleJson, updatedAt: new Date() })
    .where(eq(workItems.id, id))
    .returning();

  return updated;
};

export const updateFields = async (
  db: dbClient,
  id: number,
  fields: Partial<{
    title: string;
    structuredDescription: string | null;
    type: "Bug" | "Feature" | "Chore" | "Docs";
    priority: "P0" | "P1" | "P2" | "P3";
    riskLevel: "Low" | "Medium" | "High";
    acceptanceCriteriaJson: string[] | null;
  }>,
) => {
  const [updated] = await db
    .update(workItems)
    .set({ ...fields, updatedAt: new Date() })
    .where(eq(workItems.id, id))
    .returning();
  return updated;
};

export const listAll = async (
  db: dbClient,
  opts?: {
    statuses?: WorkItemStatus[];
    threadId?: number;
    limit?: number;
    offset?: number;
  },
) => {
  const conditions = [];
  if (opts?.statuses && opts.statuses.length > 0) {
    conditions.push(inArray(workItems.status, opts.statuses));
  }
  if (opts?.threadId) {
    conditions.push(eq(workItems.threadId, opts.threadId));
  }

  return db.query.workItems.findMany({
    where: conditions.length > 0 ? and(...conditions) : undefined,
    orderBy: desc(workItems.createdAt),
    limit: opts?.limit ?? 100,
    offset: opts?.offset ?? 0,
    with: {
      thread: true,
    },
  });
};
