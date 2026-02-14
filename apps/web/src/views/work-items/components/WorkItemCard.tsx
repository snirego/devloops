import {
  HiOutlineBugAnt,
  HiOutlineLightBulb,
  HiOutlineWrench,
  HiOutlineDocumentText,
} from "react-icons/hi2";

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

interface WorkItemCardProps {
  item: {
    publicId: string;
    title: string;
    type: string;
    priority: string;
    status: string;
    confidenceScore: number;
    riskLevel: string;
    estimatedEffortJson?: unknown;
    thread?: { publicId: string } | null;
  };
  onClick: () => void;
  onContextMenu?: (e: React.MouseEvent) => void;
}

export default function WorkItemCard({ item, onClick, onContextMenu }: WorkItemCardProps) {
  const effort = item.estimatedEffortJson as
    | { tShirt?: string }
    | null
    | undefined;

  return (
    <button
      onClick={onClick}
      onContextMenu={onContextMenu}
      className="w-full rounded-lg border border-light-300 bg-white p-3 text-left shadow-sm transition-all duration-0 hover:shadow-md dark:border-dark-300 dark:bg-dark-50 dark:hover:border-dark-400"
    >
      {/* Top row: type icon + priority */}
      <div className="mb-1.5 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          {TYPE_ICONS[item.type] ?? null}
          <span className="text-xs text-light-800 dark:text-dark-800">
            {item.type}
          </span>
        </div>
        <span
          className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${PRIORITY_COLORS[item.priority] ?? ""}`}
        >
          {item.priority}
        </span>
      </div>

      {/* Title */}
      <p className="mb-2 line-clamp-2 text-sm font-medium text-light-900 dark:text-dark-900">
        {item.title}
      </p>

      {/* Bottom row */}
      <div className="flex items-center gap-2 text-[10px]">
        {effort?.tShirt && (
          <span className="rounded bg-light-200 px-1.5 py-0.5 dark:bg-dark-200">
            {effort.tShirt}
          </span>
        )}
        <span className="text-light-800 dark:text-dark-800">
          {item.riskLevel} risk
        </span>
        <span className="ml-auto text-light-800 dark:text-dark-800">
          {(item.confidenceScore * 100).toFixed(0)}%
        </span>
      </div>
    </button>
  );
}
