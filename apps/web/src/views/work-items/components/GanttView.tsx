import { useMemo, useRef } from "react";
import { format, addDays, startOfWeek, differenceInDays, isToday } from "date-fns";

import GanttRow from "./GanttRow";

// ── Helpers ─────────────────────────────────────────────────────────────────

function getAvatarUrl(image: string | null | undefined) {
  if (!image) return null;
  if (image.startsWith("http")) return image;
  return `/api/avatars/${image}`;
}

// ── Types ───────────────────────────────────────────────────────────────────

interface WorkItem {
  publicId: string;
  title: string;
  status: string;
  type: string;
  priority: string;
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

interface GanttViewProps {
  workItems: WorkItem[];
  onItemClick: (publicId: string) => void;
}

// ── Constants ───────────────────────────────────────────────────────────────

const DAY_WIDTH = 64; // px per day
const TOTAL_DAYS = 28; // 4 weeks visible

export default function GanttView({ workItems, onItemClick }: GanttViewProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Start from the beginning of the current week
  const startDate = useMemo(() => startOfWeek(new Date(), { weekStartsOn: 1 }), []);

  // Group work items by assigned member
  const { rows, unassigned } = useMemo(() => {
    const memberMap = new Map<
      string,
      {
        label: string;
        avatarUrl: string | null;
        items: WorkItem[];
      }
    >();

    const unassignedItems: WorkItem[] = [];

    for (const wi of workItems) {
      if (!wi.assignedMember) {
        unassignedItems.push(wi);
        continue;
      }

      const key = wi.assignedMember.publicId;
      if (!memberMap.has(key)) {
        const user = wi.assignedMember.user;
        memberMap.set(key, {
          label: user?.name ?? user?.email ?? "Unknown",
          avatarUrl: getAvatarUrl(user?.image),
          items: [],
        });
      }
      memberMap.get(key)!.items.push(wi);
    }

    return {
      rows: Array.from(memberMap.values()),
      unassigned: unassignedItems,
    };
  }, [workItems]);

  // Generate day columns
  const days = useMemo(() => {
    return Array.from({ length: TOTAL_DAYS }, (_, i) => addDays(startDate, i));
  }, [startDate]);

  const todayOffset = useMemo(() => {
    const diff = differenceInDays(new Date(), startDate);
    if (diff < 0 || diff >= TOTAL_DAYS) return null;
    return diff * DAY_WIDTH + DAY_WIDTH / 2;
  }, [startDate]);

  return (
    <div className="flex h-full flex-col">
      {/* Header with day columns */}
      <div className="flex border-b border-light-300 dark:border-dark-300">
        {/* Label spacer */}
        <div className="sticky left-0 z-20 w-48 min-w-[192px] flex-shrink-0 border-r border-light-200 bg-light-100 px-3 py-2 dark:border-dark-200 dark:bg-dark-100">
          <span className="text-xs font-semibold uppercase tracking-wider text-light-800 dark:text-dark-800">
            Developer
          </span>
        </div>

        {/* Day headers */}
        <div
          className="relative flex flex-1"
          style={{ minWidth: `${TOTAL_DAYS * DAY_WIDTH}px` }}
        >
          {days.map((day, i) => {
            const isWeekend = day.getDay() === 0 || day.getDay() === 6;
            const isTodayCol = isToday(day);
            return (
              <div
                key={i}
                className={`flex flex-col items-center justify-center border-r border-light-200 py-1.5 dark:border-dark-200 ${
                  isWeekend
                    ? "bg-light-100/60 dark:bg-dark-100/40"
                    : "bg-light-50 dark:bg-dark-50"
                } ${isTodayCol ? "bg-violet-50 dark:bg-violet-950/20" : ""}`}
                style={{ width: `${DAY_WIDTH}px`, minWidth: `${DAY_WIDTH}px` }}
              >
                <span className="text-[10px] font-medium uppercase text-light-800 dark:text-dark-800">
                  {format(day, "EEE")}
                </span>
                <span
                  className={`text-xs font-semibold ${
                    isTodayCol
                      ? "text-violet-600 dark:text-violet-400"
                      : "text-light-900 dark:text-dark-900"
                  }`}
                >
                  {format(day, "d")}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Scrollable body */}
      <div ref={scrollRef} className="flex-1 overflow-auto">
        <div className="relative">
          {/* Today marker */}
          {todayOffset !== null && (
            <div
              className="absolute top-0 bottom-0 z-10 w-0.5 bg-red-500/60"
              style={{ left: `${192 + todayOffset}px` }}
            />
          )}

          {/* Developer rows */}
          {rows.map((row) => (
            <GanttRow
              key={row.label}
              label={row.label}
              avatarUrl={row.avatarUrl}
              items={row.items}
              dayWidth={DAY_WIDTH}
              totalDays={TOTAL_DAYS}
              startDate={startDate}
              onItemClick={onItemClick}
            />
          ))}

          {/* Unassigned row */}
          {unassigned.length > 0 && (
            <GanttRow
              label="Unassigned"
              items={unassigned}
              dayWidth={DAY_WIDTH}
              totalDays={TOTAL_DAYS}
              startDate={startDate}
              onItemClick={onItemClick}
            />
          )}

          {/* Empty state */}
          {rows.length === 0 && unassigned.length === 0 && (
            <div className="flex h-40 items-center justify-center text-sm text-light-800 dark:text-dark-800">
              No work items to display
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
