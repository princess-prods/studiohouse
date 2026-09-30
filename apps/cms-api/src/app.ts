import { Database } from '@studiohouse/db';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { getMe } from './lib/me';
import {
  TokenVerifier,
  UnauthorizedError,
  VerifiedUser,
  verifyBearer,
} from './lib/verify-token';

export interface AppDeps {
  readonly db: Database;
  readonly verifier: TokenVerifier;
  /** Browser origins allowed to call the API. */
  readonly allowedOrigins: readonly string[];
  readonly bootstrapOwnerEmail?: string;
  readonly bootstrapStudioSlug?: string;
}

type Env = { Variables: { user: VerifiedUser } };

/**
 * The CMS API as a Hono app. Every route past `/health` requires an
 * `Authorization: Bearer <jwt>` from Managed Auth, verified against the
 * branch's JWKS. Dependencies are explicit so tests can inject fakes.
 */
export function createApp(deps: AppDeps) {
  const app = new Hono<Env>();

  app.use(
    '*',
    cors({
      origin: (origin) =>
        deps.allowedOrigins.includes(origin) ? origin : null,
      allowHeaders: ['Authorization', 'Content-Type'],
      allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      maxAge: 600,
    }),
  );

  app.get('/health', (c) => c.json({ ok: true }));

  app.use('*', async (c, next) => {
    try {
      c.set(
        'user',
        await verifyBearer(c.req.header('authorization'), deps.verifier),
      );
    } catch (error) {
      if (error instanceof UnauthorizedError) {
        return c.json({ error: error.message }, 401);
      }
      throw error;
    }
    await next();
  });

  app.get('/me', async (c) =>
    c.json(
      await getMe(deps.db, c.get('user'), {
        bootstrapOwnerEmail: deps.bootstrapOwnerEmail,
        bootstrapStudioSlug: deps.bootstrapStudioSlug,
      }),
    ),
  );

  app.onError((error, c) => {
    console.error(error);
    return c.json({ error: 'Internal error' }, 500);
  });

  return app;
}

export type App = ReturnType<typeof createApp>;
