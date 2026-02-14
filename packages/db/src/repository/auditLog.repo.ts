import { and, desc, eq } from "drizzle-orm";

import type { dbClient } from "@kan/db/client";
import { auditLogs } from "@kan/db/schema";

export const create = async (
  db: dbClient,
  input: {
    entityType: "Thread" | "Message" | "WorkItem";
    entityId: number;
    action: string;
    detailsJson?: Record<string, unknown>;
  },
) => {
  const [log] = await db
    .insert(auditLogs)
    .values({
      entityType: input.entityType,
      entityId: input.entityId,
      action: input.action,
      detailsJson: input.detailsJson ?? null,
    })
    .returning();

  return log!;
};

export const getByEntity = async (
  db: dbClient,
  entityType: "Thread" | "Message" | "WorkItem",
  entityId: number,
) => {
  return db.query.auditLogs.findMany({
    where: and(
      eq(auditLogs.entityType, entityType),
      eq(auditLogs.entityId, entityId),
    ),
    orderBy: desc(auditLogs.createdAt),
  });
};
