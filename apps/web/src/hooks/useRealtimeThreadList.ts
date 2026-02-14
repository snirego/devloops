import { useEffect, useRef } from "react";

import { getSupabaseBrowserClient } from "@kan/auth/client";

/**
 * Subscribes to Supabase Realtime for feedback_thread and feedback_message
 * table changes. When any change occurs (new thread, status change, new message,
 * AI processing update), it throttle-calls `onInvalidate` to refresh the thread
 * list without polling.
 *
 * Replaces the previous 15s refetchInterval on chat.listThreads.
 *
 * Also runs a lightweight fallback poll every 10s to catch any events
 * that Realtime might miss (network blips, cold-start of Supabase channel).
 */
export function useRealtimeThreadList({
  enabled = true,
  onInvalidate,
}: {
  enabled?: boolean;
  onInvalidate: () => void;
}) {
  const onInvalidateRef = useRef(onInvalidate);
  onInvalidateRef.current = onInvalidate;

  // Throttle invalidation to max once per 2s to avoid hammering the API
  const lastInvalidateRef = useRef(0);

  useEffect(() => {
    if (!enabled) return;

    const supabase = getSupabaseBrowserClient();

    const throttledInvalidate = () => {
      const now = Date.now();
      if (now - lastInvalidateRef.current < 2000) return;
      lastInvalidateRef.current = now;
      onInvalidateRef.current();
    };

    const channel = supabase
      .channel("realtime-thread-list")
      // Thread created, updated (status, title, AI processing), or deleted
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "feedback_thread",
        },
        throttledInvalidate,
      )
      // New message inserted — update last message preview in sidebar
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "feedback_message",
        },
        throttledInvalidate,
      )
      // Message updated (edited) — update preview
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "feedback_message",
        },
        throttledInvalidate,
      )
      .subscribe();

    // Fallback poll every 10s to catch events Realtime might miss
    const pollInterval = setInterval(throttledInvalidate, 10_000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(pollInterval);
    };
  }, [enabled]);
}
