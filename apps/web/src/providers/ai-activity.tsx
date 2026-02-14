import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

import { authClient } from "@kan/auth/client";
import { getSupabaseBrowserClient } from "@kan/auth/client";

import { api } from "~/utils/api";
import { WorkspaceContext } from "~/providers/workspace";

// ─── Types ─────────────────────────────────────────────────────────────────

interface AiJob {
  threadId: number;
  threadPublicId: string;
  threadTitle: string;
  since: string;
}

interface AiActivityContextValue {
  /** Currently active AI jobs (from DB) */
  activeJobs: AiJob[];
  /** Is the AI currently processing anything? */
  isActive: boolean;
}

const AiActivityContext = createContext<AiActivityContextValue>({
  activeJobs: [],
  isActive: false,
});

export const useAiActivity = () => useContext(AiActivityContext);

// ─── Provider ──────────────────────────────────────────────────────────────

/**
 * Global AI activity tracker — lives in _app.tsx so it is NEVER unmounted
 * during page navigation. Works across all pages, tabs, and browser refreshes.
 *
 * The LLM pipeline sets `aiProcessingSince` on the feedback_thread row when
 * it starts, and clears it when done. This provider:
 *   1. Fetches AI processing state on mount and on window re-focus.
 *   2. Only polls (every 5s) while jobs are active — stops when idle.
 *   3. Listens to Supabase Realtime for thread updates to refetch instantly
 *      when the AI starts or finishes (aiProcessingSince set/cleared).
 *   4. Only activates when the user is authenticated (protectedProcedure).
 */
export function AiActivityProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session } = authClient.useSession();
  const isAuthenticated = !!session?.user;

  // Get workspace context (may be undefined if not yet loaded)
  const workspaceCtx = useContext(WorkspaceContext);
  const workspacePublicId = workspaceCtx?.workspace?.publicId;
  const hasWorkspace = !!workspacePublicId && workspacePublicId.length >= 12;

  // Track whether we currently have active jobs — drives polling
  const [hasActiveJobs, setHasActiveJobs] = useState(false);

  // Track consecutive errors so we can back off
  const errorCountRef = useRef(0);

  // Only query when authenticated and workspace is resolved
  const { data, refetch } = api.chat.aiProcessing.useQuery(
    hasWorkspace ? { workspacePublicId } : undefined,
    {
      enabled: isAuthenticated && hasWorkspace,
      // Only poll while there are active jobs (5s), otherwise don't poll at all.
      // Supabase Realtime handles the "AI just started" notification.
      refetchInterval: () => {
        if (!isAuthenticated || !hasWorkspace) return false;
        if (errorCountRef.current >= 3) return false; // stop on repeated errors
        if (hasActiveJobs) return 5_000; // poll while active
        return false; // idle — no polling, Realtime will trigger refetch
      },
      refetchOnWindowFocus: true,
      retry: 1,
      retryDelay: 5_000,
    },
  );

  // Stable ref so the Realtime callback always calls the latest refetch
  const refetchRef = useRef(refetch);
  useEffect(() => {
    refetchRef.current = refetch;
  }, [refetch]);

  // Derive job list from query data
  const [activeJobs, setActiveJobs] = useState<AiJob[]>([]);

  useEffect(() => {
    const jobs: AiJob[] = (data ?? []).map((t) => ({
      threadId: t.id,
      threadPublicId: t.publicId,
      threadTitle: t.title ?? "",
      since: t.aiProcessingSince
        ? typeof t.aiProcessingSince === "string"
          ? t.aiProcessingSince
          : (t.aiProcessingSince as Date).toISOString()
        : new Date().toISOString(),
    }));
    setActiveJobs(jobs);
    setHasActiveJobs(jobs.length > 0);
    // Reset error count on any successful response
    errorCountRef.current = 0;
  }, [data]);

  // ── Supabase Realtime subscription (global, never remounts) ──────────
  const channelRef = useRef<ReturnType<
    ReturnType<typeof getSupabaseBrowserClient>["channel"]
  > | null>(null);

  const setupRealtime = useCallback(() => {
    // Clean up any previous channel first
    if (channelRef.current) {
      const supabase = getSupabaseBrowserClient();
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    if (!isAuthenticated) return;

    const supabase = getSupabaseBrowserClient();

    const channel = supabase
      .channel("ai-activity-global")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "feedback_thread",
        },
        () => {
          // Refetch immediately when any thread changes
          // (AI starting or finishing — aiProcessingSince set/cleared)
          errorCountRef.current = 0;
          refetchRef.current();
        },
      )
      .subscribe();

    channelRef.current = channel;
  }, [isAuthenticated]);

  useEffect(() => {
    setupRealtime();

    return () => {
      if (channelRef.current) {
        const supabase = getSupabaseBrowserClient();
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [setupRealtime]);

  const value: AiActivityContextValue = {
    activeJobs,
    isActive: activeJobs.length > 0,
  };

  return (
    <AiActivityContext.Provider value={value}>
      {children}
    </AiActivityContext.Provider>
  );
}
