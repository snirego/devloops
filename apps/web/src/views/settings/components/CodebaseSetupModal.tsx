import { t } from "@lingui/core/macro";
import { useState } from "react";
import {
  HiArrowTopRightOnSquare,
  HiCheck,
  HiClipboard,
  HiOutlineBookOpen,
  HiOutlineCheckCircle,
  HiOutlinePlusCircle,
  HiOutlineTrash,
  HiOutlineXMark,
} from "react-icons/hi2";
import { twMerge } from "tailwind-merge";

import Button from "~/components/Button";

// ---------------------------------------------------------------------------
// URL regex (same as IntegrationSetupModal)
// ---------------------------------------------------------------------------

const URL_RE =
  /\b(https?:\/\/[^\s,)]+|[a-z0-9-]+(?:\.[a-z]{2,})+(?:\/[^\s,)]*)?)/gi;

function linkifyText(text: string, keyPrefix: string): React.ReactNode {
  const matches = [...text.matchAll(URL_RE)];
  if (matches.length === 0) return text;

  const result: React.ReactNode[] = [];
  let cursor = 0;

  matches.forEach((m, idx) => {
    const start = m.index!;
    if (start > cursor) result.push(text.slice(cursor, start));
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

  if (cursor < text.length) result.push(text.slice(cursor));
  return result;
}

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
      <span key={i} className="text-light-800 dark:text-dark-800">
        {linkifyText(part, `seg-${i}`)}
      </span>
    );
  });
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CodebaseAuthField {
  key: string;
  label: string;
  placeholder: string;
  type?: "text" | "password";
  helpText?: string;
  helpUrl?: string;
}

export interface CodebaseProviderConfig {
  id: string;
  name: string;
  description: string;
  longDescription: string;
  icon: React.ReactNode;
  docsUrl?: string;
  domain: string;
  instructions: string[];
  instructionsHelpUrl?: string;
  instructionsHelpLabel?: string;
  authFields: CodebaseAuthField[];
  repoPlaceholder: string;
}

export interface CodebaseConnection {
  credentials: Record<string, string>;
  repos: string[];
}

