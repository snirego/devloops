import { useMemo, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import {
  HiOutlineBugAnt,
  HiOutlineLightBulb,
  HiOutlineWrench,
  HiOutlineDocumentText,
  HiOutlineChevronUp,
  HiOutlineChevronDown,
  HiOutlineFunnel,
} from "react-icons/hi2";

// ── Constants ───────────────────────────────────────────────────────────────

const TYPE_ICONS: Record<string, React.ReactNode> = {
  Bug: <HiOutlineBugAnt className="h-3.5 w-3.5 text-red-500" />,
  Feature: <HiOutlineLightBulb className="h-3.5 w-3.5 text-blue-500" />,
  Chore: <HiOutlineWrench className="h-3.5 w-3.5 text-slate-500" />,
  Docs: <HiOutlineDocumentText className="h-3.5 w-3.5 text-emerald-500" />,
};

const PRIORITY_COLORS: Record<string, string> = {
  P0: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  P1: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  P2: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  P3: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
};

const STATUS_DOTS: Record<string, string> = {
  Draft: "bg-slate-400",
  PendingApproval: "bg-amber-500",
  Approved: "bg-blue-500",
  InProgress: "bg-violet-500",
  NeedsReview: "bg-orange-500",
  Done: "bg-emerald-500",
  OnHold: "bg-slate-400",
  Rejected: "bg-red-400",
  Failed: "bg-red-600",
  Canceled: "bg-slate-400",
};

const RISK_COLORS: Record<string, string> = {
  Low: "text-emerald-600 dark:text-emerald-400",
  Medium: "text-amber-600 dark:text-amber-400",
  High: "text-red-600 dark:text-red-400",
};

const ALL_STATUSES = [
  "PendingApproval", "Approved", "InProgress", "NeedsReview",
  "Done", "OnHold", "Rejected", "Failed", "Canceled",
];

const ALL_TYPES = ["Bug", "Feature", "Chore", "Docs"];
const ALL_PRIORITIES = ["P0", "P1", "P2", "P3"];

// ── Types ───────────────────────────────────────────────────────────────────

interface WorkItem {
  publicId: string;
  title: string;
  status: string;
  type: string;
  priority: string;
  riskLevel: string;
  createdAt: string | Date;
  estimatedEffortJson?: unknown;
  assignedMember?: {
    publicId: string;
    user?: {
      id: string;
      name: string | null;
      email: string;
      image: string | null;
    } | null;
  } | null;
}

type SortKey = "title" | "type" | "priority" | "status" | "assignee" | "effort" | "risk" | "created";
type SortDir = "asc" | "desc";

interface TableViewProps {
  workItems: WorkItem[];
  onItemClick: (publicId: string) => void;
}

// ── Sorting helpers ─────────────────────────────────────────────────────────

const PRIORITY_ORDER: Record<string, number> = { P0: 0, P1: 1, P2: 2, P3: 3 };
const STATUS_ORDER: Record<string, number> = {
  InProgress: 0, NeedsReview: 1, Approved: 2, PendingApproval: 3,
  OnHold: 4, Done: 5, Failed: 6, Rejected: 7, Canceled: 8, Draft: 9,
};

function getSortValue(item: WorkItem, key: SortKey): string | number {
  switch (key) {
    case "title": return item.title.toLowerCase();
    case "type": return item.type;
    case "priority": return PRIORITY_ORDER[item.priority] ?? 99;
    case "status": return STATUS_ORDER[item.status] ?? 99;
    case "assignee": return item.assignedMember?.user?.name?.toLowerCase() ?? "zzz";
    case "effort": {
      const e = item.estimatedEffortJson as { tShirt?: string } | null;
      return e?.tShirt ?? "zzz";
    }
    case "risk": return item.riskLevel;
    case "created": return new Date(item.createdAt).getTime();
    default: return "";
  }
}

// ── Component ───────────────────────────────────────────────────────────────

export default function TableView({ workItems, onItemClick }: TableViewProps) {
  const [sortKey, setSortKey] = useState<SortKey>("priority");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [showFilters, setShowFilters] = useState(false);

  // Filters
  const [filterStatus, setFilterStatus] = useState<string[]>([]);
  const [filterType, setFilterType] = useState<string[]>([]);
  const [filterPriority, setFilterPriority] = useState<string[]>([]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const toggleFilter = (
    arr: string[],
    setter: (v: string[]) => void,
    value: string,
  ) => {
    setter(arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value]);
  };

  const sorted = useMemo(() => {
    let filtered = [...workItems];

    if (filterStatus.length > 0) {
      filtered = filtered.filter((wi) => filterStatus.includes(wi.status));
    }
    if (filterType.length > 0) {
      filtered = filtered.filter((wi) => filterType.includes(wi.type));
    }
    if (filterPriority.length > 0) {
      filtered = filtered.filter((wi) => filterPriority.includes(wi.priority));
    }

    filtered.sort((a, b) => {
      const av = getSortValue(a, sortKey);
      const bv = getSortValue(b, sortKey);
      const cmp = av < bv ? -1 : av > bv ? 1 : 0;
      return sortDir === "asc" ? cmp : -cmp;
    });

    return filtered;
  }, [workItems, sortKey, sortDir, filterStatus, filterType, filterPriority]);

  const activeFilterCount = filterStatus.length + filterType.length + filterPriority.length;

  const SortIcon = ({ column }: { column: SortKey }) => {
    if (sortKey !== column) return null;
    return sortDir === "asc" ? (
      <HiOutlineChevronUp className="ml-0.5 inline h-3 w-3" />
    ) : (
      <HiOutlineChevronDown className="ml-0.5 inline h-3 w-3" />
    );
  };

  return (
    <div className="flex h-full flex-col">
      {/* Filter bar */}
      <div className="flex items-center gap-2 border-b border-light-200 px-4 py-2 dark:border-dark-200">
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors ${
            activeFilterCount > 0
              ? "border-brand-300 bg-brand-50 text-brand-700 dark:border-brand-700 dark:bg-brand-950/20 dark:text-brand-300"
              : "border-light-300 text-light-900 hover:bg-light-100 dark:border-dark-300 dark:text-dark-900 dark:hover:bg-dark-200"
          }`}
        >
          <HiOutlineFunnel className="h-3.5 w-3.5" />
          Filters
          {activeFilterCount > 0 && (
            <span className="rounded-full bg-brand-200 px-1.5 py-0.5 text-[10px] font-bold text-brand-800 dark:bg-brand-800 dark:text-brand-200">
              {activeFilterCount}
            </span>
          )}
        </button>
        {activeFilterCount > 0 && (
          <button
            onClick={() => {
              setFilterStatus([]);
              setFilterType([]);
              setFilterPriority([]);
            }}
            className="text-xs text-light-800 hover:text-light-900 dark:text-dark-800 dark:hover:text-dark-900"
          >
            Clear all
          </button>
        )}
        <span className="ml-auto text-xs text-light-800 dark:text-dark-800">
          {sorted.length} item{sorted.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Inline filter chips */}
      {showFilters && (
        <div className="flex flex-wrap gap-3 border-b border-light-200 px-4 py-2.5 dark:border-dark-200">
          <FilterGroup
            label="Status"
            options={ALL_STATUSES}
            selected={filterStatus}
            onToggle={(v) => toggleFilter(filterStatus, setFilterStatus, v)}
            renderLabel={(s) => s.replace(/([A-Z])/g, " $1").trim()}
          />
          <FilterGroup
            label="Type"
            options={ALL_TYPES}
            selected={filterType}
            onToggle={(v) => toggleFilter(filterType, setFilterType, v)}
          />
          <FilterGroup
            label="Priority"
            options={ALL_PRIORITIES}
            selected={filterPriority}
            onToggle={(v) => toggleFilter(filterPriority, setFilterPriority, v)}
          />
        </div>
      )}

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full min-w-[900px]">
          <thead className="sticky top-0 z-10 bg-light-100 dark:bg-dark-100">
            <tr>
              <Th onClick={() => toggleSort("title")} className="w-[40%]">
                Title <SortIcon column="title" />
              </Th>
              <Th onClick={() => toggleSort("type")} className="w-16">
                Type <SortIcon column="type" />
              </Th>
              <Th onClick={() => toggleSort("priority")} className="w-16">
                Priority <SortIcon column="priority" />
              </Th>
              <Th onClick={() => toggleSort("status")} className="w-28">
                Status <SortIcon column="status" />
              </Th>
              <Th onClick={() => toggleSort("assignee")} className="w-36">
                Assigned To <SortIcon column="assignee" />
              </Th>
              <Th onClick={() => toggleSort("effort")} className="w-16">
                Effort <SortIcon column="effort" />
              </Th>
              <Th onClick={() => toggleSort("risk")} className="w-20">
                Risk <SortIcon column="risk" />
              </Th>
              <Th onClick={() => toggleSort("created")} className="w-28">
                Created <SortIcon column="created" />
              </Th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((item) => {
              const effort = item.estimatedEffortJson as { tShirt?: string } | null;
              const assignee = item.assignedMember?.user;
              return (
                <tr
                  key={item.publicId}
                  onClick={() => onItemClick(item.publicId)}
                  className="cursor-pointer border-b border-light-200 transition-colors hover:bg-light-100 dark:border-dark-200 dark:hover:bg-dark-100"
                >
                  <td className="px-3 py-2.5 text-sm font-medium text-light-900 dark:text-dark-900">
                    <span className="line-clamp-1">{item.title}</span>
                  </td>
                  <td className="px-3 py-2.5">
                    <span className="flex items-center gap-1">
                      {TYPE_ICONS[item.type]}
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    <span className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold ${PRIORITY_COLORS[item.priority] ?? ""}`}>
                      {item.priority}
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    <span className="flex items-center gap-1.5">
                      <span className={`h-2 w-2 rounded-full ${STATUS_DOTS[item.status] ?? "bg-slate-400"}`} />
                      <span className="text-xs text-light-900 dark:text-dark-900">
                        {item.status.replace(/([A-Z])/g, " $1").trim()}
                      </span>
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    {assignee ? (
                      <span className="flex items-center gap-1.5">
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-100 text-[9px] font-bold text-brand-700 dark:bg-brand-900/40 dark:text-brand-300">
                          {(assignee.name ?? assignee.email).charAt(0).toUpperCase()}
                        </span>
                        <span className="truncate text-xs text-light-900 dark:text-dark-900">
                          {assignee.name ?? assignee.email}
                        </span>
                      </span>
                    ) : (
                      <span className="text-xs text-light-800 dark:text-dark-800">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5">
                    {effort?.tShirt ? (
                      <span className="rounded bg-light-200 px-1.5 py-0.5 text-[10px] font-medium dark:bg-dark-200">
                        {effort.tShirt}
                      </span>
                    ) : (
                      <span className="text-xs text-light-800 dark:text-dark-800">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5">
                    <span className={`text-xs font-medium ${RISK_COLORS[item.riskLevel] ?? ""}`}>
                      {item.riskLevel}
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    <span className="text-xs text-light-800 dark:text-dark-800">
                      {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
                    </span>
                  </td>
                </tr>
              );
            })}
            {sorted.length === 0 && (
              <tr>
                <td colSpan={8} className="py-12 text-center text-sm text-light-800 dark:text-dark-800">
                  No work items match your filters
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Sub-components ──────────────────────────────────────────────────────────

function Th({
  onClick,
  children,
  className,
}: {
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <th
      onClick={onClick}
      className={`cursor-pointer select-none border-b border-light-300 px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-light-800 transition-colors hover:text-light-900 dark:border-dark-300 dark:text-dark-800 dark:hover:text-dark-900 ${className ?? ""}`}
    >
      {children}
    </th>
  );
}

function FilterGroup({
  label,
  options,
  selected,
  onToggle,
  renderLabel,
}: {
  label: string;
  options: string[];
  selected: string[];
  onToggle: (value: string) => void;
  renderLabel?: (value: string) => string;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-light-800 dark:text-dark-800">
        {label}:
      </span>
      {options.map((opt) => (
        <button
          key={opt}
          onClick={() => onToggle(opt)}
          className={`rounded-full px-2 py-0.5 text-[10px] font-medium transition-colors ${
            selected.includes(opt)
              ? "bg-brand-100 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300"
              : "bg-light-200 text-light-800 hover:bg-light-300 dark:bg-dark-200 dark:text-dark-800 dark:hover:bg-dark-300"
          }`}
        >
          {renderLabel ? renderLabel(opt) : opt}
        </button>
      ))}
    </div>
  );
}
