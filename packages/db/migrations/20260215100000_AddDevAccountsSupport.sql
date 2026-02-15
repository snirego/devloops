-- Add isDevAccount column to user table
ALTER TABLE "user" ADD COLUMN "isDevAccount" boolean NOT NULL DEFAULT false;--> statement-breakpoint

-- Mark the two specified users as dev accounts
UPDATE "user" SET "isDevAccount" = true WHERE "id" IN (
  '74836831-dfcd-44e3-afcb-db0d21f55eb9',
  '592b7163-0e5b-4a2a-a1fe-40eb7e69b337'
);--> statement-breakpoint

-- Create a "pro" subscription for the first user's workspaces
INSERT INTO "subscription" ("plan", "referenceId", "stripeCustomerId", "stripeSubscriptionId", "status", "periodStart", "periodEnd", "cancelAtPeriodEnd", "seats", "unlimitedSeats", "createdAt", "updatedAt")
SELECT 'pro', w."publicId", 'dev_account', 'dev_sub_pro', 'active', NOW(), NOW() + INTERVAL '100 years', false, 999, true, NOW(), NOW()
FROM "workspace" w
WHERE w."createdBy" = '74836831-dfcd-44e3-afcb-db0d21f55eb9'
  AND NOT EXISTS (
    SELECT 1 FROM "subscription" s WHERE s."referenceId" = w."publicId" AND s."status" = 'active'
  );--> statement-breakpoint

-- Update workspace plan to 'pro' for the first user's workspaces
UPDATE "workspace" SET "plan" = 'pro'
WHERE "createdBy" = '74836831-dfcd-44e3-afcb-db0d21f55eb9';--> statement-breakpoint

-- Create a "free" (no active subscription) status for the second user's workspaces
-- Free plan doesn't need a subscription row - just ensure workspace plan is 'free'
UPDATE "workspace" SET "plan" = 'free'
WHERE "createdBy" = '592b7163-0e5b-4a2a-a1fe-40eb7e69b337';
