import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";

import { getConfig } from "../config.js";
import { getLogger } from "../utils/logger.js";
import * as schema from "./schema.js";

const { Pool } = pg;

export type DbClient = ReturnType<typeof drizzle<typeof schema>>;

let _pool: pg.Pool | null = null;
let _db: DbClient | null = null;

export function getDb(): DbClient {
  if (_db) return _db;

  const config = getConfig();
  const logger = getLogger();

  _pool = new Pool({
    connectionString: config.POSTGRES_URL,
    max: 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
  });

  _pool.on("error", (err) => {
    logger.error({ err }, "Unexpected Postgres pool error");
  });

  _db = drizzle(_pool, { schema });
  logger.info("Postgres connection pool created");
  return _db;
}

export function getPool(): pg.Pool | null {
  return _pool;
}

export async function closeDb(): Promise<void> {
  if (_pool) {
    await _pool.end();
    _pool = null;
    _db = null;
    getLogger().info("Postgres pool closed");
  }
}

export async function checkDbHealth(): Promise<boolean> {
  try {
    if (!_pool) return false;
    const client = await _pool.connect();
    await client.query("SELECT 1");
    client.release();
    return true;
  } catch {
    return false;
  }
}
