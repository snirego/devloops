CREATE TYPE "public"."audit_entity_type" AS ENUM('Thread', 'Message', 'WorkItem');--> statement-breakpoint
CREATE TYPE "public"."feedback_message_source" AS ENUM('widget', 'email', 'whatsapp', 'slack', 'api');--> statement-breakpoint
CREATE TYPE "public"."feedback_sender_type" AS ENUM('user', 'internal');--> statement-breakpoint
CREATE TYPE "public"."feedback_thread_status" AS ENUM('Open', 'WaitingOnUser', 'Resolved', 'Closed');--> statement-breakpoint
CREATE TYPE "public"."work_item_priority" AS ENUM('P0', 'P1', 'P2', 'P3');--> statement-breakpoint
CREATE TYPE "public"."work_item_risk_level" AS ENUM('Low', 'Medium', 'High');--> statement-breakpoint
CREATE TYPE "public"."work_item_status" AS ENUM('Draft', 'PendingApproval', 'Approved', 'Rejected', 'OnHold', 'InProgress', 'NeedsReview', 'Done', 'Failed', 'Canceled');--> statement-breakpoint
CREATE TYPE "public"."work_item_type" AS ENUM('Bug', 'Feature', 'Chore', 'Docs');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "audit_log" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"entityType" "audit_entity_type" NOT NULL,
	"entityId" bigserial NOT NULL,
	"action" text NOT NULL,
	"detailsJson" jsonb,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "feedback_message" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"publicId" varchar(12) NOT NULL,
	"threadId" bigserial NOT NULL,
	"source" "feedback_message_source" DEFAULT 'api' NOT NULL,
	"externalMessageId" varchar(255),
	"externalThreadId" varchar(255),
	"senderType" "feedback_sender_type" DEFAULT 'user' NOT NULL,
	"rawText" text NOT NULL,
	"metadataJson" jsonb,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "feedback_message_publicId_unique" UNIQUE("publicId")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "feedback_thread" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"publicId" varchar(12) NOT NULL,
	"primarySource" varchar(50),
	"customerId" varchar(255),
	"status" "feedback_thread_status" DEFAULT 'Open' NOT NULL,
	"threadStateJson" jsonb,
	"lastActivityAt" timestamp DEFAULT now() NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp,
	CONSTRAINT "feedback_thread_publicId_unique" UNIQUE("publicId")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "work_item" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"publicId" varchar(12) NOT NULL,
	"threadId" bigserial NOT NULL,
	"type" "work_item_type" DEFAULT 'Bug' NOT NULL,
	"title" text NOT NULL,
	"structuredDescription" text,
	"acceptanceCriteriaJson" jsonb,
	"priority" "work_item_priority" DEFAULT 'P2' NOT NULL,
	"severity" integer DEFAULT 3 NOT NULL,
	"confidenceScore" double precision DEFAULT 0.5 NOT NULL,
	"riskLevel" "work_item_risk_level" DEFAULT 'Medium' NOT NULL,
	"status" "work_item_status" DEFAULT 'Draft' NOT NULL,
	"reason" text,
	"ownerUserId" uuid,
	"suggestedOwnerUserId" uuid,
	"labelsJson" jsonb,
	"estimatedEffortJson" jsonb,
	"promptBundleJson" jsonb,
	"linksJson" jsonb,
	"executionJson" jsonb,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp,
	CONSTRAINT "work_item_publicId_unique" UNIQUE("publicId")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "feedback_message" ADD CONSTRAINT "feedback_message_threadId_feedback_thread_id_fk" FOREIGN KEY ("threadId") REFERENCES "public"."feedback_thread"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "work_item" ADD CONSTRAINT "work_item_threadId_feedback_thread_id_fk" FOREIGN KEY ("threadId") REFERENCES "public"."feedback_thread"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "work_item" ADD CONSTRAINT "work_item_ownerUserId_user_id_fk" FOREIGN KEY ("ownerUserId") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "work_item" ADD CONSTRAINT "work_item_suggestedOwnerUserId_user_id_fk" FOREIGN KEY ("suggestedOwnerUserId") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "audit_log_entity_idx" ON "audit_log" USING btree ("entityType","entityId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "feedback_message_thread_idx" ON "feedback_message" USING btree ("threadId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "feedback_message_external_thread_idx" ON "feedback_message" USING btree ("externalThreadId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "feedback_thread_customer_idx" ON "feedback_thread" USING btree ("customerId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "feedback_thread_status_idx" ON "feedback_thread" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "feedback_thread_last_activity_idx" ON "feedback_thread" USING btree ("lastActivityAt");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "work_item_thread_idx" ON "work_item" USING btree ("threadId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "work_item_status_idx" ON "work_item" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "work_item_priority_idx" ON "work_item" USING btree ("priority");