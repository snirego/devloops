import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

/**
 * Creates a Supabase client for use in non-SSR contexts (e.g. background jobs).
 * For SSR/API routes, use createServerClient from server.ts instead.
 */
export const createSupabaseClient = () => {
  return createClient(supabaseUrl, supabaseAnonKey);
};
