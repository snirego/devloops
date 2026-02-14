import { useCallback, useState } from "react";
import {
  HiOutlineCheck,
  HiOutlineNoSymbol,
  HiOutlinePause,
  HiOutlinePlay,
  HiOutlineEye,
  HiOutlineFire,
  HiOutlineXCircle,
  HiOutlineClipboard,
  HiOutlineLink,
  HiOutlineArrowsRightLeft,
  HiOutlinePencil,
} from "react-icons/hi2";

import ContextMenu from "~/components/ContextMenu";
import type { ContextMenuEntry } from "~/components/ContextMenu";
import { createOptimisticStatusMutation } from "~/hooks/useOptimisticWorkItemStatus";
import { usePopup } from "~/providers/popup";
import { useWorkspace } from "~/providers/workspace";
import { api } from "~/utils/api";

// ── Valid transitions (mirrors the server-side map) ───────────────────
const VALID_TRANSITIONS: Record<string, string[]> = {
  Draft: ["PendingApproval", "Canceled"],
  PendingApproval: ["Approved", "Rejected", "OnHold", "Canceled"],
  Approved: ["InProgress", "OnHold", "Canceled"],
  Rejected: ["PendingApproval", "Canceled"],
  OnHold: ["PendingApproval", "Approved", "Canceled"],
  InProgress: ["NeedsReview", "Done", "Failed", "OnHold", "Canceled"],
  NeedsReview: ["InProgress", "Done", "Failed", "Canceled"],
  Done: [],
  Failed: ["InProgress", "PendingApproval", "Canceled"],
  Canceled: [],
};

const STATUS_LABELS: Record<string, string> = {
  PendingApproval: "Pending Approval",
  Approved: "Approved",
  Rejected: "Rejected",
  OnHold: "On Hold",
  InProgress: "In Progress",
  NeedsReview: "Needs Review",
  Done: "Done",
  Failed: "Failed",
  Canceled: "Canceled",
};

// ── Props ─────────────────────────────────────────────────────────────

interface WorkItemContextMenuProps {
  x: number;
  y: number;
  publicId: string;
  title: string;
  status: string;
  onClose: () => void;
  /** Callback after any mutation (invalidate list, etc.) */
  onAction?: () => void;
}

// ── Component ─────────────────────────────────────────────────────────

