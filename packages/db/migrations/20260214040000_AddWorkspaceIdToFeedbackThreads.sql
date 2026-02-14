-- Add workspaceId column to feedback_thread for workspace-level data isolation
ALTER TABLE "feedback_thread" ADD COLUMN IF NOT EXISTS "workspaceId" bigint REFERENCES "workspace"("id") ON DELETE CASCADE;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "feedback_thread_workspace_idx" ON "feedback_thread" ("workspaceId");
--> statement-breakpoint

-- Backfill: assign all existing threads to the first workspace (if any exist)
-- This is a best-effort migration — in a fresh install there may be no workspaces yet.
UPDATE "feedback_thread"
SET "workspaceId" = (SELECT "id" FROM "workspace" WHERE "deletedAt" IS NULL ORDER BY "id" LIMIT 1)
WHERE "workspaceId" IS NULL
  AND EXISTS (SELECT 1 FROM "workspace" WHERE "deletedAt" IS NULL);
