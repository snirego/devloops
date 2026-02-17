import { t } from "@lingui/core/macro";
import {
  HiChevronDown,
  HiChevronUp,
  HiOutlineCheckCircle,
} from "react-icons/hi2";
import { useState } from "react";
import { twMerge } from "tailwind-merge";

import type { DeveloperMeta } from "@kan/db/schema";
import Avatar from "~/components/Avatar";
import { getAvatarUrl } from "~/utils/helpers";

import TagInput from "./TagInput";

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

interface TeamMemberCardProps {
  member: MemberData;
  meta: DeveloperMeta;
  onChange: (meta: DeveloperMeta) => void;
  disabled?: boolean;
}

const TIMEZONE_OPTIONS = [
  "UTC",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Sao_Paulo",
  "Europe/London",
  "Europe/Berlin",
  "Europe/Moscow",
  "Asia/Kolkata",
  "Asia/Shanghai",
  "Asia/Tokyo",
  "Asia/Seoul",
  "Australia/Sydney",
  "Pacific/Auckland",
];

const SKILL_SUGGESTIONS = [
  "React",
  "Next.js",
  "TypeScript",
  "Node.js",
  "Python",
  "Go",
  "PostgreSQL",
  "MongoDB",
  "Redis",
  "Docker",
  "Kubernetes",
  "AWS",
  "GraphQL",
  "REST API",
  "CSS",
  "Tailwind",
  "Testing",
  "CI/CD",
  "DevOps",
  "Security",
];

function getCompletionCount(meta: DeveloperMeta): number {
  let count = 0;
  if (meta.role) count++;
  if (meta.seniorityLevel) count++;
  if (meta.skills && meta.skills.length > 0) count++;
  if (meta.focusAreas && meta.focusAreas.length > 0) count++;
  if (meta.timezone) count++;
  if (meta.summary && meta.summary.trim()) count++;
  return count;
}

const TOTAL_FIELDS = 6;

