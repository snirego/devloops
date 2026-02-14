/**
 * DEV-ONLY seed script
 *
 * Inserts dummy feedback threads, work items (with variety of statuses,
 * types, priorities, risk levels, and assignments) and sets developer
 * metadata on existing workspace members so the Gantt / Table / Kanban
 * views have realistic data to display.
 *
 * Usage:
 *   pnpm with-env tsx src/seed-dev.ts
 *
 * The script:
 *  1. Finds the first workspace
 *  2. Fetches active members and gives them developerMeta
 *  3. Creates ~15 feedback threads + work items in various states
 *  4. Assigns some work items to members
 */

import { eq, and, isNull } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { customAlphabet } from "nanoid";

import * as schema from "./schema";

// ── nanoid (same config as generateUID) ────────────────────────────────────
const nanoid = customAlphabet("0123456789abcdefghijklmnopqrstuvwxyz", 12);
const uid = () => nanoid();

// ── Connect ────────────────────────────────────────────────────────────────
const connectionString = process.env.POSTGRES_URL;
if (!connectionString) {
  console.error("❌  POSTGRES_URL is not set. Run via: pnpm with-env tsx src/seed-dev.ts");
  process.exit(1);
}

const pool = new Pool({ connectionString, max: 3 });
const db = drizzle(pool, { schema });

