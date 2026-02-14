import { useCallback, useEffect, useMemo, useState } from "react";
import {
  HiOutlineChatBubbleLeftRight,
  HiOutlineGlobeAlt,
  HiOutlineLockClosed,
  HiOutlineCodeBracket,
  HiOutlineClipboard,
  HiOutlineCheck,
  HiOutlineXMark,
} from "react-icons/hi2";

type ThreadFilter = "all" | "external" | "internal";
type EmbedTab = "react" | "html" | "vue" | "api";

import { generateUID } from "@kan/shared/utils";

import Modal from "~/components/modal";
import { PageHead } from "~/components/PageHead";
import { useModal } from "~/providers/modal";
import { useWorkspace } from "~/providers/workspace";
import { api } from "~/utils/api";

import { useGlobalChatSound } from "~/hooks/useGlobalChatSound";
import { useThreadReadStatus } from "~/hooks/useThreadReadStatus";

import ChatPanel from "./components/ChatPanel";
import { RenameThreadForm } from "./components/RenameThreadForm";
import ThreadList from "./components/ThreadList";

interface OptimisticThread {
  publicId: string;
  title: string;
  status: string;
  primarySource: string | null;
  lastActivityAt: Date;
  messages: [];
  _optimistic?: boolean;
}

export default function ChatView() {
  const { openModal, modalContentType, isOpen: isModalOpen } = useModal();
  const { workspace } = useWorkspace();
  const { markAsRead, getUnreadCount } = useThreadReadStatus();

  // Play notification sound for ANY incoming customer message (global listener)
  useGlobalChatSound();

  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [showNewMenu, setShowNewMenu] = useState(false);
  const [showWidgetEmbed, setShowWidgetEmbed] = useState(false);
  const [threadFilter, setThreadFilter] = useState<ThreadFilter>("all");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(
    null,
  );
  const [optimisticThreads, setOptimisticThreads] = useState<
    OptimisticThread[]
  >([]);

  // ESC key closes the current chat / dismisses open menus
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      // Close the most specific thing first, then fall through
      if (showDeleteConfirm) {
        setShowDeleteConfirm(null);
      } else if (showWidgetEmbed) {
        setShowWidgetEmbed(false);
      } else if (showNewMenu) {
        setShowNewMenu(false);
      } else if (activeThreadId) {
        setActiveThreadId(null);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [showDeleteConfirm, showWidgetEmbed, showNewMenu, activeThreadId]);

  const {
    data: threads,
    refetch: refetchThreads,
    isLoading: threadsLoading,
  } = api.chat.listThreads.useQuery(
    { workspacePublicId: workspace.publicId },
    {
      enabled: !!workspace.publicId && workspace.publicId.length >= 12,
      refetchInterval: 15000,
    },
  );

  const createThread = api.chat.createThread.useMutation({
    onSuccess: (data, variables) => {
      setOptimisticThreads((prev) =>
        prev.filter((t) => t.title !== variables.title || !t._optimistic),
      );
      setActiveThreadId(data.threadPublicId);
      refetchThreads();
      setShowNewMenu(false);
    },
    onError: (_err, variables) => {
      setOptimisticThreads((prev) =>
        prev.filter((t) => t.title !== variables.title || !t._optimistic),
      );
    },
  });

  const deleteThreadMut = api.chat.deleteThread.useMutation({
    onSuccess: () => {
      refetchThreads();
    },
  });

  const updateStatusMut = api.chat.updateStatus.useMutation({
    onSuccess: () => {
      refetchThreads();
    },
  });

  // Merge real threads with optimistic ones
  const mergedThreads = useMemo(
    () => [
      ...optimisticThreads.filter(
        (ot) => !threads?.some((t: any) => t.publicId === ot.publicId),
      ),
      ...(threads ?? []),
    ],
    [optimisticThreads, threads],
  );

  // Filter threads by tab
  const filteredThreads = useMemo(() => {
    if (threadFilter === "all") return mergedThreads;
    if (threadFilter === "external")
      return mergedThreads.filter((t) => t.primarySource === "widget");
    return mergedThreads.filter((t) => t.primarySource !== "widget");
  }, [mergedThreads, threadFilter]);

  // Counts for tab badges
  const filterCounts = useMemo(() => {
    const ext = mergedThreads.filter((t) => t.primarySource === "widget").length;
    return { all: mergedThreads.length, external: ext, internal: mergedThreads.length - ext };
  }, [mergedThreads]);

  const handleSelectThread = useCallback(
    (publicId: string) => {
      setActiveThreadId(publicId);
      markAsRead(publicId);
    },
    [markAsRead],
  );

  const handleCreateThread = useCallback(
    (type: "external" | "team") => {
      const title =
        type === "external" ? "New Support Chat" : "Team Discussion";
      const tempId = `_opt_${generateUID()}`;

      const optimistic: OptimisticThread = {
        publicId: tempId,
        title,
        status: "Open",
        primarySource: type === "external" ? "widget" : "api",
        lastActivityAt: new Date(),
        messages: [],
        _optimistic: true,
      };
      setOptimisticThreads((prev) => [optimistic, ...prev]);
      setActiveThreadId(tempId);
      setShowNewMenu(false);

      createThread.mutate({ workspacePublicId: workspace.publicId, title, type });
    },
    [createThread],
  );

  // ── Thread context menu handlers ────────────────────────────────────────
  const handleDeleteThread = useCallback(
    (publicId: string) => {
      setShowDeleteConfirm(publicId);
    },
    [],
  );

  const confirmDeleteThread = useCallback(() => {
    if (!showDeleteConfirm) return;
    if (activeThreadId === showDeleteConfirm) {
      setActiveThreadId(null);
    }
    deleteThreadMut.mutate({ threadPublicId: showDeleteConfirm });
    setShowDeleteConfirm(null);
  }, [showDeleteConfirm, activeThreadId, deleteThreadMut]);

  const handleRenameThread = useCallback(
    (publicId: string) => {
      setActiveThreadId(publicId);
      openModal("RENAME_THREAD", publicId);
    },
    [openModal],
  );

  const handleArchiveThread = useCallback(
    (publicId: string) => {
      updateStatusMut.mutate({ threadPublicId: publicId, status: "Closed" });
    },
    [updateStatusMut],
  );

  const handleReopenThread = useCallback(
    (publicId: string) => {
      updateStatusMut.mutate({ threadPublicId: publicId, status: "Open" });
    },
    [updateStatusMut],
  );

  // ── Widget embed code ─────────────────────────────────────────────────
  const [embedTab, setEmbedTab] = useState<EmbedTab>("react");
  const [copiedSnippet, setCopiedSnippet] = useState(false);

  const baseUrl =
    typeof window !== "undefined" ? window.location.origin : "";
  const workspacePublicId = workspace.publicId;

  const embedSnippets: Record<EmbedTab, { label: string; lang: string; code: string }> = {
    react: {
      label: "React / Next.js",
      lang: "tsx",
      code: `// Add to your layout or App component
import Script from "next/script"; // Next.js — or use <script> in plain React

export default function Layout({ children }) {
  return (
    <>
      {children}
      <Script
        src="${baseUrl}/widget/devloops-chat.js"
        data-workspace-id="${workspacePublicId}"
        strategy="lazyOnload"
      />
    </>
  );
}`,
    },
    html: {
      label: "HTML",
      lang: "html",
      code: `<!-- Add before </body> -->
<script
  src="${baseUrl}/widget/devloops-chat.js"
  data-workspace-id="${workspacePublicId}"
></script>`,
    },
    vue: {
      label: "Vue / Nuxt",
      lang: "html",
      code: `<!-- Add to App.vue or your layout component -->
<template>
  <div id="app">
    <router-view />
  </div>
</template>

<script setup>
import { onMounted } from "vue";

onMounted(() => {
  const script = document.createElement("script");
  script.src = "${baseUrl}/widget/devloops-chat.js";
  script.setAttribute("data-workspace-id", "${workspacePublicId}");
  document.body.appendChild(script);
});
</script>`,
    },
    api: {
      label: "REST API",
      lang: "bash",
      code: `# Create a chat session
curl -X POST ${baseUrl}/api/chat/session \\
  -H "Content-Type: application/json" \\
  -d '{
    "visitorName": "John Doe",
    "workspacePublicId": "${workspacePublicId}"
  }'

# Send a message (use sessionId from above)
curl -X POST ${baseUrl}/api/chat/messages \\
  -H "Content-Type: application/json" \\
  -H "X-Session-Id: SESSION_ID" \\
  -d '{ "rawText": "Hello!", "senderName": "John Doe" }'`,
    },
  };

  const activeSnippet = embedSnippets[embedTab];

  const handleCopySnippet = () => {
    navigator.clipboard.writeText(activeSnippet.code);
    setCopiedSnippet(true);
    setTimeout(() => setCopiedSnippet(false), 2000);
  };

  return (
    <div className="flex h-full flex-col">
      <PageHead title="Chat" />

      {/* Header */}
      <div className="flex items-center justify-between border-b border-light-300 px-6 py-4 dark:border-dark-300">
        <div className="flex items-center gap-3">
          <HiOutlineChatBubbleLeftRight className="h-5 w-5 text-light-800 dark:text-dark-800" />
          <h1 className="text-lg font-semibold text-light-900 dark:text-dark-900">
            Chat
          </h1>
          <span className="text-xs text-light-800 dark:text-dark-800">
            {filteredThreads.length} conversations
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Global widget embed button */}
          <button
            onClick={() => setShowWidgetEmbed(true)}
            className="inline-flex items-center gap-1.5 rounded-md border border-light-300 px-3 py-1.5 text-xs font-medium text-light-900 transition-colors duration-0 hover:bg-light-100 dark:border-dark-300 dark:text-dark-900 dark:hover:bg-dark-200"
          >
            <HiOutlineCodeBracket className="h-3.5 w-3.5" />
            Install Widget
          </button>

          {/* New thread dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowNewMenu(!showNewMenu)}
              className="inline-flex items-center gap-1.5 rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white transition-colors duration-0 hover:bg-indigo-700"
            >
              <HiOutlineChatBubbleLeftRight className="h-3.5 w-3.5" />
              New Conversation
            </button>

            {showNewMenu && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowNewMenu(false)}
                />
                <div className="absolute right-0 top-full z-50 mt-1 w-72 overflow-hidden rounded-lg border border-light-200 bg-white shadow-lg dark:border-dark-300 dark:bg-dark-100">
                  <button
                    onClick={() => handleCreateThread("external")}
                    disabled={createThread.isPending}
                    className="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors duration-0 hover:bg-light-50 dark:hover:bg-dark-200"
                  >
                    <HiOutlineGlobeAlt className="mt-0.5 h-5 w-5 flex-shrink-0 text-indigo-500" />
                    <div>
                      <div className="text-sm font-medium text-light-900 dark:text-dark-900">
                        External Chat
                      </div>
                      <p className="mt-0.5 text-xs text-light-800 dark:text-dark-800">
                        Public URL anyone can access. Share with users or embed
                        as a widget.
                      </p>
                    </div>
                  </button>
                  <div className="mx-3 border-t border-light-200 dark:border-dark-300" />
                  <button
                    onClick={() => handleCreateThread("team")}
                    disabled={createThread.isPending}
                    className="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors duration-0 hover:bg-light-50 dark:hover:bg-dark-200"
                  >
                    <HiOutlineLockClosed className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-500" />
                    <div>
                      <div className="text-sm font-medium text-light-900 dark:text-dark-900">
                        Team Thread
                      </div>
                      <p className="mt-0.5 text-xs text-light-800 dark:text-dark-800">
                        Internal discussion only visible to authenticated team
                        members.
                      </p>
                    </div>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Split panel */}
      <div className="flex flex-1 overflow-hidden">
        {/* Thread list (left panel) */}
        <div className="flex w-80 flex-shrink-0 flex-col border-r border-light-300 dark:border-dark-300">
          {/* Filter tabs */}
          <div className="flex border-b border-light-200 dark:border-dark-200">
            {(
              [
                { key: "all", label: "All", count: filterCounts.all },
                { key: "external", label: "External", count: filterCounts.external },
                { key: "internal", label: "Internal", count: filterCounts.internal },
              ] as const
            ).map((tab) => (
              <button
                key={tab.key}
                onClick={() => setThreadFilter(tab.key)}
                className={`relative flex flex-1 items-center justify-center gap-1.5 px-2 py-2.5 text-xs font-medium transition-colors duration-0 ${
                  threadFilter === tab.key
                    ? "text-indigo-600 dark:text-indigo-400"
                    : "text-light-800 hover:text-light-900 dark:text-dark-800 dark:hover:text-dark-900"
                }`}
              >
                {tab.label}
                <span
                  className={`inline-flex h-4 min-w-[16px] items-center justify-center rounded-full px-1 text-[10px] font-semibold ${
                    threadFilter === tab.key
                      ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300"
                      : "bg-light-200 text-light-800 dark:bg-dark-300 dark:text-dark-800"
                  }`}
                >
                  {tab.count}
                </span>
                {/* Active indicator */}
                {threadFilter === tab.key && (
                  <span className="absolute bottom-0 left-2 right-2 h-0.5 rounded-full bg-indigo-600 dark:bg-indigo-400" />
                )}
              </button>
            ))}
          </div>

          {/* Thread list */}
          <ThreadList
            threads={filteredThreads}
            activeThreadId={activeThreadId}
            onSelectThread={handleSelectThread}
            onDeleteThread={handleDeleteThread}
            onRenameThread={handleRenameThread}
            onArchiveThread={handleArchiveThread}
            onReopenThread={handleReopenThread}
            isLoading={threadsLoading}
            getUnreadCount={getUnreadCount}
            emptyLabel={
              threadFilter === "all"
                ? "No conversations yet"
                : threadFilter === "external"
                  ? "No external conversations"
                  : "No internal conversations"
            }
          />
        </div>

        {/* Chat panel (right panel) */}
        <div className="flex flex-1 flex-col">
          {activeThreadId && !activeThreadId.startsWith("_opt_") ? (
            <ChatPanel
              threadPublicId={activeThreadId}
              onThreadUpdate={refetchThreads}
            />
          ) : activeThreadId?.startsWith("_opt_") ? (
            <div className="flex flex-1 items-center justify-center">
              <div className="text-center">
                <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
                <p className="mt-3 text-sm text-light-800 dark:text-dark-800">
                  Creating conversation...
                </p>
              </div>
            </div>
          ) : (
            <div className="flex flex-1 items-center justify-center">
              <div className="text-center">
                <HiOutlineChatBubbleLeftRight className="mx-auto h-12 w-12 text-light-800 dark:text-dark-800" />
                <p className="mt-3 text-sm text-light-800 dark:text-dark-800">
                  Select a conversation or start a new one
                </p>
                <p className="mt-1 text-xs text-light-800 dark:text-dark-800">
                  External chats can be shared via a public URL or widget.
                  <br />
                  Team threads are only visible to your workspace members.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Rename modal */}
      <Modal
        modalSize="sm"
        isVisible={isModalOpen && modalContentType === "RENAME_THREAD"}
      >
        <RenameThreadForm
          threadPublicId={activeThreadId ?? ""}
          currentTitle={
            mergedThreads.find((t) => t.publicId === activeThreadId)?.title ??
            ""
          }
          onSuccess={refetchThreads}
        />
      </Modal>

      {/* Delete confirmation dialog */}
      {showDeleteConfirm && (
        <>
          <div
            className="fixed inset-0 z-[9998] bg-black/40"
            onClick={() => setShowDeleteConfirm(null)}
          />
          <div className="fixed left-1/2 top-1/2 z-[9999] w-96 -translate-x-1/2 -translate-y-1/2 rounded-xl border border-light-200 bg-white p-6 shadow-2xl dark:border-dark-300 dark:bg-dark-100">
            <h3 className="text-sm font-semibold text-light-900 dark:text-dark-900">
              Delete conversation?
            </h3>
            <p className="mt-2 text-xs text-light-800 dark:text-dark-800">
              This will permanently delete the conversation and all its messages,
              sessions, and associated work items. This action cannot be undone.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="rounded-md border border-light-200 px-3 py-1.5 text-xs font-medium text-light-900 transition-colors duration-0 hover:bg-light-100 dark:border-dark-300 dark:text-dark-900 dark:hover:bg-dark-200"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteThread}
                disabled={deleteThreadMut.isPending}
                className="rounded-md bg-red-600 px-3 py-1.5 text-xs font-medium text-white transition-colors duration-0 hover:bg-red-700 disabled:opacity-50"
              >
                {deleteThreadMut.isPending ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </>
      )}

      {/* ── Embed Widget Modal ────────────────────────────────────────────── */}
      {showWidgetEmbed && (
        <>
          <div
            className="fixed inset-0 z-[9998] bg-black/50 backdrop-blur-sm"
            onClick={() => setShowWidgetEmbed(false)}
          />
          <div className="fixed left-1/2 top-1/2 z-[9999] w-[600px] max-w-[calc(100vw-32px)] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-2xl border border-light-200 bg-white shadow-2xl dark:border-dark-300 dark:bg-dark-100">
            {/* Modal header */}
            <div className="flex items-center justify-between border-b border-light-200 px-6 py-4 dark:border-dark-300">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-100 dark:bg-indigo-900/30">
                  <HiOutlineCodeBracket className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-light-900 dark:text-dark-900">
                    Install Chat Widget
                  </h2>
                  <p className="text-xs text-light-800 dark:text-dark-800">
                    Add live chat to your website in minutes
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowWidgetEmbed(false)}
                className="flex h-7 w-7 items-center justify-center rounded-md text-light-800 transition-colors duration-0 hover:bg-light-100 dark:text-dark-800 dark:hover:bg-dark-200"
              >
                <HiOutlineXMark className="h-4 w-4" />
              </button>
            </div>

            {/* Tab bar */}
            <div className="flex border-b border-light-200 bg-light-50/50 px-6 dark:border-dark-300 dark:bg-dark-200/30">
              {(
                [
                  { key: "react", label: "React / Next.js" },
                  { key: "html", label: "HTML" },
                  { key: "vue", label: "Vue / Nuxt" },
                  { key: "api", label: "REST API" },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => { setEmbedTab(tab.key); setCopiedSnippet(false); }}
                  className={`relative px-4 py-2.5 text-xs font-medium transition-colors duration-0 ${
                    embedTab === tab.key
                      ? "text-indigo-600 dark:text-indigo-400"
                      : "text-light-800 hover:text-light-900 dark:text-dark-800 dark:hover:text-dark-900"
                  }`}
                >
                  {tab.label}
                  {embedTab === tab.key && (
                    <span className="absolute bottom-0 left-2 right-2 h-0.5 rounded-full bg-indigo-600 dark:bg-indigo-400" />
                  )}
                </button>
              ))}
            </div>

            {/* Code snippet */}
            <div className="px-6 py-4">
              <div className="overflow-hidden rounded-lg border border-light-200 dark:border-dark-300">
                {/* Snippet header */}
                <div className="flex items-center justify-between border-b border-light-200 bg-light-50 px-4 py-2 dark:border-dark-300 dark:bg-dark-200">
                  <span className="text-[11px] font-medium uppercase tracking-wider text-light-800 dark:text-dark-800">
                    {activeSnippet.lang}
                  </span>
                  <button
                    onClick={handleCopySnippet}
                    className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-medium text-light-800 transition-colors duration-0 hover:bg-light-200 hover:text-light-900 dark:text-dark-800 dark:hover:bg-dark-300 dark:hover:text-dark-900"
                  >
                    {copiedSnippet ? (
                      <>
                        <HiOutlineCheck className="h-3 w-3 text-green-500" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <HiOutlineClipboard className="h-3 w-3" />
                        Copy
                      </>
                    )}
                  </button>
                </div>
                {/* Code block */}
                <pre className="max-h-[280px] overflow-auto bg-[#1e1e2e] p-4 text-[12px] leading-relaxed">
                  <code className="font-mono text-[#cdd6f4]">
                    {activeSnippet.code}
                  </code>
                </pre>
              </div>
            </div>

            {/* Footer with tips */}
            <div className="border-t border-light-200 bg-light-50/50 px-6 py-3 dark:border-dark-300 dark:bg-dark-200/30">
              <div className="flex items-start gap-2">
                <div className="mt-0.5 h-1 w-1 flex-shrink-0 rounded-full bg-indigo-500" />
                <p className="text-[11px] leading-relaxed text-light-800 dark:text-dark-800">
                  <span className="font-medium text-light-900 dark:text-dark-900">Optional attributes:</span>{" "}
                  <code className="rounded bg-light-200/60 px-1 py-0.5 text-[10px] dark:bg-dark-300/60">data-theme</code>{" "}
                  <code className="rounded bg-light-200/60 px-1 py-0.5 text-[10px] dark:bg-dark-300/60">data-position</code>{" "}
                  <code className="rounded bg-light-200/60 px-1 py-0.5 text-[10px] dark:bg-dark-300/60">data-color</code>{" "}
                  — Customize the widget&apos;s appearance and placement.
                </p>
              </div>
              <div className="mt-1.5 flex items-start gap-2">
                <div className="mt-0.5 h-1 w-1 flex-shrink-0 rounded-full bg-indigo-500" />
                <p className="text-[11px] leading-relaxed text-light-800 dark:text-dark-800">
                  <span className="font-medium text-light-900 dark:text-dark-900">Workspace ID:</span>{" "}
                  <code className="rounded bg-light-200/60 px-1 py-0.5 text-[10px] dark:bg-dark-300/60">{workspacePublicId}</code>{" "}
                  — already embedded in the snippet above.
                </p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
