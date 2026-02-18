import { useCallback, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import {
  HiOutlineXMark,
  HiOutlineFunnel,
  HiOutlineArrowPath,
  HiOutlineExclamationTriangle,
  HiOutlineCpuChip,
  HiOutlineWrench,
  HiOutlineChatBubbleLeft,
  HiOutlineCheckCircle,
  HiOutlineXCircle,
  HiOutlineQuestionMarkCircle,
  HiOutlineChevronDown,
  HiOutlineChevronRight,
} from "react-icons/hi2";

import { ensureUtcTimestamp } from "~/hooks/useRealtimeMessages";
import { api } from "~/utils/api";

type LogFilter = "all" | "pipeline" | "workitem" | "errors";

const FILTERS: { value: LogFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "pipeline", label: "Pipeline" },
  { value: "workitem", label: "Work Items" },
  { value: "errors", label: "Errors" },
];

// Map actions to human-readable labels and icons
const ACTION_META: Record<
  string,
  { label: string; icon: React.ReactNode; color: string }
> = {
  threadstate_updated: {
    label: "ThreadState Updated",
    icon: <HiOutlineCpuChip className="h-3.5 w-3.5" />,
    color: "text-blue-500",
  },
  threadstate_update_failed: {
    label: "ThreadState Update Failed",
    icon: <HiOutlineExclamationTriangle className="h-3.5 w-3.5" />,
    color: "text-red-500",
  },
  smart_pipeline_completed: {
    label: "Smart Pipeline Completed",
    icon: <HiOutlineCheckCircle className="h-3.5 w-3.5" />,
    color: "text-emerald-500",
  },
  ai_asked_questions: {
    label: "AI Asked Questions",
    icon: <HiOutlineQuestionMarkCircle className="h-3.5 w-3.5" />,
    color: "text-amber-500",
  },
  workitem_generation_failed: {
    label: "Work Item Generation Failed",
    icon: <HiOutlineXCircle className="h-3.5 w-3.5" />,
    color: "text-red-500",
  },
  created: {
    label: "Created",
    icon: <HiOutlineCheckCircle className="h-3.5 w-3.5" />,
    color: "text-emerald-500",
  },
  approved: {
    label: "Approved",
    icon: <HiOutlineCheckCircle className="h-3.5 w-3.5" />,
    color: "text-blue-500",
  },
  rejected: {
    label: "Rejected",
    icon: <HiOutlineXCircle className="h-3.5 w-3.5" />,
    color: "text-red-500",
  },
  on_hold: {
    label: "On Hold",
    icon: <HiOutlineWrench className="h-3.5 w-3.5" />,
    color: "text-slate-500",
  },
  started: {
    label: "Started",
    icon: <HiOutlineArrowPath className="h-3.5 w-3.5" />,
    color: "text-brand-500",
  },
  done: {
    label: "Done",
    icon: <HiOutlineCheckCircle className="h-3.5 w-3.5" />,
    color: "text-emerald-600",
  },
  failed: {
    label: "Failed",
    icon: <HiOutlineXCircle className="h-3.5 w-3.5" />,
    color: "text-red-600",
  },
  canceled: {
    label: "Canceled",
    icon: <HiOutlineXCircle className="h-3.5 w-3.5" />,
    color: "text-gray-500",
  },
  created_from_chat: {
    label: "Created from Chat",
    icon: <HiOutlineChatBubbleLeft className="h-3.5 w-3.5" />,
    color: "text-brand-500",
  },
  fields_updated: {
    label: "Fields Updated",
    icon: <HiOutlineWrench className="h-3.5 w-3.5" />,
    color: "text-blue-400",
  },
  agent_prepared: {
    label: "Agent Prepared",
    icon: <HiOutlineCpuChip className="h-3.5 w-3.5" />,
    color: "text-brand-500",
  },
  github_issue_created: {
    label: "GitHub Issue Created",
    icon: <HiOutlineCheckCircle className="h-3.5 w-3.5" />,
    color: "text-emerald-500",
  },
};

