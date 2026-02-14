import { createServerClient as _createServerClient } from "@supabase/ssr";
import type { NextApiRequest, NextApiResponse } from "next";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

/**
 * Creates a Supabase server client for use in Next.js Pages Router API routes.
 * Reads/writes auth tokens from/to cookies via req/res.
 */
export const createServerClient = (
  req: NextApiRequest,
  res: NextApiResponse,
) => {
  return _createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        const cookies: { name: string; value: string }[] = [];
        for (const [name, value] of Object.entries(req.cookies)) {
          if (value !== undefined) {
            cookies.push({ name, value });
          }
        }
        return cookies;
      },
      setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
        cookiesToSet.forEach(({ name, value, options }: { name: string; value: string; options?: Record<string, unknown> }) => {
          res.setHeader(
            "Set-Cookie",
            serializeCookie(name, value, options),
          );
        });
      },
    },
  });
};

/**
 * Creates a Supabase server client for use in getServerSideProps.
 * Uses the req/res from GetServerSidePropsContext.
 */
export const createServerPropsClient = (context: {
  req: NextApiRequest;
  res: NextApiResponse;
}) => {
  return createServerClient(context.req, context.res);
};

function serializeCookie(
  name: string,
  value: string,
  options?: Record<string, unknown>,
): string {
  let cookie = `${name}=${encodeURIComponent(value)}`;
  if (options) {
    if (options.path) cookie += `; Path=${options.path}`;
    if (options.maxAge) cookie += `; Max-Age=${options.maxAge}`;
    if (options.domain) cookie += `; Domain=${options.domain}`;
    if (options.secure) cookie += "; Secure";
    if (options.httpOnly) cookie += "; HttpOnly";
    if (options.sameSite) cookie += `; SameSite=${options.sameSite}`;
  }
  return cookie;
}
