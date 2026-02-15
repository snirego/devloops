import type { NextApiRequest, NextApiResponse } from "next";

export default function handler(
  _req: NextApiRequest,
  res: NextApiResponse,
) {
  const checks: Record<string, string> = {};

  // Check key env vars
  checks.POSTGRES_URL = process.env.POSTGRES_URL ? "set" : "NOT SET";
  checks.BETTER_AUTH_SECRET = process.env.BETTER_AUTH_SECRET ? "set" : "NOT SET";
  checks.NEXT_PUBLIC_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ? "set" : "NOT SET";
  checks.NEXT_PUBLIC_SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? "set" : "NOT SET";
  checks.STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY ? "set" : "NOT SET";
  checks.RESEND_API_KEY = process.env.RESEND_API_KEY ? "set" : "NOT SET";
  checks.NEXT_PUBLIC_KAN_ENV = process.env.NEXT_PUBLIC_KAN_ENV ?? "NOT SET";
  checks.NODE_ENV = process.env.NODE_ENV ?? "NOT SET";
  checks.REDIS_URL = process.env.REDIS_URL ? "set" : "NOT SET";

  return res.status(200).json(checks);
}
