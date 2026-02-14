import crypto from "crypto";

import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";
import { and, eq } from "drizzle-orm";

import { db } from "@kan/db/client";
import { apikey } from "@kan/db/schema";

import { createServerClient } from "@kan/auth/server";

// Lazily-initialised Supabase admin client (service-role)
function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
  );
}

/** Return the authenticated Supabase user or null. */
async function getAuthenticatedUser(
  supabase: ReturnType<typeof createServerClient>,
) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

/**
 * Catch-all auth API route.
 * Handles session, sign-up, sign-out, password change, account deletion,
 * and API-key CRUD.
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const supabase = createServerClient(req, res);
  const pathSegments = (req.query.all as string[]) ?? [];
  const path = pathSegments.join("/");

  try {
    switch (path) {
      // ----------------------------------------------------------------
      // EMAIL CONFIRMATION / MAGIC-LINK VERIFICATION
      // Supabase sends: {SITE_URL}/api/auth/confirm?token_hash=...&type=magiclink
      // Legacy better-auth links: /api/auth/magic-link/verify?token=...
      // ----------------------------------------------------------------
      case "confirm":
      case "magic-link/verify": {
        const tokenHash = req.query.token_hash as string | undefined;
        const type =
          (req.query.type as string | undefined) ?? "magiclink";
        const next =
          (req.query.callbackURL as string) ||
          (req.query.next as string) ||
          "/boards";

        if (tokenHash) {
          const { error: verifyErr } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: type as "magiclink" | "email",
          });

          if (!verifyErr) {
            return res.redirect(303, next);
          }
          console.error("Auth confirm error:", verifyErr.message);
        }

        // Redirect to login with error hint
        return res.redirect(303, "/login?error=magic-link-expired");
      }

      // ----------------------------------------------------------------
      // SESSION
      // ----------------------------------------------------------------
      case "session":
      case "get-session": {
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();
        if (error) return res.status(401).json({ error: error.message });
        if (!session) return res.status(401).json({ error: "No session" });
        return res.status(200).json({ session, user: session.user });
      }

      // ----------------------------------------------------------------
      // SOCIAL PROVIDERS
      // Returns a list of provider names that have credentials configured.
      // ----------------------------------------------------------------
      case "social-providers": {
        const providers: string[] = [];
        if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET)
          providers.push("google");
        if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET)
          providers.push("github");
        if (process.env.DISCORD_CLIENT_ID && process.env.DISCORD_CLIENT_SECRET)
          providers.push("discord");
        return res.status(200).json(providers);
      }

      // ----------------------------------------------------------------
      // SIGN-UP  (admin API → email_confirm: true, no email sent)
      // ----------------------------------------------------------------
      case "sign-up": {
        if (req.method !== "POST")
          return res.status(405).json({ error: "Method not allowed" });

        const { email, password, name } = req.body as {
          email?: string;
          password?: string;
          name?: string;
        };
        if (!email || !password)
          return res
            .status(400)
            .json({ error: "Email and password are required" });

        const admin = getAdminClient();
        const { data: adminData, error: adminError } =
          await admin.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: { name: name ?? "" },
          });
        if (adminError)
          return res.status(400).json({ error: adminError.message });
        return res
          .status(200)
          .json({ user: adminData.user, message: "User created" });
      }

      // ----------------------------------------------------------------
      // SIGN-OUT
      // ----------------------------------------------------------------
      case "sign-out": {
        const { error } = await supabase.auth.signOut();
        if (error) return res.status(500).json({ error: error.message });
        return res.status(200).json({ success: true });
      }

      // ----------------------------------------------------------------
      // CHANGE PASSWORD
      // ----------------------------------------------------------------
      case "change-password": {
        if (req.method !== "POST")
          return res.status(405).json({ error: "Method not allowed" });

        const user = await getAuthenticatedUser(supabase);
        if (!user) return res.status(401).json({ error: "Not authenticated" });

        const { newPassword } = req.body as {
          currentPassword?: string;
          newPassword?: string;
          revokeOtherSessions?: boolean;
        };
        if (!newPassword)
          return res
            .status(400)
            .json({ error: "New password is required" });

        const admin = getAdminClient();
        const { error: updateErr } = await admin.auth.admin.updateUserById(
          user.id,
          { password: newPassword },
        );
        if (updateErr)
          return res.status(400).json({ error: updateErr.message });
        return res.status(200).json({ success: true });
      }

      // ----------------------------------------------------------------
      // DELETE USER
      // ----------------------------------------------------------------
      case "delete-user": {
        if (req.method !== "POST")
          return res.status(405).json({ error: "Method not allowed" });

        const user = await getAuthenticatedUser(supabase);
        if (!user) return res.status(401).json({ error: "Not authenticated" });

        const admin = getAdminClient();
        const { error: delErr } = await admin.auth.admin.deleteUser(user.id);
        if (delErr) return res.status(500).json({ error: delErr.message });
        return res.status(200).json({ success: true });
      }

      // ----------------------------------------------------------------
      // API KEYS  (list / create / delete)
      // ----------------------------------------------------------------
      case "api-keys": {
        const user = await getAuthenticatedUser(supabase);
        if (!user) return res.status(401).json({ error: "Not authenticated" });

        // LIST
        if (req.method === "GET") {
          const keys = await db
            .select({
              id: apikey.id,
              name: apikey.name,
              start: apikey.start,
              createdAt: apikey.createdAt,
              lastRequest: apikey.lastRequest,
            })
            .from(apikey)
            .where(eq(apikey.userId, user.id));

          return res.status(200).json({ data: keys });
        }

        // CREATE
        if (req.method === "POST") {
          const { name: keyName, prefix } = req.body as {
            name: string;
            prefix?: string;
          };
          if (!keyName)
            return res.status(400).json({ error: "Name is required" });

          const rawKey = crypto.randomBytes(24).toString("hex");
          const fullKey = `${prefix ?? ""}${rawKey}`;
          const start = fullKey.slice(0, 8);
          const now = new Date();

          const [created] = await db
            .insert(apikey)
            .values({
              name: keyName,
              key: fullKey,
              start,
              prefix: prefix ?? null,
              userId: user.id,
              createdAt: now,
              updatedAt: now,
              enabled: true,
            })
            .returning();

          return res
            .status(200)
            .json({ data: { key: fullKey, name: keyName, id: created?.id } });
        }

        // DELETE
        if (req.method === "DELETE") {
          const keyId = req.query.keyId as string | undefined;
          if (!keyId)
            return res.status(400).json({ error: "keyId is required" });

          await db
            .delete(apikey)
            .where(
              and(eq(apikey.id, Number(keyId)), eq(apikey.userId, user.id)),
            );

          return res.status(200).json({ success: true });
        }

        return res.status(405).json({ error: "Method not allowed" });
      }

      // ----------------------------------------------------------------
      // SUBSCRIPTION UPGRADE (stub — cloud-only)
      // ----------------------------------------------------------------
      case "subscription-upgrade": {
        return res
          .status(501)
          .json({ error: "Subscription management is cloud-only" });
      }

      // ----------------------------------------------------------------
      default:
        return res.status(404).json({ error: "Not found" });
    }
  } catch (error) {
    console.error("Auth API error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
