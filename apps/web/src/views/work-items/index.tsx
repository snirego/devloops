import { useCallback, useEffect, useState } from "react";
import {
  HiOutlineArrowPath,
  HiOutlineDocumentText,
  HiOutlineViewColumns,
  HiOutlineBars3,
  HiOutlineCalendarDays,
} from "react-icons/hi2";

import { PageHead } from "~/components/PageHead";
import { useRealtimeWorkItems } from "~/hooks/useRealtimeWorkItems";
import { useWorkspace } from "~/providers/workspace";
import { api } from "~/utils/api";
import GanttView from "./components/GanttView";
import TableView from "./components/TableView";
import WorkItemCard from "./components/WorkItemCard";
import { WorkItemContextMenu } from "./components/WorkItemContextMenu";
import WorkItemDrawer from "./components/WorkItemDrawer";
import LogsPanel from "./components/LogsPanel";

const KANBAN_COLUMNS = [
  { status: "PendingApproval", label: "Pending Approval", color: "bg-amber-500" },
  { status: "Approved", label: "Approved", color: "bg-blue-500" },
  { status: "InProgress", label: "In Progress", color: "bg-violet-500" },
  { status: "NeedsReview", label: "Needs Review", color: "bg-orange-500" },
  { status: "Done", label: "Done", color: "bg-emerald-500" },
  { status: "OnHold", label: "On Hold", color: "bg-slate-400" },
  { status: "Rejected", label: "Rejected", color: "bg-red-400" },
  { status: "Failed", label: "Failed", color: "bg-red-600" },
] as const;

type ViewMode = "kanban" | "gantt" | "table";

const VIEW_STORAGE_KEY = "devloops-work-items-view";

