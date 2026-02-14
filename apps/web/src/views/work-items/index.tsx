import { useState } from "react";
import {
  HiOutlineArrowPath,
  HiOutlineDocumentText,
} from "react-icons/hi2";

import { PageHead } from "~/components/PageHead";
import { useRealtimeWorkItems } from "~/hooks/useRealtimeWorkItems";
import { useWorkspace } from "~/providers/workspace";
import { api } from "~/utils/api";
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

  const { data: workItems, refetch, isLoading, isFetching } = api.workItem.list.useQuery(
    { workspacePublicId: workspace.publicId },
    {
      enabled: !!workspace.publicId && workspace.publicId.length >= 12,
      staleTime: 60_000, // Fresh for 60s — Realtime handles updates
    },
  );

  // Replace polling with Realtime subscription for instant updates
  useRealtimeWorkItems({
    enabled: !!workspace.publicId && workspace.publicId.length >= 12,
    onInvalidate: refetch,
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
          <button
            onClick={() => setShowLogs(true)}
            className="flex items-center gap-1.5 rounded-md border border-light-300 px-2.5 py-1.5 text-xs font-medium transition-colors duration-0 hover:bg-light-200 dark:border-dark-300 dark:hover:bg-dark-200"
            title="View pipeline logs"
          >
            <HiOutlineDocumentText className="h-3.5 w-3.5 text-light-900 dark:text-dark-900" />
            <span className="text-light-900 dark:text-dark-900">Logs</span>
          </button>
          <button
            onClick={() => refetch()}
            className="rounded-md border border-light-300 p-1.5 transition-colors duration-0 hover:bg-light-200 dark:border-dark-300 dark:hover:bg-dark-200"
            title="Refresh"
          >
            <HiOutlineArrowPath className="h-4 w-4 text-light-900 dark:text-dark-900" />
          </button>
        </div>
      </div>

      {/* Kanban Board */}
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

      {/* Drawer */}
      {selectedWorkItemId && (
        <WorkItemDrawer
          publicId={selectedWorkItemId}
          onClose={() => setSelectedWorkItemId(null)}
          onRefresh={() => refetch()}
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
          onAction={() => refetch()}
        />
      )}

      {/* Logs Panel */}
      {showLogs && <LogsPanel onClose={() => setShowLogs(false)} />}
    </div>
  );
}