export function WorkItemContextMenu({
  x,
  y,
  publicId,
  title,
  status,
  onClose,
  onAction,
}: WorkItemContextMenuProps) {
  const { workspace } = useWorkspace();
  const { showPopup } = usePopup();
  const utils = api.useUtils();

  // ── Rename state ──
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(title);

  // ── Reason input state (for reject / hold / failed) ──
  const [reasonTarget, setReasonTarget] = useState<
    "reject" | "hold" | "failed" | null
  >(null);
  const [reasonText, setReasonText] = useState("");

  // ── Shared optimistic builder ──
  const optimistic = useCallback(
    (newStatus: string) =>
      createOptimisticStatusMutation(
        utils,
        newStatus as
          | "Approved"
          | "Rejected"
          | "OnHold"
          | "InProgress"
          | "NeedsReview"
          | "Done"
          | "Failed"
          | "Canceled",
        workspace.publicId,
        { onSuccess: onAction },
      ),
    [utils, workspace.publicId, onAction],
  );

  // ── Mutations ──
  const updateFields = api.workItem.updateFields.useMutation({
    onSuccess: onAction,
  });
  const approve = api.workItem.approve.useMutation(optimistic("Approved"));
  const reject = api.workItem.reject.useMutation(optimistic("Rejected"));
  const hold = api.workItem.hold.useMutation(optimistic("OnHold"));
  const start = api.workItem.start.useMutation(optimistic("InProgress"));
  const needsReview = api.workItem.markNeedsReview.useMutation(
    optimistic("NeedsReview"),
  );
  const markDone = api.workItem.markDone.useMutation(optimistic("Done"));
  const markFailed = api.workItem.markFailed.useMutation(
    optimistic("Failed"),
  );
  const cancel = api.workItem.cancel.useMutation(optimistic("Canceled"));
  const createIssue = api.workItem.createGithubIssue.useMutation({
    onSuccess: onAction,
  });
  const { data: ghStatus } = api.workItem.githubStatus.useQuery();

  // ── Handlers ──

  const submitRename = () => {
    const trimmed = renameValue.trim();
    if (trimmed && trimmed !== title) {
      updateFields.mutate({ publicId, title: trimmed });
    }
    onClose();
  };

  const submitReason = () => {
    const text = reasonText.trim();
    if (!text) return;
    if (reasonTarget === "reject") reject.mutate({ publicId, reason: text });
    if (reasonTarget === "hold") hold.mutate({ publicId, reason: text });
    if (reasonTarget === "failed")
      markFailed.mutate({ publicId, reason: text });
    onClose();
  };

  const handleCopyId = () => {
    navigator.clipboard.writeText(publicId);
    showPopup({
      header: "Copied",
      message: `Work item ID copied to clipboard.`,
      icon: "success",
    });
  };

  /** Dispatch a status action that doesn't need a reason */
  const dispatchSimple = (target: string) => {
    switch (target) {
      case "Approved":
        approve.mutate({ publicId });
        break;
      case "InProgress":
        start.mutate({ publicId });
        break;
      case "NeedsReview":
        needsReview.mutate({ publicId });
        break;
      case "Done":
        markDone.mutate({ publicId });
        break;
      case "PendingApproval":
        // Re-submit = update status to PendingApproval via approve (Rejected → PendingApproval)
        // The server uses the same "approve" endpoint; for other origins use updateFields
        updateFields.mutate({ publicId });
        break;
      case "Canceled":
        cancel.mutate({ publicId });
        break;
    }
    onClose();
  };

  const needsReason = (target: string): boolean =>
    target === "Rejected" || target === "OnHold" || target === "Failed";

  // ── Build items ──

  const items: ContextMenuEntry[] = [];

  // Rename (custom content slot)
  if (isRenaming) {
    items.push({
      customContent: true,
      children: ({ onClose: close }) => (
        <div className="w-56 p-2">
          <input
            type="text"
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") submitRename();
              if (e.key === "Escape") close();
            }}
            autoFocus
            className="w-full rounded-md border border-light-300 bg-light-50 px-2.5 py-1.5 text-sm text-neutral-900 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500 dark:border-dark-400 dark:bg-dark-100 dark:text-dark-1000"
          />
          <div className="mt-2 flex justify-end gap-1.5">
            <button
              onClick={close}
              className="rounded-md px-2.5 py-1 text-xs font-medium text-light-900 hover:bg-light-200 dark:text-dark-900 dark:hover:bg-dark-300"
            >
              Cancel
            </button>
            <button
              onClick={submitRename}
              className="rounded-md bg-violet-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-violet-700"
            >
              Save
            </button>
          </div>
        </div>
      ),
    });

    return <ContextMenu x={x} y={y} items={items} onClose={onClose} minWidth="180px" />;
  }

  // Reason input (custom content slot)
  if (reasonTarget) {
    const label =
      reasonTarget === "reject"
        ? "Rejection reason"
        : reasonTarget === "hold"
          ? "Hold reason"
          : "Failure reason";

    items.push({
      customContent: true,
      children: ({ onClose: close }) => (
        <div className="w-56 p-2">
          <label className="mb-1.5 block text-xs font-medium text-light-800 dark:text-dark-800">
            {label}
          </label>
          <input
            type="text"
            value={reasonText}
            onChange={(e) => setReasonText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && reasonText.trim()) submitReason();
              if (e.key === "Escape") close();
            }}
            autoFocus
            placeholder="Enter reason..."
            className="w-full rounded-md border border-light-300 bg-light-50 px-2.5 py-1.5 text-sm text-neutral-900 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500 dark:border-dark-400 dark:bg-dark-100 dark:text-dark-1000"
          />
          <div className="mt-2 flex justify-end gap-1.5">
            <button
              onClick={close}
              className="rounded-md px-2.5 py-1 text-xs font-medium text-light-900 hover:bg-light-200 dark:text-dark-900 dark:hover:bg-dark-300"
            >
              Cancel
            </button>
            <button
              onClick={submitReason}
              disabled={!reasonText.trim()}
              className="rounded-md bg-red-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-40"
            >
              Submit
            </button>
          </div>
        </div>
      ),
    });

    return <ContextMenu x={x} y={y} items={items} onClose={onClose} minWidth="180px" />;
  }

  // ── Normal menu items ──

  // Rename
  items.push({
    label: "Rename",
    icon: <HiOutlinePencil className="h-3.5 w-3.5" />,
    onClick: () => setIsRenaming(true),
    keepOpen: true,
  });

  // Copy ID
  items.push({
    label: "Copy ID",
    icon: <HiOutlineClipboard className="h-3.5 w-3.5" />,
    onClick: handleCopyId,
  });

  // GitHub Issue (only when Approved/InProgress and configured)
  if (
    ghStatus?.configured &&
    (status === "Approved" || status === "InProgress")
  ) {
    items.push({
      label: "Create GitHub Issue",
      icon: <HiOutlineLink className="h-3.5 w-3.5" />,
      onClick: () => {
        createIssue.mutate({ publicId });
        onClose();
      },
    });
  }

  items.push({ separator: true });

  // ── Status-aware quick actions ──

  const allowed = VALID_TRANSITIONS[status] ?? [];

  if (allowed.length > 0) {
    // If 3 or fewer transitions, show them as flat items for speed.
    // Otherwise use a sub-menu.
    const transitionCount = allowed.length;

    if (transitionCount <= 3) {
      for (const target of allowed) {
        const cfg = ACTION_CONFIG[target];
        if (!cfg) continue;
        items.push({
          label: cfg.label,
          icon: cfg.icon,
          variant: cfg.variant,
          onClick: () => {
            if (needsReason(target)) {
              setReasonTarget(
                target === "Rejected"
                  ? "reject"
                  : target === "OnHold"
                    ? "hold"
                    : "failed",
              );
            } else {
              dispatchSimple(target);
            }
          },
          keepOpen: needsReason(target),
        });
      }
    } else {
      items.push({
        label: "Move to status",
        icon: <HiOutlineArrowsRightLeft className="h-3.5 w-3.5" />,
        subMenu: true,
        children: ({ onBack }) => (
          <>
            <button
              onClick={onBack}
              className="flex w-full items-center gap-2 rounded-[5px] px-2.5 py-1.5 text-left text-sm font-semibold text-neutral-700 hover:bg-light-200 dark:text-dark-900 dark:hover:bg-dark-400"
            >
              <svg
                className="h-3 w-3"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15.75 19.5L8.25 12l7.5-7.5"
                />
              </svg>
              Move to status
            </button>
            <div className="my-0.5 border-t border-light-200 dark:border-dark-500" />
            {allowed.map((target) => {
              const cfg = ACTION_CONFIG[target];
              if (!cfg) return null;
              return (
                <button
                  key={target}
                  onClick={() => {
                    if (needsReason(target)) {
                      setReasonTarget(
                        target === "Rejected"
                          ? "reject"
                          : target === "OnHold"
                            ? "hold"
                            : "failed",
                      );
                    } else {
                      dispatchSimple(target);
                    }
                  }}
                  className={`flex w-full items-center gap-2 rounded-[5px] px-2.5 py-1.5 text-left text-sm ${
                    cfg.variant === "danger"
                      ? "text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30"
                      : "text-neutral-900 hover:bg-light-200 dark:text-dark-950 dark:hover:bg-dark-400"
                  }`}
                >
                  <span className="flex h-4 w-4 items-center justify-center">
                    {cfg.icon}
                  </span>
                  {cfg.label}
                </button>
              );
            })}
          </>
        ),
      });
    }
  }

  return (
    <ContextMenu x={x} y={y} items={items} onClose={onClose} minWidth="180px" />
  );
}

