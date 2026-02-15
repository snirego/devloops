import { useMemo } from "react";

import GanttBar, { getEstimatedDays } from "./GanttBar";

// ── Types ────────────────────────────────────────────────────────────────────

interface WorkItem {
  publicId: string;
  title: string;
  status: string;
  type: string;
  priority: string;
  createdAt: string | Date;
  estimatedEffortJson?: unknown;
}

interface GanttRowProps {
  label: string;
  avatarUrl?: string | null;
  items: WorkItem[];
  dayWidth: number;
  totalDays: number;
  startDate: Date;
  onItemClick: (publicId: string) => void;
}

// ── Status ordering (active work first, then backlog, then done) ─────────────

const STATUS_ORDER: Record<string, number> = {
  InProgress:      0,
  NeedsReview:     1,
  Approved:        2,
  PendingApproval: 3,
  OnHold:          4,
  Draft:           5,
  Done:            6,
  Failed:          7,
  Rejected:        8,
  Canceled:        9,
};

const PRIORITY_ORDER: Record<string, number> = {
  P0: 0,
  P1: 1,
  P2: 2,
  P3: 3,
};

// ── Sequential scheduling ────────────────────────────────────────────────────
// Sorts items by status (active first) then priority, then lays them out
// end-to-end on a single timeline: each task starts where the previous ends.
// The first task starts at whichever is earlier: the developer's first
// created-at date or today.

interface ScheduledItem {
  item: WorkItem;
  leftPx: number;
  widthPx: number;
}

function scheduleSequentially(
  items: WorkItem[],
  dayWidth: number,
  startDate: Date,
): ScheduledItem[] {
  if (items.length === 0) return [];

  // Sort: active statuses first, then by priority, then by createdAt
  const sorted = [...items].sort((a, b) => {
    const statusDiff =
      (STATUS_ORDER[a.status] ?? 99) - (STATUS_ORDER[b.status] ?? 99);
    if (statusDiff !== 0) return statusDiff;

    const prioDiff =
      (PRIORITY_ORDER[a.priority] ?? 99) - (PRIORITY_ORDER[b.priority] ?? 99);
    if (prioDiff !== 0) return prioDiff;

    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });

  // The timeline starts at the earliest createdAt or the chart start date,
  // whichever comes later (we don't show bars before the chart starts)
  const earliestCreated = Math.min(
    ...items.map((i) => new Date(i.createdAt).getTime()),
  );
  const chartStart = startDate.getTime();
  const timelineStart = Math.max(earliestCreated, chartStart);

  // Convert timeline start to pixel offset from chart start
  const startOffsetDays =
    (timelineStart - chartStart) / (1000 * 60 * 60 * 24);
  let cursorPx = startOffsetDays * dayWidth;

  const GAP_PX = 4; // small gap between sequential bars

  const result: ScheduledItem[] = [];

  for (const item of sorted) {
    const durationDays = getEstimatedDays(item.estimatedEffortJson);
    const widthPx = Math.max(dayWidth * 0.5, durationDays * dayWidth);

    result.push({
      item,
      leftPx: cursorPx,
      widthPx,
    });

    cursorPx += widthPx + GAP_PX;
  }

  return result;
}

// ── Component ────────────────────────────────────────────────────────────────

const ROW_HEIGHT = 44; // single-lane row height

export default function GanttRow({
  label,
  avatarUrl,
  items,
  dayWidth,
  totalDays,
  startDate,
  onItemClick,
}: GanttRowProps) {
  const scheduled = useMemo(
    () => scheduleSequentially(items, dayWidth, startDate),
    [items, dayWidth, startDate],
  );

  // The timeline needs to be wide enough for both the default day columns
  // AND the scheduled bars (they might extend past 28 days)
  const scheduledEnd =
    scheduled.length > 0
      ? Math.max(...scheduled.map((s) => s.leftPx + s.widthPx))
      : 0;
  const timelineMinWidth = Math.max(
    totalDays * dayWidth,
    scheduledEnd + dayWidth, // a little extra space after the last bar
  );

  return (
    <div className="flex border-b border-light-200 dark:border-dark-200">
      {/* Developer label (sticky left) */}
      <div
        className="sticky left-0 z-10 flex w-48 min-w-[192px] flex-shrink-0 items-center gap-2 border-r border-light-200 bg-light-50 px-3 dark:border-dark-200 dark:bg-dark-50"
        style={{ height: `${ROW_HEIGHT}px` }}
      >
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt=""
            className="h-6 w-6 flex-shrink-0 rounded-full object-cover"
          />
        ) : (
          <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-violet-100 text-[10px] font-bold text-violet-700 dark:bg-violet-900/40 dark:text-violet-300">
            {label.charAt(0).toUpperCase()}
          </div>
        )}
        <span className="truncate text-xs font-medium text-light-900 dark:text-dark-900">
          {label}
        </span>
        <span className="ml-auto flex-shrink-0 text-[10px] text-light-800 dark:text-dark-800">
          {items.length}
        </span>
      </div>

      {/* Timeline area — bars laid out sequentially on one line */}
      <div
        className="relative flex items-center gap-0"
        style={{
          minWidth: `${timelineMinWidth}px`,
          height: `${ROW_HEIGHT}px`,
        }}
      >
        {scheduled.map((entry) => (
          <div
            key={entry.item.publicId}
            className="absolute"
            style={{
              left: `${entry.leftPx}px`,
              top: "50%",
              transform: "translateY(-50%)",
            }}
          >
            <GanttBar
              item={entry.item}
              left={entry.leftPx}
              width={entry.widthPx}
              onClick={() => onItemClick(entry.item.publicId)}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
