import { config } from 'dotenv';
import { defineConfig } from 'drizzle-kit';

// Run from the workspace root via `nx run db:<target>`; the root .env.local is git-ignored.
config({ path: '.env.local' });

export default defineConfig({
  dialect: 'postgresql',
  schema: './packages/shared/db/src/lib/schema.ts',
  out: './packages/shared/db/migrations',
  dbCredentials: {
    // Migrations use the direct (unpooled) connection.
    url:
      process.env['DATABASE_URL_UNPOOLED'] ?? process.env['DATABASE_URL'] ?? '',
  },
  strict: true,
  verbose: true,
});
