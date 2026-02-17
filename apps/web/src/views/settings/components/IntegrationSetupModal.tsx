import { t } from "@lingui/core/macro";
import { useState } from "react";
import {
  HiArrowLeft,
  HiArrowTopRightOnSquare,
  HiCheck,
  HiClipboard,
  HiOutlineBookOpen,
  HiOutlineCheckCircle,
  HiOutlineXMark,
} from "react-icons/hi2";
import { twMerge } from "tailwind-merge";

import Button from "~/components/Button";

/**
 * Turns a plain-text URL segment into a clickable <a> if it looks like a link.
 * Handles both "https://..." and bare domains like "api.slack.com/apps".
 */
const URL_RE =
  /\b(https?:\/\/[^\s,)]+|[a-z0-9-]+(?:\.[a-z]{2,})+(?:\/[^\s,)]*)?)/gi;

function linkifyText(text: string, keyPrefix: string): React.ReactNode {
  const matches = [...text.matchAll(URL_RE)];
  if (matches.length === 0) return text;

  const result: React.ReactNode[] = [];
  let cursor = 0;

  matches.forEach((m, idx) => {
    const start = m.index!;
    if (start > cursor) {
      result.push(text.slice(cursor, start));
    }
    const url = m[0];
    const href = url.startsWith("http") ? url : `https://${url}`;
    result.push(
      <a
        key={`${keyPrefix}-link-${idx}`}
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="font-medium text-brand-500 underline decoration-brand-300 underline-offset-2 hover:text-brand-600 dark:text-brand-400 dark:decoration-brand-600 dark:hover:text-brand-300"
      >
        {url}
      </a>,
    );
    cursor = start + url.length;
  });

  if (cursor < text.length) {
    result.push(text.slice(cursor));
  }
  return result;
}

/**
 * Renders a plain string that may contain backtick-wrapped segments
 * (e.g. "Go to `Settings > API Keys`") into JSX with inline <code> tags.
 * Plain text is dimmed; code highlights and links pop.
 */
