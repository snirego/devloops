-- Add assignedMemberId column to work_item table
ALTER TABLE "work_item" ADD COLUMN "assignedMemberId" bigint;--> statement-breakpoint

-- Add foreign key constraint
ALTER TABLE "work_item" ADD CONSTRAINT "work_item_assignedMemberId_workspace_members_id_fk" FOREIGN KEY ("assignedMemberId") REFERENCES "public"."workspace_members"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint

-- Add index for faster lookups
CREATE INDEX "work_item_assigned_member_idx" ON "work_item" ("assignedMemberId");
