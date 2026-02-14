/**
 * Rate limiting configuration for Fastify.
 *
 * Uses @fastify/rate-limit with sensible defaults.
 * In production this is backed by the default in-memory store;
 * for multi-instance deployments, switch to the Redis store.
 */

import type { FastifyInstance } from "fastify";
import rateLimit from "@fastify/rate-limit";

export async function registerRateLimit(
  app: FastifyInstance,
): Promise<void> {
  await app.register(rateLimit, {
    max: 100,
    timeWindow: "1 minute",
    keyGenerator: (req) => {
      // Use X-Forwarded-For if behind a proxy, else fallback to IP
      return (
        (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ??
        req.ip
      );
    },
    errorResponseBuilder: (_req, context) => ({
      error: "Too Many Requests",
      message: `Rate limit exceeded. Retry after ${Math.round(context.ttl / 1000)}s`,
      retryAfter: Math.round(context.ttl / 1000),
    }),
  });
}
