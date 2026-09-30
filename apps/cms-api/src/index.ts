/**
 * Studiohouse CMS API — Neon Function entry point.
 *
 * Deployed by `neon deploy --env .env.local` from the root `neon.ts`;
 * served locally with `neon dev`. Neon injects `DATABASE_URL`,
 * `NEON_AUTH_BASE_URL` and `NEON_AUTH_JWKS_URL`; the rest comes from the
 * `env` block in `neon.ts`.
 */
import { attachDatabasePool } from '@neon/functions';
import { createPooledDb } from '@studiohouse/db';
import { Pool } from 'pg';
import { createApp } from './app';
import { verifierFromEnv } from './lib/verify-token';

function parseOrigins(value: string | undefined): string[] {
  return (value ?? 'http://localhost:4200')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

// Module scope: one pool per isolate, reused across requests.
const pool = new Pool({
  connectionString: process.env['DATABASE_URL'],
  max: 5,
});
attachDatabasePool(pool);

export default createApp({
  db: createPooledDb(pool),
  verifier: verifierFromEnv(),
  allowedOrigins: parseOrigins(process.env['ALLOWED_ORIGINS']),
  bootstrapOwnerEmail: process.env['BOOTSTRAP_OWNER_EMAIL'] || undefined,
  bootstrapStudioSlug: process.env['BOOTSTRAP_STUDIO_SLUG'] || undefined,
});
