import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";
import { formatDistanceToNow } from "date-fns";
import { createClient } from "@supabase/supabase-js";

/**
 * Widget embed page — rendered inside an iframe on external sites.
 * No dashboard layout, no Tailwind from the host, fully isolated.
 *
 * Features:
 *  - Supabase Realtime for instant message delivery (no polling)
 *  - Sound notification on incoming support replies
 *  - "New messages" divider between read and unread
 *  - Posts unread count to parent window for badge on floating button
 *  - Requires ?workspaceId=... query parameter for data isolation
 */

interface Message {
  publicId: string;
  senderType: "user" | "internal";
  senderName: string | null;
  rawText: string;
  createdAt: string;
  metadataJson?: Record<string, unknown> | null;
}

// ─── Lightweight anon Supabase client for Realtime ─────────────────────────

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

let _anonClient: ReturnType<typeof createClient> | null = null;
function getAnonSupabase() {
  if (!_anonClient && SUPABASE_URL && SUPABASE_ANON_KEY) {
    _anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }
  return _anonClient;
}

// ─── Notification sound helper ─────────────────────────────────────────────
let _notifAudio: HTMLAudioElement | null = null;
function playNotificationSound(baseUrl: string) {
  try {
    if (!_notifAudio) {
      _notifAudio = new Audio(`${baseUrl}/sounds/new-message.mp3`);
      _notifAudio.volume = 0.5;
    }
    _notifAudio.currentTime = 0;
    _notifAudio.play().catch(() => {
      // Browser may block autoplay — silently ignore
    });
  } catch {
    // Non-critical
  }
}

// ─── Read-status localStorage helpers ──────────────────────────────────────
const WIDGET_READ_KEY = "devloops_widget_last_read";
function getLastReadTs(): string | null {
  try {
    return localStorage.getItem(WIDGET_READ_KEY);
  } catch {
    return null;
  }
}
function setLastReadTs(iso: string) {
  try {
    localStorage.setItem(WIDGET_READ_KEY, iso);
  } catch {
    // storage blocked
  }
}

