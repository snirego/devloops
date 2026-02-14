import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { PGlite } from "@electric-sql/pglite";
import { uuid_ossp } from "@electric-sql/pglite/contrib/uuid_ossp";
import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
import { drizzle as drizzlePgLite } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
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
    console.log("POSTGRES_URL environment variable is not set, using PGLite");

    const client = new PGlite({
      dataDir: "./pgdata",
      extensions: { uuid_ossp },
    });
    const db = drizzlePgLite(client, { schema });

    migrate(db, { migrationsFolder: "../../packages/db/migrations" });

    _singleton = db as unknown as dbClient;
    return _singleton;
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
