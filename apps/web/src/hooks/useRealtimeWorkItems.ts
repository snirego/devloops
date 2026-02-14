import { useEffect, useRef } from "react";

import { getSupabaseBrowserClient } from "@kan/auth/client";

/**
 * Subscribes to Supabase Realtime for work_item table changes.
 * On INSERT/UPDATE/DELETE, throttle-calls `onInvalidate` to refresh
 * the kanban board without polling.
 *
 * Replaces the previous 10s refetchInterval on workItem.list.
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

  // Throttle invalidation to max once per 3s
  const lastInvalidateRef = useRef(0);

  useEffect(() => {
    if (!enabled) return;

    const supabase = getSupabaseBrowserClient();

    const throttledInvalidate = () => {
      const now = Date.now();
      if (now - lastInvalidateRef.current < 3000) return;
      lastInvalidateRef.current = now;
      onInvalidateRef.current();
    };

    const channel = supabase
      .channel("realtime-work-items")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "work_item",
        },
        throttledInvalidate,
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [enabled]);
}