function getActionMeta(action: string) {
  return (
    ACTION_META[action] ?? {
      label: action.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
      icon: <HiOutlineCpuChip className="h-3.5 w-3.5" />,
      color: "text-light-800 dark:text-dark-800",
    }
  );
}

interface LogEntryProps {
  log: {
    id: number;
    entityType: string;
    entityId: number;
    action: string;
    detailsJson: unknown;
    createdAt: Date | string;
  };
}

function LogEntry({ log }: LogEntryProps) {
  const [expanded, setExpanded] = useState(false);
  const meta = getActionMeta(log.action);
  const details = log.detailsJson as Record<string, unknown> | null;
  const hasDetails = details && Object.keys(details).length > 0;
  const isError = log.action.includes("failed");

  return (
    <div
      className={`border-b border-light-200 px-4 py-2.5 dark:border-dark-200 ${
        isError ? "bg-red-50/50 dark:bg-red-950/10" : ""
      }`}
    >
      <div className="flex items-start gap-2">
        {/* Icon */}
        <span className={`mt-0.5 flex-shrink-0 ${meta.color}`}>
          {meta.icon}
        </span>

        {/* Content */}
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-medium text-light-900 dark:text-dark-900">
                {meta.label}
              </span>
              <span className="rounded bg-light-200 px-1 py-0.5 text-[9px] font-medium text-light-800 dark:bg-dark-200 dark:text-dark-800">
                {log.entityType}#{log.entityId}
              </span>
            </div>
            <span className="flex-shrink-0 text-[10px] text-light-700 dark:text-dark-700">
              {formatDistanceToNow(
                new Date(ensureUtcTimestamp(log.createdAt)),
                { addSuffix: true },
              )}
            </span>
          </div>

          {/* Summary line from details */}
          {details && (
            <p className="mt-0.5 truncate text-[11px] text-light-800 dark:text-dark-800">
              {renderSummary(log.action, details)}
            </p>
          )}

          {/* Show hint prominently for errors */}
          {isError && details?.hint && (
            <p className="mt-1 rounded bg-amber-50 px-2 py-1 text-[11px] leading-relaxed text-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
              💡 {String(details.hint)}
            </p>
          )}

          {/* Expandable details */}
          {hasDetails && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="mt-1 flex items-center gap-0.5 text-[10px] text-brand-500 hover:text-brand-600 dark:text-brand-400 dark:hover:text-brand-300"
            >
              {expanded ? (
                <HiOutlineChevronDown className="h-3 w-3" />
              ) : (
                <HiOutlineChevronRight className="h-3 w-3" />
              )}
              {expanded ? "Hide details" : "Show details"}
            </button>
          )}

          {expanded && hasDetails && (
            <pre className="mt-1.5 max-h-48 overflow-auto rounded bg-light-200 p-2 text-[10px] leading-relaxed text-light-900 dark:bg-dark-200 dark:text-dark-900">
              {JSON.stringify(details, null, 2)}
            </pre>
          )}
        </div>
      </div>
    </div>
  );
}

/** Render a single-line summary from details based on the action type. */
function renderSummary(
  action: string,
  details: Record<string, unknown>,
): string {
  if (action === "threadstate_updated") {
    const rec = details.recommendation as
      | { action?: string; confidence?: number; reason?: string }
      | undefined;
    if (rec) {
      return `${rec.action ?? "?"} (confidence: ${rec.confidence?.toFixed(2) ?? "?"}) — ${rec.reason ?? ""}`;
    }
    if (details.mode) return `Mode: ${String(details.mode)}`;
  }

  if (action === "smart_pipeline_completed") {
    const ga = details.gatekeeperAction as string | undefined;
    const wc = details.workItemCreated as boolean | undefined;
    const rec = details.llmRecommendation as { action?: string; confidence?: number } | undefined;
    const intent = details.llmIntent as string | undefined;
    const confStr = rec?.confidence != null ? ` (confidence: ${Number(rec.confidence).toFixed(2)})` : "";
    const intentStr = intent ? ` [${intent}]` : "";
    return `${ga ?? "Unknown action"}${confStr}${intentStr}${wc ? " — Work item created" : " — No work item"}`;
  }

  if (action === "ai_asked_questions") {
    const questions = details.openQuestions as string[] | undefined;
    return questions
      ? `${questions.length} question(s) asked`
      : details.reason
        ? String(details.reason)
        : "";
  }

  if (
    action === "threadstate_update_failed" ||
    action === "workitem_generation_failed"
  ) {
    const error = String(details.error ?? "Unknown error");
    const url = details.llmBaseUrl ? ` → ${String(details.llmBaseUrl)}` : "";
    return `${error}${url}`;
  }

  if (action === "created" && details.type) {
    return `${String(details.type)} — ${String(details.title ?? "")}`;
  }

  if (details.reason) return String(details.reason);
  if (details.error) return String(details.error);

  const keys = Object.keys(details);
  if (keys.length <= 3) {
    return keys.map((k) => `${k}: ${JSON.stringify(details[k])}`).join(", ");
  }
  return `${keys.length} fields`;
}

