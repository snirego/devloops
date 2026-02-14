import { useCallback, useEffect, useRef, useState } from "react";

import { getSupabaseBrowserClient } from "@kan/auth/client";

export interface RealtimeMessage {
  id: number;
  publicId: string;
  threadId: number;
  source: string;
  senderType: "user" | "internal";
  senderName: string | null;
  visibility: "public" | "internal";
  rawText: string;
  metadataJson: Record<string, unknown> | null;
  createdAt: string;
}

interface UseRealtimeMessagesOptions {
  /** The thread's DB id (numeric) to subscribe to */
  threadId: number | null;
  /** If true, filters to only public messages (for external-facing views) */
  publicOnly?: boolean;
  /** Initial messages to seed the state with (e.g. from tRPC query) */
  initialMessages?: RealtimeMessage[];
  /** Called when the thread row itself is updated (e.g. LLM finished analyzing) */
  onThreadUpdated?: () => void;
}

/**
 * Subscribes to Supabase Realtime events on `feedback_message`
 * filtered by `threadId`. Merges incoming messages with local state,
 * deduplicating against optimistic messages using `publicId`.
 *
 * Seeding strategy:
 *  - When threadId changes → clear state, wait for initialMessages.
 *  - When initialMessages arrive (from tRPC query) → seed once.
 *  - After seeding, Realtime handles all new/edit/delete events.
 *  - Subsequent query refetches for the same thread are ignored
 *    (we use a fingerprint to detect actual data changes vs stale cache).
 */
export function useRealtimeMessages({
  threadId,
  publicOnly = false,
  initialMessages = [],
  onThreadUpdated,
}: UseRealtimeMessagesOptions) {
  const [messages, setMessages] = useState<RealtimeMessage[]>([]);
  const seenIds = useRef(new Set<string>());

  // Track which threadId we last seeded for and a fingerprint of that seed
  const activeThreadId = useRef<number | null>(null);
  const seedFingerprint = useRef("");

  // Build a lightweight fingerprint from initialMessages to detect real changes
  // (different query load vs duplicate refetch of same data).
  const computeFingerprint = (msgs: RealtimeMessage[]): string => {
    if (msgs.length === 0) return "empty";
    // Use count + last message publicId + last message text length
    const last = msgs[msgs.length - 1]!;
    return `${msgs.length}:${last.publicId}:${last.rawText.length}`;
  };

  // ── Seed / re-seed logic ───────────────────────────────────────────────
  useEffect(() => {
    // Thread changed → always clear and re-seed
    if (threadId !== activeThreadId.current) {
      activeThreadId.current = threadId;
      seedFingerprint.current = "";
      // Clear state immediately when switching threads
      if (threadId === null) {
        seenIds.current = new Set();
        setMessages([]);
        return;
      }
    }

    // No data yet (query still loading) — don't overwrite with empty
    if (initialMessages.length === 0 && seedFingerprint.current !== "") return;

    // Same thread, same data — skip (this prevents refetch-induced flicker)
    const fp = computeFingerprint(initialMessages);
    if (fp === seedFingerprint.current) return;

    // Seed
    seedFingerprint.current = fp;
    const ids = new Set<string>();
    for (const m of initialMessages) ids.add(m.publicId);

    // Merge: keep any optimistic messages (id === -1) that aren't in
    // the initial set — they were added locally while the query was in flight.
    setMessages((prev) => {
      const optimisticExtras = prev.filter(
        (m) => m.id === -1 && !ids.has(m.publicId),
      );
      for (const m of optimisticExtras) ids.add(m.publicId);
      seenIds.current = ids;
      return [...initialMessages, ...optimisticExtras];
    });
  }, [threadId, initialMessages]);

  // Keep a stable ref for the thread-updated callback
  const onThreadUpdatedRef = useRef(onThreadUpdated);
  onThreadUpdatedRef.current = onThreadUpdated;

  // Throttle thread-updated callback to max once per 2s
  const lastThreadUpdateRef = useRef(0);

  // ── Subscribe to Realtime ──────────────────────────────────────────────
  useEffect(() => {
    if (!threadId) return;

    const supabase = getSupabaseBrowserClient();
    const channelName = `thread-messages:${threadId}`;

    const channel = supabase
      .channel(channelName)
      // ── New messages ──────────────────────────────────────────────────
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "feedback_message",
          filter: `threadId=eq.${threadId}`,
        },
        (payload) => {
          const newMsg = payload.new as RealtimeMessage;

          // Filter internal messages in public-only mode
          if (publicOnly && newMsg.visibility !== "public") return;

          // Deduplicate against optimistic messages
          if (seenIds.current.has(newMsg.publicId)) {
            // The optimistic version has id=-1; patch in the real DB id
            setMessages((prev) =>
              prev.map((m) =>
                m.publicId === newMsg.publicId && m.id === -1
                  ? { ...m, id: newMsg.id }
                  : m,
              ),
            );
            return;
          }
          seenIds.current.add(newMsg.publicId);

          setMessages((prev) => {
            if (prev.some((m) => m.publicId === newMsg.publicId)) return prev;
            return [...prev, newMsg];
          });
        },
      )
      // ── Edited messages ───────────────────────────────────────────────
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "feedback_message",
          filter: `threadId=eq.${threadId}`,
        },
        (payload) => {
          const updated = payload.new as RealtimeMessage;
          setMessages((prev) =>
            prev.map((m) =>
              m.publicId === updated.publicId
                ? { ...m, rawText: updated.rawText, id: updated.id }
                : m,
            ),
          );
        },
      )
      // ── Deleted messages ──────────────────────────────────────────────
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "feedback_message",
        },
        (payload) => {
          const old = payload.old as { id?: number; publicId?: string };
          if (old.id) {
            setMessages((prev) => prev.filter((m) => m.id !== old.id));
          } else if (old.publicId) {
            setMessages((prev) =>
              prev.filter((m) => m.publicId !== old.publicId),
            );
          }
        },
      )
      // ── Thread updated (LLM finished, status changed, etc.) ─────────
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "feedback_thread",
          filter: `id=eq.${threadId}`,
        },
        () => {
          const now = Date.now();
          if (now - lastThreadUpdateRef.current < 2000) return;
          lastThreadUpdateRef.current = now;
          onThreadUpdatedRef.current?.();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [threadId, publicOnly]);

  /**
   * Add an optimistic message to the local state.
   * It will be deduped when the real INSERT arrives from Realtime.
   */
  const addOptimistic = useCallback((msg: RealtimeMessage) => {
    seenIds.current.add(msg.publicId);
    setMessages((prev) => [...prev, msg]);
  }, []);

  /**
   * Mark an optimistic message as failed (for retry UI)
   */
  const markFailed = useCallback((publicId: string) => {
    setMessages((prev) =>
      prev.map((m) =>
        m.publicId === publicId
          ? { ...m, metadataJson: { ...m.metadataJson, _failed: true } }
          : m,
      ),
    );
  }, []);

  /**
   * Remove a specific message by publicId
   */
  const removeMessage = useCallback((publicId: string) => {
    seenIds.current.delete(publicId);
    setMessages((prev) => prev.filter((m) => m.publicId !== publicId));
  }, []);

  /**
   * Update the text of an existing message (optimistic edit)
   */
  const updateMessage = useCallback(
    (publicId: string, newText: string) => {
      setMessages((prev) =>
        prev.map((m) =>
          m.publicId === publicId ? { ...m, rawText: newText } : m,
        ),
      );
    },
    [],
  );

  return { messages, addOptimistic, markFailed, removeMessage, updateMessage };
}
