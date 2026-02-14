/**
 * Health and readiness endpoints.
 *
 *   GET /health — liveness probe (always 200 if process is alive)
 *   GET /ready  — readiness probe (checks Redis, Postgres, LLM)
 */

import dns from "node:dns";
import type { FastifyInstance } from "fastify";

import { getConfig } from "../config.js";
import { checkDbHealth } from "../db/client.js";
import { checkRedisHealth } from "../queue/connection.js";
import { checkLlmHealth, getCircuitBreakerStatus, resetCircuitBreaker } from "../llm/client.js";
import { railwayFetch } from "../llm/httpClient.js";
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

    const config = getConfig();
    const circuitBreaker = getCircuitBreakerStatus();

    return reply.code(statusCode).send({
      status: allHealthy ? "ready" : "degraded",
      timestamp: new Date().toISOString(),
      checks: {
        redis,
        postgres,
        llm,
      },
      circuitBreaker,
      llmConfig: {
        baseUrl: config.LLM_BASE_URL,
        model: config.LLM_MODEL,
        // Don't expose the full key — just show if it's set and a prefix
        apiKeySet: !!config.LLM_API_KEY && config.LLM_API_KEY !== "ollama",
        apiKeyPrefix: config.LLM_API_KEY
          ? config.LLM_API_KEY.slice(0, 7) + "..."
          : "(not set)",
      },
      queues: {
        ingest: { waiting: ingestWaiting, active: ingestActive },
        workItem: { waiting: workItemWaiting, active: workItemActive },
      },
    });
  });

  // ── Admin: Reset Circuit Breaker ──────────────────────────────────
  app.post("/admin/reset-circuit-breaker", async (req, reply) => {
    const config = getConfig();
    const secret = req.headers["x-api-secret"];
    if (secret !== config.API_SECRET) {
      return reply.code(401).send({ error: "Unauthorized" });
    }

    resetCircuitBreaker();
    return reply.send({
      status: "ok",
      message: "Circuit breaker reset",
      circuitBreaker: getCircuitBreakerStatus(),
    });
  });

  // ── Admin: Network Diagnostics ──────────────────────────────────────
  app.get("/admin/diag", async (req, reply) => {
    const config = getConfig();
    const secret = req.headers["x-api-secret"];
    if (secret !== config.API_SECRET) {
      return reply.code(401).send({ error: "Unauthorized" });
    }

    const ollamaBase = config.LLM_BASE_URL.replace(/\/v1\/?$/, "");
    const hostname = new URL(config.LLM_BASE_URL).hostname;

    // Test 1: DNS resolution
    let dnsResult: unknown = null;
    try {
      dnsResult = await new Promise((resolve, reject) => {
        dns.resolve(hostname, (err, addresses) => {
          if (err) reject(err);
          else resolve({ ipv4: addresses });
        });
      });
    } catch (err) {
      dnsResult = { error: `IPv4 resolve failed: ${err instanceof Error ? err.message : String(err)}` };
    }

    let dns6Result: unknown = null;
    try {
      dns6Result = await new Promise((resolve, reject) => {
        dns.resolve6(hostname, (err, addresses) => {
          if (err) reject(err);
          else resolve({ ipv6: addresses });
        });
      });
    } catch (err) {
      dns6Result = { error: `IPv6 resolve failed: ${err instanceof Error ? err.message : String(err)}` };
    }

    // Test 2: HTTP connectivity via railwayFetch (Node http module for .railway.internal)
    let httpTest: unknown = null;
    try {
      const res = await railwayFetch(`${ollamaBase}/api/tags`, {
        method: "GET",
        timeoutMs: 10_000,
      });
      const body = await res.text().catch(() => "(could not read body)");
      httpTest = {
        ok: res.ok,
        status: res.status,
        bodyPreview: body.slice(0, 500),
      };
    } catch (err) {
      httpTest = { error: err instanceof Error ? err.message : String(err) };
    }

    // Test 3: Native fetch (for comparison — expected to fail on Railway internal)
    let nativeFetchTest: unknown = null;
    try {
      const res = await fetch(`${ollamaBase}/api/tags`, {
        signal: AbortSignal.timeout(10_000),
      });
      const body = await res.text().catch(() => "(could not read body)");
      nativeFetchTest = {
        ok: res.ok,
        status: res.status,
        bodyPreview: body.slice(0, 500),
      };
    } catch (err) {
      nativeFetchTest = { error: err instanceof Error ? err.message : String(err) };
    }

    return reply.send({
      timestamp: new Date().toISOString(),
      llmBaseUrl: config.LLM_BASE_URL,
      hostname,
      dns: {
        ipv4: dnsResult,
        ipv6: dns6Result,
      },
      connectivity: {
        railwayFetch: httpTest,
        nativeFetch: nativeFetchTest,
      },
    });
  });
}
