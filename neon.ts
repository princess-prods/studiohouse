import { defineConfig } from '@neon/config/v1';

/**
 * Neon infrastructure as code. Applied to the linked branch with
 * `neon deploy --env .env.local`; served locally with `neon dev`.
 *
 * - `auth: true`     Managed Better Auth on every branch (users live in `neon_auth`).
 * - `functions`      Neon Functions, keyed by slug (permanent, ^[a-z0-9]{1,20}$).
 */
export default defineConfig({
  auth: true,
  functions: {
    cmsapi: {
      name: 'CMS API',
      source: 'apps/cms-api/src/index.ts',
      env: {
        // Comma-separated browser origins allowed to call the API.
        ALLOWED_ORIGINS: process.env['ALLOWED_ORIGINS']!,
        // First-run bootstrap: this email becomes owner of BOOTSTRAP_STUDIO_SLUG
        // when it signs in with no memberships. Remove once the studio has an owner.
        BOOTSTRAP_OWNER_EMAIL: process.env['BOOTSTRAP_OWNER_EMAIL']!,
        BOOTSTRAP_STUDIO_SLUG: process.env['BOOTSTRAP_STUDIO_SLUG']!,
      },
    },
  },
});