function renderInstruction(text: string): React.ReactNode {
  const parts = text.split(/(`[^`]+`)/g);
  return parts.map((part, i) => {
    if (part.startsWith("`") && part.endsWith("`")) {
      const inner = part.slice(1, -1);
      const hasUrl = URL_RE.test(inner);
      URL_RE.lastIndex = 0;
      return (
        <code
          key={i}
          className="rounded bg-light-200 px-1.5 py-0.5 font-mono text-xs font-semibold text-light-1000 dark:bg-dark-400 dark:text-dark-1000"
        >
          {hasUrl ? linkifyText(inner, `code-${i}`) : inner}
        </code>
      );
    }
    return (
      <span
        key={i}
        className="text-light-800 dark:text-dark-800"
      >
        {linkifyText(part, `seg-${i}`)}
      </span>
    );
  });
}

export interface IntegrationField {
  key: string;
  label: string;
  placeholder: string;
  type?: "text" | "password" | "url";
  helpText?: string;
  helpUrl?: string;
  required?: boolean;
}

export interface IntegrationStep {
  title: string;
  description: string;
  fields?: IntegrationField[];
  instructions?: string[];
  helpUrl?: string;
  helpUrlLabel?: string;
}

export interface IntegrationConfig {
  id: string;
  name: string;
  description: string;
  longDescription: string;
  icon: React.ReactNode;
  category: "feedback" | "llm" | "agent";
  steps: IntegrationStep[];
  docsUrl?: string;
  comingSoon?: boolean;
}

interface IntegrationSetupModalProps {
  integration: IntegrationConfig;
  onClose: () => void;
  onComplete: (integrationId: string, values: Record<string, string>) => void;
  isConnected?: boolean;
  onDisconnect?: () => void;
  isSaving?: boolean;
}

export default function IntegrationSetupModal({
  integration,
  onClose,
  onComplete,
  isConnected,
  onDisconnect,
  isSaving,
}: IntegrationSetupModalProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const step = integration.steps[currentStep];
  const isLastStep = currentStep === integration.steps.length - 1;
  const totalSteps = integration.steps.length;

  const handleFieldChange = (key: string, value: string) => {
    setFieldValues((prev) => ({ ...prev, [key]: value }));
  };

  const copyToClipboard = (text: string, fieldKey: string) => {
    void navigator.clipboard.writeText(text);
    setCopiedField(fieldKey);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const canProceed = () => {
    if (!step?.fields) return true;
    return step.fields
      .filter((f) => f.required !== false)
      .every((f) => fieldValues[f.key]?.trim());
  };

  const handleNext = () => {
    if (isLastStep) {
      onComplete(integration.id, fieldValues);
    } else {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  if (!step) return null;

  return (
    <div className="p-6">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="mb-5 flex items-start gap-3">
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-light-100 text-lg dark:bg-dark-200">
          {integration.icon}
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-semibold text-light-1000 dark:text-dark-1000">
            {integration.name}
          </h2>
          <p className="text-sm leading-snug text-light-900 dark:text-dark-900">
            {integration.longDescription}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-light-600 transition-colors hover:bg-light-200 hover:text-light-900 dark:text-dark-600 dark:hover:bg-dark-300 dark:hover:text-dark-900"
        >
          <HiOutlineXMark className="h-5 w-5" />
        </button>
      </div>

      {/* ── Connected banner ───────────────────────────────────────────── */}
      {isConnected && (
        <div className="mb-5 flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-800/40 dark:bg-green-900/10">
          <HiOutlineCheckCircle className="h-5 w-5 flex-shrink-0 text-green-500" />
          <div className="flex-1">
            <p className="text-sm font-medium text-green-800 dark:text-green-300">
              {t`Connected`}
            </p>
            <p className="text-xs text-green-600 dark:text-green-400">
              {t`This integration is active and working.`}
            </p>
          </div>
          {onDisconnect && (
            <Button variant="secondary" size="xs" onClick={onDisconnect}>
              {t`Disconnect`}
            </Button>
          )}
        </div>
      )}

      {/* ── Step indicator ─────────────────────────────────────────────── */}
      {totalSteps > 1 && !isConnected && (
        <div className="mb-5">
          <div className="mb-2 flex items-center justify-between text-sm text-light-900 dark:text-dark-900">
            <span>
              {t`Step`} {currentStep + 1} {t`of`} {totalSteps}
            </span>
            <span className="font-medium">{step.title}</span>
          </div>
          <div className="flex gap-1.5">
            {integration.steps.map((_, idx) => (
              <div
                key={idx}
                className={twMerge(
                  "h-1 flex-1 rounded-full transition-colors",
                  idx <= currentStep
                    ? "bg-light-1000 dark:bg-dark-1000"
                    : "bg-light-200 dark:bg-dark-300",
                )}
              />
            ))}
          </div>
        </div>
      )}

      {/* ── Step content ───────────────────────────────────────────────── */}
      {!isConnected && (
        <>
          {/* Title + description */}
          <div className="mb-4">
            <h3 className="mb-1 text-sm font-semibold text-light-1000 dark:text-dark-1000">
              {step.title}
            </h3>
            <p className="text-sm leading-relaxed text-light-900 dark:text-dark-900">
              {step.description}
            </p>
          </div>

          {/* Instructions */}
          {step.instructions && step.instructions.length > 0 && (
            <div className="mb-4 max-h-[240px] overflow-y-auto rounded-lg border border-light-200 bg-light-50 p-4 dark:border-dark-400 dark:bg-dark-200/50">
              <ol className="space-y-3">
                {step.instructions.map((instruction, idx) => (
                  <li key={idx} className="flex gap-3">
                    <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-light-200 text-xs font-bold text-light-1000 dark:bg-dark-400 dark:text-dark-1000">
                      {idx + 1}
                    </span>
                    <p className="pt-0.5 text-sm leading-relaxed text-light-1000 dark:text-dark-1000">
                      {renderInstruction(instruction)}
                    </p>
                  </li>
                ))}
              </ol>

              {/* Help link pinned inside the instructions card */}
              {step.helpUrl && (
                <a
                  href={step.helpUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-brand-500 hover:text-brand-600 dark:text-brand-400 dark:hover:text-brand-300"
                >
                  <HiArrowTopRightOnSquare className="h-3.5 w-3.5" />
                  {step.helpUrlLabel ?? t`View documentation`}
                </a>
              )}
            </div>
          )}

          {/* Standalone help link when there are no instructions */}
          {step.helpUrl &&
            (!step.instructions || step.instructions.length === 0) && (
              <a
                href={step.helpUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mb-4 inline-flex items-center gap-1.5 text-xs font-medium text-brand-500 hover:text-brand-600 dark:text-brand-400 dark:hover:text-brand-300"
              >
                <HiArrowTopRightOnSquare className="h-3.5 w-3.5" />
                {step.helpUrlLabel ?? t`View documentation`}
              </a>
            )}

          {/* Form fields */}
          {step.fields && step.fields.length > 0 && (
            <div className="mb-5 space-y-4">
              {step.fields.map((field) => (
                <div key={field.key}>
                  <label
                    htmlFor={`integration-${integration.id}-${field.key}`}
                    className="mb-1.5 block text-sm font-medium text-light-1000 dark:text-dark-1000"
                  >
                    {field.label}
                    {field.required !== false && (
                      <span className="ml-0.5 text-red-400">*</span>
                    )}
                  </label>
                  <div className="relative">
                    <input
                      id={`integration-${integration.id}-${field.key}`}
                      name={`integration_${integration.id}_${field.key}_${Date.now()}`}
                      type={field.type ?? "text"}
                      value={fieldValues[field.key] ?? ""}
                      onChange={(e) =>
                        handleFieldChange(field.key, e.target.value)
                      }
                      placeholder={field.placeholder}
                      autoComplete="new-password"
                      autoCorrect="off"
                      autoCapitalize="off"
                      spellCheck={false}
                      data-1p-ignore
                      data-lpignore="true"
                      data-form-type="other"
                      className="w-full rounded-lg border border-light-300 bg-light-50 px-3 py-2 pr-10 font-mono text-sm text-light-1000 outline-none transition-colors placeholder:text-light-500 focus:border-light-500 focus:ring-1 focus:ring-light-500 dark:border-dark-400 dark:bg-dark-100 dark:text-dark-1000 dark:placeholder:text-dark-600 dark:focus:border-dark-600 dark:focus:ring-dark-600"
                    />
                    {fieldValues[field.key] && (
                      <button
                        type="button"
                        onClick={() =>
                          copyToClipboard(
                            fieldValues[field.key] ?? "",
                            field.key,
                          )
                        }
                        className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-light-500 hover:text-light-800 dark:text-dark-500 dark:hover:text-dark-800"
                      >
                        {copiedField === field.key ? (
                          <HiCheck className="h-3.5 w-3.5 text-green-500" />
                        ) : (
                          <HiClipboard className="h-3.5 w-3.5" />
                        )}
                      </button>
                    )}
                  </div>
                  {field.helpText && (
                    <p className="mt-1 text-xs leading-relaxed text-light-800 dark:text-dark-800">
                      {field.helpText}
                    </p>
                  )}
                  {field.helpUrl && (
                    <a
                      href={field.helpUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1 inline-flex items-center gap-1 text-xs text-brand-500 hover:text-brand-600 dark:text-brand-400 dark:hover:text-brand-300"
                    >
                      <HiArrowTopRightOnSquare className="h-3 w-3" />
                      {t`Where do I find this?`}
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* ── Footer: Back / Docs / Connect ──────────────────────────── */}
          <div className="flex items-center justify-between border-t border-light-200 pt-4 dark:border-dark-300">
            <div className="flex items-center gap-4">
              {currentStep > 0 && (
                <button
                  type="button"
                  onClick={handleBack}
                  className="inline-flex items-center gap-1.5 text-sm text-light-700 transition-colors hover:text-light-1000 dark:text-dark-700 dark:hover:text-dark-1000"
                >
                  <HiArrowLeft className="h-3.5 w-3.5" />
                  {t`Back`}
                </button>
              )}
              {integration.docsUrl && (
                <a
                  href={integration.docsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs text-light-600 transition-colors hover:text-light-900 dark:text-dark-600 dark:hover:text-dark-900"
                >
                  <HiOutlineBookOpen className="h-3.5 w-3.5" />
                  {t`Docs`}
                </a>
              )}
            </div>
            <Button
              onClick={handleNext}
              disabled={!canProceed() || isSaving}
              isLoading={isSaving}
              size="sm"
            >
              {isLastStep ? t`Connect` : t`Continue`}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
