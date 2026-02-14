import { api } from "~/utils/api";

type WorkItemStatus =
  | "Draft"
  | "PendingApproval"
  | "Approved"
  | "Rejected"
  | "OnHold"
  | "InProgress"
  | "NeedsReview"
  | "Done"
  | "Failed"
  | "Canceled";

/**
 * Factory to create optimistic mutation options for a WorkItem status change.
 * Pass this as options to `api.workItem.<action>.useMutation(...)`.
 */
export function createOptimisticStatusMutation(
  utils: ReturnType<typeof api.useUtils>,
  newStatus: WorkItemStatus,
  workspacePublicId: string,
  extraCallbacks?: {
    onSuccess?: () => void;
    onError?: () => void;
  },
) {
  return {
    onMutate: async (input: { publicId: string }) => {
      // Cancel any outgoing refetches so they don't overwrite our optimistic update
      await utils.workItem.list.cancel();
      await utils.workItem.byPublicId.cancel({ publicId: input.publicId });

      // Snapshot previous list data for rollback
      const prevList = utils.workItem.list.getData({
        workspacePublicId,
      });
      const prevItem = utils.workItem.byPublicId.getData({
        publicId: input.publicId,
      });

      // Optimistically update the item in the list cache
      utils.workItem.list.setData(
        { workspacePublicId },
        (old) =>
          old?.map((wi) =>
            wi.publicId === input.publicId
              ? { ...wi, status: newStatus, updatedAt: new Date() }
              : wi,
          ),
      );

      // Also update the single-item cache (used by WorkItemDrawer)
      if (prevItem) {
        utils.workItem.byPublicId.setData(
          { publicId: input.publicId },
          { ...prevItem, status: newStatus, updatedAt: new Date() },
        );
      }

      return { prevList, prevItem };
    },
    onError: (
      _err: unknown,
      _vars: { publicId: string },
      ctx?: { prevList?: unknown; prevItem?: unknown },
    ) => {
      // Rollback to previous data on error
      if (ctx?.prevList) {
        utils.workItem.list.setData(
          { workspacePublicId },
          ctx.prevList as WorkItemListData,
        );
      }
      if (ctx?.prevItem) {
        utils.workItem.byPublicId.setData(
          { publicId: _vars.publicId },
          ctx.prevItem as WorkItemData,
        );
      }
      extraCallbacks?.onError?.();
    },
    onSettled: () => {
      // Revalidate in background to ensure server state is synced
      utils.workItem.list.invalidate();
      extraCallbacks?.onSuccess?.();
    },
  } as const;
}

// Type helpers — extract the data types for rollback casting
type WorkItemListData = ReturnType<
  ReturnType<typeof api.useUtils>["workItem"]["list"]["getData"]
>;
type WorkItemData = ReturnType<
  ReturnType<typeof api.useUtils>["workItem"]["byPublicId"]["getData"]
>;
