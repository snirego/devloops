/**
 * API key auth middleware for Fastify.
 *
 * Validates the X-API-Secret header against the API_SECRET env var
 * using constant-time comparison to prevent timing attacks.
 */

import { timingSafeEqual } from "node:crypto";
import type { FastifyRequest, FastifyReply, HookHandlerDoneFunction } from "fastify";

import { getConfig } from "../config.js";

function constantTimeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;

  const bufA = Buffer.from(a, "utf-8");
  const bufB = Buffer.from(b, "utf-8");

  return timingSafeEqual(bufA, bufB);
}

export function authMiddleware(
  request: FastifyRequest,
  reply: FastifyReply,
  done: HookHandlerDoneFunction,
): void {
  const config = getConfig();
  const secret = request.headers["x-api-secret"] as string | undefined;

  if (!secret) {
    reply.code(401).send({ error: "Missing X-API-Secret header" });
    return;
  }

  if (!constantTimeCompare(secret, config.API_SECRET)) {
    reply.code(403).send({ error: "Invalid API secret" });
    return;
  }

  done();
}
