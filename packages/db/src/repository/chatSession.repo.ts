import { eq } from "drizzle-orm";

import type { dbClient } from "@kan/db/client";
import { chatSessions } from "@kan/db/schema";
import { generateUID } from "@kan/shared/utils";

export const create = async (
  db: dbClient,
  input: {
    threadId: number;
    visitorName?: string;
    visitorEmail?: string;
    metadataJson?: Record<string, unknown>;
  },
) => {
  const [session] = await db
    .insert(chatSessions)
    .values({
      publicId: generateUID(),
      threadId: input.threadId,
      visitorName: input.visitorName ?? null,
      visitorEmail: input.visitorEmail ?? null,
      metadataJson: input.metadataJson ?? null,
      lastSeenAt: new Date(),
    })
    .returning();

  return session!;
};

export const getByPublicId = async (db: dbClient, publicId: string) => {
  return db.query.chatSessions.findFirst({
    where: eq(chatSessions.publicId, publicId),
    with: { thread: true },
  });
};

export const getById = async (db: dbClient, id: number) => {
  return db.query.chatSessions.findFirst({
    where: eq(chatSessions.id, id),
  });
};

export const getByThreadId = async (db: dbClient, threadId: number) => {
  return db.query.chatSessions.findFirst({
    where: eq(chatSessions.threadId, threadId),
  });
};

export const updateLastSeen = async (db: dbClient, id: number) => {
  const [updated] = await db
    .update(chatSessions)
    .set({ lastSeenAt: new Date() })
    .where(eq(chatSessions.id, id))
    .returning();
  return updated;
};

export const updateVisitorInfo = async (
  db: dbClient,
  id: number,
  input: { visitorName?: string; visitorEmail?: string },
) => {
  const updates: Record<string, unknown> = { lastSeenAt: new Date() };
  if (input.visitorName !== undefined) updates.visitorName = input.visitorName;
  if (input.visitorEmail !== undefined)
    updates.visitorEmail = input.visitorEmail;

  const [updated] = await db
    .update(chatSessions)
    .set(updates)
    .where(eq(chatSessions.id, id))
    .returning();
  return updated;
};
