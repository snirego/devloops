/**
 * Graceful shutdown handler.
 *
 * On SIGINT / SIGTERM:
 *   1. Stop accepting new HTTP requests
 *   2. Drain BullMQ workers (wait for active jobs to finish)
 *   3. Close queue connections
 *   4. Close Redis
 *   5. Close Postgres pool
 *   6. Exit
 */

import type { FastifyInstance } from "fastify";

import { getLogger } from "./logger.js";
import { closeWorkers } from "../queue/workers.js";
import { closeQueues } from "../queue/queues.js";
import { closeRedis } from "../queue/connection.js";
import { closeDb } from "../db/client.js";

const SHUTDOWN_TIMEOUT_MS = 30_000;

export function registerShutdownHandlers(app: FastifyInstance): void {
  const logger = getLogger();
  let isShuttingDown = false;

  async function shutdown(signal: string): Promise<void> {
    if (isShuttingDown) return;
    isShuttingDown = true;

    logger.info({ signal }, "Graceful shutdown initiated");

    // Force-exit if shutdown takes too long
    const forceExit = setTimeout(() => {
      logger.error("Shutdown timed out — forcing exit");
      process.exit(1);
    }, SHUTDOWN_TIMEOUT_MS);
    forceExit.unref();

    try {
      // 1. Stop HTTP server
      await app.close();
      logger.info("HTTP server closed");

      // 2. Drain workers
      await closeWorkers();

      // 3. Close queues
      await closeQueues();

      // 4. Close Redis
      await closeRedis();

      // 5. Close Postgres
      await closeDb();

      logger.info("Graceful shutdown complete");
      process.exit(0);
    } catch (err) {
      logger.error({ err }, "Error during shutdown");
      process.exit(1);
    }
  }

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
}
