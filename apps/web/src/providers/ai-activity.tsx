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
 *   1. Polls via tRPC every 10s for threads with aiProcessingSince != null.
 *      Backs off to 30s on consecutive errors to avoid log spam.
 *   2. Listens to Supabase Realtime for thread updates to refetch instantly
 *      when the AI finishes (aiProcessingSince is cleared).
 *   3. Only activates when the user is authenticated (protectedProcedure).
 */
export function AiActivityProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session } = authClient.useSession();
  const isAuthenticated = !!session?.user;

  // Track consecutive errors so we can back off
  const errorCountRef = useRef(0);

  // Only query when authenticated — the endpoint uses protectedProcedure
  const { data, refetch, status } = api.chat.aiProcessing.useQuery(undefined, {
    enabled: isAuthenticated,
    // Dynamic interval: 10s normally, 30s after 2+ errors, stop after 5+ errors
    refetchInterval: (query) => {
      if (!isAuthenticated) return false;
      if (query.state.status === "error") {
        errorCountRef.current++;
        if (errorCountRef.current >= 5) return false; // stop polling until page reload
        return 30_000; // back off to 30s on error
      }
      errorCountRef.current = 0; // reset on success
      return 10_000;
    },
    refetchOnWindowFocus: true,
    retry: 1, // only retry once on failure, don't stack retries
    retryDelay: 5_000,
  });

  // Stable ref so the Realtime callback always calls the latest refetch
  const refetchRef = useRef(refetch);
  useEffect(() => {
    refetchRef.current = refetch;
  }, [refetch]);

  // Memoised job list
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
          // Also reset error count so polling resumes normally
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
