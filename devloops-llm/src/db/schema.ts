/**
 * Drizzle schema — mirrors the relevant tables from @kan/db/schema.
 *
 * Only includes the tables the LLM service reads/writes:
 *   - feedback_thread
 *   - feedback_message
 *   - work_item
 *   - audit_log
 *   - pipeline_job
 *
 * The canonical schema lives in packages/db/src/schema/feedbackThreads.ts.
 * Keep this file in sync when that schema changes.
 */

import { relations } from "drizzle-orm";
import {
  bigint,
  bigserial,
  doublePrecision,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

// ─── Enums ───────────────────────────────────────────────────────────────────

export const threadStatusEnum = pgEnum("feedback_thread_status", [
  "Open",
  "WaitingOnUser",
  "Resolved",
  "Closed",
]);

export const messageSourceEnum = pgEnum("feedback_message_source", [
  "widget",
  "email",
  "whatsapp",
  "slack",
  "api",
]);

export const senderTypeEnum = pgEnum("feedback_sender_type", [
  "user",
  "internal",
]);

export const messageVisibilityEnum = pgEnum("feedback_message_visibility", [
  "public",
  "internal",
]);

export const workItemTypeEnum = pgEnum("work_item_type", [
  "Bug",
  "Feature",
  "Chore",
  "Docs",
]);

export const workItemPriorityEnum = pgEnum("work_item_priority", [
  "P0",
  "P1",
  "P2",
  "P3",
]);

export const workItemRiskLevelEnum = pgEnum("work_item_risk_level", [
  "Low",
  "Medium",
  "High",
]);

export const workItemStatusEnum = pgEnum("work_item_status", [
  "Draft",
  "PendingApproval",
  "Approved",
  "Rejected",
  "OnHold",
  "InProgress",
  "NeedsReview",
  "Done",
  "Failed",
  "Canceled",
]);

export const auditEntityTypeEnum = pgEnum("audit_entity_type", [
  "Thread",
  "Message",
  "WorkItem",
]);

// ─── Thread ──────────────────────────────────────────────────────────────────

export const feedbackThreads = pgTable(
  "feedback_thread",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    publicId: varchar("publicId", { length: 12 }).notNull().unique(),
    title: varchar("title", { length: 500 }),
    primarySource: varchar("primarySource", { length: 50 }),
    customerId: varchar("customerId", { length: 255 }),
    status: threadStatusEnum("status").notNull().default("Open"),
    threadStateJson: jsonb("threadStateJson"),
    aiProcessingSince: timestamp("aiProcessingSince"),
    lastActivityAt: timestamp("lastActivityAt").defaultNow().notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt"),
  },
  (table) => [
    index("feedback_thread_customer_idx").on(table.customerId),
    index("feedback_thread_status_idx").on(table.status),
    index("feedback_thread_last_activity_idx").on(table.lastActivityAt),
  ],
);

export const feedbackThreadsRelations = relations(
  feedbackThreads,
  ({ many }) => ({
    messages: many(feedbackMessages),
    workItems: many(workItems),
    pipelineJobs: many(pipelineJobs),
  }),
);

// ─── Message ─────────────────────────────────────────────────────────────────

export const feedbackMessages = pgTable(
  "feedback_message",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    publicId: varchar("publicId", { length: 12 }).notNull().unique(),
    threadId: bigserial("threadId", { mode: "number" })
      .notNull()
      .references(() => feedbackThreads.id, { onDelete: "cascade" }),
    source: messageSourceEnum("source").notNull().default("api"),
    externalMessageId: varchar("externalMessageId", { length: 255 }),
    externalThreadId: varchar("externalThreadId", { length: 255 }),
    senderType: senderTypeEnum("senderType").notNull().default("user"),
    senderName: varchar("senderName", { length: 255 }),
    visibility: messageVisibilityEnum("visibility")
      .notNull()
      .default("public"),
    rawText: text("rawText").notNull(),
    metadataJson: jsonb("metadataJson"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => [
    index("feedback_message_thread_idx").on(table.threadId),
    index("feedback_message_external_thread_idx").on(table.externalThreadId),
    index("feedback_message_visibility_idx").on(table.visibility),
  ],
);

export const feedbackMessagesRelations = relations(
  feedbackMessages,
  ({ one }) => ({
    thread: one(feedbackThreads, {
      fields: [feedbackMessages.threadId],
      references: [feedbackThreads.id],
      relationName: "feedbackMessagesThread",
    }),
  }),
);

// ─── WorkItem ────────────────────────────────────────────────────────────────

export const workItems = pgTable(
  "work_item",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    publicId: varchar("publicId", { length: 12 }).notNull().unique(),
    threadId: bigserial("threadId", { mode: "number" })
      .notNull()
      .references(() => feedbackThreads.id, { onDelete: "cascade" }),
    type: workItemTypeEnum("type").notNull().default("Bug"),
    title: text("title").notNull(),
    structuredDescription: text("structuredDescription"),
    acceptanceCriteriaJson: jsonb("acceptanceCriteriaJson"),
    priority: workItemPriorityEnum("priority").notNull().default("P2"),
    severity: integer("severity").notNull().default(3),
    confidenceScore: doublePrecision("confidenceScore")
      .notNull()
      .default(0.5),
    riskLevel: workItemRiskLevelEnum("riskLevel").notNull().default("Medium"),
    status: workItemStatusEnum("status").notNull().default("Draft"),
    reason: text("reason"),
    ownerUserId: uuid("ownerUserId"),
    suggestedOwnerUserId: uuid("suggestedOwnerUserId"),
    assignedMemberId: bigint("assignedMemberId", { mode: "number" }),
    labelsJson: jsonb("labelsJson"),
    estimatedEffortJson: jsonb("estimatedEffortJson"),
    promptBundleJson: jsonb("promptBundleJson"),
    linksJson: jsonb("linksJson"),
    executionJson: jsonb("executionJson"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt"),
  },
  (table) => [
    index("work_item_thread_idx").on(table.threadId),
    index("work_item_status_idx").on(table.status),
    index("work_item_priority_idx").on(table.priority),
    index("work_item_assigned_member_idx").on(table.assignedMemberId),
  ],
);

export const workItemsRelations = relations(workItems, ({ one }) => ({
  thread: one(feedbackThreads, {
    fields: [workItems.threadId],
    references: [feedbackThreads.id],
    relationName: "workItemsThread",
  }),
}));

// ─── Pipeline Job (Durable Job Ledger) ───────────────────────────────────────

export const pipelineJobStatusEnum = pgEnum("pipeline_job_status", [
  "pending",
  "processing",
  "waiting_for_input",
  "completed",
  "failed",
  "canceled",
]);

export const pipelineJobs = pgTable(
  "pipeline_job",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    publicId: varchar("publicId", { length: 12 }).notNull().unique(),
    threadId: bigserial("threadId", { mode: "number" })
      .notNull()
      .references(() => feedbackThreads.id, { onDelete: "cascade" }),
    triggerMessageId: bigint("triggerMessageId", { mode: "number" })
      .references(() => feedbackMessages.id, { onDelete: "set null" }),
    status: pipelineJobStatusEnum("status").notNull().default("pending"),
    gatekeeperAction: varchar("gatekeeperAction", { length: 50 }),
    resultJson: jsonb("resultJson"),
    errorMessage: text("errorMessage"),
    attempts: integer("attempts").notNull().default(0),
    maxAttempts: integer("maxAttempts").notNull().default(3),
    claimedAt: timestamp("claimedAt"),
    completedAt: timestamp("completedAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt"),
  },
  (table) => [
    index("pipeline_job_thread_idx").on(table.threadId),
    index("pipeline_job_status_idx").on(table.status),
    index("pipeline_job_pending_idx").on(table.status, table.createdAt),
  ],
);

