import { neon } from '@neondatabase/serverless';
import { drizzle as drizzleHttp } from 'drizzle-orm/neon-http';
import { drizzle as drizzleNode } from 'drizzle-orm/node-postgres';
import { PgDatabase, PgQueryResultHKT } from 'drizzle-orm/pg-core';
import type { Pool } from 'pg';
import * as schema from './schema';

/**
 * Driver-agnostic database handle. Both factories below satisfy it, so
 * query code (handlers, seeds, tests) never depends on the transport.
 */
export type Database = PgDatabase<PgQueryResultHKT, typeof schema>;

function requireUrl(connectionString: string | undefined): string {
  if (!connectionString) {
    throw new Error(
      'DATABASE_URL is not set. Run `neon env pull` or copy .env.example to .env.local.',
    );
  }
  return connectionString;
}

/**
 * One-shot HTTP client over Neon's serverless driver. Right for scripts,
 * seeds and lambda-style runtimes with no persistent process.
 */
export function createDb(
  connectionString = process.env['DATABASE_URL'],
): Database {
  return drizzleHttp(neon(requireUrl(connectionString)), { schema });
}

/**
 * Pooled node-postgres client for long-running runtimes such as Neon
 * Functions. Create the pool once at module scope and pass it here.
 */
export function createPooledDb(pool: Pool): Database {
  return drizzleNode(pool, { schema });
}
