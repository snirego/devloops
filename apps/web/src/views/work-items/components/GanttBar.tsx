import { useMemo, useState } from "react";

// ── Status color mapping ────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  Draft:           { bg: "bg-slate-200 dark:bg-slate-700",       border: "border-slate-300 dark:border-slate-600",   text: "text-slate-800 dark:text-slate-200" },
  PendingApproval: { bg: "bg-amber-200 dark:bg-amber-800/50",   border: "border-amber-300 dark:border-amber-700",   text: "text-amber-900 dark:text-amber-200" },
  Approved:        { bg: "bg-blue-200 dark:bg-blue-800/50",      border: "border-blue-300 dark:border-blue-700",     text: "text-blue-900 dark:text-blue-200" },
  InProgress:      { bg: "bg-violet-200 dark:bg-violet-800/50",  border: "border-violet-300 dark:border-violet-700", text: "text-violet-900 dark:text-violet-200" },
  NeedsReview:     { bg: "bg-orange-200 dark:bg-orange-800/50",  border: "border-orange-300 dark:border-orange-700", text: "text-orange-900 dark:text-orange-200" },
  Done:            { bg: "bg-emerald-200 dark:bg-emerald-800/50", border: "border-emerald-300 dark:border-emerald-700", text: "text-emerald-900 dark:text-emerald-200" },
  OnHold:          { bg: "bg-slate-200 dark:bg-slate-700",       border: "border-slate-300 dark:border-slate-600",   text: "text-slate-700 dark:text-slate-300" },
  Rejected:        { bg: "bg-red-200 dark:bg-red-800/50",        border: "border-red-300 dark:border-red-700",       text: "text-red-900 dark:text-red-200" },
  Failed:          { bg: "bg-red-300 dark:bg-red-900/50",        border: "border-red-400 dark:border-red-800",       text: "text-red-900 dark:text-red-200" },
  Canceled:        { bg: "bg-slate-100 dark:bg-slate-800",       border: "border-slate-200 dark:border-slate-700",   text: "text-slate-500 dark:text-slate-400" },
};

// ── T-shirt size → days mapping ──────────────────────────────────────────────

const TSHIRT_DAYS: Record<string, number> = {
  XS: 0.5,
  S: 1,
  M: 2,
  L: 4,
  XL: 8,
};

// ── Props ────────────────────────────────────────────────────────────────────

interface GanttBarProps {
  item: {
    publicId: string;
    title: string;
    status: string;
    type: string;
    priority: string;
    createdAt: string | Date;
    estimatedEffortJson?: unknown;
  };
  dayWidth: number;
  startDate: Date;
  onClick: () => void;
}

export default function GanttBar({ item, dayWidth, startDate, onClick }: GanttBarProps) {
  const [hovered, setHovered] = useState(false);

  const { left, width } = useMemo(() => {
    const created = new Date(item.createdAt);
    const diffMs = created.getTime() - startDate.getTime();
    const diffDays = Math.max(0, diffMs / (1000 * 60 * 60 * 24));

    const effort = item.estimatedEffortJson as {
      tShirt?: string;
      hoursMin?: number;
      hoursMax?: number;
    } | null;

    let durationDays = 2; // default
    if (effort?.hoursMax) {
      durationDays = Math.max(0.5, effort.hoursMax / 8);
    } else if (effort?.hoursMin) {
      durationDays = Math.max(0.5, effort.hoursMin / 8);
    } else if (effort?.tShirt) {
      durationDays = TSHIRT_DAYS[effort.tShirt] ?? 2;
    }

    return {
      left: diffDays * dayWidth,
      width: Math.max(dayWidth * 0.5, durationDays * dayWidth),
    };
  }, [item.createdAt, item.estimatedEffortJson, dayWidth, startDate]);

  const colors = STATUS_COLORS[item.status] ?? STATUS_COLORS.Draft!;

  return (
    <div
      className="absolute top-1 bottom-1"
      style={{ left: `${left}px`, width: `${width}px` }}
    >
      <button
        onClick={onClick}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className={`flex h-full w-full items-center overflow-hidden rounded-md border px-2 text-[11px] font-medium leading-tight transition-shadow hover:shadow-md ${colors.bg} ${colors.border} ${colors.text}`}
        title={item.title}
      >
        <span className="truncate">{item.title}</span>
      </button>

      {/* Tooltip */}
      {hovered && (
        <div className="pointer-events-none absolute left-1/2 bottom-full z-50 mb-2 -translate-x-1/2 whitespace-nowrap rounded-lg border border-light-200 bg-white px-3 py-2 text-xs shadow-xl dark:border-dark-300 dark:bg-dark-100">
          <p className="font-semibold text-light-900 dark:text-dark-900">{item.title}</p>
          <div className="mt-1 flex items-center gap-2 text-light-800 dark:text-dark-800">
            <span>{item.type}</span>
            <span>&middot;</span>
            <span>{item.priority}</span>
            <span>&middot;</span>
            <span>{item.status.replace(/([A-Z])/g, " $1").trim()}</span>
          </div>
        </div>
      )}
    </div>
  );
}
