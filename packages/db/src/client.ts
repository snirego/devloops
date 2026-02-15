import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import * as schema from "./schema";

export type dbClient = NodePgDatabase<typeof schema> & {
  $client: Pool;
};

/**
 * Singleton drizzle client.
 *
 * IMPORTANT: Every call to `createDrizzleClient()` returns the SAME instance.
 * Previously each call created a new `Pool`, which exhausted Supabase's
 * Session-mode connection limit (`MaxClientsInSessionMode`).
 */
let _singleton: dbClient | null = null;

export const createDrizzleClient = (): dbClient => {
  if (_singleton) return _singleton;

  const connectionString = process.env.POSTGRES_URL;

  if (!connectionString) {
    // PGlite is loaded dynamically to avoid bundling WASM in serverless
    // environments where POSTGRES_URL is always set.
    throw new Error(
      "POSTGRES_URL environment variable is not set. " +
        "Set POSTGRES_URL to use a real PostgreSQL database.",
    );
  }

  const pool = new Pool({
    connectionString,
    // Keep the pool small to stay within Supabase Session-mode limits.
    // Supabase pooler (pgBouncer session mode) counts each client connection
    // against pool_size — a single shared pool avoids exhaustion.
    max: 5,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
  });

  _singleton = drizzlePg(pool, { schema }) as dbClient;
  return _singleton;
};
