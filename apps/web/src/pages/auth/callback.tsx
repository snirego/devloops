import { useRouter } from "next/router";
import { useEffect } from "react";

import { getSupabaseBrowserClient } from "@kan/auth/client";

/**
 * Supabase Auth callback page.
 *
 * After a user clicks a magic link or completes an OAuth flow, Supabase
 * redirects here with tokens in the URL hash fragment.  The Supabase
 * browser client automatically picks up the tokens from the hash and
 * establishes a session.  We just need to wait for that to complete
 * and then redirect the user to /boards (or wherever `next` says).
 */
export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();

    // The Supabase client automatically exchanges the hash-fragment tokens
    // when onAuthStateChange fires with a SIGNED_IN event.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN") {
        const next =
          (router.query.next as string) ||
          (router.query.callbackURL as string) ||
          "/boards";
        void router.replace(next);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [router]);

  return (
    <div className="flex h-screen items-center justify-center bg-light-100 dark:bg-dark-50">
      <p className="text-light-1000 dark:text-dark-1000">Signing you in...</p>
    </div>
  );
}