export default function TeamMemberCard({
  member,
  meta,
  onChange,
  disabled = false,
}: TeamMemberCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const updateField = <K extends keyof DeveloperMeta>(
    field: K,
    value: DeveloperMeta[K],
  ) => {
    onChange({ ...meta, [field]: value });
  };

  const memberName = member.user?.name || member.email || member.publicId;
  const memberEmail = member.user?.email || member.email || "";
  const completion = getCompletionCount(meta);

  const roleBadgeStyles: Record<string, string> = {
    "super-admin": "bg-purple-500/10 text-purple-400 ring-purple-500/20",
    admin: "bg-emerald-500/10 text-emerald-400 ring-emerald-500/20",
    member: "bg-blue-500/10 text-blue-400 ring-blue-500/20",
    tester: "bg-amber-500/10 text-amber-400 ring-amber-500/20",
    guest: "bg-gray-500/10 text-gray-400 ring-gray-500/20",
  };

  const inputClasses =
    "block w-full rounded-md border-0 bg-white/5 py-2 px-3 text-sm shadow-sm ring-1 ring-inset ring-light-600 placeholder:text-dark-800 focus:ring-2 focus:ring-inset focus:ring-light-700 dark:bg-dark-300 dark:text-dark-1000 dark:ring-dark-700 dark:focus:ring-dark-700 sm:leading-6";

  const selectClasses = twMerge(
    inputClasses,
    "cursor-pointer appearance-none pr-8",
  );

  return (
    <div className="rounded-xl border border-light-200 bg-white transition-all dark:border-dark-300 dark:bg-dark-100">
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex w-full items-center justify-between p-4"
      >
        <div className="flex items-center gap-3">
          <Avatar
            name={memberName ?? ""}
            email={memberEmail}
            imageUrl={
              member.user?.image
                ? getAvatarUrl(member.user.image)
                : undefined
            }
          />
          <div className="text-left">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-light-1000 dark:text-dark-1000">
                {memberName}
              </span>
              <span
                className={twMerge(
                  "inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-medium ring-1 ring-inset",
                  roleBadgeStyles[member.role] ?? roleBadgeStyles.member,
                )}
              >
                {member.role === "super-admin"
                  ? "Super Admin"
                  : member.role.charAt(0).toUpperCase() +
                    member.role.slice(1)}
              </span>
            </div>
            <span className="text-xs text-light-600 dark:text-dark-600">
              {memberEmail}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {completion === TOTAL_FIELDS ? (
            <span className="flex items-center gap-1 text-xs text-green-500 dark:text-green-400">
              <HiOutlineCheckCircle className="h-3.5 w-3.5" />
              {t`Complete`}
            </span>
          ) : (
            <span className="text-xs text-light-500 dark:text-dark-500">
              {completion}/{TOTAL_FIELDS}
            </span>
          )}
          {isExpanded ? (
            <HiChevronUp className="h-4 w-4 text-light-500 dark:text-dark-500" />
          ) : (
            <HiChevronDown className="h-4 w-4 text-light-500 dark:text-dark-500" />
          )}
        </div>
      </button>

      {isExpanded && (
        <div className="border-t border-light-200 px-4 pb-5 pt-4 dark:border-dark-300">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-light-1000 dark:text-dark-1000">
                {t`Developer Role`}
              </label>
              <div className="relative">
                <select
                  value={meta.role}
                  onChange={(e) =>
                    updateField(
                      "role",
                      e.target.value as DeveloperMeta["role"],
                    )
                  }
                  disabled={disabled}
                  className={selectClasses}
                >
                  <option value="developer">{t`Developer`}</option>
                  <option value="tester">{t`Tester`}</option>
                  <option value="lead">{t`Lead`}</option>
                  <option value="designer">{t`Designer`}</option>
                </select>
                <HiChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-light-600 dark:text-dark-600" />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-light-1000 dark:text-dark-1000">
                {t`Seniority Level`}
              </label>
              <div className="relative">
                <select
                  value={meta.seniorityLevel ?? "mid"}
                  onChange={(e) =>
                    updateField(
                      "seniorityLevel",
                      e.target.value as DeveloperMeta["seniorityLevel"],
                    )
                  }
                  disabled={disabled}
                  className={selectClasses}
                >
                  <option value="junior">{t`Junior`}</option>
                  <option value="mid">{t`Mid`}</option>
                  <option value="senior">{t`Senior`}</option>
                  <option value="staff">{t`Staff`}</option>
                  <option value="principal">{t`Principal`}</option>
                </select>
                <HiChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-light-600 dark:text-dark-600" />
              </div>
            </div>

            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-medium text-light-1000 dark:text-dark-1000">
                {t`Skills`}
              </label>
              <TagInput
                tags={meta.skills ?? []}
                onChange={(tags) => updateField("skills", tags)}
                placeholder={t`e.g. React, Node.js, PostgreSQL`}
                disabled={disabled}
                suggestions={SKILL_SUGGESTIONS}
              />
            </div>

            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-medium text-light-1000 dark:text-dark-1000">
                {t`Focus Areas`}
              </label>
              <TagInput
                tags={meta.focusAreas ?? []}
                onChange={(tags) => updateField("focusAreas", tags)}
                placeholder={t`e.g. frontend, auth, payments`}
                disabled={disabled}
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-light-1000 dark:text-dark-1000">
                {t`Max Concurrent Items`}
              </label>
              <input
                type="number"
                min={1}
                max={20}
                value={meta.maxConcurrentItems}
                onChange={(e) => {
                  const v = Math.max(1, Math.min(20, Number(e.target.value) || 3));
                  updateField("maxConcurrentItems", v);
                }}
                disabled={disabled}
                className={inputClasses}
              />
              <p className="mt-1 text-[11px] text-light-500 dark:text-dark-500">
                {t`How many work items this person can handle at once.`}
              </p>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-light-1000 dark:text-dark-1000">
                {t`Timezone`}
              </label>
              <div className="relative">
                <select
                  value={meta.timezone ?? "UTC"}
                  onChange={(e) => updateField("timezone", e.target.value)}
                  disabled={disabled}
                  className={selectClasses}
                >
                  {TIMEZONE_OPTIONS.map((tz) => (
                    <option key={tz} value={tz}>
                      {tz.replace(/_/g, " ")}
                    </option>
                  ))}
                </select>
                <HiChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-light-600 dark:text-dark-600" />
              </div>
            </div>

            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-medium text-light-1000 dark:text-dark-1000">
                {t`About`}
              </label>
              <textarea
                value={meta.summary ?? ""}
                onChange={(e) => updateField("summary", e.target.value)}
                placeholder={t`A short summary about this developer's strengths, preferences, or context...`}
                disabled={disabled}
                rows={2}
                className={twMerge(inputClasses, "min-h-[56px] resize-y")}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
