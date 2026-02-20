import type { CreateNextContextOptions } from "@trpc/server/adapters/next";
import type { NextApiRequest } from "next";
import type { OpenApiMeta } from "trpc-to-openapi";
import { initTRPC, TRPCError } from "@trpc/server";
import { env } from "next-runtime-env";
import superjson from "superjson";
import { ZodError } from "zod";

import type { dbClient } from "@kan/db/client";
import { createDrizzleClient } from "@kan/db/client";
import * as userRepo from "@kan/db/repository/user.repo";
import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

export interface User {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
  image?: string | null | undefined;
  stripeCustomerId?: string | null | undefined;
  isDevAccount: boolean;
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

interface CreateContextOptions {
  user: User | null | undefined;
  db: dbClient;
  headers: Headers;
}

export const createInnerTRPCContext = (opts: CreateContextOptions) => {
  return {
    user: opts.user,
    db: opts.db,
    headers: opts.headers,
  };
};

/**
 * Gets the Supabase user from request cookies, then looks up the
 * corresponding user in our database.
 */
async function getUserFromRequest(
  req: NextApiRequest,
  db: dbClient,
): Promise<User | null> {
  const cookies: { name: string; value: string }[] = [];
  for (const [name, value] of Object.entries(req.cookies ?? {})) {
    if (value !== undefined) {
      cookies.push({ name, value });
    }
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookies;
      },
      setAll() {
        // No-op for read-only context
      },
    },
  });

  let supabaseUser: { id: string; email?: string } | null = null;

  // 1. Try cookie-based session (web clients)
  const cookieResult = await supabase.auth.getUser();
  if (!cookieResult.error && cookieResult.data.user) {
    supabaseUser = cookieResult.data.user;
  }

  // 2. Fallback: Authorization: Bearer <token> (mobile / API clients)
  if (!supabaseUser) {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.slice(7);
      const client = createSupabaseClient(supabaseUrl, supabaseAnonKey);
      const { data, error: tokenError } = await client.auth.getUser(token);
      if (!tokenError && data.user) {
        supabaseUser = data.user;
      }
    }
  }

  if (!supabaseUser) {
    return null;
  }

  // Look up the user in our database by their Supabase user ID
  const dbUser = await userRepo.getById(db, supabaseUser.id);

  if (!dbUser) {
    // User exists in Supabase but not in our DB yet - create them
    const email = supabaseUser.email;
    if (!email) return null;

    const newUser = await userRepo.create(db, {
      id: supabaseUser.id,
      email,
    });

    if (!newUser) return null;

    return {
      id: newUser.id,
      name: newUser.name ?? "",
      email: newUser.email,
      emailVerified: newUser.emailVerified,
      createdAt: newUser.createdAt,
      updatedAt: newUser.updatedAt,
      image: null,
      stripeCustomerId: newUser.stripeCustomerId,
      isDevAccount: newUser.isDevAccount,
    };
  }

  return {
    id: dbUser.id,
    name: dbUser.name ?? "",
    email: dbUser.email ?? "",
    emailVerified: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    image: dbUser.image,
    stripeCustomerId: dbUser.stripeCustomerId,
    isDevAccount: dbUser.isDevAccount,
  };
}

export const createTRPCContext = async ({ req }: CreateNextContextOptions) => {
  const db = createDrizzleClient();
  const headers = new Headers(req.headers as Record<string, string>);
  const user = await getUserFromRequest(req, db);

  return createInnerTRPCContext({ db, user, headers });
};

export const createNextApiContext = async (req: NextApiRequest) => {
  const db = createDrizzleClient();
  const headers = new Headers(req.headers as Record<string, string>);
  const user = await getUserFromRequest(req, db);

  return createInnerTRPCContext({ db, user, headers });
};

export const createRESTContext = async ({ req }: CreateNextContextOptions) => {
  const db = createDrizzleClient();
  const headers = new Headers(req.headers as Record<string, string>);
  const user = await getUserFromRequest(req, db);

  return createInnerTRPCContext({ db, user, headers });
};

const t = initTRPC
  .context<typeof createTRPCContext>()
  .meta<OpenApiMeta>()
  .create({
    transformer: superjson,
    errorFormatter({ shape, error }) {
      return {
        ...shape,
        data: {
          ...shape.data,
          zodError:
            error.cause instanceof ZodError ? error.cause.flatten() : null,
        },
      };
    },
  });

export const createTRPCRouter = t.router;

export const createCallerFactory = t.createCallerFactory;

export const publicProcedure = t.procedure.meta({
  openapi: { method: "GET", path: "/public" },
});

const enforceUserIsAuthed = t.middleware(async ({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }

  return next({
    ctx,
  });
});

const enforceUserIsAdmin = t.middleware(async ({ ctx, next }) => {
  if (ctx.headers.get("x-admin-api-key") !== env("KAN_ADMIN_API_KEY")) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }

  return next({
    ctx,
  });
});

export const protectedProcedure = t.procedure.use(enforceUserIsAuthed).meta({
  openapi: {
    method: "GET",
    path: "/protected",
  },
});

export const adminProtectedProcedure = t.procedure
  .use(enforceUserIsAdmin)
  .meta({
    openapi: {
      method: "GET",
      path: "/admin/protected",
    },
  });
