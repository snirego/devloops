import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";

import type { dbClient } from "@kan/db/client";
import type { PipelineJobStatus } from "@kan/db/schema";
import { pipelineJobs } from "@kan/db/schema";
import { generateUID } from "@kan/shared/utils";

// ─── Create ──────────────────────────────────────────────────────────────────

export const create = async (
  db: dbClient,
  input: {
    threadId: number;
    triggerMessageId?: number | null;
  },
) => {
  const [job] = await db
    .insert(pipelineJobs)
    .values({
      publicId: generateUID(),
      threadId: input.threadId,
      triggerMessageId: input.triggerMessageId ?? null,
      status: "pending",
    })
    .returning();

  return job!;
};

// ─── Atomic Claim ────────────────────────────────────────────────────────────

/**
 * Atomically claim the next pending pipeline job.
 *
 * Uses SELECT ... FOR UPDATE SKIP LOCKED to prevent double-processing
 * across multiple workers or concurrent requests.
 *
 * Only claims jobs that haven't exceeded maxAttempts.
 */
export const claimNext = async (
  db: dbClient,
  limit = 1,
) => {
  const result = await db.execute(sql`
    UPDATE pipeline_job
    SET
      status = 'processing',
      attempts = attempts + 1,
      "claimedAt" = NOW(),
      "updatedAt" = NOW()
    WHERE id IN (
      SELECT id FROM pipeline_job
      WHERE status = 'pending'
        AND attempts < "maxAttempts"
      ORDER BY "createdAt" ASC
      LIMIT ${limit}
      FOR UPDATE SKIP LOCKED
    )
    RETURNING *
  `);

  return result.rows as Array<{
    id: number;
    publicId: string;
    threadId: number;
    triggerMessageId: number | null;
    status: PipelineJobStatus;
    gatekeeperAction: string | null;
    resultJson: unknown;
    errorMessage: string | null;
    attempts: number;
    maxAttempts: number;
    claimedAt: string | null;
    completedAt: string | null;
    createdAt: string;
    updatedAt: string | null;
  }>;
};

// ─── Status Updates ──────────────────────────────────────────────────────────

export const markProcessing = async (db: dbClient, id: number) => {
  const [updated] = await db
    .update(pipelineJobs)
    .set({
      status: "processing",
      claimedAt: new Date(),
      attempts: sql`attempts + 1`,
      updatedAt: new Date(),
    })
    .where(eq(pipelineJobs.id, id))
    .returning();
  return updated;
};

export const markWaitingForInput = async (
  db: dbClient,
  id: number,
  opts?: {
    gatekeeperAction?: string;
    resultJson?: Record<string, unknown>;
  },
) => {
  const [updated] = await db
    .update(pipelineJobs)
    .set({
      status: "waiting_for_input",
      gatekeeperAction: opts?.gatekeeperAction ?? null,
      resultJson: opts?.resultJson ?? null,
      updatedAt: new Date(),
    })
    .where(eq(pipelineJobs.id, id))
    .returning();
  return updated;
};

export const markCompleted = async (
  db: dbClient,
  id: number,
  opts?: {
    gatekeeperAction?: string;
    resultJson?: Record<string, unknown>;
  },
) => {
  const [updated] = await db
    .update(pipelineJobs)
    .set({
      status: "completed",
      gatekeeperAction: opts?.gatekeeperAction ?? null,
      resultJson: opts?.resultJson ?? null,
      completedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(pipelineJobs.id, id))
    .returning();
  return updated;
};

export const markFailed = async (
  db: dbClient,
  id: number,
  errorMessage: string,
) => {
  const [updated] = await db
    .update(pipelineJobs)
    .set({
      status: "failed",
      errorMessage,
      updatedAt: new Date(),
    })
    .where(eq(pipelineJobs.id, id))
    .returning();
  return updated;
};

export const markCanceled = async (db: dbClient, id: number) => {
  const [updated] = await db
    .update(pipelineJobs)
    .set({
      status: "canceled",
      updatedAt: new Date(),
    })
    .where(eq(pipelineJobs.id, id))
    .returning();
  return updated;
};

// ─── Queries ─────────────────────────────────────────────────────────────────

/** Check if there is already a pending or processing job for a thread (dedup). */
export const hasPendingForThread = async (
  db: dbClient,
  threadId: number,
): Promise<boolean> => {
  const existing = await db.query.pipelineJobs.findFirst({
    where: and(
      eq(pipelineJobs.threadId, threadId),
      inArray(pipelineJobs.status, ["pending", "processing"]),
    ),
    columns: { id: true },
  });
  return !!existing;
};

/** Get the latest pipeline job for a thread. */
export const getLatestByThreadId = async (
  db: dbClient,
  threadId: number,
) => {
  return db.query.pipelineJobs.findFirst({
    where: eq(pipelineJobs.threadId, threadId),
    orderBy: desc(pipelineJobs.createdAt),
  });
};

/** Get a pipeline job by publicId. */
export const getByPublicId = async (db: dbClient, publicId: string) => {
  return db.query.pipelineJobs.findFirst({
    where: eq(pipelineJobs.publicId, publicId),
  });
};

/** Get a pipeline job by id. */
export const getById = async (db: dbClient, id: number) => {
  return db.query.pipelineJobs.findFirst({
    where: eq(pipelineJobs.id, id),
  });
};

/** List pipeline jobs for a thread. */
export const listByThreadId = async (
  db: dbClient,
  threadId: number,
  opts?: { limit?: number },
) => {
  return db.query.pipelineJobs.findMany({
    where: eq(pipelineJobs.threadId, threadId),
    orderBy: desc(pipelineJobs.createdAt),
    limit: opts?.limit ?? 20,
  });
};

/** Count pending jobs (for monitoring). */
export const countPending = async (db: dbClient) => {
  const result = await db.execute(sql`
    SELECT COUNT(*) as count FROM pipeline_job WHERE status = 'pending'
  `);
  return Number((result.rows[0] as { count: string })?.count ?? 0);
};

/**
 * Cancel any pending/processing jobs for a thread that are older than
 * the given job id. Used when a new message arrives to supersede stale jobs.
 */
export const cancelStaleForThread = async (
  db: dbClient,
  threadId: number,
  newerThanJobId: number,
) => {
  await db
    .update(pipelineJobs)
    .set({
      status: "canceled",
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(pipelineJobs.threadId, threadId),
        inArray(pipelineJobs.status, ["pending"]),
        sql`${pipelineJobs.id} < ${newerThanJobId}`,
      ),
    );
};
