-- Add AI processing tracking column to feedback_thread
ALTER TABLE "feedback_thread" ADD COLUMN IF NOT EXISTS "aiProcessingSince" timestamp;
