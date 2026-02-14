CREATE TYPE "public"."feedback_message_visibility" AS ENUM('public', 'internal');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "chat_session" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"publicId" varchar(12) NOT NULL,
	"threadId" bigserial NOT NULL,
	"visitorName" varchar(255),
	"visitorEmail" varchar(255),
	"metadataJson" jsonb,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"lastSeenAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "chat_session_publicId_unique" UNIQUE("publicId")
);
--> statement-breakpoint
ALTER TABLE "feedback_message" ADD COLUMN "senderName" varchar(255);--> statement-breakpoint
ALTER TABLE "feedback_message" ADD COLUMN "visibility" "feedback_message_visibility" DEFAULT 'public' NOT NULL;--> statement-breakpoint
ALTER TABLE "feedback_thread" ADD COLUMN "title" varchar(500);--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "chat_session" ADD CONSTRAINT "chat_session_threadId_feedback_thread_id_fk" FOREIGN KEY ("threadId") REFERENCES "public"."feedback_thread"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "chat_session_thread_idx" ON "chat_session" USING btree ("threadId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "chat_session_public_idx" ON "chat_session" USING btree ("publicId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "feedback_message_visibility_idx" ON "feedback_message" USING btree ("visibility");