import { Database } from '@studiohouse/db';
import { BRAND_DELETE_ROLE, BRAND_WRITE_ROLE } from '@studiohouse/models';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { ForbiddenError, NotFoundError, requireRole } from './lib/authz';
import {
  ConflictError,
  createBrand,
  createTheme,
  deleteBrand,
  deleteTheme,
  getBrand,
  getTheme,
  listBrands,
  listThemes,
  updateBrand,
  updateTheme,
} from './lib/brands';
import { getMe } from './lib/me';
import {
  ValidationError,
  createBrandSchema,
  createThemeSchema,
  parse,
  updateBrandSchema,
  updateThemeSchema,
} from './lib/validation';
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
 * branch's JWKS. Studio-scoped routes then check the caller's membership
 * role. Dependencies are explicit so tests can inject fakes.
 */
export function createApp(deps: AppDeps) {
  const app = new Hono<Env>();
  const { db } = deps;

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
      // verifyBearer only throws UnauthorizedError; anything else is a bug worth a 500.
      const message =
        error instanceof UnauthorizedError ? error.message : 'Unauthorized';
      return c.json({ error: message }, 401);
    }
    return next();
  });

  app.get('/me', async (c) =>
    c.json(
      await getMe(db, c.get('user'), {
        bootstrapOwnerEmail: deps.bootstrapOwnerEmail,
        bootstrapStudioSlug: deps.bootstrapStudioSlug,
      }),
    ),
  );

  // --- Studio-scoped: brands and themes ----------------------------------

  const studio = new Hono<Env>();

  studio.get('/brands', async (c) => {
    const studioId = c.req.param('studioId') as string;
    await requireRole(db, c.get('user'), studioId, 'viewer');
    return c.json(await listBrands(db, studioId));
  });

  studio.post('/brands', async (c) => {
    const studioId = c.req.param('studioId') as string;
    await requireRole(db, c.get('user'), studioId, BRAND_WRITE_ROLE);
    const input = parse(createBrandSchema, await c.req.json());
    return c.json(await createBrand(db, studioId, input), 201);
  });

  studio.get('/brands/:brandId', async (c) => {
    const studioId = c.req.param('studioId') as string;
    const brandId = c.req.param('brandId') as string;
    await requireRole(db, c.get('user'), studioId, 'viewer');
    return c.json(await getBrand(db, studioId, brandId));
  });

  studio.patch('/brands/:brandId', async (c) => {
    const studioId = c.req.param('studioId') as string;
    const brandId = c.req.param('brandId') as string;
    await requireRole(db, c.get('user'), studioId, BRAND_WRITE_ROLE);
    const input = parse(updateBrandSchema, await c.req.json());
    return c.json(await updateBrand(db, studioId, brandId, input));
  });

  studio.delete('/brands/:brandId', async (c) => {
    const studioId = c.req.param('studioId') as string;
    const brandId = c.req.param('brandId') as string;
    await requireRole(db, c.get('user'), studioId, BRAND_DELETE_ROLE);
    await deleteBrand(db, studioId, brandId);
    return c.body(null, 204);
  });

  studio.get('/themes', async (c) => {
    const studioId = c.req.param('studioId') as string;
    await requireRole(db, c.get('user'), studioId, 'viewer');
    return c.json(await listThemes(db, studioId));
  });

  studio.post('/themes', async (c) => {
    const studioId = c.req.param('studioId') as string;
    await requireRole(db, c.get('user'), studioId, BRAND_WRITE_ROLE);
    const input = parse(createThemeSchema, await c.req.json());
    return c.json(await createTheme(db, studioId, input), 201);
  });

  studio.get('/themes/:themeId', async (c) => {
    const studioId = c.req.param('studioId') as string;
    const themeId = c.req.param('themeId') as string;
    await requireRole(db, c.get('user'), studioId, 'viewer');
    return c.json(await getTheme(db, studioId, themeId));
  });

  studio.put('/themes/:themeId', async (c) => {
    const studioId = c.req.param('studioId') as string;
    const themeId = c.req.param('themeId') as string;
    await requireRole(db, c.get('user'), studioId, BRAND_WRITE_ROLE);
    const input = parse(updateThemeSchema, await c.req.json());
    return c.json(await updateTheme(db, studioId, themeId, input));
  });

  studio.delete('/themes/:themeId', async (c) => {
    const studioId = c.req.param('studioId') as string;
    const themeId = c.req.param('themeId') as string;
    await requireRole(db, c.get('user'), studioId, BRAND_DELETE_ROLE);
    await deleteTheme(db, studioId, themeId);
    return c.body(null, 204);
  });

  app.route('/studios/:studioId', studio);

  app.notFound((c) => c.json({ error: 'Not found' }, 404));

  app.onError((error, c) => {
    if (error instanceof ValidationError) {
      return c.json({ error: error.message, issues: error.issues }, 400);
    }
    if (
      error instanceof NotFoundError ||
      error instanceof ForbiddenError ||
      error instanceof ConflictError
    ) {
      return c.json({ error: error.message }, error.status);
    }
    if (error instanceof SyntaxError) {
      return c.json({ error: 'Malformed JSON body' }, 400);
    }
    console.error(error);
    return c.json({ error: 'Internal error' }, 500);
  });

  return app;
}

export type App = ReturnType<typeof createApp>;