export default function WidgetEmbedPage() {
  const router = useRouter();
  const workspaceId = (router.query.workspaceId as string) ?? "";

  const scrollRef = useRef<HTMLDivElement>(null);
  const isNearBottomRef = useRef(true);
  const seenIds = useRef(new Set<string>());

  const [step, setStep] = useState<"name" | "chat">("name");
  const [visitorName, setVisitorName] = useState("");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [threadDbId, setThreadDbId] = useState<number | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [unreadCount, setUnreadCount] = useState(0);

  // Track whether the parent modal is visible (chat is open).
  // Starts as false — the iframe loads before the user opens the popup.
  const widgetVisibleRef = useRef(false);

  // Capture the last-read timestamp when the component first mounts.
  // This value stays fixed during the session so the divider doesn't jump.
  const initialLastReadRef = useRef<string | null>(null);
  const didCaptureRef = useRef(false);

  // Base URL for sound file (derived from iframe src)
  const baseUrl =
    typeof window !== "undefined" ? window.location.origin : "";

  // ── Force light mode: safety net for any leaked global CSS ──────────
  useEffect(() => {
    document.documentElement.classList.remove("dark");
    document.documentElement.style.colorScheme = "light";

    const style = document.createElement("style");
    style.textContent = `
      html, body {
        background: #fff !important;
        color: #111 !important;
        color-scheme: light !important;
      }
      input, textarea, select {
        background: #fff !important;
        color: #111 !important;
        -webkit-text-fill-color: #111 !important;
      }
      input::placeholder, textarea::placeholder {
        color: #9ca3af !important;
        -webkit-text-fill-color: #9ca3af !important;
      }
    `;
    document.head.appendChild(style);
    return () => { style.remove(); };
  }, []);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    isNearBottomRef.current =
      el.scrollHeight - el.scrollTop - el.clientHeight < 150;
  }, []);

  // Restore session from localStorage
  useEffect(() => {
    const name = localStorage.getItem("devloops_widget_name");
    const sid = localStorage.getItem("devloops_widget_session");
    const tid = localStorage.getItem("devloops_widget_threadId");
    if (name && sid) {
      setVisitorName(name);
      setSessionId(sid);
      if (tid) setThreadDbId(parseInt(tid, 10));
      setStep("chat");
    }
    // Capture initial last-read timestamp
    if (!didCaptureRef.current) {
      initialLastReadRef.current = getLastReadTs();
      didCaptureRef.current = true;
    }
  }, []);

  // Create or resume session
  const initSession = useCallback(
    async (name: string) => {
      const existingSid = localStorage.getItem("devloops_widget_session");

      const res = await fetch("/api/chat/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: existingSid,
          visitorName: name,
          workspacePublicId: workspaceId || undefined,
        }),
      });
      const data = await res.json();
      setSessionId(data.sessionId);
      setThreadDbId(data.threadId ?? null);
      localStorage.setItem("devloops_widget_session", data.sessionId);
      localStorage.setItem("devloops_widget_name", name);
      if (data.threadId) {
        localStorage.setItem(
          "devloops_widget_threadId",
          String(data.threadId),
        );
      }
    },
    [workspaceId],
  );

  // Fetch initial messages once when session is established
  useEffect(() => {
    if (!sessionId) return;

    const loadOnce = async () => {
      try {
        const res = await fetch(`/api/chat/messages?sessionId=${sessionId}`, {
          headers: { "X-Session-Id": sessionId },
        });
        if (res.ok) {
          const data = await res.json();
          const msgs: Message[] = data.messages ?? [];
          const ids = new Set<string>();
          for (const m of msgs) ids.add(m.publicId);
          seenIds.current = ids;
          setMessages(msgs);
        }
      } catch {
        // non-critical
      }
    };

    loadOnce();
  }, [sessionId]);

  // ── Compute unread count & post to parent ────────────────────────────────
  useEffect(() => {
    const lastRead = initialLastReadRef.current;
    // Count incoming support replies that arrived after lastRead
    const count = messages.filter((m) => {
      if (m.senderType !== "internal") return false;
      if (!lastRead) return true; // never read = all are unread
      return new Date(m.createdAt) > new Date(lastRead);
    }).length;
    setUnreadCount(count);

    // Post to parent so the floating button can show the badge
    window.parent?.postMessage(
      { type: "devloops-widget-unread", count },
      "*",
    );
  }, [messages]);

  // ── Mark as read when user scrolls to bottom (only if widget is open) ──
  useEffect(() => {
    if (widgetVisibleRef.current && isNearBottomRef.current && messages.length > 0) {
      setLastReadTs(new Date().toISOString());
    }
  }, [messages]);

  // ── Supabase Realtime subscription ──────────────────────────────────────
  useEffect(() => {
    if (!threadDbId) return;

    const supabase = getAnonSupabase();
    if (!supabase) return;

    const channel = supabase
      .channel(`widget-chat:${threadDbId}`)
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

          // Play sound for incoming support replies (not our own messages)
          if (row.senderType === "internal") {
            playNotificationSound(baseUrl);
          }

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
  }, [threadDbId, baseUrl]);

  // Auto scroll (only when near bottom)
  useEffect(() => {
    if (!isNearBottomRef.current) return;
    const el = scrollRef.current;
    if (!el) return;
    requestAnimationFrame(() => {
      el.scrollTop = el.scrollHeight;
    });
  }, [messages]);

  const handleStartChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!visitorName.trim()) return;
    await initSession(visitorName.trim());
    setStep("chat");
  };

  const handleSend = useCallback(async () => {
    if (!input.trim() || !sessionId) return;

    const text = input.trim();
    // Generate a proper 12-char ID so the server uses the same publicId.
    // This prevents the Realtime INSERT from creating a duplicate.
    const alphabet = "abcdefghijklmnopqrstuvwxyz0123456789";
    let optimisticId = "";
    for (let i = 0; i < 12; i++) {
      optimisticId += alphabet[Math.floor(Math.random() * alphabet.length)];
    }

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

    // Mark as read since the user is actively chatting
    widgetVisibleRef.current = true;
    setLastReadTs(new Date().toISOString());

    try {
      await fetch("/api/chat/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Session-Id": sessionId,
        },
        body: JSON.stringify({
          rawText: text,
          senderName: visitorName,
          publicId: optimisticId,
        }),
      });
    } catch {
      // non-critical
    }
  }, [input, sessionId, visitorName]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Communicate height changes to parent for auto-sizing
  useEffect(() => {
    const sendHeight = () => {
      window.parent?.postMessage(
        { type: "devloops-widget-resize", height: document.body.scrollHeight },
        "*",
      );
    };
    const observer = new ResizeObserver(sendHeight);
    observer.observe(document.body);
    return () => observer.disconnect();
  }, []);

  // Listen for "opened" / "closed" messages from parent
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data?.type === "devloops-widget-opened") {
        widgetVisibleRef.current = true;
        setLastReadTs(new Date().toISOString());
        // Update the initial ref so divider logic stays coherent
        initialLastReadRef.current = new Date().toISOString();
        // Reset unread count
        setUnreadCount(0);
        window.parent?.postMessage(
          { type: "devloops-widget-unread", count: 0 },
          "*",
        );
      } else if (e.data?.type === "devloops-widget-closed") {
        widgetVisibleRef.current = false;
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, []);

  // ─── Name Step ──────────────────────────────────────────────────────────

  if (step === "name") {
    return (
      <div
        style={{
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          display: "flex",
          flexDirection: "column",
          height: "100vh",
          background: "#fff",
        }}
      >
        <div
          style={{
            padding: "24px 16px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "16px",
          }}
        >
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: "50%",
              background: "#6366f1",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
              fontSize: 18,
              fontWeight: 700,
            }}
          >
            D
          </div>
          <div style={{ textAlign: "center" }}>
            <h2
              style={{
                margin: 0,
                fontSize: 16,
                fontWeight: 600,
                color: "#111",
              }}
            >
              DevLoops Support
            </h2>
            <p style={{ margin: "4px 0 0", fontSize: 13, color: "#666" }}>
              Hi! How can we help you today?
            </p>
          </div>
          <form
            onSubmit={handleStartChat}
            style={{ width: "100%", maxWidth: 280 }}
          >
            <input
              type="text"
              value={visitorName}
              onChange={(e) => setVisitorName(e.target.value)}
              placeholder="Your name"
              autoFocus
              style={{
                width: "100%",
                padding: "10px 12px",
                border: "1px solid #e2e8f0",
                borderRadius: 8,
                fontSize: 14,
                outline: "none",
                boxSizing: "border-box",
                background: "#fff",
                color: "#111",
                WebkitTextFillColor: "#111",
              }}
            />
            <button
              type="submit"
              disabled={!visitorName.trim()}
              style={{
                width: "100%",
                marginTop: 10,
                padding: "10px",
                background: visitorName.trim() ? "#6366f1" : "#c7d2fe",
                color: "#fff",
                border: "none",
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 500,
                cursor: visitorName.trim() ? "pointer" : "default",
              }}
            >
              Start Chat
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ─── Chat Step ──────────────────────────────────────────────────────────

  // Build divider placement: insert before first unread support reply
  const lastReadCutoff = initialLastReadRef.current;
  let dividerInsertedBefore: string | null = null;
  if (lastReadCutoff) {
    for (const msg of messages) {
      if (
        msg.senderType === "internal" &&
        new Date(msg.createdAt) > new Date(lastReadCutoff)
      ) {
        dividerInsertedBefore = msg.publicId;
        break;
      }
    }
  } else if (messages.some((m) => m.senderType === "internal")) {
    // Never read — divider before first support reply
    for (const msg of messages) {
      if (msg.senderType === "internal") {
        dividerInsertedBefore = msg.publicId;
        break;
      }
    }
  }

  return (
    <div
      style={{
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        background: "#fff",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "12px 16px",
          borderBottom: "1px solid #e2e8f0",
          display: "flex",
          alignItems: "center",
          gap: 10,
          background: "#6366f1",
          color: "#fff",
        }}
      >
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: "50%",
            background: "rgba(255,255,255,0.2)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 14,
            fontWeight: 700,
          }}
        >
          D
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 600 }}>DevLoops Support</div>
          <div style={{ fontSize: 11, opacity: 0.8 }}>
            We usually respond in a few minutes
          </div>
        </div>
        {/* Unread badge in header */}
        {unreadCount > 0 && (
          <div
            style={{
              minWidth: 20,
              height: 20,
              borderRadius: 10,
              background: "#f43f5e",
              color: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 11,
              fontWeight: 700,
              padding: "0 6px",
            }}
          >
            {unreadCount > 99 ? "99+" : unreadCount}
          </div>
        )}
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        style={{
          flex: 1,
          overflow: "auto",
          padding: "12px 0",
        }}
      >
        {messages.length === 0 && (
          <div
            style={{
              textAlign: "center",
              padding: "40px 20px",
              color: "#94a3b8",
              fontSize: 13,
            }}
          >
            Send a message to start the conversation.
          </div>
        )}

        {messages.map((msg) => {
          const isMe = msg.senderType === "user";
          const isSystem =
            (msg.metadataJson?.type as string)?.startsWith("system_") ?? false;

          // Hide system messages from widget users
          if (isSystem) return null;

          const showDivider = dividerInsertedBefore === msg.publicId;

          const initials = msg.senderName
            ? msg.senderName
                .split(/\s+/)
                .map((p) => p[0])
                .join("")
                .slice(0, 2)
                .toUpperCase()
            : "?";

          return (
            <div key={msg.publicId}>
              {/* ── New Messages Divider ── */}
              {showDivider && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "10px 16px",
                    margin: "4px 0",
                  }}
                >
                  <div
                    style={{ flex: 1, height: 1, background: "#f43f5e40" }}
                  />
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      color: "#f43f5e",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {unreadCount} new{" "}
                    {unreadCount === 1 ? "message" : "messages"}
                  </span>
                  <div
                    style={{ flex: 1, height: 1, background: "#f43f5e40" }}
                  />
                </div>
              )}

              <div
                style={{
                  display: "flex",
                  flexDirection: isMe ? "row-reverse" : "row",
                  gap: 8,
                  padding: "3px 12px",
                }}
              >
                {/* Avatar circle */}
                <div
                  style={{
                    width: 26,
                    height: 26,
                    borderRadius: "50%",
                    background: isMe ? "#6366f1" : "#94a3b8",
                    color: "#fff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 10,
                    fontWeight: 700,
                    flexShrink: 0,
                    marginTop: 4,
                  }}
                  title={msg.senderName ?? undefined}
                >
                  {initials}
                </div>

                <div
                  style={{
                    maxWidth: "72%",
                    background: isMe ? "#6366f1" : "#f1f5f9",
                    color: isMe ? "#fff" : "#111",
                    borderRadius: 12,
                    padding: "8px 12px",
                    fontSize: 14,
                    lineHeight: 1.4,
                  }}
                >
                  {msg.senderName && (
                    <div
                      style={{
                        fontSize: 10,
                        fontWeight: 600,
                        marginBottom: 2,
                        opacity: 0.7,
                      }}
                    >
                      {msg.senderName}
                    </div>
                  )}
                  <div style={{ whiteSpace: "pre-wrap" }}>{msg.rawText}</div>
                  <div
                    style={{
                      fontSize: 10,
                      textAlign: "right",
                      marginTop: 4,
                      opacity: 0.5,
                    }}
                  >
                    {formatDistanceToNow(new Date(msg.createdAt), {
                      addSuffix: true,
                    })}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Input */}
      <div style={{ padding: "8px 12px", borderTop: "1px solid #e2e8f0" }}>
        <div style={{ display: "flex", gap: 8 }}>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            rows={1}
            style={{
              flex: 1,
              resize: "none",
              border: "1px solid #e2e8f0",
              borderRadius: 8,
              padding: "8px 12px",
              fontSize: 14,
              outline: "none",
              minHeight: 36,
              maxHeight: 80,
              fontFamily: "inherit",
              background: "#fff",
              color: "#111",
              WebkitTextFillColor: "#111",
            }}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim()}
            style={{
              width: 36,
              height: 36,
              borderRadius: 8,
              border: "none",
              background: input.trim() ? "#6366f1" : "#c7d2fe",
              color: "#fff",
              cursor: input.trim() ? "pointer" : "default",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 16,
            }}
          >
            &rarr;
          </button>
        </div>
        <div
          style={{
            textAlign: "center",
            fontSize: 10,
            color: "#94a3b8",
            marginTop: 6,
          }}
        >
          Powered by DevLoops
        </div>
      </div>
    </div>
  );
}
