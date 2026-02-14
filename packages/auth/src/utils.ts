import type { NextApiRequest, NextApiResponse } from "next";

import { createServerClient } from "./server";

/**
 * Gets the current user from Supabase auth in an API route context.
 * Returns the user object or null if not authenticated.
 */
export const getUser = async (req: NextApiRequest, res: NextApiResponse) => {
  const supabase = createServerClient(req, res);
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return null;
  }

  return user;
};

/**
 * Gets the current session from Supabase auth in an API route context.
 */
export const getSession = async (
  req: NextApiRequest,
  res: NextApiResponse,
) => {
  const supabase = createServerClient(req, res);
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error || !session) {
    return null;
  }

  return session;
};
