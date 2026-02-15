import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

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

export const TSHIRT_DAYS: Record<string, number> = {
  XS: 0.5,
  S: 1,
  M: 2,
  L: 4,
  XL: 8,
};

// ── Duration helper (exported for use by GanttRow scheduling) ────────────────

export function getEstimatedDays(estimatedEffortJson?: unknown): number {
  const effort = estimatedEffortJson as {
    tShirt?: string;
    hours?: number;
    hoursMin?: number;
    hoursMax?: number;
  } | null;

  if (effort?.hoursMax) return Math.max(0.5, effort.hoursMax / 8);
  if (effort?.hours) return Math.max(0.5, effort.hours / 8);
  if (effort?.hoursMin) return Math.max(0.5, effort.hoursMin / 8);
  if (effort?.tShirt) return TSHIRT_DAYS[effort.tShirt] ?? 2;
  return 2; // default
}

// ── Props ────────────────────────────────────────────────────────────────────

interface GanttBarProps {
  item: {
    publicId: string;
    title: string;
    status: string;
    type: string;
    priority: string;
  };
  /** Pre-computed pixel offset from the left edge of the timeline */
  left: number;
  /** Pre-computed pixel width of the bar */
  width: number;
  onClick: () => void;
}

// ── Component ────────────────────────────────────────────────────────────────

export default function GanttBar({
  item,
  left,
  width,
  onClick,
}: GanttBarProps) {
  const [hovered, setHovered] = useState(false);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);
  const barRef = useRef<HTMLButtonElement>(null);

  const colors = STATUS_COLORS[item.status] ?? STATUS_COLORS.Draft!;

  // Position the tooltip relative to the viewport (using a portal)
  useEffect(() => {
    if (hovered && barRef.current) {
      const rect = barRef.current.getBoundingClientRect();
      setTooltipPos({
        x: rect.left + rect.width / 2,
        y: rect.top,
      });
    } else {
      setTooltipPos(null);
    }
  }, [hovered]);

  return (
    <>
      <button
        ref={barRef}
        onClick={onClick}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className={`flex h-7 items-center overflow-hidden rounded-md border px-2 text-[11px] font-medium leading-tight transition-shadow hover:shadow-md ${colors.bg} ${colors.border} ${colors.text}`}
        style={{
          width: `${width}px`,
          minWidth: `${width}px`,
        }}
      >
        <span className="truncate">{item.title}</span>
      </button>

      {/* Tooltip — rendered via portal to escape overflow/stacking constraints */}
      {hovered &&
        tooltipPos &&
        createPortal(
          <div
            className="pointer-events-none fixed z-[9999] whitespace-nowrap rounded-lg border border-light-200 bg-white px-3 py-2 text-xs shadow-xl dark:border-dark-300 dark:bg-dark-100"
            style={{
              left: `${tooltipPos.x}px`,
              top: `${tooltipPos.y - 8}px`,
              transform: "translate(-50%, -100%)",
            }}
          >
            <p className="max-w-xs truncate font-semibold text-light-900 dark:text-dark-900">
              {item.title}
            </p>
            <div className="mt-1 flex items-center gap-2 text-light-800 dark:text-dark-800">
              <span>{item.type}</span>
              <span>&middot;</span>
              <span>{item.priority}</span>
              <span>&middot;</span>
              <span>{item.status.replace(/([A-Z])/g, " $1").trim()}</span>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
