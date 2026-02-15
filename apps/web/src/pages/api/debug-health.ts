import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(
  _req: NextApiRequest,
  res: NextApiResponse,
) {
  const checks: Record<string, string> = {};

  // Check env validation
  try {
    await import("~/env");
    checks.envValidation = "ok";
  } catch (e) {
    checks.envValidation = `FAILED: ${e instanceof Error ? e.message : String(e)}`;
  }

  // Check DB client
  try {
    const { createDrizzleClient } = await import("@kan/db/client");
    createDrizzleClient();
    checks.dbClient = "ok";
  } catch (e) {
    checks.dbClient = `FAILED: ${e instanceof Error ? e.message : String(e)}`;
  }

  // Check API router
  try {
    await import("@kan/api/root");
    checks.apiRouter = "ok";
  } catch (e) {
    checks.apiRouter = `FAILED: ${e instanceof Error ? e.message : String(e)}`;
  }

  // Check tRPC context
  try {
    await import("@kan/api/trpc");
    checks.trpcContext = "ok";
  } catch (e) {
    checks.trpcContext = `FAILED: ${e instanceof Error ? e.message : String(e)}`;
  }

  // Check rate limiter
  try {
    await import("@kan/api/utils/rateLimit");
    checks.rateLimit = "ok";
  } catch (e) {
    checks.rateLimit = `FAILED: ${e instanceof Error ? e.message : String(e)}`;
  }

  // Check key env vars
  checks.POSTGRES_URL = process.env.POSTGRES_URL ? "set" : "NOT SET";
  checks.BETTER_AUTH_SECRET = process.env.BETTER_AUTH_SECRET ? "set" : "NOT SET";
  checks.NEXT_PUBLIC_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ? "set" : "NOT SET";
  checks.NEXT_PUBLIC_SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? "set" : "NOT SET";
  checks.STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY ? "set" : "NOT SET";
  checks.NODE_ENV = process.env.NODE_ENV ?? "NOT SET";

  const allOk = Object.values(checks).every(
    (v) => v === "ok" || v === "set" || v === "NOT SET" || v === "production" || v === "development",
  );

  return res.status(allOk ? 200 : 500).json(checks);
}
