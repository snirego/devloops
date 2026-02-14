-- Add pipeline_job table for durable smart pipeline processing.
-- This table serves as a job ledger: every user message creates a row,
-- and the devloops-llm service polls and processes pending jobs.
-- Survives page reloads, server restarts, and deploys.

CREATE TYPE "public"."pipeline_job_status" AS ENUM('pending', 'processing', 'waiting_for_input', 'completed', 'failed', 'canceled');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "pipeline_job" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"publicId" varchar(12) NOT NULL,
	"threadId" bigserial NOT NULL,
	"triggerMessageId" bigint,
	"status" "pipeline_job_status" DEFAULT 'pending' NOT NULL,
	"gatekeeperAction" varchar(50),
	"resultJson" jsonb,
	"errorMessage" text,
	"attempts" integer DEFAULT 0 NOT NULL,
	"maxAttempts" integer DEFAULT 3 NOT NULL,
	"claimedAt" timestamp,
	"completedAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp,
	CONSTRAINT "pipeline_job_publicId_unique" UNIQUE("publicId")
);--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "pipeline_job" ADD CONSTRAINT "pipeline_job_threadId_feedback_thread_id_fk" FOREIGN KEY ("threadId") REFERENCES "public"."feedback_thread"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "pipeline_job" ADD CONSTRAINT "pipeline_job_triggerMessageId_feedback_message_id_fk" FOREIGN KEY ("triggerMessageId") REFERENCES "public"."feedback_message"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "pipeline_job_thread_idx" ON "pipeline_job" USING btree ("threadId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "pipeline_job_status_idx" ON "pipeline_job" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "pipeline_job_pending_idx" ON "pipeline_job" USING btree ("status","createdAt");--> statement-breakpoint

-- Enable Supabase Realtime on pipeline_job so frontend can react to status changes
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'pipeline_job'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.pipeline_job;
  END IF;
END $$;