// ─── Main Panel ──────────────────────────────────────────────────────────────

interface LogsPanelProps {
  onClose: () => void;
}

export default function LogsPanel({ onClose }: LogsPanelProps) {
  const [filter, setFilter] = useState<LogFilter>("all");

  const {
    data: logs,
    isLoading,
    isFetching,
    refetch,
  } = api.workItem.logs.useQuery(
    { filter, limit: 200 },
    { staleTime: 10_000 },
  );

  const handleRefresh = useCallback(() => {
    void refetch();
  }, [refetch]);

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/30 backdrop-blur-[2px]"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed bottom-0 right-0 top-0 z-50 flex w-full max-w-lg flex-col border-l border-light-300 bg-white shadow-2xl dark:border-dark-300 dark:bg-dark-50">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-light-300 px-4 py-3 dark:border-dark-300">
          <div className="flex items-center gap-2">
            <HiOutlineCpuChip className="h-5 w-5 text-brand-500" />
            <h2 className="text-sm font-semibold text-light-900 dark:text-dark-900">
              Pipeline Logs
            </h2>
            {logs && (
              <span className="rounded-full bg-light-200 px-2 py-0.5 text-[10px] font-medium text-light-800 dark:bg-dark-200 dark:text-dark-800">
                {logs.length}
              </span>
            )}
            {isFetching && !isLoading && (
              <span className="text-[10px] text-light-700 dark:text-dark-700">
                syncing...
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={handleRefresh}
              className="rounded p-1 hover:bg-light-200 dark:hover:bg-dark-200"
              title="Refresh"
            >
              <HiOutlineArrowPath className="h-4 w-4 text-light-800 dark:text-dark-800" />
            </button>
            <button
              onClick={onClose}
              className="rounded p-1 hover:bg-light-200 dark:hover:bg-dark-200"
            >
              <HiOutlineXMark className="h-4 w-4 text-light-800 dark:text-dark-800" />
            </button>
          </div>
        </div>

        {/* Filter tabs */}
        <div className="flex items-center gap-1 border-b border-light-200 px-4 py-2 dark:border-dark-200">
          <HiOutlineFunnel className="mr-1 h-3.5 w-3.5 text-light-800 dark:text-dark-800" />
          {FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors duration-0 ${
                filter === f.value
                  ? "bg-brand-100 text-brand-700 dark:bg-brand-950/40 dark:text-brand-300"
                  : "text-light-800 hover:bg-light-200 dark:text-dark-800 dark:hover:bg-dark-200"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Log entries */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
            </div>
          ) : !logs || logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
              <HiOutlineCpuChip className="h-8 w-8 text-light-700 dark:text-dark-700" />
              <p className="text-sm text-light-800 dark:text-dark-800">
                No logs yet
              </p>
              <p className="text-xs text-light-700 dark:text-dark-700">
                AI pipeline activity will appear here
              </p>
            </div>
          ) : (
            logs.map((log) => <LogEntry key={log.id} log={log} />)
          )}
        </div>
      </div>
    </>
  );
}
