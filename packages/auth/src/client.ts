import { createBrowserClient } from "@supabase/ssr";

import { useSession } from "./hooks";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

/**
 * Creates a Supabase client for use in browser/client-side React components.
 * Uses @supabase/ssr's createBrowserClient which handles cookie-based auth automatically.
 */
export const createBrowserSupabaseClient = () => {
  return createBrowserClient(supabaseUrl, supabaseAnonKey);
};

/**
 * Singleton browser client instance.
 * Safe to reuse across the app on the client side.
 */
let _browserClient: ReturnType<typeof createBrowserClient> | null = null;

export const getSupabaseBrowserClient = () => {
  if (!_browserClient) {
    _browserClient = createBrowserSupabaseClient();
  }
  return _browserClient;
};

// ---------------------------------------------------------------------------
// authClient — drop-in compatibility layer for code that used better-auth's
// client object.  All methods hit either the Supabase client SDK or the
// server-side /api/auth/* endpoints we added.
// ---------------------------------------------------------------------------

async function fetchApi<T = unknown>(
  path: string,
  init?: RequestInit,
): Promise<{ data: T | null; error: { message: string } | null }> {
  try {
    const res = await fetch(path, init);
    const body = (await res.json()) as Record<string, unknown>;
    if (!res.ok) {
      return {
        data: null,
        error: { message: (body.error as string) ?? "Request failed" },
      };
    }
    return { data: body as T, error: null };
  } catch (err) {
    return {
      data: null,
      error: {
        message: err instanceof Error ? err.message : "Request failed",
      },
    };
  }
}

export const authClient = {
  /** React hook – mirrors better-auth's authClient.useSession() */
  useSession,

  /** Sign out the current user */
  async signOut() {
    const supabase = getSupabaseBrowserClient();
    return supabase.auth.signOut();
  },

  /** Change the current user's password */
  async changePassword(opts: {
    currentPassword: string;
    newPassword: string;
    revokeOtherSessions?: boolean;
  }) {
    return fetchApi("/api/auth/change-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(opts),
    });
  },

  /** Delete the current user */
  async deleteUser() {
    return fetchApi("/api/auth/delete-user", { method: "POST" });
  },

  /** API-key management */
  apiKey: {
    async list() {
      return fetchApi<
        {
          id: number;
          name: string | null;
          start: string | null;
          createdAt: string;
          lastRequest: string | null;
        }[]
      >("/api/auth/api-keys");
    },

    async create(opts: { name: string; prefix?: string }) {
      return fetchApi<{ key: string; name: string }>("/api/auth/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(opts),
      });
    },

    async delete(opts: { keyId: string }) {
      return fetchApi(`/api/auth/api-keys?keyId=${opts.keyId}`, {
        method: "DELETE",
      });
    },
  },

  /** Subscription management (stub – only used in cloud env) */
  subscription: {
    async upgrade(opts: Record<string, unknown>) {
      return fetchApi<{ url: string }>("/api/auth/subscription-upgrade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(opts),
      });
    },
  },
};
