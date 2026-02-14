import { useMemo } from "react";

import { useWorkspace } from "~/providers/workspace";
import { api } from "~/utils/api";
import { useThreadReadStatus } from "~/hooks/useThreadReadStatus";
import { useRealtimeThreadList } from "~/hooks/useRealtimeThreadList";
import { ensureUtcTimestamp } from "~/hooks/useRealtimeMessages";

/**
 * Global hook that computes how many chat threads have unread messages.
 *
 * "Unread" means the thread contains at least one message from a customer
 * (`senderType === "user"`) that arrived after the dev last opened that thread.
 *
 * Shares the same tRPC query cache as the ChatView (`chat.listThreads`),
 * so it won't cause duplicate requests. Also subscribes to Supabase Realtime
 * via `useRealtimeThreadList` so the count updates instantly.
 */
export function useUnreadThreadCount(): number {
  const { workspace } = useWorkspace();
  const { getUnreadCount } = useThreadReadStatus();

  const hasWorkspace =
    !!workspace?.publicId && workspace.publicId.length >= 12;

  const utils = api.useUtils();

  // Fetch thread list — shares cache with ChatView (same queryKey)
  const { data: threads } = api.chat.listThreads.useQuery(
    { workspacePublicId: workspace?.publicId ?? "" },
    {
      enabled: hasWorkspace,
      staleTime: 5_000,
    },
  );

  // Subscribe to Realtime to keep count fresh
  useRealtimeThreadList({
    enabled: hasWorkspace,
    onInvalidate: () => {
      void utils.chat.listThreads.invalidate();
    },
  });

  // Count threads that have at least 1 unread customer message
  const unreadThreadCount = useMemo(() => {
    if (!threads || threads.length === 0) return 0;

    let count = 0;
    for (const thread of threads) {
      // Skip archived threads
      if (thread.status === "Closed") continue;

      const msgs = thread.messages;
      if (!msgs || msgs.length === 0) continue;

      const unread = getUnreadCount(
        thread.publicId,
        msgs.map((m) => ({
          createdAt:
            typeof m.createdAt === "string"
              ? ensureUtcTimestamp(m.createdAt)
              : (m.createdAt as Date).toISOString(),
          senderType: m.senderType,
        })),
      );

      if (unread > 0) count++;
    }
    return count;
  }, [threads, getUnreadCount]);

  return unreadThreadCount;
}
