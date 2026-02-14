/**
 * Shared Redis / IORedis connection for BullMQ.
 *
 * Uses the exact same ioredis version as BullMQ (5.9.2).
 */

// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { Redis, type RedisOptions } from "ioredis";

import { getConfig } from "../config.js";
import { getLogger } from "../utils/logger.js";

let _redis: Redis | null = null;

export function getRedis(): Redis {
  if (_redis) return _redis;

  const config = getConfig();
  const logger = getLogger();

  const opts: RedisOptions = {
    maxRetriesPerRequest: null, // required by BullMQ
    enableReadyCheck: true,
    retryStrategy(times: number) {
      const delay = Math.min(times * 200, 5_000);
      logger.warn({ attempt: times, delayMs: delay }, "Redis reconnecting");
      return delay;
    },
  };

  _redis = new Redis(config.REDIS_URL, opts);

  _redis.on("connect", () => logger.info("Redis connected"));
  _redis.on("error", (err: Error) => logger.error({ err }, "Redis error"));
  _redis.on("close", () => logger.warn("Redis connection closed"));

  return _redis;
}

export async function closeRedis(): Promise<void> {
  if (_redis) {
    await _redis.quit();
    _redis = null;
    getLogger().info("Redis connection closed gracefully");
  }
}

export async function checkRedisHealth(): Promise<boolean> {
  try {
    if (!_redis) return false;
    const result = await _redis.ping();
    return result === "PONG";
  } catch {
    return false;
  }
}
