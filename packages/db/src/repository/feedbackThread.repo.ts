import { and, desc, eq, gte, inArray, isNotNull } from "drizzle-orm";

import type { dbClient } from "@kan/db/client";
import type { ThreadStateJson } from "@kan/db/schema";
import { feedbackMessages, feedbackThreads } from "@kan/db/schema";
import { generateUID } from "@kan/shared/utils";

export const create = async (
  db: dbClient,
  input: {
    primarySource?: string;
    customerId?: string;
    title?: string;
  },
) => {
  const [thread] = await db
    .insert(feedbackThreads)
    .values({
      publicId: generateUID(),
      title: input.title ?? null,
      primarySource: input.primarySource ?? null,
      customerId: input.customerId ?? null,
      status: "Open",
      lastActivityAt: new Date(),
    })
    .returning();

  return thread!;
};

export const updateTitle = async (
  db: dbClient,
  id: number,
  title: string,
) => {
  const [updated] = await db
    .update(feedbackThreads)
    .set({ title, updatedAt: new Date() })
    .where(eq(feedbackThreads.id, id))
    .returning();
  return updated;
};

export const getById = async (db: dbClient, id: number) => {
  return db.query.feedbackThreads.findFirst({
    where: eq(feedbackThreads.id, id),
  });
};

export const getByPublicId = async (db: dbClient, publicId: string) => {
  return db.query.feedbackThreads.findFirst({
    where: eq(feedbackThreads.publicId, publicId),
  });
};

export const getByPublicIdWithMessages = async (
  db: dbClient,
  publicId: string,
) => {
  return db.query.feedbackThreads.findFirst({
    where: eq(feedbackThreads.publicId, publicId),
    with: {
      messages: {
        orderBy: feedbackMessages.createdAt,
      },
      workItems: true,
    },
  });
};

/**
 * Find an existing open thread for the same customer within 24h,
 * or by external thread ID mapping.
 */
export const findExistingThread = async (
  db: dbClient,
  input: {
    customerId?: string;
    externalThreadId?: string;
  },
) => {
  // Strategy 1: external thread ID match
  if (input.externalThreadId) {
    const msg = await db.query.feedbackMessages.findFirst({
      where: eq(feedbackMessages.externalThreadId, input.externalThreadId),
      with: { thread: true },
    });
    if (msg?.thread) return msg.thread;
  }

  // Strategy 2: same customer, open thread, activity within 24h
  if (input.customerId) {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    return db.query.feedbackThreads.findFirst({
      where: and(
        eq(feedbackThreads.customerId, input.customerId),
        inArray(feedbackThreads.status, ["Open", "WaitingOnUser"]),
        gte(feedbackThreads.lastActivityAt, twentyFourHoursAgo),
      ),
      orderBy: desc(feedbackThreads.lastActivityAt),
    });
  }

  return undefined;
};

export const updateThreadState = async (
  db: dbClient,
  id: number,
  threadState: ThreadStateJson,
  status?: "Open" | "WaitingOnUser" | "Resolved" | "Closed",
) => {
  const updates: Record<string, unknown> = {
    threadStateJson: threadState,
    updatedAt: new Date(),
    lastActivityAt: new Date(),
  };
  if (status) updates.status = status;

  const [updated] = await db
    .update(feedbackThreads)
    .set(updates)
    .where(eq(feedbackThreads.id, id))
    .returning();

  return updated;
};

export const updateStatus = async (
  db: dbClient,
  id: number,
  status: "Open" | "WaitingOnUser" | "Resolved" | "Closed",
) => {
  const [updated] = await db
    .update(feedbackThreads)
    .set({ status, updatedAt: new Date() })
    .where(eq(feedbackThreads.id, id))
    .returning();

  return updated;
};

export const listAll = async (
  db: dbClient,
  opts?: { status?: string; limit?: number; offset?: number },
) => {
  const limit = opts?.limit ?? 50;
  const offset = opts?.offset ?? 0;

  const conditions = [];
  if (opts?.status) {
    conditions.push(
      eq(
        feedbackThreads.status,
        opts.status as "Open" | "WaitingOnUser" | "Resolved" | "Closed",
      ),
    );
  }

  return db.query.feedbackThreads.findMany({
    where: conditions.length > 0 ? and(...conditions) : undefined,
    orderBy: desc(feedbackThreads.lastActivityAt),
    limit,
    offset,
    with: {
      messages: {
        orderBy: desc(feedbackMessages.createdAt),
        limit: 1,
      },
      workItems: true,
    },
  });
};

/** List threads where AI is currently processing */
export const listAiProcessing = async (db: dbClient) => {
  return db.query.feedbackThreads.findMany({
    where: isNotNull(feedbackThreads.aiProcessingSince),
    columns: {
      id: true,
      publicId: true,
      title: true,
      aiProcessingSince: true,
    },
  });
};

/** Mark a thread as AI-processing (set timestamp) */
export const setAiProcessing = async (db: dbClient, id: number) => {
  const [updated] = await db
    .update(feedbackThreads)
    .set({ aiProcessingSince: new Date() })
    .where(eq(feedbackThreads.id, id))
    .returning();
  return updated;
};

/** Clear the AI-processing flag (set to null) */
export const clearAiProcessing = async (db: dbClient, id: number) => {
  const [updated] = await db
    .update(feedbackThreads)
    .set({ aiProcessingSince: null })
    .where(eq(feedbackThreads.id, id))
    .returning();
  return updated;
};

/** Delete a thread and all its messages/sessions/workItems (cascade) */
export const deleteById = async (db: dbClient, id: number) => {
  const [deleted] = await db
    .delete(feedbackThreads)
    .where(eq(feedbackThreads.id, id))
    .returning();
  return deleted;
};

/** List threads with preview message (for chat thread list) */
export const listForChat = async (
  db: dbClient,
  opts?: { limit?: number; offset?: number },
) => {
  const limit = opts?.limit ?? 50;
  const offset = opts?.offset ?? 0;

  return db.query.feedbackThreads.findMany({
    where: inArray(feedbackThreads.status, ["Open", "WaitingOnUser"]),
    orderBy: desc(feedbackThreads.lastActivityAt),
    limit,
    offset,
    with: {
      messages: {
        orderBy: desc(feedbackMessages.createdAt),
        limit: 1,
      },
    },
  });
};