// ── Dummy work item definitions ────────────────────────────────────────────
const WORK_ITEMS: Array<{
  title: string;
  description: string;
  type: "Bug" | "Feature" | "Chore" | "Docs";
  priority: "P0" | "P1" | "P2" | "P3";
  severity: number;
  confidence: number;
  risk: "Low" | "Medium" | "High";
  status: "Draft" | "PendingApproval" | "Approved" | "InProgress" | "NeedsReview" | "Done" | "OnHold" | "Rejected";
  effort: { tShirt: string; hours: number; complexity: string };
  labels: string[];
  threadTitle: string;
  threadSource: string;
}> = [
  {
    title: "Login page crashes on Safari 17",
    description: "Users on Safari 17 see a white screen after entering credentials. The error is caused by an unsupported CSS property.",
    type: "Bug",
    priority: "P0",
    severity: 5,
    confidence: 0.95,
    risk: "High",
    status: "InProgress",
    effort: { tShirt: "M", hours: 8, complexity: "medium" },
    labels: ["frontend", "safari", "auth"],
    threadTitle: "Safari login broken",
    threadSource: "widget",
  },
  {
    title: "Add dark mode toggle to settings",
    description: "Users want a dark mode toggle in the settings panel. Should respect OS preference as default.",
    type: "Feature",
    priority: "P1",
    severity: 3,
    confidence: 0.88,
    risk: "Low",
    status: "Approved",
    effort: { tShirt: "L", hours: 16, complexity: "medium" },
    labels: ["frontend", "settings", "design"],
    threadTitle: "Dark mode request",
    threadSource: "email",
  },
  {
    title: "Upgrade PostgreSQL driver to v9",
    description: "The current pg driver v8 has known memory leak issues under high concurrency. Upgrade to v9.",
    type: "Chore",
    priority: "P2",
    severity: 2,
    confidence: 0.75,
    risk: "Medium",
    status: "PendingApproval",
    effort: { tShirt: "S", hours: 4, complexity: "low" },
    labels: ["backend", "database", "infrastructure"],
    threadTitle: "pg driver memory leak",
    threadSource: "api",
  },
  {
    title: "Write onboarding guide for new developers",
    description: "Create a step-by-step onboarding document covering local setup, architecture overview, and coding conventions.",
    type: "Docs",
    priority: "P3",
    severity: 1,
    confidence: 0.65,
    risk: "Low",
    status: "Draft",
    effort: { tShirt: "M", hours: 6, complexity: "low" },
    labels: ["documentation", "onboarding"],
    threadTitle: "Dev onboarding docs needed",
    threadSource: "api",
  },
  {
    title: "Email notifications not sent for overdue tasks",
    description: "The cron job for overdue task emails silently fails when the SMTP config has empty auth fields.",
    type: "Bug",
    priority: "P1",
    severity: 4,
    confidence: 0.92,
    risk: "High",
    status: "NeedsReview",
    effort: { tShirt: "S", hours: 3, complexity: "low" },
    labels: ["backend", "notifications", "email"],
    threadTitle: "Missing overdue emails",
    threadSource: "widget",
  },
  {
    title: "Implement CSV export for board cards",
    description: "Users need to export their board cards to CSV for reporting purposes. Include all visible columns.",
    type: "Feature",
    priority: "P2",
    severity: 2,
    confidence: 0.80,
    risk: "Low",
    status: "Approved",
    effort: { tShirt: "M", hours: 10, complexity: "medium" },
    labels: ["frontend", "backend", "export"],
    threadTitle: "CSV export feature request",
    threadSource: "email",
  },
  {
    title: "Fix memory leak in WebSocket connection pool",
    description: "WebSocket connections are not being properly cleaned up on client disconnect, causing memory to grow over time.",
    type: "Bug",
    priority: "P0",
    severity: 5,
    confidence: 0.97,
    risk: "High",
    status: "Done",
    effort: { tShirt: "L", hours: 12, complexity: "high" },
    labels: ["backend", "websocket", "performance"],
    threadTitle: "Server memory growing",
    threadSource: "api",
  },
  {
    title: "Add keyboard shortcuts for card navigation",
    description: "Power users want j/k navigation between cards, Enter to open, Escape to close, and ? for shortcut help.",
    type: "Feature",
    priority: "P3",
    severity: 1,
    confidence: 0.70,
    risk: "Low",
    status: "OnHold",
    effort: { tShirt: "M", hours: 8, complexity: "medium" },
    labels: ["frontend", "ux", "accessibility"],
    threadTitle: "Keyboard shortcuts request",
    threadSource: "widget",
  },
  {
    title: "Migrate CI pipeline from Jenkins to GitHub Actions",
    description: "Replace the aging Jenkins setup with GitHub Actions workflows for build, test, and deploy.",
    type: "Chore",
    priority: "P2",
    severity: 2,
    confidence: 0.85,
    risk: "Medium",
    status: "InProgress",
    effort: { tShirt: "XL", hours: 24, complexity: "high" },
    labels: ["devops", "ci-cd", "infrastructure"],
    threadTitle: "CI migration plan",
    threadSource: "api",
  },
  {
    title: "Dashboard widgets show stale data after timezone change",
    description: "When a user changes timezone in settings, the dashboard widgets still show data in the old timezone until page refresh.",
    type: "Bug",
    priority: "P2",
    severity: 3,
    confidence: 0.82,
    risk: "Medium",
    status: "PendingApproval",
    effort: { tShirt: "S", hours: 4, complexity: "medium" },
    labels: ["frontend", "dashboard", "timezone"],
    threadTitle: "Timezone bug on dashboard",
    threadSource: "widget",
  },
  {
    title: "Implement role-based access for API keys",
    description: "API keys should have scoped permissions (read-only, write, admin) instead of full access.",
    type: "Feature",
    priority: "P1",
    severity: 4,
    confidence: 0.90,
    risk: "High",
    status: "InProgress",
    effort: { tShirt: "XL", hours: 20, complexity: "high" },
    labels: ["backend", "security", "api"],
    threadTitle: "API key permissions",
    threadSource: "email",
  },
  {
    title: "Clean up unused npm dependencies",
    description: "Audit and remove unused dependencies to reduce bundle size and improve install time.",
    type: "Chore",
    priority: "P3",
    severity: 1,
    confidence: 0.60,
    risk: "Low",
    status: "Rejected",
    effort: { tShirt: "S", hours: 2, complexity: "low" },
    labels: ["tooling", "performance"],
    threadTitle: "Bundle size too large",
    threadSource: "api",
  },
  {
    title: "Search results page shows 500 error for long queries",
    description: "Queries longer than 200 characters cause the search endpoint to return a 500 error due to missing input validation.",
    type: "Bug",
    priority: "P1",
    severity: 4,
    confidence: 0.93,
    risk: "Medium",
    status: "Approved",
    effort: { tShirt: "S", hours: 2, complexity: "low" },
    labels: ["backend", "search", "validation"],
    threadTitle: "Search 500 error",
    threadSource: "widget",
  },
  {
    title: "Add Slack integration for thread notifications",
    description: "When a new feedback thread is created or a work item status changes, post a notification to a configured Slack channel.",
    type: "Feature",
    priority: "P2",
    severity: 2,
    confidence: 0.78,
    risk: "Medium",
    status: "Draft",
    effort: { tShirt: "L", hours: 16, complexity: "high" },
    labels: ["backend", "integration", "slack"],
    threadTitle: "Slack notifications",
    threadSource: "email",
  },
  {
    title: "Update API documentation for v2 endpoints",
    description: "The v2 API endpoints are live but the documentation still references v1. Update OpenAPI spec and developer portal.",
    type: "Docs",
    priority: "P2",
    severity: 2,
    confidence: 0.72,
    risk: "Low",
    status: "NeedsReview",
    effort: { tShirt: "M", hours: 8, complexity: "medium" },
    labels: ["documentation", "api"],
    threadTitle: "Outdated API docs",
    threadSource: "api",
  },
];

// ── Developer meta templates ───────────────────────────────────────────────
const DEV_METAS: Array<{
  skills: string[];
  maxConcurrentItems: number;
  role: "developer" | "tester" | "lead" | "designer";
  timezone: string;
}> = [
  {
    skills: ["frontend", "react", "css", "design", "ux", "accessibility"],
    maxConcurrentItems: 4,
    role: "developer",
    timezone: "Asia/Jerusalem",
  },
  {
    skills: ["backend", "api", "database", "security", "infrastructure"],
    maxConcurrentItems: 3,
    role: "developer",
    timezone: "America/New_York",
  },
  {
    skills: ["frontend", "backend", "debugging", "testing", "search"],
    maxConcurrentItems: 5,
    role: "lead",
    timezone: "Europe/London",
  },
  {
    skills: ["testing", "debugging", "documentation", "email", "notifications"],
    maxConcurrentItems: 4,
    role: "tester",
    timezone: "Asia/Jerusalem",
  },
  {
    skills: ["devops", "ci-cd", "infrastructure", "tooling", "backend"],
    maxConcurrentItems: 3,
    role: "developer",
    timezone: "America/Los_Angeles",
  },
];

