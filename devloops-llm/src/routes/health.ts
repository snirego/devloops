/**
 * Health and readiness endpoints.
 *
 *   GET /health — liveness probe (always 200 if process is alive)
 *   GET /ready  — readiness probe (checks Redis, Postgres, LLM)
 */

import type { FastifyInstance } from "fastify";

import { checkDbHealth } from "../db/client.js";
import { checkRedisHealth } from "../queue/connection.js";
import { checkLlmHealth } from "../llm/client.js";
import { getIngestQueue, getWorkItemQueue } from "../queue/queues.js";

export async function registerHealthRoutes(
  app: FastifyInstance,
): Promise<void> {
  // ── Liveness ─────────────────────────────────────────────────────────
  app.get("/health", async (_req, reply) => {
    return reply.send({
      status: "ok",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  });

  // ── Readiness ────────────────────────────────────────────────────────
  app.get("/ready", async (_req, reply) => {
    const [redis, postgres, llm] = await Promise.all([
      checkRedisHealth(),
      checkDbHealth(),
      checkLlmHealth(),
    ]);

    // Queue metrics
    let ingestWaiting = 0;
    let ingestActive = 0;
    let workItemWaiting = 0;
    let workItemActive = 0;

    try {
      const ingestCounts = await getIngestQueue().getJobCounts(
        "waiting",
        "active",
        "delayed",
        "failed",
      );
      ingestWaiting = ingestCounts.waiting ?? 0;
      ingestActive = ingestCounts.active ?? 0;

      const workItemCounts = await getWorkItemQueue().getJobCounts(
        "waiting",
        "active",
        "delayed",
        "failed",
      );
      workItemWaiting = workItemCounts.waiting ?? 0;
      workItemActive = workItemCounts.active ?? 0;
    } catch {
      // Queue not initialized yet
    }

    const allHealthy = redis && postgres;
    const statusCode = allHealthy ? 200 : 503;

    return reply.code(statusCode).send({
      status: allHealthy ? "ready" : "degraded",
      timestamp: new Date().toISOString(),
      checks: {
        redis,
        postgres,
        llm,
      },
      queues: {
        ingest: { waiting: ingestWaiting, active: ingestActive },
        workItem: { waiting: workItemWaiting, active: workItemActive },
      },
    });
  });
}