export const pipelineJobsRelations = relations(pipelineJobs, ({ one }) => ({
  thread: one(feedbackThreads, {
    fields: [pipelineJobs.threadId],
    references: [feedbackThreads.id],
    relationName: "pipelineJobsThread",
  }),
  triggerMessage: one(feedbackMessages, {
    fields: [pipelineJobs.triggerMessageId],
    references: [feedbackMessages.id],
    relationName: "pipelineJobsTriggerMessage",
  }),
}));

// ─── AuditLog ────────────────────────────────────────────────────────────────

export const auditLogs = pgTable(
  "audit_log",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    entityType: auditEntityTypeEnum("entityType").notNull(),
    entityId: bigserial("entityId", { mode: "number" }).notNull(),
    action: text("action").notNull(),
    detailsJson: jsonb("detailsJson"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => [
    index("audit_log_entity_idx").on(table.entityType, table.entityId),
  ],
);

// ─── TypeScript types for JSON fields ────────────────────────────────────────

export interface ThreadStateJson {
  summary: string;
  userGoal: string | null;
  intent: "Bug" | "Feature" | "Performance" | "Billing" | "Other";
  knownEnvironment: {
    device?: string;
    os?: string;
    browser?: string;
    appVersion?: string;
    hardware?: string;
    network?: string;
  };
  reproSteps: string[];
  expectedBehavior: string | null;
  actualBehavior: string | null;
  openQuestions: string[];
  resolvedQuestions: string[];
  signals: {
    sentiment?: string;
    urgency?: string;
    impactGuess?: string;
  };
  workItemCandidates: Array<{
    type: string;
    shortTitle: string;
    reason: string;
    confidence: number;
  }>;
  recommendation: {
    action:
      | "NoTicket"
      | "AskQuestions"
      | "CreateBugWorkItem"
      | "CreateFeatureWorkItem"
      | "SplitIntoTwo";
    reason: string;
    confidence: number;
  };
  duplicateHint: {
    possibleDuplicate: boolean;
    matchedWorkItemId: number | null;
    matchedTicketUrl: string | null;
  };
}

export interface EstimatedEffortJson {
  tShirt: "XS" | "S" | "M" | "L" | "XL";
  hoursMin: number;
  hoursMax: number;
  confidence: number;
}

export interface PromptBundleJson {
  cursorPrompt: string;
  agentSystemPrompt: string;
  agentTaskPrompt: string;
  suspectedFiles: string[];
  testsToRun: string[];
  commands: string[];
}

export interface LinksJson {
  githubRepo: string;
  githubIssueUrl: string | null;
  githubPrUrl: string | null;
  branch: string | null;
}

export interface ExecutionJson {
  agentMode: "none" | "cursor" | "cloud_agent";
  agentJobId: string | null;
  lastRunAt: string | null;
  runLogsUrl: string | null;
  artifactsJson: Record<string, unknown> | null;
}

export type WorkItemStatus =
  | "Draft"
  | "PendingApproval"
  | "Approved"
  | "Rejected"
  | "OnHold"
  | "InProgress"
  | "NeedsReview"
  | "Done"
  | "Failed"
  | "Canceled";

export type PipelineJobStatus =
  | "pending"
  | "processing"
  | "waiting_for_input"
  | "completed"
  | "failed"
  | "canceled";

export interface PipelineJobResultJson {
  gatekeeperAction: string;
  reason: string;
  workItemPublicId?: string;
  workItemId?: number;
  aiResponseText?: string;
  threadStatus?: string;
}
