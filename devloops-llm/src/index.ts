/**
 * devloops-llm — Standalone LLM backend service.
 *
 * Production-ready Fastify server with BullMQ job processing,
 * designed for deployment on Railway / Koyeb.
 */

import Fastify from "fastify";
import cors from "@fastify/cors";

import { loadConfig } from "./config.js";
import { createLogger } from "./utils/logger.js";
import { registerShutdownHandlers } from "./utils/shutdown.js";
import { registerRateLimit } from "./middleware/rateLimit.js";
import { registerHealthRoutes } from "./routes/health.js";
import { registerJobRoutes } from "./routes/jobs.js";
import { getDb } from "./db/client.js";
import { getRedis } from "./queue/connection.js";
import { getIngestQueue, getWorkItemQueue } from "./queue/queues.js";
import { startWorkers } from "./queue/workers.js";

async function main(): Promise<void> {
  // ── 1. Load + validate config ──────────────────────────────────────
  const config = loadConfig();
  const logger = createLogger();

  logger.info(
    {
      port: config.PORT,
      llmModel: config.LLM_MODEL,
      llmBaseUrl: config.LLM_BASE_URL,
      concurrency: config.LLM_MAX_CONCURRENCY,
    },
    "Starting devloops-llm service",
  );

  // ── 2. Create Fastify instance ─────────────────────────────────────
  const app = Fastify({
    logger: false, // we use our own pino instance
    trustProxy: true, // Railway/Koyeb run behind a reverse proxy
    requestTimeout: 30_000,
    bodyLimit: 1_048_576, // 1 MB
  });

  // ── 3. Register plugins ────────────────────────────────────────────
  const origins = config.ALLOWED_ORIGINS === "*"
    ? true
    : config.ALLOWED_ORIGINS.split(",").map((o) => o.trim());

  await app.register(cors, {
    origin: origins,
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "X-API-Secret"],
  });

  await registerRateLimit(app);

  // ── 4. Register routes ─────────────────────────────────────────────
  await registerHealthRoutes(app);
  await registerJobRoutes(app);

  // Request logging
  app.addHook("onRequest", async (request) => {
    logger.info(
      {
        method: request.method,
        url: request.url,
        ip: request.ip,
        requestId: request.id,
      },
      "Incoming request",
    );
  });

  app.addHook("onResponse", async (request, reply) => {
    logger.info(
      {
        method: request.method,
        url: request.url,
        statusCode: reply.statusCode,
        requestId: request.id,
        responseTimeMs: reply.elapsedTime,
      },
      "Request completed",
    );
  });

  // ── 5. Initialize infrastructure ───────────────────────────────────
  getDb();       // Warm Postgres pool
  getRedis();    // Connect to Redis
  getIngestQueue();   // Initialize queues
  getWorkItemQueue();

  // ── 6. Start BullMQ workers ────────────────────────────────────────
  startWorkers();

  // ── 7. Register graceful shutdown ──────────────────────────────────
  registerShutdownHandlers(app);

  // ── 8. Start listening ─────────────────────────────────────────────
  const address = await app.listen({
    port: config.PORT,
    host: "0.0.0.0", // Required for Docker / Railway / Koyeb
  });

  logger.info({ address }, "devloops-llm is listening");
}

main().catch((err) => {
  console.error("Fatal startup error:", err);
  process.exit(1);
});
