import { useEffect, useRef } from "react";

import { getSupabaseBrowserClient } from "@kan/auth/client";

/**
 * Subscribes to Supabase Realtime for work_item and feedback_thread
 * table changes. On INSERT/UPDATE/DELETE, throttle-calls `onInvalidate`
 * to refresh the work items list without polling.
 *
 * Also subscribes to feedback_thread updates (status changes, new threads)
 * since work items are displayed with thread context.
 *
 * Includes a lightweight fallback poll every 10s to catch any events
 * that Realtime might miss (network blips, cold-start of Supabase channel).
 */
export function useRealtimeWorkItems({
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
      .channel("realtime-work-items")
      // Work item created, updated (status, assignment, fields), or deleted
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "work_item",
        },
        throttledInvalidate,
      )
      // Thread updates (status, title changes) — work items display thread context
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "feedback_thread",
        },
        throttledInvalidate,
      )
      // New thread created (may have new work items associated soon)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "feedback_thread",
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
