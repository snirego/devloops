import { t } from "@lingui/core/macro";
import { twMerge } from "tailwind-merge";

import type { WorkspaceKnowledge } from "@kan/db/schema";

interface CompanyProfileSectionProps {
  knowledge: WorkspaceKnowledge;
  onChange: (partial: Partial<WorkspaceKnowledge>) => void;
  disabled?: boolean;
}

function FieldLabel({
  label,
  helperText,
}: {
  label: string;
  helperText: string;
}) {
  return (
    <div className="mb-1.5">
      <label className="text-sm font-medium text-primary">
        {label}
      </label>
      <p className="text-xs text-muted">{helperText}</p>
    </div>
  );
}

export default function CompanyProfileSection({
  knowledge,
  onChange,
  disabled = false,
}: CompanyProfileSectionProps) {
  const inputClasses =
    "block w-full rounded-md border-0 bg-white/5 py-2 px-3 text-sm shadow-sm ring-1 ring-inset ring-light-600 placeholder:text-light-700 focus:ring-2 focus:ring-inset focus:ring-light-700 dark:bg-dark-300 dark:text-dark-1000 dark:ring-dark-500 dark:placeholder:text-dark-700 dark:focus:ring-dark-600 sm:leading-6";

  const textareaClasses = twMerge(inputClasses, "min-h-[72px] resize-y");

  return (
    <div className="space-y-5">
      <div>
        <FieldLabel
          label={t`Website URL`}
          helperText={t`Paste your marketing site and we'll pull product info, features, and terminology automatically.`}
        />
        <input
          type="url"
          value={knowledge.websiteUrl ?? ""}
          onChange={(e) => onChange({ websiteUrl: e.target.value })}
          placeholder={t`https://yourproduct.com`}
          disabled={disabled}
          className={inputClasses}
        />
      </div>

      <div>
        <FieldLabel
          label={t`What does your product do?`}
          helperText={t`The AI uses this to write tickets that reference real features instead of generic descriptions.`}
        />
        <textarea
          value={knowledge.productDescription ?? ""}
          onChange={(e) => onChange({ productDescription: e.target.value })}
          placeholder={t`e.g. A SaaS platform with kanban boards, real-time chat, and AI-powered work item generation for software teams...`}
          disabled={disabled}
          rows={2}
          className={textareaClasses}
        />
      </div>

      <div>
        <FieldLabel
          label={t`Who are your users?`}
          helperText={t`Helps the AI assess severity -- a checkout bug matters more than a settings typo.`}
        />
        <input
          type="text"
          value={knowledge.targetAudience ?? ""}
          onChange={(e) => onChange({ targetAudience: e.target.value })}
          placeholder={t`e.g. Software developers and product managers at mid-size companies`}
          disabled={disabled}
          className={inputClasses}
        />
      </div>

      <div>
        <FieldLabel
          label={t`Key features & areas`}
          helperText={t`List your main product areas so the AI can categorize feedback accurately (e.g. "billing, dashboard, onboarding, API").`}
        />
        <textarea
          value={knowledge.keyFeatures ?? ""}
          onChange={(e) => onChange({ keyFeatures: e.target.value })}
          placeholder={t`e.g. User dashboard, billing & subscriptions, team management, API integrations, onboarding wizard...`}
          disabled={disabled}
          rows={2}
          className={textareaClasses}
        />
      </div>

      <div>
        <FieldLabel
          label={t`Domain terminology`}
          helperText={t`Terms specific to your product or industry. The AI will use these instead of guessing.`}
        />
        <textarea
          value={knowledge.domainTerminology ?? ""}
          onChange={(e) => onChange({ domainTerminology: e.target.value })}
          placeholder={t`e.g. We call projects "workspaces", users are "members", our plans are "Starter / Pro / Enterprise"...`}
          disabled={disabled}
          rows={2}
          className={textareaClasses}
        />
      </div>

      <div>
        <FieldLabel
          label={t`Anything else the AI should know?`}
          helperText={t`Business rules, compliance needs, or context that affects how tickets should be written.`}
        />
        <textarea
          value={knowledge.additionalContext ?? ""}
          onChange={(e) => onChange({ additionalContext: e.target.value })}
          placeholder={t`e.g. We follow SOC 2 compliance. All user-facing copy needs to be reviewed. We use "workspace" instead of "organization"...`}
          disabled={disabled}
          rows={3}
          className={textareaClasses}
        />
      </div>
    </div>
  );
}
