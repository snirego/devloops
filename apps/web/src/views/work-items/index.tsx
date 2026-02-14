import { useState } from "react";
import {
  HiOutlinePlus,
  HiOutlineArrowPath,
  HiOutlineCpuChip,
} from "react-icons/hi2";

import { PageHead } from "~/components/PageHead";
import { useWorkspace } from "~/providers/workspace";
import { api } from "~/utils/api";
import WorkItemCard from "./components/WorkItemCard";
import WorkItemDrawer from "./components/WorkItemDrawer";
import IngestPanel from "./components/IngestPanel";

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
  const [showIngest, setShowIngest] = useState(false);

  const { data: workItems, refetch, isLoading } = api.workItem.list.useQuery(
    { workspacePublicId: workspace.publicId },
    {
      enabled: !!workspace.publicId && workspace.publicId.length >= 12,
      refetchInterval: 10000,
    },
  );

  const { data: llmHealth } = api.feedbackThread.llmHealth.useQuery(undefined, {
    refetchInterval: 30000,
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
        </div>
        <div className="flex items-center gap-2">
          {/* LLM Status indicator */}
          <div className="flex items-center gap-1.5 rounded-md border border-light-300 px-2 py-1 text-xs dark:border-dark-300">
            <HiOutlineCpuChip className="h-3.5 w-3.5" />
            <span
              className={
                llmHealth?.ok
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-red-500"
              }
            >
              {llmHealth?.ok ? "LLM Online" : "LLM Offline"}
            </span>
          </div>

          <button
            onClick={() => refetch()}
            className="rounded-md border border-light-300 p-1.5 transition-colors duration-0 hover:bg-light-200 dark:border-dark-300 dark:hover:bg-dark-200"
            title="Refresh"
          >
            <HiOutlineArrowPath className="h-4 w-4 text-light-900 dark:text-dark-900" />
          </button>
          <button
            onClick={() => setShowIngest(true)}
            className="flex items-center gap-1.5 rounded-md bg-violet-600 px-3 py-1.5 text-sm font-medium text-white transition-colors duration-0 hover:bg-violet-700"
          >
            <HiOutlinePlus className="h-4 w-4" />
            Ingest Message
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
                  {items.map((item: { publicId: string }) => (
                    <WorkItemCard
                      key={item.publicId}
                      item={item}
                      onClick={() => setSelectedWorkItemId(item.publicId)}
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

      {/* Ingest Panel */}
      {showIngest && (
        <IngestPanel
          onClose={() => setShowIngest(false)}
          onSuccess={() => {
            refetch();
            setShowIngest(false);
          }}
        />
      )}
    </div>
  );
}