interface CodebaseSetupModalProps {
  provider: CodebaseProviderConfig;
  connection?: CodebaseConnection;
  onClose: () => void;
  onAuthenticate: (providerId: string, credentials: Record<string, string>) => void;
  onAddRepo: (providerId: string, repoUrl: string) => void;
  onRemoveRepo: (providerId: string, repoUrl: string) => void;
  onDisconnect: (providerId: string) => void;
  isSaving?: boolean;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function extractRepoName(url: string): string {
  try {
    const cleaned = url.replace(/\/+$/, "");
    const parts = cleaned.split("/");
    const last = parts.pop() ?? "";
    const secondLast = parts.pop() ?? "";
    if (secondLast && last) return `${secondLast}/${last}`;
    return last || url;
  } catch {
    return url;
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function CodebaseSetupModal({
  provider,
  connection,
  onClose,
  onAuthenticate,
  onAddRepo,
  onRemoveRepo,
  onDisconnect,
  isSaving,
}: CodebaseSetupModalProps) {
  const isAuthenticated = Boolean(connection);

  // Auth phase state
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Repo manager state
  const [newRepoUrl, setNewRepoUrl] = useState("");
  const [repoError, setRepoError] = useState("");
  const [confirmDisconnect, setConfirmDisconnect] = useState(false);

  const handleFieldChange = (key: string, value: string) => {
    setFieldValues((prev) => ({ ...prev, [key]: value }));
  };

  const copyToClipboard = (text: string, fieldKey: string) => {
    void navigator.clipboard.writeText(text);
    setCopiedField(fieldKey);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const canAuthenticate = () => {
    return provider.authFields.every((f) => fieldValues[f.key]?.trim());
  };

  const handleAuthenticate = () => {
    onAuthenticate(provider.id, fieldValues);
  };

  const validateRepoUrl = (url: string): boolean => {
    if (!url.trim()) return false;
    const lower = url.toLowerCase();
    return lower.includes(provider.domain);
  };

  const handleAddRepo = () => {
    const trimmed = newRepoUrl.trim();
    if (!trimmed) return;

    if (!validateRepoUrl(trimmed)) {
      setRepoError(
        `URL must be a ${provider.name} repository (e.g. https://${provider.domain}/org/repo)`,
      );
      return;
    }

    if (connection?.repos.includes(trimmed)) {
      setRepoError("This repository is already connected.");
      return;
    }

    setRepoError("");
    onAddRepo(provider.id, trimmed);
    setNewRepoUrl("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddRepo();
    }
  };

  const repos = connection?.repos ?? [];

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-5 flex items-start gap-3">
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-light-100 text-lg dark:bg-dark-200">
          {provider.icon}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold text-light-1000 dark:text-dark-1000">
              {provider.name}
            </h2>
            {isAuthenticated && (
              <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-semibold text-green-700 dark:bg-green-800/30 dark:text-green-400">
                <HiOutlineCheckCircle className="h-3 w-3" />
                {t`Connected`}
              </span>
            )}
          </div>
          <p className="text-sm leading-snug text-light-900 dark:text-dark-900">
            {isAuthenticated ? provider.longDescription : provider.description}
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

      {/* ================================================================= */}
      {/* PHASE 1: Authentication                                           */}
      {/* ================================================================= */}
      {!isAuthenticated && (
        <>
          {/* Instructions */}
          {provider.instructions.length > 0 && (
            <div className="mb-4 max-h-[220px] overflow-y-auto rounded-lg border border-light-200 bg-light-50 p-4 dark:border-dark-400 dark:bg-dark-200/50">
              <ol className="space-y-3">
                {provider.instructions.map((instruction, idx) => (
                  <li key={idx} className="flex gap-3">
                    <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-light-200 px-1.5 text-xs font-bold text-light-1000 dark:bg-dark-400 dark:text-dark-1000">
                      {idx + 1}
                    </span>
                    <p className="pt-0.5 text-sm leading-relaxed text-light-1000 dark:text-dark-1000">
                      {renderInstruction(instruction)}
                    </p>
                  </li>
                ))}
              </ol>

              {provider.instructionsHelpUrl && (
                <a
                  href={provider.instructionsHelpUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-brand-500 hover:text-brand-600 dark:text-brand-400 dark:hover:text-brand-300"
                >
                  <HiArrowTopRightOnSquare className="h-3.5 w-3.5" />
                  {provider.instructionsHelpLabel ?? t`View documentation`}
                </a>
              )}
            </div>
          )}

          {/* Auth fields */}
          <div className="mb-5 space-y-4">
            {provider.authFields.map((field) => (
              <div key={field.key}>
                <label
                  htmlFor={`codebase-${provider.id}-${field.key}`}
                  className="mb-1.5 block text-sm font-medium text-light-1000 dark:text-dark-1000"
                >
                  {field.label}
                  <span className="ml-0.5 text-red-400">*</span>
                </label>
                <div className="relative">
                  <input
                    id={`codebase-${provider.id}-${field.key}`}
                    name={`codebase_${provider.id}_${field.key}_${Date.now()}`}
                    type={field.type ?? "text"}
                    value={fieldValues[field.key] ?? ""}
                    onChange={(e) => handleFieldChange(field.key, e.target.value)}
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
                        copyToClipboard(fieldValues[field.key] ?? "", field.key)
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

          {/* Auth footer */}
          <div className="flex items-center justify-between border-t border-light-200 pt-4 dark:border-dark-300">
            <div className="flex items-center gap-4">
              {provider.docsUrl && (
                <a
                  href={provider.docsUrl}
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
              onClick={handleAuthenticate}
              disabled={!canAuthenticate() || isSaving}
              isLoading={isSaving}
              size="sm"
            >
              {t`Connect`}
            </Button>
          </div>
        </>
      )}

      {/* ================================================================= */}
      {/* PHASE 2: Repository Manager                                       */}
      {/* ================================================================= */}
      {isAuthenticated && (
        <>
          {/* Repo list */}
          <div className="mb-4">
            <h3 className="mb-3 text-sm font-semibold text-light-1000 dark:text-dark-1000">
              {t`Repositories`}
              {repos.length > 0 && (
                <span className="ml-2 text-xs font-normal text-light-600 dark:text-dark-600">
                  ({repos.length})
                </span>
              )}
            </h3>

            {repos.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-light-300 py-8 text-center dark:border-dark-400">
                <HiOutlinePlusCircle className="mb-2 h-6 w-6 text-light-400 dark:text-dark-500" />
                <p className="text-sm text-light-600 dark:text-dark-600">
                  {t`No repositories connected yet.`}
                </p>
                <p className="mt-0.5 text-xs text-light-500 dark:text-dark-500">
                  {t`Add one below to get started.`}
                </p>
              </div>
            ) : (
              <ul className="max-h-[200px] space-y-2 overflow-y-auto">
                {repos.map((repo) => (
                  <li
                    key={repo}
                    className="group/repo flex items-center justify-between rounded-lg border border-light-200 bg-light-50 px-3 py-2.5 dark:border-dark-400 dark:bg-dark-200/50"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-light-1000 dark:text-dark-1000">
                        {extractRepoName(repo)}
                      </p>
                      <p
                        className="truncate text-xs text-light-600 dark:text-dark-600"
                        title={repo}
                      >
                        {repo}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => onRemoveRepo(provider.id, repo)}
                      className="ml-3 flex-shrink-0 rounded p-1 text-light-400 opacity-0 transition-all hover:bg-red-50 hover:text-red-500 group-hover/repo:opacity-100 dark:text-dark-500 dark:hover:bg-red-900/20 dark:hover:text-red-400"
                      title={t`Remove repository`}
                    >
                      <HiOutlineTrash className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Add repo input */}
          <div className="mb-5">
            <label
              htmlFor={`add-repo-${provider.id}`}
              className="mb-1.5 block text-sm font-medium text-light-1000 dark:text-dark-1000"
            >
              {t`Add repository`}
            </label>
            <div className="flex gap-2">
              <input
                id={`add-repo-${provider.id}`}
                type="url"
                value={newRepoUrl}
                onChange={(e) => {
                  setNewRepoUrl(e.target.value);
                  if (repoError) setRepoError("");
                }}
                onKeyDown={handleKeyDown}
                placeholder={provider.repoPlaceholder}
                autoComplete="new-password"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck={false}
                data-1p-ignore
                data-lpignore="true"
                data-form-type="other"
                className="flex-1 rounded-lg border border-light-300 bg-light-50 px-3 py-2 text-sm text-light-1000 outline-none transition-colors placeholder:text-light-500 focus:border-light-500 focus:ring-1 focus:ring-light-500 dark:border-dark-400 dark:bg-dark-100 dark:text-dark-1000 dark:placeholder:text-dark-600 dark:focus:border-dark-600 dark:focus:ring-dark-600"
              />
              <Button
                onClick={handleAddRepo}
                disabled={!newRepoUrl.trim()}
                size="sm"
              >
                {t`Add`}
              </Button>
            </div>
            {repoError && (
              <p className="mt-1.5 text-xs text-red-500 dark:text-red-400">
                {repoError}
              </p>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between border-t border-light-200 pt-4 dark:border-dark-300">
            <div className="flex items-center gap-4">
              {provider.docsUrl && (
                <a
                  href={provider.docsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs text-light-600 transition-colors hover:text-light-900 dark:text-dark-600 dark:hover:text-dark-900"
                >
                  <HiOutlineBookOpen className="h-3.5 w-3.5" />
                  {t`Docs`}
                </a>
              )}
            </div>
            {confirmDisconnect ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-light-700 dark:text-dark-700">
                  {t`Remove account & all repos?`}
                </span>
                <Button
                  variant="danger"
                  size="xs"
                  onClick={() => {
                    onDisconnect(provider.id);
                    setConfirmDisconnect(false);
                  }}
                >
                  {t`Yes, disconnect`}
                </Button>
                <Button
                  variant="secondary"
                  size="xs"
                  onClick={() => setConfirmDisconnect(false)}
                >
                  {t`Cancel`}
                </Button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmDisconnect(true)}
                className={twMerge(
                  "text-xs font-medium transition-colors",
                  "text-red-400 hover:text-red-500 dark:text-red-500 dark:hover:text-red-400",
                )}
              >
                {t`Disconnect ${provider.name}`}
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
