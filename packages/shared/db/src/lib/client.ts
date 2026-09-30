import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';

export type Database = ReturnType<typeof createDb>;

/**
 * Creates a Drizzle client over Neon's HTTP driver. The connection string is
 * the only environment-specific input, so the same code runs against the
 * `main`, `dev` and preview branches.
 */
export function createDb(connectionString = process.env['DATABASE_URL']) {
  if (!connectionString) {
    throw new Error(
      'DATABASE_URL is not set. Copy .env.example to .env.local or run `vercel env pull`.',
    );
  }
  return drizzle(neon(connectionString), { schema });
}
