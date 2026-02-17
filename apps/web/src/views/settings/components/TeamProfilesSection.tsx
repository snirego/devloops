import { t } from "@lingui/core/macro";

import type { DeveloperMeta } from "@kan/db/schema";

import TeamMemberCard from "./TeamMemberCard";

interface MemberData {
  publicId: string;
  email?: string;
  role: string;
  status?: string;
  developerMetaJson: unknown;
  user?: {
    id?: string | null;
    name: string | null;
    email?: string;
    image: string | null;
  } | null;
}

function getDefaultMeta(): DeveloperMeta {
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  return {
    skills: [],
    maxConcurrentItems: 3,
    role: "developer",
    timezone: tz || "UTC",
    summary: "",
    focusAreas: [],
    seniorityLevel: "mid",
  };
}

interface TeamProfilesSectionProps {
  members: MemberData[];
  memberMetas: Record<string, DeveloperMeta>;
  onMemberMetaChange: (publicId: string, meta: DeveloperMeta) => void;
  disabled?: boolean;
}

export default function TeamProfilesSection({
  members,
  memberMetas,
  onMemberMetaChange,
  disabled = false,
}: TeamProfilesSectionProps) {
  const visibleMembers = members.filter(
    (m) => m.status !== "removed",
  );

  return (
    <div className="space-y-3">
      <p className="text-xs text-light-600 dark:text-dark-600">
        {t`Set up each person's skills and focus areas so the AI can route work items to the right person.`}
      </p>
      {visibleMembers.length === 0 && (
        <p className="py-6 text-center text-sm text-light-600 dark:text-dark-600">
          {t`Members will appear here once they are part of this workspace.`}
        </p>
      )}
      {visibleMembers.map((member) => {
        const existing = (member.developerMetaJson as DeveloperMeta) ?? null;
        const meta =
          memberMetas[member.publicId] ??
          (existing ? { ...getDefaultMeta(), ...existing } : getDefaultMeta());

        return (
          <TeamMemberCard
            key={member.publicId}
            member={member}
            meta={meta}
            onChange={(newMeta) => onMemberMetaChange(member.publicId, newMeta)}
            disabled={disabled}
          />
        );
      })}
    </div>
  );
}

export { getDefaultMeta };
export type { MemberData };