export default function WorkItemsView() {
  const { workspace } = useWorkspace();
  const [selectedWorkItemId, setSelectedWorkItemId] = useState<string | null>(
    null,
  );
  const [showLogs, setShowLogs] = useState(false);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    publicId: string;
    title: string;
    status: string;
  } | null>(null);

  // View mode (persisted to localStorage — hydrate after mount to avoid SSR mismatch)
  const [viewMode, setViewMode] = useState<ViewMode>("kanban");

  useEffect(() => {
    const stored = localStorage.getItem(VIEW_STORAGE_KEY) as ViewMode | null;
    if (stored && stored !== viewMode) {
      setViewMode(stored);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    localStorage.setItem(VIEW_STORAGE_KEY, viewMode);
  }, [viewMode]);

  const utils = api.useUtils();

  const { data: workItems, isLoading, isFetching } = api.workItem.list.useQuery(
    { workspacePublicId: workspace.publicId },
    {
      enabled: !!workspace.publicId && workspace.publicId.length >= 12,
      staleTime: 5_000, // 5s — Realtime/fallback poll triggers invalidation
    },
  );

  // Invalidate + refetch when Realtime fires (not just refetch — forces stale)
  const invalidateWorkItems = useCallback(() => {
    void utils.workItem.list.invalidate();
  }, [utils.workItem.list]);

  // Replace polling with Realtime subscription for instant updates
  useRealtimeWorkItems({
    enabled: !!workspace.publicId && workspace.publicId.length >= 12,
    onInvalidate: invalidateWorkItems,
  });

  const itemsByStatus = (status: string) =>
    (workItems ?? []).filter((wi: { status: string }) => wi.status === status);

  return (
    <div className="flex h-full flex-col">
      <PageHead title="Work Items" />

      {/* Header */}
      <div className="flex items-center justify-between border-b border-light-300 px-6 py-4 dark:border-dark-300">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-semibold text-light-900 dark:text-dark-900">
            Work Items
          </h1>
          <span className="rounded-full bg-light-200 px-2.5 py-0.5 text-xs font-medium text-light-900 dark:bg-dark-200 dark:text-dark-900">
            {workItems?.length ?? 0}
          </span>
          {isFetching && !isLoading && (
            <span className="text-[10px] text-light-700 dark:text-dark-700">
              syncing...
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {/* View mode toggle */}
          <div className="flex items-center rounded-md border border-light-300 dark:border-dark-300">
            <ViewToggle
              icon={<HiOutlineViewColumns className="h-4 w-4" />}
              label="Kanban"
              active={viewMode === "kanban"}
              onClick={() => setViewMode("kanban")}
              position="left"
            />
            <ViewToggle
              icon={<HiOutlineCalendarDays className="h-4 w-4" />}
              label="Gantt"
              active={viewMode === "gantt"}
              onClick={() => setViewMode("gantt")}
              position="middle"
            />
            <ViewToggle
              icon={<HiOutlineBars3 className="h-4 w-4" />}
              label="Table"
              active={viewMode === "table"}
              onClick={() => setViewMode("table")}
              position="right"
            />
          </div>

          <button
            onClick={() => setShowLogs(true)}
            className="flex items-center gap-1.5 rounded-md border border-light-300 px-2.5 py-1.5 text-xs font-medium transition-colors duration-0 hover:bg-light-200 dark:border-dark-300 dark:hover:bg-dark-200"
            title="View pipeline logs"
          >
            <HiOutlineDocumentText className="h-3.5 w-3.5 text-light-900 dark:text-dark-900" />
            <span className="text-light-900 dark:text-dark-900">Logs</span>
          </button>
          <button
            onClick={invalidateWorkItems}
            className="rounded-md border border-light-300 p-1.5 transition-colors duration-0 hover:bg-light-200 dark:border-dark-300 dark:hover:bg-dark-200"
            title="Refresh"
          >
            <HiOutlineArrowPath className="h-4 w-4 text-light-900 dark:text-dark-900" />
          </button>
        </div>
      </div>

      {/* View body */}
      {viewMode === "kanban" && (
        <div className="flex-1 overflow-x-auto overflow-y-hidden p-4">
          <div className="flex h-full gap-4">
            {KANBAN_COLUMNS.map((col) => {
              const items = itemsByStatus(col.status);
              return (
                <div
                  key={col.status}
                  className="flex h-full w-72 min-w-[288px] flex-shrink-0 flex-col rounded-lg bg-light-100 dark:bg-dark-100"
                >
                  {/* Column header */}
                  <div className="flex items-center gap-2 px-3 py-2.5">
                    <div className={`h-2.5 w-2.5 rounded-full ${col.color}`} />
                    <span className="text-sm font-medium text-light-900 dark:text-dark-900">
                      {col.label}
                    </span>
                    <span className="ml-auto text-xs text-light-800 dark:text-dark-800">
                      {items.length}
                    </span>
                  </div>

                  {/* Cards */}
                  <div className="flex-1 space-y-2 overflow-y-auto px-2 pb-2">
                    {items.map((item: { publicId: string; title: string; status: string }) => (
                      <WorkItemCard
                        key={item.publicId}
                        item={item}
                        onClick={() => setSelectedWorkItemId(item.publicId)}
                        onContextMenu={(e) => {
                          e.preventDefault();
                          setContextMenu({
                            x: e.clientX,
                            y: e.clientY,
                            publicId: item.publicId,
                            title: item.title,
                            status: item.status,
                          });
                        }}
                      />
                    ))}
                    {items.length === 0 && !isLoading && (
                      <div className="py-8 text-center text-xs text-light-800 dark:text-dark-800">
                        No items
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {viewMode === "gantt" && (
        <div className="flex-1 overflow-hidden">
          <GanttView
            workItems={(workItems as any[]) ?? []}
            onItemClick={(publicId) => setSelectedWorkItemId(publicId)}
          />
        </div>
      )}

      {viewMode === "table" && (
        <div className="flex-1 overflow-hidden">
          <TableView
            workItems={(workItems as any[]) ?? []}
            onItemClick={(publicId) => setSelectedWorkItemId(publicId)}
          />
        </div>
      )}

      {/* Drawer */}
      {selectedWorkItemId && (
        <WorkItemDrawer
          publicId={selectedWorkItemId}
          onClose={() => setSelectedWorkItemId(null)}
          onRefresh={invalidateWorkItems}
        />
      )}

      {/* Context Menu */}
      {contextMenu && (
        <WorkItemContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          publicId={contextMenu.publicId}
          title={contextMenu.title}
          status={contextMenu.status}
          onClose={() => setContextMenu(null)}
          onAction={invalidateWorkItems}
        />
      )}

      {/* Logs Panel */}
      {showLogs && <LogsPanel onClose={() => setShowLogs(false)} />}
    </div>
  );
}

// ── View toggle button sub-component ────────────────────────────────────────

function ViewToggle({
  icon,
  label,
  active,
  onClick,
  position,
}: {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
  position: "left" | "middle" | "right";
}) {
  const rounded =
    position === "left"
      ? "rounded-l-[5px]"
      : position === "right"
        ? "rounded-r-[5px]"
        : "";

  return (
    <button
      onClick={onClick}
      title={label}
      className={`flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium transition-colors duration-0 ${rounded} ${
        active
          ? "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300"
          : "text-light-900 hover:bg-light-100 dark:text-dark-900 dark:hover:bg-dark-200"
      } ${position === "middle" ? "border-x border-light-300 dark:border-dark-300" : ""}`}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}
