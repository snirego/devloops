import { and, desc, eq, inArray, sql } from "drizzle-orm";

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

/**
 * List recent audit logs, optionally filtered by entity type and/or actions.
 * Returns newest first. Used by the Logs panel in the Work Items view.
 */
export const listRecent = async (
  db: dbClient,
  opts?: {
    entityTypes?: Array<"Thread" | "Message" | "WorkItem">;
    actions?: string[];
    limit?: number;
    offset?: number;
  },
) => {
  const conditions = [];

  if (opts?.entityTypes && opts.entityTypes.length > 0) {
    conditions.push(inArray(auditLogs.entityType, opts.entityTypes));
  }

  if (opts?.actions && opts.actions.length > 0) {
    conditions.push(inArray(auditLogs.action, opts.actions));
  }

  return db.query.auditLogs.findMany({
    where: conditions.length > 0 ? and(...conditions) : undefined,
    orderBy: desc(auditLogs.createdAt),
    limit: opts?.limit ?? 100,
    offset: opts?.offset ?? 0,
  });
};

/**
 * Count audit logs by action (for summary stats).
 */
export const countByAction = async (db: dbClient) => {
  const result = await db.execute(sql`
    SELECT action, COUNT(*) as count
    FROM audit_log
    GROUP BY action
    ORDER BY count DESC
  `);
  return result.rows as Array<{ action: string; count: string }>;
};
