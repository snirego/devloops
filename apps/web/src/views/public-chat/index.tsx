import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";
import {
  HiOutlineChatBubbleLeftRight,
  HiOutlinePaperAirplane,
  HiOutlineExclamationTriangle,
} from "react-icons/hi2";
import { formatDistanceToNow } from "date-fns";
import { createClient } from "@supabase/supabase-js";

import { PageHead } from "~/components/PageHead";

// ─── Types ─────────────────────────────────────────────────────────────────

interface PublicMessage {
  publicId: string;
  senderType: "user" | "internal";
  senderName: string | null;
  rawText: string;
  createdAt: string;
  metadataJson?: Record<string, unknown> | null;
}

interface ThreadInfo {
  publicId: string;
  title: string | null;
  status: string;
}

// ─── Lightweight Supabase client for Realtime (anon, no auth) ─────────────

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

let _anonClient: ReturnType<typeof createClient> | null = null;
function getAnonSupabase() {
  if (!_anonClient && SUPABASE_URL && SUPABASE_ANON_KEY) {
    _anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }
  return _anonClient;
}

// ─── Component ─────────────────────────────────────────────────────────────

export default function PublicChatView() {
  const router = useRouter();
  const { threadId } = router.query;
  const scrollRef = useRef<HTMLDivElement>(null);

  const [visitorName, setVisitorName] = useState("");
  const [hasName, setHasName] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [threadDbId, setThreadDbId] = useState<number | null>(null);
  const [thread, setThread] = useState<ThreadInfo | null>(null);
  const [messages, setMessages] = useState<PublicMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Track seen publicIds for dedup against optimistic messages
  const seenIds = useRef(new Set<string>());
  // Smart scroll: only auto-scroll when near bottom
  const isNearBottomRef = useRef(true);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    isNearBottomRef.current =
      el.scrollHeight - el.scrollTop - el.clientHeight < 150;
  }, []);

  // Check localStorage for existing name
  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = localStorage.getItem("devloops_chat_name");
    if (stored) {
      setVisitorName(stored);
      setHasName(true);
    }
  }, []);

  // Load thread data (initial fetch — once)
  useEffect(() => {
    if (!threadId || typeof threadId !== "string") return;

    const loadThread = async () => {
      try {
        const res = await fetch(`/api/chat/thread/${threadId}`);
        if (!res.ok) {
          setError("Thread not found");
          setLoading(false);
          return;
        }
        const data = await res.json();
        setThread(data.thread);
        setThreadDbId(data.thread?.id ?? null);

        const msgs: PublicMessage[] = data.messages ?? [];
        const ids = new Set<string>();
        for (const m of msgs) ids.add(m.publicId);
        seenIds.current = ids;
        setMessages(msgs);
        setLoading(false);
      } catch {
        setError("Failed to load conversation");
        setLoading(false);
      }
    };

    loadThread();
  }, [threadId]);

  // Create or resume session
  useEffect(() => {
    if (!threadId || typeof threadId !== "string" || !hasName) return;

    const existingSession = localStorage.getItem(
      `devloops_chat_session_${threadId}`,
    );

    const initSession = async () => {
      try {
        const res = await fetch("/api/chat/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId: existingSession,
            threadPublicId: threadId,
            visitorName,
          }),
        });
        const data = await res.json();
        setSessionId(data.sessionId);
        localStorage.setItem(
          `devloops_chat_session_${threadId}`,
          data.sessionId,
        );
      } catch {
        // Non-critical
      }
    };

    initSession();
  }, [threadId, hasName, visitorName]);

  // ── Supabase Realtime subscription (replaces polling) ─────────────────
  useEffect(() => {
    if (!threadDbId) return;

    const supabase = getAnonSupabase();
    if (!supabase) return;

    const channel = supabase
      .channel(`public-chat:${threadDbId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "feedback_message",
          filter: `threadId=eq.${threadDbId}`,
        },
        (payload) => {
          const row = payload.new as {
            publicId: string;
            senderType: "user" | "internal";
            senderName: string | null;
            rawText: string;
            createdAt: string;
            metadataJson: Record<string, unknown> | null;
            visibility: string;
          };

          // Only show public messages
          if (row.visibility !== "public") return;

          // Deduplicate against optimistic messages
          if (seenIds.current.has(row.publicId)) return;
          seenIds.current.add(row.publicId);

          setMessages((prev) => {
            if (prev.some((m) => m.publicId === row.publicId)) return prev;
            return [
              ...prev,
              {
                publicId: row.publicId,
                senderType: row.senderType,
                senderName: row.senderName,
                rawText: row.rawText,
                createdAt: row.createdAt,
                metadataJson: row.metadataJson,
              },
            ];
          });
        },
      )
      // Handle message edits
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "feedback_message",
          filter: `threadId=eq.${threadDbId}`,
        },
        (payload) => {
          const updated = payload.new as {
            publicId: string;
            rawText: string;
          };
          setMessages((prev) =>
            prev.map((m) =>
              m.publicId === updated.publicId
                ? { ...m, rawText: updated.rawText }
                : m,
            ),
          );
        },
      )
      // Handle message deletions
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "feedback_message",
        },
        (payload) => {
          const old = payload.old as { publicId?: string };
          if (old.publicId) {
            seenIds.current.delete(old.publicId);
            setMessages((prev) =>
              prev.filter((m) => m.publicId !== old.publicId),
            );
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [threadDbId]);

  // Auto scroll (only when near bottom)
  useEffect(() => {
    if (!isNearBottomRef.current) return;
    const el = scrollRef.current;
    if (!el) return;
    requestAnimationFrame(() => {
      el.scrollTop = el.scrollHeight;
    });
  }, [messages]);

  const handleSetName = (e: React.FormEvent) => {
    e.preventDefault();
    if (!visitorName.trim()) return;
    localStorage.setItem("devloops_chat_name", visitorName.trim());
    setHasName(true);
  };

  const handleSend = useCallback(async () => {
    if (!input.trim() || !sessionId) return;

    const text = input.trim();
    const optimisticId = `opt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    // Optimistic — add instantly and clear input
    seenIds.current.add(optimisticId);
    setMessages((prev) => [
      ...prev,
      {
        publicId: optimisticId,
        senderType: "user",
        senderName: visitorName,
        rawText: text,
        createdAt: new Date().toISOString(),
      },
    ]);
    setInput("");

    try {
      await fetch("/api/chat/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Session-Id": sessionId,
        },
        body: JSON.stringify({ rawText: text, senderName: visitorName }),
      });
    } catch {
      // Mark as failed visually
      setMessages((prev) =>
        prev.map((m) =>
          m.publicId === optimisticId
            ? { ...m, metadataJson: { _failed: true } }
            : m,
        ),
      );
    }
  }, [input, sessionId, visitorName]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // ─── Loading / Error states ─────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50">
        <HiOutlineExclamationTriangle className="h-10 w-10 text-red-400" />
        <p className="mt-3 text-sm text-gray-700">{error}</p>
      </div>
    );
  }

  // ─── Name prompt ────────────────────────────────────────────────────────

  if (!hasName) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <PageHead title="Chat" />
        <div className="w-full max-w-sm rounded-xl bg-white p-8 shadow-lg">
          <div className="mb-6 text-center">
            <HiOutlineChatBubbleLeftRight className="mx-auto h-10 w-10 text-indigo-500" />
            <h1 className="mt-3 text-lg font-semibold text-gray-900">
              Join the Conversation
            </h1>
            <p className="mt-1 text-sm text-gray-600">
              {thread?.title ?? "Enter your name to start chatting"}
            </p>
          </div>
          <form onSubmit={handleSetName}>
            <input
              type="text"
              value={visitorName}
              onChange={(e) => setVisitorName(e.target.value)}
              placeholder="Your name"
              autoFocus
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
            <button
              type="submit"
              disabled={!visitorName.trim()}
              className="mt-3 w-full rounded-lg bg-indigo-600 py-2.5 text-sm font-medium text-white transition-colors hover:bg-indigo-700 disabled:opacity-50"
            >
              Start Chatting
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ─── Chat view ──────────────────────────────────────────────────────────

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <PageHead title={thread?.title ?? "Chat"} />

      {/* Header */}
      <div className="border-b border-gray-200 bg-white px-4 py-3 shadow-sm">
        <div className="mx-auto flex max-w-2xl items-center gap-3">
          <HiOutlineChatBubbleLeftRight className="h-5 w-5 text-indigo-500" />
          <div>
            <h1 className="text-sm font-semibold text-gray-900">
              {thread?.title ?? "Conversation"}
            </h1>
            <p className="text-xs text-gray-600">
              {thread?.status === "Open" ? "Active" : thread?.status}
            </p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="mx-auto w-full max-w-2xl flex-1 overflow-y-auto py-4"
      >
        {messages.length === 0 && (
          <div className="py-12 text-center">
            <p className="text-sm text-gray-500">
              Start the conversation by sending a message.
            </p>
          </div>
        )}

        {messages.map((msg) => {
          const isMe = msg.senderType === "user";
          const isSystem =
            (msg.metadataJson?.type as string)?.startsWith("system_") ?? false;
          const isFailed = !!msg.metadataJson?._failed;

          // Hide system messages (AI work item suggestions, etc.) from external users
          if (isSystem) return null;

          const initials = msg.senderName
            ? msg.senderName
                .split(/\s+/)
                .map((p) => p[0])
                .join("")
                .slice(0, 2)
                .toUpperCase()
            : "?";

          return (
            <div
              key={msg.publicId}
              className={`flex gap-2 px-4 py-1.5 ${isMe ? "flex-row-reverse" : "flex-row"}`}
            >
              {/* Avatar */}
              <span
                className={`mt-1 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-[10px] font-semibold text-white ${
                  isMe ? "bg-indigo-600" : "bg-gray-500"
                }`}
                title={msg.senderName ?? undefined}
              >
                {initials}
              </span>

              <div className={`max-w-[70%] ${isFailed ? "opacity-50" : ""}`}>
                <div
                  className={`rounded-lg px-3 py-2 ${
                    isMe
                      ? "bg-indigo-600 text-white"
                      : "bg-white text-gray-900 shadow-sm"
                  }`}
                >
                  {msg.senderName && (
                    <span
                      className={`mb-0.5 block text-[10px] font-semibold ${
                        isMe ? "text-indigo-200" : "text-gray-500"
                      }`}
                    >
                      {msg.senderName}
                    </span>
                  )}
                  <p className="whitespace-pre-wrap text-sm">{msg.rawText}</p>
                  <span
                    className={`mt-1 block text-right text-[10px] ${
                      isMe ? "text-indigo-200" : "text-gray-500"
                    }`}
                  >
                    {formatDistanceToNow(new Date(msg.createdAt), {
                      addSuffix: true,
                    })}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Input */}
      <div className="border-t border-gray-200 bg-white p-3">
        <div className="mx-auto flex max-w-2xl items-end gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            rows={1}
            className="flex-1 resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-400"
            style={{ minHeight: "38px", maxHeight: "100px" }}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim()}
            className="flex h-[38px] w-[38px] items-center justify-center rounded-lg bg-indigo-600 text-white transition-colors hover:bg-indigo-700 disabled:opacity-40"
          >
            <HiOutlinePaperAirplane className="h-4 w-4" />
          </button>
        </div>
        <p className="mx-auto mt-1 max-w-2xl text-center text-[10px] text-gray-500">
          Powered by DevLoops
        </p>
      </div>
    </div>
  );
}
