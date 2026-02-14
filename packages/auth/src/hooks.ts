import { useEffect, useState, useCallback } from "react";
import type { AuthChangeEvent, Session, User } from "@supabase/supabase-js";

import { getSupabaseBrowserClient } from "./client";

export interface UseSessionReturn {
  data: {
    user: User | null;
    session: Session | null;
  } | null;
  isPending: boolean;
  error: Error | null;
}

/**
 * React hook to get the current Supabase auth session.
 * Replaces better-auth's authClient.useSession().
 */
export const useSession = (): UseSessionReturn => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isPending, setIsPending] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();

    // Get initial session
    supabase.auth
      .getSession()
      .then(
        ({
          data,
          error: sessionError,
        }: {
          data: { session: Session | null };
          error: Error | null;
        }) => {
          if (sessionError) {
            setError(sessionError);
          } else {
            setSession(data.session);
            setUser(data.session?.user ?? null);
          }
          setIsPending(false);
        },
      )
      .catch((err: unknown) => {
        setError(err instanceof Error ? err : new Error(String(err)));
        setIsPending(false);
      });

    // Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (_event: AuthChangeEvent, newSession: Session | null) => {
        setSession(newSession);
        setUser(newSession?.user ?? null);
        setIsPending(false);
      },
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  if (!user && !session && isPending) {
    return { data: null, isPending: true, error: null };
  }

  return {
    data: { user, session },
    isPending,
    error,
  };
};

/**
 * Hook to sign out the current user.
 */
export const useSignOut = () => {
  const [isPending, setIsPending] = useState(false);

  const signOut = useCallback(async () => {
    setIsPending(true);
    const supabase = getSupabaseBrowserClient();
    const { error } = await supabase.auth.signOut();
    setIsPending(false);
    if (error) throw error;
    // Redirect to login page after sign out (type-safe in non-DOM tsconfig)
    const g = globalThis as typeof globalThis & {
      window?: { location: { href: string } };
    };
    if (typeof g.window !== "undefined") {
      g.window.location.href = "/auth/login";
    }
  }, []);

  return { signOut, isPending };
};
