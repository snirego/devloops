import { and, asc, desc, eq, gte } from "drizzle-orm";

import type { dbClient } from "@kan/db/client";
import type { MessageVisibility } from "@kan/db/schema";
import { feedbackMessages } from "@kan/db/schema";
import { generateUID } from "@kan/shared/utils";

export const create = async (
  db: dbClient,
  input: {
    threadId: number;
    source: "widget" | "email" | "whatsapp" | "slack" | "api";
    externalMessageId?: string;
    externalThreadId?: string;
    senderType: "user" | "internal";
    senderName?: string;
    visibility?: MessageVisibility;
    rawText: string;
    metadataJson?: Record<string, unknown>;
    publicId?: string;
  },
) => {
  const [message] = await db
    .insert(feedbackMessages)
    .values({
      publicId: input.publicId ?? generateUID(),
      threadId: input.threadId,
      source: input.source,
      externalMessageId: input.externalMessageId ?? null,
      externalThreadId: input.externalThreadId ?? null,
      senderType: input.senderType,
      senderName: input.senderName ?? null,
      visibility: input.visibility ?? "public",
      rawText: input.rawText,
      metadataJson: input.metadataJson ?? null,
    })
    .returning();

  return message!;
};

/** Get all messages for a thread (dashboard - includes internal notes) */
export const getByThreadId = async (db: dbClient, threadId: number) => {
  return db.query.feedbackMessages.findMany({
    where: eq(feedbackMessages.threadId, threadId),
    orderBy: asc(feedbackMessages.createdAt),
  });
};

/** Get only public messages for a thread (external-facing endpoints) */
export const getByThreadIdPublic = async (db: dbClient, threadId: number) => {
  return db.query.feedbackMessages.findMany({
    where: and(
      eq(feedbackMessages.threadId, threadId),
      eq(feedbackMessages.visibility, "public"),
    ),
    orderBy: asc(feedbackMessages.createdAt),
  });
};

/** Get the most recent message for a thread (for previews) */
export const getLastByThreadId = async (db: dbClient, threadId: number) => {
  return db.query.feedbackMessages.findFirst({
    where: eq(feedbackMessages.threadId, threadId),
    orderBy: desc(feedbackMessages.createdAt),
  });
};

export const getById = async (db: dbClient, id: number) => {
  return db.query.feedbackMessages.findFirst({
    where: eq(feedbackMessages.id, id),
  });
};

export const getByPublicId = async (db: dbClient, publicId: string) => {
  return db.query.feedbackMessages.findFirst({
    where: eq(feedbackMessages.publicId, publicId),
  });
};

/** Get messages for a thread created after a given timestamp (incremental sync) */
export const getByThreadIdSince = async (
  db: dbClient,
  threadId: number,
  since: Date,
) => {
  return db.query.feedbackMessages.findMany({
    where: and(
      eq(feedbackMessages.threadId, threadId),
      gte(feedbackMessages.createdAt, since),
    ),
    orderBy: asc(feedbackMessages.createdAt),
  });
};

/** Update the text of a message */
export const updateText = async (
  db: dbClient,
  id: number,
  rawText: string,
) => {
  const [updated] = await db
    .update(feedbackMessages)
    .set({ rawText })
    .where(eq(feedbackMessages.id, id))
    .returning();
  return updated;
};

/** Delete a single message */
export const deleteById = async (db: dbClient, id: number) => {
  const [deleted] = await db
    .delete(feedbackMessages)
    .where(eq(feedbackMessages.id, id))
    .returning();
  return deleted;
};
