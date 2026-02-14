-- Add version column to feedback_thread for optimistic concurrency control.
-- Auto-incremented on every update to support ETag-style conditional fetching.
--
-- IMPORTANT: After running this migration, also uncomment the `version` column
-- in packages/db/src/schema/feedbackThreads.ts and the version increment logic
-- in packages/db/src/repository/feedbackThread.repo.ts (updateTitle, updateThreadState, updateStatus).
ALTER TABLE "feedback_thread" ADD COLUMN IF NOT EXISTS "version" integer NOT NULL DEFAULT 1;
