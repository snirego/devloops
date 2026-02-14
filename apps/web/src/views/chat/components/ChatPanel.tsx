import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  HiOutlineLink,
  HiOutlineCheck,
  HiOutlinePencilSquare,
  HiOutlineSparkles,
  HiOutlineChevronDown,
  HiOutlineChevronUp,
} from "react-icons/hi2";

import { generateUID } from "@kan/shared/utils";

import type { RealtimeMessage } from "~/hooks/useRealtimeMessages";
import { useRealtimeMessages } from "~/hooks/useRealtimeMessages";
import { useThreadReadStatus, getLastReadTimestamp } from "~/hooks/useThreadReadStatus";
import { useAiActivity } from "~/providers/ai-activity";
import { api } from "~/utils/api";

import InternalNoteInput from "./InternalNoteInput";
import MessageBubble from "./MessageBubble";
import WorkItemSuggestion from "./WorkItemSuggestion";

interface ChatPanelProps {
  threadPublicId: string;
  onThreadUpdate?: () => void;
}

export default function ChatPanel({
  threadPublicId,
  onThreadUpdate,
}: ChatPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [workItemCreating, setWorkItemCreating] = useState<string | null>(null);
  const [showAiInsights, setShowAiInsights] = useState(false);

  // Read tracking — capture last-read before marking as read
  const { markAsRead } = useThreadReadStatus();
  const lastReadRef = useRef<string | null>(null);

  // Capture the lastRead value synchronously from localStorage when
  // switching threads (before markAsRead overwrites it).
  const prevThreadRef = useRef<string>("");
  if (prevThreadRef.current !== threadPublicId) {
    prevThreadRef.current = threadPublicId;
    lastReadRef.current = getLastReadTimestamp(threadPublicId);
  }

  // ── Thread metadata (title, status, AI insights) — cache-first, revalidate in background
  // NOTE: Do NOT use keepPreviousData here — threadData.id drives the Realtime
  // subscription, so stale data from a previous thread would subscribe to the
  // wrong channel when switching threads.
  const {
    data: threadData,
    isLoading: threadLoading,
    isFetching: threadFetching,
    error: threadError,
    refetch: refetchThread,
  } = api.chat.getThread.useQuery(
    { threadPublicId },
    {
      staleTime: 60_000,
    },
  );

  // ── Messages — fetched per thread switch, then Realtime takes over.
  // Keep staleTime low: when the user revisits a thread, we need a fresh fetch
  // to pick up messages that arrived while the Realtime subscription was inactive
  // (i.e. while viewing a different thread). The non-blocking loading check below
  // ensures stale cached data is shown instantly while the refetch runs silently.
  const {
    data: messagesData,
    isLoading: messagesLoading,
  } = api.chat.getMessages.useQuery(
    { threadPublicId },
    {
      staleTime: 5_000, // Considered stale after 5s — revalidates on revisit
      refetchOnWindowFocus: false,
    },
  );

  // ── AI processing indicator (non-blocking) ──────────────────────────
  const { activeJobs } = useAiActivity();
  const isProcessingAI = activeJobs.some(
    (j) => j.threadPublicId === threadPublicId,
  );

  // Title mutation
  const updateTitleMut = api.chat.updateTitle.useMutation({
    onSuccess: () => {
      refetchThread();
      onThreadUpdate?.();
    },
  });

  // Map tRPC messages to the RealtimeMessage shape (only used for initial seed)
  const initialMessages: RealtimeMessage[] = useMemo(() => {
    if (!messagesData?.messages) return [];
    return messagesData.messages.map((m) => ({
      id: m.id,
      publicId: m.publicId,
      threadId: m.threadId,
      source: m.source,
      senderType: m.senderType as "user" | "internal",
      senderName: m.senderName,
      visibility: (m.visibility ?? "public") as "public" | "internal",
      rawText: m.rawText,
      metadataJson: m.metadataJson as Record<string, unknown> | null,
      createdAt:
        typeof m.createdAt === "string"
          ? m.createdAt
          : (m.createdAt as Date).toISOString(),
    }));
  }, [messagesData?.messages]);

  // Refetch only thread metadata when the LLM finishes background analysis
  const handleThreadUpdated = useCallback(() => {
    refetchThread();
    onThreadUpdate?.();
  }, [refetchThread, onThreadUpdate]);

  // Subscribe to Realtime with initial messages
  const { messages, addOptimistic, markFailed, removeMessage, updateMessage } =
    useRealtimeMessages({
      threadId: threadData?.id ?? messagesData?.thread?.id ?? null,
      publicOnly: false,
      initialMessages,
      onThreadUpdated: handleThreadUpdated,
    });

  // Mutations
  const sendMut = api.chat.send.useMutation({
    onError: (_err, vars) => {
      if (vars.publicId) markFailed(vars.publicId);
    },
  });

  const sendNoteMut = api.chat.sendInternalNote.useMutation({
    onError: (_err, vars) => {
      if (vars.publicId) markFailed(vars.publicId);
    },
  });

  const editMut = api.chat.editMessage.useMutation();
  const deleteMut = api.chat.deleteMessage.useMutation();
  const createWorkItemMut = api.chat.createWorkItemFromMessage.useMutation();

  // Auto-scroll to bottom on new messages — but only if user is already
  // near the bottom (within 150px). This prevents forcefully yanking
  // the viewport when the user is scrolling up to read history.
  const isNearBottomRef = useRef(true);
  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const threshold = 150;
    isNearBottomRef.current =
      el.scrollHeight - el.scrollTop - el.clientHeight < threshold;
  }, []);

  useEffect(() => {
    if (!isNearBottomRef.current) return;
    const el = scrollRef.current;
    if (!el) return;
    requestAnimationFrame(() => {
      el.scrollTop = el.scrollHeight;
    });
  }, [messages]);

  // Mark thread as read when user is viewing it and messages are loaded
  useEffect(() => {
    if (messages.length > 0 && isNearBottomRef.current) {
      markAsRead(threadPublicId);
    }
  }, [messages, threadPublicId, markAsRead]);

  // Focus title input when editing starts
  useEffect(() => {
    if (isEditingTitle && titleInputRef.current) {
      titleInputRef.current.focus();
      titleInputRef.current.select();
    }
  }, [isEditingTitle]);

  const handleSend = useCallback(
    (text: string, visibility: "public" | "internal", mentions?: string[]) => {
      const optimisticId = generateUID();
      const now = new Date().toISOString();

      const meta: Record<string, unknown> = {};
      if (visibility === "internal") meta.isInternalNote = true;
      if (mentions && mentions.length > 0) meta.mentions = mentions;

      // Optimistic update
      addOptimistic({
        id: -1,
        publicId: optimisticId,
        threadId: threadData?.id ?? 0,
        source: "api",
        senderType: "internal",
        senderName: "You",
        visibility,
        rawText: text,
        metadataJson: Object.keys(meta).length > 0 ? meta : null,
        createdAt: now,
      });

      if (visibility === "internal") {
        sendNoteMut.mutate({
          threadPublicId,
          rawText: text,
          publicId: optimisticId,
        });
      } else {
        sendMut.mutate({
          threadPublicId,
          rawText: text,
          visibility,
          publicId: optimisticId,
        });
      }
    },
    [threadPublicId, threadData?.id, addOptimistic, sendMut, sendNoteMut],
  );

  // ── Message edit / delete ─────────────────────────────────────────────
  const handleEditMessage = useCallback(
    (publicId: string, newText: string) => {
      // Optimistic update
      updateMessage(publicId, newText);
      editMut.mutate(
        { messagePublicId: publicId, rawText: newText },
        {
          onError: () => {
            // Revert on failure — refetch will fix it
          },
        },
      );
    },
    [updateMessage, editMut],
  );

  const handleDeleteMessage = useCallback(
    (publicId: string) => {
      // Optimistic remove
      removeMessage(publicId);
      deleteMut.mutate(
        { messagePublicId: publicId },
        {
          onError: () => {
            // Refetch will restore
          },
        },
      );
    },
    [removeMessage, deleteMut],
  );

  // ── Create WorkItem from message ──────────────────────────────────────
  const workItemTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleCreateWorkItem = useCallback(
    (messagePublicId: string, type: "Bug" | "Feature") => {
      setWorkItemCreating(type);

      // Safety timeout: clear the toast after 30s even if the request
      // is still pending — the work will finish in the background
      if (workItemTimerRef.current) clearTimeout(workItemTimerRef.current);
      workItemTimerRef.current = setTimeout(() => {
        setWorkItemCreating(null);
      }, 30_000);

      createWorkItemMut.mutate(
        { messagePublicId, type },
        {
          onSuccess: () => {
            if (workItemTimerRef.current) clearTimeout(workItemTimerRef.current);
            setWorkItemCreating(null);
          },
          onError: () => {
            if (workItemTimerRef.current) clearTimeout(workItemTimerRef.current);
            setWorkItemCreating(null);
          },
        },
      );
    },
    [createWorkItemMut],
  );

  // ── Title editing ───────────────────────────────────────────────────────
  const handleStartEditTitle = () => {
    const currentTitle =
      threadData?.title ?? `Thread ${threadPublicId.slice(0, 8)}`;
    setEditTitle(currentTitle);
    setIsEditingTitle(true);
  };

  const handleSaveTitle = () => {
    const trimmed = editTitle.trim();
    if (trimmed && trimmed !== threadData?.title) {
      updateTitleMut.mutate({ threadPublicId, title: trimmed });
    }
    setIsEditingTitle(false);
  };

  const handleCancelTitle = () => {
    setIsEditingTitle(false);
  };

  const handleTitleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSaveTitle();
    } else if (e.key === "Escape") {
      handleCancelTitle();
    }
  };

  // ── Invite link ─────────────────────────────────────────────────────────
  const isExternal = threadData?.primarySource === "widget";
  const baseUrl =
    typeof window !== "undefined" ? window.location.origin : "";
  const publicUrl = `${baseUrl}/chat/${threadPublicId}`;

  const handleCopyInviteLink = () => {
    navigator.clipboard.writeText(publicUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  // Only block rendering on true first load when no cached data is available.
  // If we have stale data, render it immediately while revalidating in the background.
  if ((threadLoading && !threadData) || (messagesLoading && !messagesData)) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
      </div>
    );
  }

  if (threadError) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-sm text-red-500">Failed to load conversation</p>
      </div>
    );
  }

  const thread = threadData;
  const threadState = thread?.threadStateJson as Record<string, unknown> | null;

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Thread header */}
      <div className="flex items-center justify-between border-b border-light-200 px-4 py-3 dark:border-dark-200">
        <div className="min-w-0 flex-1">
          {isEditingTitle ? (
            <input
              ref={titleInputRef}
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              onBlur={handleSaveTitle}
              onKeyDown={handleTitleKeyDown}
              className="w-full rounded border border-indigo-300 bg-white px-2 py-0.5 text-sm font-semibold text-light-900 outline-none focus:ring-2 focus:ring-indigo-500/30 dark:border-indigo-700 dark:bg-dark-100 dark:text-dark-900"
              maxLength={200}
            />
          ) : (
            <button
              onClick={handleStartEditTitle}
              className="group flex items-center gap-1.5 rounded px-1 py-0.5 text-left transition-colors duration-0 hover:bg-light-100 dark:hover:bg-dark-200"
              title="Click to edit title"
            >
              <h2 className="truncate text-sm font-semibold text-light-900 dark:text-dark-900">
                {thread?.title ?? `Thread ${threadPublicId.slice(0, 8)}`}
              </h2>
              <HiOutlinePencilSquare className="h-3.5 w-3.5 flex-shrink-0 text-light-800 opacity-0 transition-opacity duration-0 group-hover:opacity-100 dark:text-dark-800" />
            </button>
          )}
          <div className="flex items-center gap-2 text-xs text-light-800 dark:text-dark-800">
            <span className="capitalize">{thread?.status}</span>
            {thread?.customerId && <span>- {thread.customerId}</span>}
            {isProcessingAI && (
              <span className="flex items-center gap-1.5 text-indigo-500">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-indigo-500" />
                AI analyzing...
              </span>
            )}
            {threadFetching && !threadLoading && (
              <span className="text-[10px] text-light-700 dark:text-dark-700">
                syncing...
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Invite link - only for external threads */}
          {isExternal && (
            <button
              onClick={handleCopyInviteLink}
              className="inline-flex items-center gap-1 rounded-md border border-light-200 px-2.5 py-1 text-xs text-light-900 transition-colors duration-0 hover:bg-light-100 dark:border-dark-300 dark:text-dark-900 dark:hover:bg-dark-200"
              title="Copy invite link for this conversation"
            >
              {copiedLink ? (
                <>
                  <HiOutlineCheck className="h-3.5 w-3.5 text-green-500" />
                  <span className="text-green-600">Copied!</span>
                </>
              ) : (
                <>
                  <HiOutlineLink className="h-3.5 w-3.5" />
                  Invite Link
                </>
              )}
            </button>
          )}

          {/* AI Insights toggle */}
          {threadState?.summary && (
            <button
              onClick={() => setShowAiInsights(!showAiInsights)}
              className={`inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs transition-colors duration-0 ${
                showAiInsights
                  ? "border-indigo-300 bg-indigo-50 text-indigo-700 dark:border-indigo-700 dark:bg-indigo-950/30 dark:text-indigo-300"
                  : "border-light-200 text-light-900 hover:bg-light-100 dark:border-dark-300 dark:text-dark-900 dark:hover:bg-dark-200"
              }`}
            >
              <HiOutlineSparkles className="h-3.5 w-3.5" />
              AI Insights
              {showAiInsights ? (
                <HiOutlineChevronUp className="h-3 w-3" />
              ) : (
                <HiOutlineChevronDown className="h-3 w-3" />
              )}
            </button>
          )}
        </div>
      </div>

      {/* AI Insights panel */}
      {showAiInsights && threadState && (
        <div className="border-b border-indigo-200 bg-indigo-50/50 px-4 py-3 dark:border-indigo-900 dark:bg-indigo-950/20">
          <div className="space-y-2">
            {threadState.summary && (
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-indigo-500">
                  Summary
                </p>
                <p className="text-xs text-light-950 dark:text-dark-950">
                  {threadState.summary as string}
                </p>
              </div>
            )}
            <div className="flex flex-wrap gap-3">
              {threadState.intent && (
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-indigo-500">
                    Intent
                  </p>
                  <span className="mt-0.5 inline-block rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-medium text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300">
                    {threadState.intent as string}
                  </span>
                </div>
              )}
              {(threadState.recommendation as Record<string, unknown>)
                ?.action &&
                (threadState.recommendation as Record<string, unknown>)
                  ?.action !== "NoTicket" && (
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-indigo-500">
                      Recommendation
                    </p>
                    <span className="mt-0.5 inline-block rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                      {
                        (threadState.recommendation as Record<string, unknown>)
                          .action as string
                      }
                    </span>
                    <span className="ml-1 text-[10px] text-light-800 dark:text-dark-800">
                      (
                      {Math.round(
                        ((threadState.recommendation as Record<string, unknown>)
                          .confidence as number) * 100,
                      )}
                      % confidence)
                    </span>
                  </div>
                )}
              {(threadState.signals as Record<string, unknown>)?.urgency && (
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-indigo-500">
                    Urgency
                  </p>
                  <span className="mt-0.5 inline-block text-xs text-light-950 dark:text-dark-950">
                    {
                      (threadState.signals as Record<string, unknown>)
                        .urgency as string
                    }
                  </span>
                </div>
              )}
            </div>
            {Array.isArray(threadState.openQuestions) &&
              (threadState.openQuestions as string[]).length > 0 && (
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-indigo-500">
                    Open Questions
                  </p>
                  <ul className="mt-0.5 list-inside list-disc text-xs text-light-900 dark:text-dark-900">
                    {(threadState.openQuestions as string[]).map((q, i) => (
                      <li key={i}>{q}</li>
                    ))}
                  </ul>
                </div>
              )}
          </div>
        </div>
      )}

      {/* Work item creation toast */}
      {workItemCreating && (
        <div className="flex items-center gap-2 border-b border-indigo-200 bg-indigo-50 px-4 py-2 dark:border-indigo-900 dark:bg-indigo-950/30">
          <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
          <span className="text-xs font-medium text-indigo-700 dark:text-indigo-300">
            AI is creating a {workItemCreating} work item...
          </span>
        </div>
      )}

      {/* Messages */}
      <div ref={scrollRef} onScroll={handleScroll} className="flex-1 overflow-y-auto py-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-xs text-light-800 dark:text-dark-800">
              No messages yet. Send a reply to start the conversation.
            </p>
          </div>
        )}

        {(() => {
          const cutoff = lastReadRef.current;
          let dividerRendered = false;

          // Count unread user messages for the divider label
          const unreadUserMsgCount = messages.filter((m) => {
            if (m.senderType !== "user") return false;
            if (!cutoff) return true; // never read → all user msgs are unread
            return new Date(m.createdAt) > new Date(cutoff);
          }).length;

          return messages.map((msg) => {
            // Determine if we should render the "New messages" divider before this message.
            // Unread = external user messages that arrived after the last-read timestamp.
            // If cutoff is null the thread was never opened → all user msgs are unread.
            let showDivider = false;
            if (
              !dividerRendered &&
              msg.senderType === "user" &&
              (cutoff ? new Date(msg.createdAt) > new Date(cutoff) : true) &&
              unreadUserMsgCount > 0
            ) {
              showDivider = true;
              dividerRendered = true;
            }

            // Work item suggestion
            if (
              msg.metadataJson?.type === "system_workitem_suggestion" &&
              msg.metadataJson?.workItemPublicId
            ) {
              return (
                <WorkItemSuggestion
                  key={msg.publicId}
                  workItemPublicId={msg.metadataJson.workItemPublicId as string}
                  reason={msg.rawText}
                />
              );
            }

            return (
              <div key={msg.publicId}>
                {showDivider && (
                  <div className="my-3 flex items-center gap-3 px-4">
                    <div className="h-px flex-1 bg-rose-300 dark:bg-rose-700" />
                    <span className="flex-shrink-0 text-[10px] font-semibold uppercase tracking-wider text-rose-500">
                      {unreadUserMsgCount} new {unreadUserMsgCount === 1 ? "message" : "messages"}
                    </span>
                    <div className="h-px flex-1 bg-rose-300 dark:bg-rose-700" />
                  </div>
                )}
                <MessageBubble
                  publicId={msg.publicId}
                  senderType={msg.senderType}
                  senderName={msg.senderName}
                  visibility={msg.visibility}
                  rawText={msg.rawText}
                  createdAt={msg.createdAt}
                  metadataJson={msg.metadataJson}
                  isFailed={!!msg.metadataJson?._failed}
                  onEdit={handleEditMessage}
                  onDelete={handleDeleteMessage}
                  onCreateWorkItem={handleCreateWorkItem}
                />
              </div>
            );
          });
        })()}
      </div>

      {/* Input */}
      <InternalNoteInput
        onSend={handleSend}
        disabled={false}
      />
    </div>
  );
}
