/**
 * Auto-Assignment Engine
 *
 * When a work item is approved, this module finds the best developer
 * to assign it to based on:
 *   1. Skill match  — compare work item type/labels against member skills
 *   2. Current load — prefer members with fewer active items
 *   3. Capacity     — skip members at their maxConcurrentItems limit
 *
 * Returns the best-fit workspaceMemberId, or null if no one qualifies.
 */

import type { dbClient } from "@kan/db/client";
import type { DeveloperMeta } from "@kan/db/schema";
import * as memberRepo from "@kan/db/repository/member.repo";
import * as workItemRepo from "@kan/db/repository/workItem.repo";

// ── Type / Label → Skill mapping ──────────────────────────────────────────────

const TYPE_TO_SKILLS: Record<string, string[]> = {
  Bug: ["debugging", "backend", "frontend", "testing"],
  Feature: ["frontend", "backend", "api", "design"],
  Chore: ["devops", "backend", "tooling", "infrastructure"],
  Docs: ["documentation", "technical-writing", "frontend"],
};

// ── Scoring weights ───────────────────────────────────────────────────────────

const WEIGHT_SKILL_MATCH = 10; // points per matching skill
const WEIGHT_LOAD_PENALTY = -5; // points per active item
const WEIGHT_DEVELOPER_ROLE_BONUS = 3; // bonus for "developer" role match

// ── Main function ─────────────────────────────────────────────────────────────

export interface AutoAssignResult {
  memberId: number;
  memberPublicId: string;
  score: number;
  reason: string;
}

export async function autoAssignWorkItem(
  db: dbClient,
  workspaceId: number,
  workItem: {
    type: string;
    labelsJson?: unknown;
  },
): Promise<AutoAssignResult | null> {
  // 1. Get all active members with developer metadata
  const members = await memberRepo.getActiveMembersWithMeta(db, workspaceId);

  // Filter to only members who have developer meta configured
  const candidates = members.filter(
    (m) => m.developerMetaJson != null,
  );

  if (candidates.length === 0) return null;

  // 2. Determine desired skills from work item
  const desiredSkills = new Set<string>();
  const typeSkills = TYPE_TO_SKILLS[workItem.type] ?? [];
  for (const s of typeSkills) desiredSkills.add(s.toLowerCase());

  // Add labels as skills too (they often map to domains)
  const labels = Array.isArray(workItem.labelsJson)
    ? (workItem.labelsJson as string[])
    : [];
  for (const label of labels) desiredSkills.add(label.toLowerCase());

  // 3. Score each candidate
  const scored: AutoAssignResult[] = [];

  for (const member of candidates) {
    const meta = member.developerMetaJson as DeveloperMeta;

    // Count active items (InProgress + NeedsReview) for this member
    const activeCount = await workItemRepo.countByStatusForMember(
      db,
      member.id,
      ["InProgress", "NeedsReview", "Approved"],
    );

    // Skip if at capacity
    const maxItems = meta.maxConcurrentItems ?? 3;
    if (activeCount >= maxItems) continue;

    // Skill match score
    const memberSkills = new Set(
      (meta.skills ?? []).map((s) => s.toLowerCase()),
    );
    let skillMatches = 0;
    for (const desired of desiredSkills) {
      if (memberSkills.has(desired)) skillMatches++;
    }

    // Role bonus — "developer" role gets a slight preference for Bug/Feature/Chore
    const roleBonus =
      meta.role === "developer" && workItem.type !== "Docs"
        ? WEIGHT_DEVELOPER_ROLE_BONUS
        : meta.role === "tester" && workItem.type === "Bug"
          ? WEIGHT_DEVELOPER_ROLE_BONUS
          : 0;

    const score =
      skillMatches * WEIGHT_SKILL_MATCH +
      activeCount * WEIGHT_LOAD_PENALTY +
      roleBonus;

    scored.push({
      memberId: member.id,
      memberPublicId: member.publicId,
      score,
      reason: `skills=${skillMatches}, load=${activeCount}/${maxItems}, roleBonus=${roleBonus}`,
    });
  }

  if (scored.length === 0) return null;

  // 4. Return the highest-scoring candidate
  scored.sort((a, b) => b.score - a.score);
  return scored[0]!;
}
