import { useCallback, useEffect, useRef, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import {
  HiOutlineXMark,
  HiOutlineCheck,
  HiOutlineNoSymbol,
  HiOutlinePause,
  HiOutlinePlay,
  HiOutlineEye,
  HiOutlineFire,
  HiOutlineClipboard,
  HiOutlineLink,
  HiOutlinePencilSquare,
  HiOutlineChevronDown,
  HiOutlineChevronRight,
  HiOutlineChatBubbleLeftRight,
  HiOutlineSparkles,
  HiOutlineCodeBracket,
  HiOutlineDocumentText,
  HiOutlineBugAnt,
  HiOutlineLightBulb,
  HiOutlineWrench,
  HiOutlinePlusCircle,
  HiOutlineTrash,
  HiOutlineArrowTopRightOnSquare,
} from "react-icons/hi2";

import { createOptimisticStatusMutation } from "~/hooks/useOptimisticWorkItemStatus";
import { useWorkspace } from "~/providers/workspace";
import { api } from "~/utils/api";

/* ═══════════════════════════════════════════════════════════════════════════
   Constants & maps
   ═══════════════════════════════════════════════════════════════════════════ */

const STATUS_STYLES: Record<string, { bg: string; text: string; dot: string }> = {
  Draft:           { bg: "bg-slate-100 dark:bg-slate-800",    text: "text-slate-700 dark:text-slate-300",   dot: "bg-slate-400" },
  PendingApproval: { bg: "bg-amber-50 dark:bg-amber-950/30",  text: "text-amber-700 dark:text-amber-300",   dot: "bg-amber-500" },
  Approved:        { bg: "bg-blue-50 dark:bg-blue-950/30",    text: "text-blue-700 dark:text-blue-300",     dot: "bg-blue-500" },
  InProgress:      { bg: "bg-violet-50 dark:bg-violet-950/30", text: "text-violet-700 dark:text-violet-300", dot: "bg-violet-500" },
  NeedsReview:     { bg: "bg-orange-50 dark:bg-orange-950/30", text: "text-orange-700 dark:text-orange-300", dot: "bg-orange-500" },
  Done:            { bg: "bg-emerald-50 dark:bg-emerald-950/30", text: "text-emerald-700 dark:text-emerald-300", dot: "bg-emerald-500" },
  OnHold:          { bg: "bg-slate-100 dark:bg-slate-800",    text: "text-slate-600 dark:text-slate-400",   dot: "bg-slate-400" },
  Rejected:        { bg: "bg-red-50 dark:bg-red-950/30",      text: "text-red-700 dark:text-red-300",       dot: "bg-red-400" },
  Failed:          { bg: "bg-red-50 dark:bg-red-950/30",      text: "text-red-700 dark:text-red-300",       dot: "bg-red-600" },
  Canceled:        { bg: "bg-slate-100 dark:bg-slate-800",    text: "text-slate-500 dark:text-slate-400",   dot: "bg-slate-400" },
};

const PRIORITY_STYLES: Record<string, string> = {
  P0: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  P1: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  P2: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  P3: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
};

const TYPE_ICONS: Record<string, React.ReactNode> = {
  Bug: <HiOutlineBugAnt className="h-4 w-4 text-red-500" />,
  Feature: <HiOutlineLightBulb className="h-4 w-4 text-blue-500" />,
  Chore: <HiOutlineWrench className="h-4 w-4 text-slate-500" />,
  Docs: <HiOutlineDocumentText className="h-4 w-4 text-emerald-500" />,
};

const RISK_STYLES: Record<string, string> = {
  Low: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  Medium: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  High: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

/* ═══════════════════════════════════════════════════════════════════════════
   Main component
   ═══════════════════════════════════════════════════════════════════════════ */

interface DrawerProps {
  publicId: string;
  onClose: () => void;
  onRefresh: () => void;
}

export default function WorkItemDrawer({
  publicId,
  onClose,
  onRefresh,
}: DrawerProps) {
  const { workspace } = useWorkspace();
  const utils = api.useUtils();

  // ── Data fetching ──────────────────────────────────────────────────────
  const {
    data: item,
    isLoading,
    refetch,
  } = api.workItem.byPublicId.useQuery({ publicId }, { staleTime: 60_000 });

  const invalidate = useCallback(() => {
    refetch();
    onRefresh();
  }, [refetch, onRefresh]);

  // ── Shared optimistic mutation builder ─────────────────────────────────
  const optimistic = useCallback(
    (newStatus: string) =>
      createOptimisticStatusMutation(
        utils,
        newStatus as "Approved" | "Rejected" | "OnHold" | "InProgress" | "NeedsReview" | "Done" | "Failed" | "Canceled",
        workspace.publicId,
        { onSuccess: invalidate },
      ),
    [utils, workspace.publicId, invalidate],
  );

  // ── Mutations (optimistic for status changes, simple for field edits) ──
  const updateFields = api.workItem.updateFields.useMutation({ onSuccess: invalidate });
  const updatePrompt = api.workItem.updatePromptBundle.useMutation({ onSuccess: invalidate });
  const approve = api.workItem.approve.useMutation(optimistic("Approved"));
  const reject = api.workItem.reject.useMutation(optimistic("Rejected"));
  const hold = api.workItem.hold.useMutation(optimistic("OnHold"));
  const start = api.workItem.start.useMutation(optimistic("InProgress"));
  const needsReview = api.workItem.markNeedsReview.useMutation(optimistic("NeedsReview"));
  const markDone = api.workItem.markDone.useMutation(optimistic("Done"));
  const markFailed = api.workItem.markFailed.useMutation(optimistic("Failed"));
  const createIssue = api.workItem.createGithubIssue.useMutation({ onSuccess: invalidate });
  const { data: ghStatus } = api.workItem.githubStatus.useQuery();

  // ── Collapsible state ──────────────────────────────────────────────────
  const [conversationOpen, setConversationOpen] = useState(false);
  const [promptOpen, setPromptOpen] = useState(true);
  const [criteriaOpen, setCriteriaOpen] = useState(true);

  // ── Reason inputs ──────────────────────────────────────────────────────
  const [showRejectInput, setShowRejectInput] = useState(false);
  const [showHoldInput, setShowHoldInput] = useState(false);
  const [showFailInput, setShowFailInput] = useState(false);
  const [reasonText, setReasonText] = useState("");

  // ── Close on Escape ────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  // ── Loading ────────────────────────────────────────────────────────────
  if (isLoading || !item) {
    return (
      <DrawerShell onClose={onClose}>
        <div className="flex h-full items-center justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-violet-500 border-t-transparent" />
        </div>
      </DrawerShell>
    );
  }

  // ── Derived data ───────────────────────────────────────────────────────
  const threadState = item.thread?.threadStateJson as Record<string, unknown> | null;
  const promptBundle = item.promptBundleJson as {
    cursorPrompt?: string;
    agentSystemPrompt?: string;
    agentTaskPrompt?: string;
    suspectedFiles?: string[];
    testsToRun?: string[];
    commands?: string[];
  } | null;
  const effort = item.estimatedEffortJson as {
    tShirt?: string;
    hoursMin?: number;
    hoursMax?: number;
    confidence?: number;
  } | null;
  const links = item.linksJson as { githubIssueUrl?: string | null } | null;
  const acceptanceCriteria = (item.acceptanceCriteriaJson ?? []) as string[];
  const messages = (
    item.thread as {
      messages?: { rawText: string; senderType: string; senderName?: string | null; createdAt: string }[];
    }
  )?.messages ?? [];
  const statusStyle = STATUS_STYLES[item.status] ?? STATUS_STYLES.Draft!;

  return (
    <DrawerShell onClose={onClose}>
      {/* ── Scrollable content ─────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto">
        {/* ── Header area ──────────────────────────────────────────────── */}
        <div className="px-5 pt-5 pb-4">
          {/* Status + badges row */}
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${statusStyle.bg} ${statusStyle.text}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${statusStyle.dot}`} />
              {item.status.replace(/([A-Z])/g, " $1").trim()}
            </span>
            <InlineSelect
              value={item.type}
              options={["Bug", "Feature", "Chore", "Docs"]}
              icon={TYPE_ICONS[item.type]}
              onSave={(v) => updateFields.mutate({ publicId, type: v as "Bug" | "Feature" | "Chore" | "Docs" })}
            />
            <InlineSelect
              value={item.priority}
              options={["P0", "P1", "P2", "P3"]}
              className={PRIORITY_STYLES[item.priority]}
              onSave={(v) => updateFields.mutate({ publicId, priority: v as "P0" | "P1" | "P2" | "P3" })}
            />
            <InlineSelect
              value={item.riskLevel}
              options={["Low", "Medium", "High"]}
              className={RISK_STYLES[item.riskLevel]}
              onSave={(v) => updateFields.mutate({ publicId, riskLevel: v as "Low" | "Medium" | "High" })}
            />
          </div>

          {/* Title — click to edit */}
          <InlineEditText
            value={item.title}
            onSave={(v) => updateFields.mutate({ publicId, title: v })}
            className="text-lg font-semibold leading-snug text-light-900 dark:text-dark-900"
            placeholder="Untitled work item"
          />

          {/* Created / ID */}
          <div className="mt-2 flex items-center gap-3 text-[11px] text-light-950 dark:text-dark-950">
            <span>ID: {item.publicId}</span>
            <span>&middot;</span>
            <span>Created {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}</span>
            {item.updatedAt && (
              <>
                <span>&middot;</span>
                <span>Updated {formatDistanceToNow(new Date(item.updatedAt), { addSuffix: true })}</span>
              </>
            )}
          </div>
        </div>

        <Divider />

        {/* ── Properties grid ──────────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-3 px-5 py-4">
          {effort?.tShirt && (
            <PropRow label="Size">
              <span className="rounded bg-light-200 px-2 py-0.5 text-xs font-medium text-light-900 dark:bg-dark-200 dark:text-dark-900">
                {effort.tShirt}
              </span>
            </PropRow>
          )}
          {effort && (effort.hoursMin != null || effort.hoursMax != null) && (
            <PropRow label="Est. Hours">
              <span className="text-sm text-light-900 dark:text-dark-900">
                {effort.hoursMin ?? "?"}–{effort.hoursMax ?? "?"} hrs
              </span>
            </PropRow>
          )}
          {effort?.confidence != null && (
            <PropRow label="Confidence">
              <ConfidenceBar value={effort.confidence} />
            </PropRow>
          )}
          {links?.githubIssueUrl && (
            <PropRow label="GitHub Issue" colSpan>
              <a
                href={links.githubIssueUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 truncate text-sm text-violet-600 hover:underline dark:text-violet-400"
              >
                <HiOutlineArrowTopRightOnSquare className="h-3.5 w-3.5 flex-shrink-0" />
                <span className="truncate">{links.githubIssueUrl.replace("https://github.com/", "")}</span>
              </a>
            </PropRow>
          )}
        </div>

        <Divider />

        {/* ── Description ──────────────────────────────────────────────── */}
        <SectionBlock title="Description" icon={<HiOutlineDocumentText className="h-4 w-4" />}>
          <InlineEditTextarea
            value={item.structuredDescription ?? ""}
            onSave={(v) => updateFields.mutate({ publicId, structuredDescription: v || null })}
            placeholder="Click to add a description..."
            minRows={2}
          />
        </SectionBlock>

        <Divider />

        {/* ── Thread summary (AI) ──────────────────────────────────────── */}
        {threadState?.summary && (
          <>
            <SectionBlock title="AI Summary" icon={<HiOutlineSparkles className="h-4 w-4 text-brand-500" />}>
              <p className="text-sm leading-relaxed text-light-800 dark:text-dark-800">
                {threadState.summary as string}
              </p>
              {threadState.intent && (
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-[11px] font-medium uppercase tracking-wider text-light-900 dark:text-dark-900">Intent</span>
                  <span className="rounded-full bg-brand-100 px-2 py-0.5 text-[11px] font-medium text-brand-700 dark:bg-brand-900/40 dark:text-brand-300">
                    {threadState.intent as string}
                  </span>
                </div>
              )}
            </SectionBlock>
            <Divider />
          </>
        )}

        {/* ── Acceptance Criteria ──────────────────────────────────────── */}
        <CollapsibleSection
          title="Acceptance Criteria"
          icon={<HiOutlineCheck className="h-4 w-4" />}
          count={acceptanceCriteria.length}
          open={criteriaOpen}
          onToggle={() => setCriteriaOpen(!criteriaOpen)}
        >
          <AcceptanceCriteriaEditor
            items={acceptanceCriteria}
            onSave={(items) => updateFields.mutate({ publicId, acceptanceCriteria: items })}
          />
        </CollapsibleSection>

        <Divider />

        {/* ── Cursor Prompt ────────────────────────────────────────────── */}
        {promptBundle && (
          <>
            <CollapsibleSection
              title="Cursor Prompt"
              icon={<HiOutlineCodeBracket className="h-4 w-4" />}
              open={promptOpen}
              onToggle={() => setPromptOpen(!promptOpen)}
            >
              <PromptSection
                promptBundle={promptBundle}
                publicId={publicId}
                onSave={(bundle) => updatePrompt.mutate({ publicId, promptBundle: bundle })}
              />
            </CollapsibleSection>
            <Divider />
          </>
        )}

        {/* ── Conversation Timeline (collapsed by default) ─────────────── */}
        {messages.length > 0 && (
          <>
            <CollapsibleSection
              title="Conversation"
              icon={<HiOutlineChatBubbleLeftRight className="h-4 w-4" />}
              count={messages.length}
              open={conversationOpen}
              onToggle={() => setConversationOpen(!conversationOpen)}
            >
              <div className="space-y-2">
                {messages.map((msg, i) => {
                  const isInternal = msg.senderType === "internal";
                  return (
                    <div
                      key={i}
                      className={`rounded-lg border px-3 py-2.5 text-sm ${
                        isInternal
                          ? "border-violet-200 bg-violet-50/50 dark:border-violet-800 dark:bg-violet-950/20"
                          : "border-light-200 bg-light-50 dark:border-dark-200 dark:bg-dark-100"
                      }`}
                    >
                      <div className="mb-1 flex items-center justify-between">
                        <span className={`text-xs font-semibold ${isInternal ? "text-violet-600 dark:text-violet-400" : "text-light-950 dark:text-dark-950"}`}>
                          {msg.senderName ?? (isInternal ? "Agent" : "User")}
                        </span>
                        <span className="text-[10px] text-light-900 dark:text-dark-900">
                          {formatDistanceToNow(new Date(msg.createdAt), { addSuffix: true })}
                        </span>
                      </div>
                      <p className="whitespace-pre-wrap leading-relaxed text-light-900 dark:text-dark-900">
                        {msg.rawText}
                      </p>
                    </div>
                  );
                })}
              </div>
            </CollapsibleSection>
            <Divider />
          </>
        )}

        {/* bottom padding */}
        <div className="h-4" />
      </div>

      {/* ── Action bar (sticky bottom) ─────────────────────────────────── */}
      <div className="border-t border-light-200 bg-light-50 px-5 py-3 dark:border-dark-200 dark:bg-dark-50">
        <div className="flex flex-wrap items-center gap-2">
          {item.status === "PendingApproval" && (
            <>
              <ActionBtn icon={<HiOutlineCheck />} label="Approve" variant="green" onClick={() => approve.mutate({ publicId })} loading={approve.isPending} />
              <ActionBtn icon={<HiOutlineNoSymbol />} label="Reject" variant="red" onClick={() => { setShowRejectInput(true); setReasonText(""); }} />
              <ActionBtn icon={<HiOutlinePause />} label="Hold" variant="slate" onClick={() => { setShowHoldInput(true); setReasonText(""); }} />
            </>
          )}
          {item.status === "Approved" && (
            <>
              <ActionBtn icon={<HiOutlinePlay />} label="Start" variant="violet" onClick={() => start.mutate({ publicId })} loading={start.isPending} />
              {ghStatus?.configured && !links?.githubIssueUrl && (
                <ActionBtn icon={<HiOutlineLink />} label="Create GitHub Issue" variant="slate" onClick={() => createIssue.mutate({ publicId })} loading={createIssue.isPending} />
              )}
            </>
          )}
          {item.status === "InProgress" && (
            <>
              <ActionBtn icon={<HiOutlineEye />} label="Needs Review" variant="orange" onClick={() => needsReview.mutate({ publicId })} loading={needsReview.isPending} />
              <ActionBtn icon={<HiOutlineCheck />} label="Done" variant="green" onClick={() => markDone.mutate({ publicId })} loading={markDone.isPending} />
              <ActionBtn icon={<HiOutlineFire />} label="Failed" variant="red" onClick={() => { setShowFailInput(true); setReasonText(""); }} />
            </>
          )}
          {item.status === "NeedsReview" && (
            <>
              <ActionBtn icon={<HiOutlineCheck />} label="Done" variant="green" onClick={() => markDone.mutate({ publicId })} loading={markDone.isPending} />
              <ActionBtn icon={<HiOutlinePlay />} label="Back to In Progress" variant="violet" onClick={() => start.mutate({ publicId })} loading={start.isPending} />
            </>
          )}
        </div>

        {/* Reason popover */}
        {(showRejectInput || showHoldInput || showFailInput) && (
          <div className="mt-3 rounded-lg border border-light-200 bg-white p-3 dark:border-dark-300 dark:bg-dark-100">
            <label className="mb-1.5 block text-xs font-medium text-light-800 dark:text-dark-800">
              {showRejectInput ? "Rejection reason" : showHoldInput ? "Hold reason" : "Failure reason"}
            </label>
            <input
              autoFocus
              type="text"
              className="w-full rounded-md border border-light-300 px-3 py-1.5 text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-400/20 dark:border-dark-300 dark:bg-dark-200 dark:text-dark-900"
              placeholder="Enter reason..."
              value={reasonText}
              onChange={(e) => setReasonText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && reasonText.trim()) {
                  if (showRejectInput) reject.mutate({ publicId, reason: reasonText.trim() });
                  if (showHoldInput) hold.mutate({ publicId, reason: reasonText.trim() });
                  if (showFailInput) markFailed.mutate({ publicId, reason: reasonText.trim() });
                  setShowRejectInput(false);
                  setShowHoldInput(false);
                  setShowFailInput(false);
                }
                if (e.key === "Escape") {
                  setShowRejectInput(false);
                  setShowHoldInput(false);
                  setShowFailInput(false);
                }
              }}
            />
            <div className="mt-2 flex gap-2">
              <button
                disabled={!reasonText.trim()}
                className="rounded-md bg-red-600 px-3 py-1 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-40"
                onClick={() => {
                  if (showRejectInput) reject.mutate({ publicId, reason: reasonText.trim() });
                  if (showHoldInput) hold.mutate({ publicId, reason: reasonText.trim() });
                  if (showFailInput) markFailed.mutate({ publicId, reason: reasonText.trim() });
                  setShowRejectInput(false);
                  setShowHoldInput(false);
                  setShowFailInput(false);
                }}
              >
                Submit
              </button>
              <button
                className="rounded-md border border-light-300 px-3 py-1 text-xs hover:bg-light-100 dark:border-dark-300 dark:hover:bg-dark-200"
                onClick={() => {
                  setShowRejectInput(false);
                  setShowHoldInput(false);
                  setShowFailInput(false);
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </DrawerShell>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   Sub-components
   ═══════════════════════════════════════════════════════════════════════════ */

/** Outer drawer shell with backdrop and close button */
function DrawerShell({
  onClose,
  children,
}: {
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[2px] dark:bg-black/40"
        onClick={onClose}
      />
      {/* Panel */}
      <div className="fixed inset-y-0 right-0 z-50 flex w-[600px] max-w-[90vw] flex-col border-l border-light-200 bg-white shadow-2xl dark:border-dark-300 dark:bg-dark-50">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute right-3 top-3 z-10 rounded-md p-1.5 text-light-900 transition-colors hover:bg-light-200 hover:text-light-1000 dark:text-dark-900 dark:hover:bg-dark-200 dark:hover:text-dark-900"
          title="Close (Esc)"
        >
          <HiOutlineXMark className="h-5 w-5" />
        </button>
        {children}
      </div>
    </>
  );
}

/** Horizontal divider */
function Divider() {
  return <div className="mx-5 border-t border-light-200 dark:border-dark-200" />;
}

/** Property row for the grid */
function PropRow({
  label,
  children,
  colSpan,
}: {
  label: string;
  children: React.ReactNode;
  colSpan?: boolean;
}) {
  return (
    <div className={colSpan ? "col-span-2" : ""}>
      <span className="mb-0.5 block text-[11px] font-medium uppercase tracking-wider text-light-900 dark:text-dark-900">
        {label}
      </span>
      {children}
    </div>
  );
}

/** Confidence bar */
function ConfidenceBar({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 flex-1 rounded-full bg-light-200 dark:bg-dark-200">
        <div
          className="h-1.5 rounded-full bg-violet-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs font-medium text-light-800 dark:text-dark-800">{pct}%</span>
    </div>
  );
}

/** Non-collapsible section block */
function SectionBlock({
  title,
  icon,
  children,
}: {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="px-5 py-4">
      <div className="mb-2.5 flex items-center gap-2">
        {icon && <span className="text-light-900 dark:text-dark-900">{icon}</span>}
        <h3 className="text-xs font-semibold uppercase tracking-wider text-light-950 dark:text-dark-950">
          {title}
        </h3>
      </div>
      {children}
    </div>
  );
}

/** Collapsible section */
function CollapsibleSection({
  title,
  icon,
  count,
  open,
  onToggle,
  children,
}: {
  title: string;
  icon?: React.ReactNode;
  count?: number;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="px-5 py-3">
      <button
        onClick={onToggle}
        className="flex w-full items-center gap-2 rounded-md py-1 text-left transition-colors hover:bg-light-100 dark:hover:bg-dark-100"
      >
        {open ? (
          <HiOutlineChevronDown className="h-3.5 w-3.5 text-light-900 dark:text-dark-900" />
        ) : (
          <HiOutlineChevronRight className="h-3.5 w-3.5 text-light-900 dark:text-dark-900" />
        )}
        {icon && <span className="text-light-900 dark:text-dark-900">{icon}</span>}
        <h3 className="text-xs font-semibold uppercase tracking-wider text-light-950 dark:text-dark-950">
          {title}
        </h3>
        {count != null && (
          <span className="ml-auto rounded-full bg-light-200 px-1.5 py-0.5 text-[10px] font-medium text-light-900 dark:bg-dark-200 dark:text-dark-900">
            {count}
          </span>
        )}
      </button>
      {open && <div className="mt-2.5">{children}</div>}
    </div>
  );
}

/** Click-to-edit single-line text (Trello-style) */
function InlineEditText({
  value,
  onSave,
  className,
  placeholder,
}: {
  value: string;
  onSave: (v: string) => void;
  className?: string;
  placeholder?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  const save = () => {
    const trimmed = draft.trim();
    if (trimmed && trimmed !== value) onSave(trimmed);
    setEditing(false);
  };

  if (editing) {
    return (
      <input
        ref={inputRef}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={save}
        onKeyDown={(e) => {
          if (e.key === "Enter") save();
          if (e.key === "Escape") { setDraft(value); setEditing(false); }
        }}
        className={`w-full rounded-md border border-violet-300 bg-white px-2 py-1 outline-none ring-2 ring-violet-400/20 dark:border-violet-700 dark:bg-dark-100 ${className ?? ""}`}
      />
    );
  }

  return (
    <div
      onClick={() => setEditing(true)}
      className={`group cursor-text rounded-md px-2 py-1 transition-colors hover:bg-light-100 dark:hover:bg-dark-100 ${className ?? ""}`}
      title="Click to edit"
    >
      {value || <span className="text-light-800 dark:text-dark-800">{placeholder}</span>}
      <HiOutlinePencilSquare className="ml-1.5 inline h-3.5 w-3.5 text-light-800 opacity-0 transition-opacity group-hover:opacity-100 dark:text-dark-800" />
    </div>
  );
}

/** Click-to-edit multi-line textarea */
function InlineEditTextarea({
  value,
  onSave,
  placeholder,
  minRows,
}: {
  value: string;
  onSave: (v: string) => void;
  placeholder?: string;
  minRows?: number;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (editing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.selectionStart = textareaRef.current.value.length;
    }
  }, [editing]);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  const save = () => {
    if (draft !== value) onSave(draft);
    setEditing(false);
  };

  if (editing) {
    return (
      <div className="space-y-2">
        <textarea
          ref={textareaRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={Math.max(minRows ?? 3, draft.split("\n").length + 1)}
          className="w-full resize-y rounded-md border border-violet-300 bg-white px-3 py-2 text-sm leading-relaxed outline-none ring-2 ring-violet-400/20 dark:border-violet-700 dark:bg-dark-100 dark:text-dark-900"
        />
        <div className="flex items-center gap-2">
          <button onClick={save} className="rounded-md bg-violet-600 px-3 py-1 text-xs font-medium text-white hover:bg-violet-700">
            Save
          </button>
          <button onClick={() => { setDraft(value); setEditing(false); }} className="rounded-md border border-light-300 px-3 py-1 text-xs text-light-950 hover:bg-light-100 dark:border-dark-300 dark:text-dark-950 dark:hover:bg-dark-200">
            Cancel
          </button>
          <span className="text-[10px] text-light-800 dark:text-dark-800">Markdown supported</span>
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={() => setEditing(true)}
      className="group cursor-text rounded-md px-3 py-2 text-sm leading-relaxed transition-colors hover:bg-light-100 dark:hover:bg-dark-100"
      title="Click to edit"
    >
      {value ? (
        <p className="whitespace-pre-wrap text-light-900 dark:text-dark-900">{value}</p>
      ) : (
        <p className="text-light-800 dark:text-dark-800">{placeholder}</p>
      )}
      <HiOutlinePencilSquare className="mt-1 inline h-3.5 w-3.5 text-light-800 opacity-0 transition-opacity group-hover:opacity-100 dark:text-dark-800" />
    </div>
  );
}

/** Inline dropdown-style selector badge */
function InlineSelect({
  value,
  options,
  icon,
  className,
  onSave,
}: {
  value: string;
  options: string[];
  icon?: React.ReactNode;
  className?: string;
  onSave: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition-all hover:ring-2 hover:ring-violet-400/30 ${className ?? "bg-light-200 text-light-950 dark:bg-dark-200 dark:text-dark-950"}`}
      >
        {icon}
        {value}
        <HiOutlineChevronDown className="h-3 w-3 opacity-60" />
      </button>
      {open && (
        <div className="absolute left-0 top-full z-20 mt-1 min-w-[100px] rounded-lg border border-light-200 bg-white py-1 shadow-lg dark:border-dark-300 dark:bg-dark-100">
          {options.map((opt) => (
            <button
              key={opt}
              onClick={() => { onSave(opt); setOpen(false); }}
              className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs transition-colors hover:bg-light-100 dark:hover:bg-dark-200 ${opt === value ? "font-semibold text-violet-600 dark:text-violet-400" : "text-light-800 dark:text-dark-800"}`}
            >
              {opt === value && <HiOutlineCheck className="h-3 w-3" />}
              <span className={opt === value ? "" : "pl-5"}>{opt}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/** Editable acceptance criteria list */
function AcceptanceCriteriaEditor({
  items,
  onSave,
}: {
  items: string[];
  onSave: (items: string[]) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<string[]>(items);
  const [newItem, setNewItem] = useState("");

  useEffect(() => {
    setDraft(items);
  }, [items]);

  const save = () => {
    const cleaned = draft.filter((s) => s.trim());
    onSave(cleaned);
    setEditing(false);
  };

  if (editing) {
    return (
      <div className="space-y-2">
        {draft.map((item, i) => (
          <div key={i} className="flex items-start gap-2">
            <span className="mt-2 text-xs text-light-800">{i + 1}.</span>
            <input
              value={item}
              onChange={(e) => {
                const next = [...draft];
                next[i] = e.target.value;
                setDraft(next);
              }}
              className="flex-1 rounded border border-light-300 px-2 py-1 text-sm outline-none focus:border-violet-400 dark:border-dark-300 dark:bg-dark-100 dark:text-dark-900"
            />
            <button
              onClick={() => setDraft(draft.filter((_, j) => j !== i))}
              className="mt-1 rounded p-0.5 text-red-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30"
            >
              <HiOutlineTrash className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
        <div className="flex items-center gap-2">
          <input
            value={newItem}
            onChange={(e) => setNewItem(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && newItem.trim()) {
                setDraft([...draft, newItem.trim()]);
                setNewItem("");
              }
            }}
            placeholder="Add criterion..."
            className="flex-1 rounded border border-dashed border-light-300 px-2 py-1 text-sm outline-none focus:border-violet-400 dark:border-dark-300 dark:bg-dark-100 dark:text-dark-900"
          />
          <button
            onClick={() => {
              if (newItem.trim()) {
                setDraft([...draft, newItem.trim()]);
                setNewItem("");
              }
            }}
            className="rounded p-1 text-violet-600 hover:bg-violet-50 dark:hover:bg-violet-950/30"
          >
            <HiOutlinePlusCircle className="h-4 w-4" />
          </button>
        </div>
        <div className="flex gap-2">
          <button onClick={save} className="rounded-md bg-violet-600 px-3 py-1 text-xs font-medium text-white hover:bg-violet-700">
            Save
          </button>
          <button onClick={() => { setDraft(items); setEditing(false); }} className="rounded-md border border-light-300 px-3 py-1 text-xs text-light-950 hover:bg-light-100 dark:border-dark-300 dark:text-dark-950 dark:hover:bg-dark-200">
            Cancel
          </button>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <button
        onClick={() => setEditing(true)}
        className="flex items-center gap-1.5 text-sm text-light-800 hover:text-violet-600 dark:text-dark-800 dark:hover:text-violet-400"
      >
        <HiOutlinePlusCircle className="h-4 w-4" />
        Add acceptance criteria
      </button>
    );
  }

  return (
    <div
      onClick={() => setEditing(true)}
      className="group cursor-pointer space-y-1.5 rounded-md px-1 py-1 transition-colors hover:bg-light-100 dark:hover:bg-dark-100"
      title="Click to edit"
    >
      {items.map((c, i) => (
        <div key={i} className="flex items-start gap-2 text-sm">
          <span className="mt-0.5 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded border border-light-300 text-[9px] text-light-800 dark:border-dark-300 dark:text-dark-800">
            {i + 1}
          </span>
          <span className="text-light-900 dark:text-dark-900">{c}</span>
        </div>
      ))}
      <HiOutlinePencilSquare className="mt-1 inline h-3.5 w-3.5 text-light-800 opacity-0 transition-opacity group-hover:opacity-100 dark:text-dark-800" />
    </div>
  );
}

/** Prompt section (cursor prompt + suspected files) */
function PromptSection({
  promptBundle,
  publicId,
  onSave,
}: {
  promptBundle: {
    cursorPrompt?: string;
    agentSystemPrompt?: string;
    agentTaskPrompt?: string;
    suspectedFiles?: string[];
    testsToRun?: string[];
    commands?: string[];
  };
  publicId: string;
  onSave: (bundle: {
    cursorPrompt: string;
    agentSystemPrompt: string;
    agentTaskPrompt: string;
    suspectedFiles: string[];
    testsToRun: string[];
    commands: string[];
  }) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(promptBundle.cursorPrompt ?? "");
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (promptBundle.cursorPrompt) {
      navigator.clipboard.writeText(promptBundle.cursorPrompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSave = () => {
    onSave({
      cursorPrompt: draft,
      agentSystemPrompt: promptBundle.agentSystemPrompt ?? "",
      agentTaskPrompt: promptBundle.agentTaskPrompt ?? "",
      suspectedFiles: promptBundle.suspectedFiles ?? [],
      testsToRun: promptBundle.testsToRun ?? [],
      commands: promptBundle.commands ?? [],
    });
    setEditing(false);
  };

  return (
    <div className="space-y-3">
      {editing ? (
        <div className="space-y-2">
          <textarea
            autoFocus
            className="h-40 w-full resize-y rounded-md border border-violet-300 bg-white p-3 font-mono text-xs leading-relaxed outline-none ring-2 ring-violet-400/20 dark:border-violet-700 dark:bg-dark-100 dark:text-dark-900"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
          />
          <div className="flex gap-2">
            <button onClick={handleSave} className="rounded-md bg-violet-600 px-3 py-1 text-xs font-medium text-white hover:bg-violet-700">
              Save
            </button>
            <button onClick={() => { setDraft(promptBundle.cursorPrompt ?? ""); setEditing(false); }} className="rounded-md border border-light-300 px-3 py-1 text-xs text-light-950 hover:bg-light-100 dark:border-dark-300 dark:text-dark-950 dark:hover:bg-dark-200">
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="group relative">
          <pre
            onClick={() => { setDraft(promptBundle.cursorPrompt ?? ""); setEditing(true); }}
            className="max-h-40 cursor-text overflow-y-auto rounded-lg border border-light-200 bg-light-50 p-3 font-mono text-xs leading-relaxed text-light-900 transition-colors hover:border-violet-300 dark:border-dark-200 dark:bg-dark-100 dark:text-dark-900 dark:hover:border-violet-700"
          >
            {promptBundle.cursorPrompt || "No prompt generated"}
          </pre>
          <div className="mt-2 flex gap-2">
            <button
              onClick={handleCopy}
              className="inline-flex items-center gap-1 rounded-md border border-light-200 px-2.5 py-1 text-xs text-light-950 transition-colors hover:bg-light-100 dark:border-dark-300 dark:text-dark-950 dark:hover:bg-dark-200"
            >
              {copied ? <HiOutlineCheck className="h-3 w-3 text-emerald-500" /> : <HiOutlineClipboard className="h-3 w-3" />}
              {copied ? "Copied!" : "Copy"}
            </button>
            <button
              onClick={() => { setDraft(promptBundle.cursorPrompt ?? ""); setEditing(true); }}
              className="inline-flex items-center gap-1 rounded-md border border-light-200 px-2.5 py-1 text-xs text-light-950 transition-colors hover:bg-light-100 dark:border-dark-300 dark:text-dark-950 dark:hover:bg-dark-200"
            >
              <HiOutlinePencilSquare className="h-3 w-3" />
              Edit
            </button>
          </div>
        </div>
      )}

      {/* Suspected files */}
      {promptBundle.suspectedFiles && promptBundle.suspectedFiles.length > 0 && (
        <div>
          <span className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-light-900 dark:text-dark-900">
            Suspected Files
          </span>
          <div className="flex flex-wrap gap-1.5">
            {promptBundle.suspectedFiles.map((f, i) => (
              <span key={i} className="rounded-md border border-light-200 bg-light-50 px-2 py-0.5 font-mono text-[11px] text-light-800 dark:border-dark-200 dark:bg-dark-100 dark:text-dark-800">
                {f}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   Action button
   ═══════════════════════════════════════════════════════════════════════════ */

const VARIANT_CLASSES: Record<string, string> = {
  green: "bg-emerald-600 text-white hover:bg-emerald-700",
  red: "bg-red-600 text-white hover:bg-red-700",
  violet: "bg-violet-600 text-white hover:bg-violet-700",
  orange: "bg-orange-500 text-white hover:bg-orange-600",
  slate: "border border-light-300 dark:border-dark-300 hover:bg-light-200 dark:hover:bg-dark-200 text-light-900 dark:text-dark-900",
};

function ActionBtn({
  icon,
  label,
  variant,
  onClick,
  loading,
}: {
  icon: React.ReactNode;
  label: string;
  variant: string;
  onClick: () => void;
  loading?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50 ${VARIANT_CLASSES[variant] ?? ""}`}
    >
      {icon}
      {loading ? "..." : label}
    </button>
  );
}