// ── Main ───────────────────────────────────────────────────────────────────

async function main() {
  console.log("🌱  DevLoops dev seed — starting...\n");

  // 1. Find the first workspace
  const workspace = await db.query.workspaces.findFirst({
    where: isNull(schema.workspaces.deletedAt),
  });

  if (!workspace) {
    console.error("❌  No workspace found. Create one first via the UI.");
    process.exit(1);
  }

  console.log(`   Workspace: "${workspace.name}" (id=${workspace.id})`);

  // 2. Get active members
  const members = await db.query.workspaceMembers.findMany({
    where: and(
      eq(schema.workspaceMembers.workspaceId, workspace.id),
      eq(schema.workspaceMembers.status, "active"),
      isNull(schema.workspaceMembers.deletedAt),
    ),
    with: {
      user: { columns: { id: true, name: true, email: true } },
    },
  });

  console.log(`   Found ${members.length} active member(s)\n`);

  // 3. Set developer metadata on members
  for (let i = 0; i < members.length; i++) {
    const member = members[i]!;
    const meta = DEV_METAS[i % DEV_METAS.length]!;

    await db
      .update(schema.workspaceMembers)
      .set({
        developerMetaJson: meta,
        updatedAt: new Date(),
      })
      .where(eq(schema.workspaceMembers.id, member.id));

    console.log(
      `   👤 ${member.user?.name ?? member.email} → role=${meta.role}, skills=[${meta.skills.slice(0, 3).join(", ")}...]`,
    );
  }

  console.log("");

  // 4. Create threads + work items
  let assignIdx = 0;

  for (const wi of WORK_ITEMS) {
    // Create feedback thread
    const [thread] = await db
      .insert(schema.feedbackThreads)
      .values({
        publicId: uid(),
        workspaceId: workspace.id,
        title: wi.threadTitle,
        primarySource: wi.threadSource,
        status: "Open",
        lastActivityAt: new Date(),
      })
      .returning();

    if (!thread) {
      console.warn(`   ⚠️  Failed to create thread for "${wi.title}"`);
      continue;
    }

    // Create an initial message on the thread (simulates user feedback)
    await db.insert(schema.feedbackMessages).values({
      publicId: uid(),
      threadId: thread.id,
      source: wi.threadSource as "api" | "email" | "widget" | "slack" | "discord",
      senderType: "user",
      senderName: "Test User",
      visibility: "public",
      rawText: wi.description,
    });

    // Pick an assigned member (round-robin, skip some for "unassigned" items)
    let assignedMemberId: number | null = null;
    if (members.length > 0 && wi.status !== "Draft" && wi.status !== "Rejected") {
      assignedMemberId = members[assignIdx % members.length]!.id;
      assignIdx++;
    }

    // Spread creation dates over the last 14 days for Gantt variety
    const daysAgo = Math.floor(Math.random() * 14);
    const createdAt = new Date();
    createdAt.setDate(createdAt.getDate() - daysAgo);
    createdAt.setHours(Math.floor(Math.random() * 10) + 8); // 8am-6pm

    // Create work item
    const [item] = await db
      .insert(schema.workItems)
      .values({
        publicId: uid(),
        threadId: thread.id,
        type: wi.type,
        title: wi.title,
        structuredDescription: wi.description,
        acceptanceCriteriaJson: [
          `Verify ${wi.title.toLowerCase()} works as expected`,
          "No regressions in related features",
          "Passes all automated tests",
        ],
        priority: wi.priority,
        severity: wi.severity,
        confidenceScore: wi.confidence,
        riskLevel: wi.risk,
        status: wi.status,
        labelsJson: wi.labels,
        estimatedEffortJson: wi.effort,
        assignedMemberId,
        executionJson: {
          agentMode: "none",
          agentJobId: null,
          lastRunAt: null,
          runLogsUrl: null,
          artifactsJson: null,
        },
        createdAt,
      })
      .returning();

    const assignedLabel =
      assignedMemberId && members.length > 0
        ? members.find((m) => m.id === assignedMemberId)?.user?.name ?? "member"
        : "unassigned";

    console.log(
      `   ✅ [${wi.status.padEnd(16)}] ${wi.type.padEnd(7)} ${wi.priority} "${wi.title}" → ${assignedLabel}`,
    );
  }

  console.log(`\n🎉  Done! Inserted ${WORK_ITEMS.length} work items across ${WORK_ITEMS.length} threads.`);
  console.log("   Refresh the Work Items page to see them.\n");

  await pool.end();
}

main().catch((err) => {
  console.error("❌  Seed failed:", err);
  process.exit(1);
});