// ── Action configuration map ──────────────────────────────────────────

const ACTION_CONFIG: Record<
  string,
  {
    label: string;
    icon: React.ReactNode;
    variant?: "default" | "danger";
  }
> = {
  PendingApproval: {
    label: "Re-submit",
    icon: <HiOutlinePlay className="h-3.5 w-3.5" />,
  },
  Approved: {
    label: "Approve",
    icon: <HiOutlineCheck className="h-3.5 w-3.5" />,
  },
  Rejected: {
    label: "Reject",
    icon: <HiOutlineNoSymbol className="h-3.5 w-3.5" />,
    variant: "danger",
  },
  OnHold: {
    label: "Hold",
    icon: <HiOutlinePause className="h-3.5 w-3.5" />,
  },
  InProgress: {
    label: "Start",
    icon: <HiOutlinePlay className="h-3.5 w-3.5" />,
  },
  NeedsReview: {
    label: "Needs Review",
    icon: <HiOutlineEye className="h-3.5 w-3.5" />,
  },
  Done: {
    label: "Done",
    icon: <HiOutlineCheck className="h-3.5 w-3.5" />,
  },
  Failed: {
    label: "Failed",
    icon: <HiOutlineFire className="h-3.5 w-3.5" />,
    variant: "danger",
  },
  Canceled: {
    label: "Cancel",
    icon: <HiOutlineXCircle className="h-3.5 w-3.5" />,
    variant: "danger",
  },
};
