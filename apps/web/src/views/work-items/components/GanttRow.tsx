import GanttBar from "./GanttBar";

interface GanttRowProps {
  label: string;
  avatarUrl?: string | null;
  items: Array<{
    publicId: string;
    title: string;
    status: string;
    type: string;
    priority: string;
    createdAt: string | Date;
    estimatedEffortJson?: unknown;
  }>;
  dayWidth: number;
  totalDays: number;
  startDate: Date;
  onItemClick: (publicId: string) => void;
}

export default function GanttRow({
  label,
  avatarUrl,
  items,
  dayWidth,
  totalDays,
  startDate,
  onItemClick,
}: GanttRowProps) {
  return (
    <div className="flex border-b border-light-200 dark:border-dark-200">
      {/* Developer label (sticky left) */}
      <div className="sticky left-0 z-10 flex w-48 min-w-[192px] flex-shrink-0 items-center gap-2 border-r border-light-200 bg-light-50 px-3 py-2 dark:border-dark-200 dark:bg-dark-50">
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt=""
            className="h-6 w-6 rounded-full object-cover"
          />
        ) : (
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-violet-100 text-[10px] font-bold text-violet-700 dark:bg-violet-900/40 dark:text-violet-300">
            {label.charAt(0).toUpperCase()}
          </div>
        )}
        <span className="truncate text-xs font-medium text-light-900 dark:text-dark-900">
          {label}
        </span>
        <span className="ml-auto text-[10px] text-light-800 dark:text-dark-800">
          {items.length}
        </span>
      </div>

      {/* Timeline area */}
      <div
        className="relative h-10 flex-1"
        style={{ minWidth: `${totalDays * dayWidth}px` }}
      >
        {items.map((item) => (
          <GanttBar
            key={item.publicId}
            item={item}
            dayWidth={dayWidth}
            startDate={startDate}
            onClick={() => onItemClick(item.publicId)}
          />
        ))}
      </div>
    </div>
  );
}
