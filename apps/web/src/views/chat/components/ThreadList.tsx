import { useCallback, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import {
  HiOutlineChatBubbleLeft,
  HiOutlineGlobeAlt,
  HiOutlineLockClosed,
  HiOutlinePencilSquare,
  HiOutlineTrash,
  HiOutlineArchiveBox,
  HiOutlineArrowPath,
} from "react-icons/hi2";

import { ensureUtcTimestamp } from "~/hooks/useRealtimeMessages";
import ChatAvatar from "./ChatAvatar";
import ContextMenu from "./ContextMenu";
import type { ContextMenuEntry } from "./ContextMenu";

interface Thread {
  publicId: string;
  title?: string | null;
  status: string;
  primarySource?: string | null;
  lastActivityAt: Date;
  customerId?: string | null;
  messages?: Array<{
    rawText: string;
    senderType: string;
    senderName?: string | null;
    createdAt: Date;
  }>;
  _optimistic?: boolean;
}

interface ThreadListProps {
  threads: Thread[];
  activeThreadId: string | null;
  onSelectThread: (publicId: string) => void;
  onDeleteThread?: (publicId: string) => void;
  onRenameThread?: (publicId: string) => void;
  onArchiveThread?: (publicId: string) => void;
  onReopenThread?: (publicId: string) => void;
  isLoading: boolean;
  emptyLabel?: string;
  getUnreadCount?: (
    threadPublicId: string,
    messages: Array<{ createdAt: string | Date; senderType: string }>,
  ) => number;
}

const STATUS_DOTS: Record<string, string> = {
  Open: "bg-green-400",
  WaitingOnUser: "bg-amber-400",
  Resolved: "bg-blue-400",
  Closed: "bg-gray-400",
};

export default function ThreadList({
  threads,
  activeThreadId,
  onSelectThread,
  onDeleteThread,
  onRenameThread,
  onArchiveThread,
  onReopenThread,
  isLoading,
  emptyLabel = "No conversations yet",
  getUnreadCount,
}: ThreadListProps) {
  const [ctxMenu, setCtxMenu] = useState<{
    x: number;
    y: number;
    threadPublicId: string;
    threadStatus: string;
  } | null>(null);

  const handleContextMenu = useCallback(
    (e: React.MouseEvent, threadPublicId: string, threadStatus: string) => {
      e.preventDefault();
      setCtxMenu({ x: e.clientX, y: e.clientY, threadPublicId, threadStatus });
    },
    [],
  );

  const buildCtxItems = useCallback(
    (threadPublicId: string, threadStatus: string): ContextMenuEntry[] => {
      const items: ContextMenuEntry[] = [];

      if (onRenameThread) {
        items.push({
          label: "Rename",
          icon: <HiOutlinePencilSquare className="h-3.5 w-3.5" />,
          onClick: () => onRenameThread(threadPublicId),
        });
      }

      if (onArchiveThread && threadStatus !== "Closed") {
        items.push({
          label: "Archive",
          icon: <HiOutlineArchiveBox className="h-3.5 w-3.5" />,
          onClick: () => onArchiveThread(threadPublicId),
        });
      }

      if (onReopenThread && threadStatus === "Closed") {
        items.push({
          label: "Reopen",
          icon: <HiOutlineArrowPath className="h-3.5 w-3.5" />,
          onClick: () => onReopenThread(threadPublicId),
        });
      }

      if (onDeleteThread) {
        items.push(
          { separator: true },
          {
            label: "Delete conversation",
            icon: <HiOutlineTrash className="h-3.5 w-3.5" />,
            onClick: () => onDeleteThread(threadPublicId),
            variant: "danger",
          },
        );
      }

      return items;
    },
    [onRenameThread, onArchiveThread, onReopenThread, onDeleteThread],
  );

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
      </div>
    );
  }

  if (threads.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center px-4 text-center">
        <HiOutlineChatBubbleLeft className="h-8 w-8 text-light-800 dark:text-dark-800" />
        <p className="mt-2 text-xs text-light-800 dark:text-dark-800">
          {emptyLabel}
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      {threads.map((thread) => {
        const isActive = thread.publicId === activeThreadId;
        const lastMessage = thread.messages?.[0];
        const preview = lastMessage?.rawText?.slice(0, 80) ?? "No messages yet";
        const isExternal = thread.primarySource === "widget";
        const isOptimistic = !!(thread as any)._optimistic;
        const isArchived = thread.status === "Closed";
        const unreadNum =
          !isOptimistic && getUnreadCount && thread.messages
            ? getUnreadCount(
                thread.publicId,
                thread.messages.map((m) => ({
                  createdAt:
                    typeof m.createdAt === "string"
                      ? m.createdAt
                      : (m.createdAt as Date).toISOString(),
                  senderType: m.senderType,
                })),
              )
            : 0;

        return (
          <button
            key={thread.publicId}
            onClick={() => onSelectThread(thread.publicId)}
            onContextMenu={(e) => {
              if (!isOptimistic) handleContextMenu(e, thread.publicId, thread.status);
            }}
            disabled={isOptimistic}
            className={`flex gap-3 border-b border-light-200 px-4 py-3 text-left transition-colors duration-0 dark:border-dark-200 ${
              isOptimistic
                ? "animate-pulse opacity-60"
                : isActive
                  ? "bg-brand-50 dark:bg-brand-950/30"
                  : isArchived
                    ? "opacity-50 hover:bg-light-100 hover:opacity-75 dark:hover:bg-dark-100"
                    : "hover:bg-light-100 dark:hover:bg-dark-100"
            }`}
          >
            {/* Avatar of last sender */}
            <ChatAvatar
              name={lastMessage?.senderName ?? thread.title ?? thread.customerId}
              size="md"
              className="mt-0.5"
            />

            <div className="min-w-0 flex-1">
              {/* Row 1: title + badge */}
              <div className="flex items-center gap-1.5">
                {/* Thread type icon */}
                {isExternal ? (
                  <HiOutlineGlobeAlt
                    className="h-3 w-3 flex-shrink-0 text-brand-500"
                    title="External chat"
                  />
                ) : (
                  <HiOutlineLockClosed
                    className="h-3 w-3 flex-shrink-0 text-amber-500"
                    title="Team thread"
                  />
                )}
                {/* Status dot */}
                <span
                  className={`h-1.5 w-1.5 flex-shrink-0 rounded-full ${STATUS_DOTS[thread.status] ?? "bg-gray-400"}`}
                />
                <span className="min-w-0 flex-1 truncate text-sm font-medium text-light-900 dark:text-dark-900">
                  {thread.title ??
                    thread.customerId ??
                    `Thread ${thread.publicId.slice(0, 6)}`}
                </span>
                {unreadNum > 0 && (
                  <span className="flex h-[18px] min-w-[18px] flex-shrink-0 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold leading-none text-white">
                    {unreadNum > 99 ? "99+" : unreadNum}
                  </span>
                )}
              </div>
              {/* Row 2: preview + timestamp */}
              <div className="mt-0.5 flex items-baseline justify-between gap-2">
                <p className="min-w-0 flex-1 truncate text-xs text-light-800 dark:text-dark-800">
                  {isOptimistic ? (
                    <span className="italic">Creating...</span>
                  ) : (
                    <>
                      {lastMessage?.senderName && (
                        <span className="font-medium">
                          {lastMessage.senderName}:{" "}
                        </span>
                      )}
                      {preview}
                    </>
                  )}
                </p>
                <span className="flex-shrink-0 text-[10px] text-light-800 dark:text-dark-800">
                  {isOptimistic
                    ? "now"
                    : formatDistanceToNow(new Date(ensureUtcTimestamp(thread.lastActivityAt)), {
                        addSuffix: true,
                      })}
                </span>
              </div>
            </div>
          </button>
        );
      })}

      {ctxMenu && (
        <ContextMenu
          x={ctxMenu.x}
          y={ctxMenu.y}
          items={buildCtxItems(ctxMenu.threadPublicId, ctxMenu.threadStatus)}
          onClose={() => setCtxMenu(null)}
        />
      )}
    </div>
  );
}
