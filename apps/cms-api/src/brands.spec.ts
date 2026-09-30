import { PGlite } from '@electric-sql/pglite';
import { Database, memberships, studios, users } from '@studiohouse/db';
import {
  COLOR_ROLES,
  ColorRole,
  MembershipRole,
  ThemeColor,
} from '@studiohouse/models';
import { drizzle } from 'drizzle-orm/pglite';
import { SignJWT, createLocalJWKSet, exportJWK, generateKeyPair } from 'jose';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { App, createApp } from './app';
import {
  ConflictError,
  isUniqueViolation,
  rethrowConflict,
} from './lib/brands';
import { TokenVerifier } from './lib/verify-token';

const ISSUER = 'https://auth.example.test';
const ORIGIN = 'http://localhost:4200';
const migrationsDir = join(__dirname, '../../../packages/shared/db/migrations');

let pg: PGlite;
let db: Database;
let app: App;
let studioId: string;
let sign: (sub: string) => Promise<string>;

const palette = (prefix = '#1'): Record<ColorRole, ThemeColor> =>
  Object.fromEntries(
    COLOR_ROLES.map((role, i) => [
      role,
      {
        name: `${role} colour`,
        description: '',
        hex: `${prefix}${i}${i}${i}${i}${i}`,
        purpose: '',
      },
    ]),
  ) as Record<ColorRole, ThemeColor>;

beforeAll(async () => {
  pg = new PGlite();
  for (const file of readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort()) {
    for (const statement of readFileSync(
      join(migrationsDir, file),
      'utf8',
    ).split('--> statement-breakpoint')) {
      if (statement.trim()) await pg.exec(statement);
    }
  }
  db = drizzle(pg) as unknown as Database;

  const { publicKey, privateKey } = await generateKeyPair('EdDSA');
  const jwk = { ...(await exportJWK(publicKey)), kid: 'test', alg: 'EdDSA' };
  const verifier: TokenVerifier = {
    getKey: createLocalJWKSet({ keys: [jwk] }),
    issuer: ISSUER,
  };
  sign = (sub) =>
    new SignJWT({ sub, email: `${sub}@example.test`, name: sub })
      .setProtectedHeader({ alg: 'EdDSA', kid: 'test' })
      .setIssuer(ISSUER)
      .setAudience(ISSUER)
      .setIssuedAt()
      .setExpirationTime('15m')
      .sign(privateKey);
  app = createApp({ db, verifier, allowedOrigins: [ORIGIN] });
});

afterAll(async () => {
  await pg.close();
});

beforeEach(async () => {
  await pg.exec(
    'DELETE FROM memberships; DELETE FROM brands; DELETE FROM theme_colors; DELETE FROM color_themes; DELETE FROM users; DELETE FROM studios;',
  );
  const [studio] = await db
    .insert(studios)
    .values({ slug: 'demo', name: 'Demo' })
    .returning();
  studioId = studio.id;
  const roles: MembershipRole[] = ['viewer', 'editor', 'admin', 'owner'];
  await db.insert(users).values(
    [...roles, 'outsider'].map((r) => ({
      id: r,
      email: `${r}@example.test`,
    })),
  );
  await db
    .insert(memberships)
    .values(roles.map((role) => ({ studioId, userId: role, role })));
});

async function call(
  as: string,
  method: string,
  path: string,
  body?: unknown,
): Promise<{ status: number; body: any }> {
  const res = await app.request(`/studios/${studioId}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${await sign(as)}`,
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
    },
    body:
      body !== undefined
        ? typeof body === 'string'
          ? body
          : JSON.stringify(body)
        : undefined,
  });
  const text = await res.text();
  return { status: res.status, body: text ? JSON.parse(text) : null };
}

describe('authorization', () => {
  it('hides the studio from non-members and rejects lower roles', async () => {
    expect((await call('outsider', 'GET', '/brands')).status).toBe(404);
    expect((await call('viewer', 'GET', '/brands')).status).toBe(200);
    expect(
      (await call('editor', 'POST', '/brands', { name: 'X' })).status,
    ).toBe(403);
    expect((await call('admin', 'POST', '/brands', { name: 'X' })).status).toBe(
      201,
    );
  });

  it('reserves deletion for owners', async () => {
    const { body: brand } = await call('admin', 'POST', '/brands', {
      name: 'Gone',
    });
    expect((await call('admin', 'DELETE', `/brands/${brand.id}`)).status).toBe(
      403,
    );
    expect((await call('owner', 'DELETE', `/brands/${brand.id}`)).status).toBe(
      204,
    );
    expect((await call('owner', 'GET', `/brands/${brand.id}`)).status).toBe(
      404,
    );
  });
});

describe('brands', () => {
  it('creates with a derived slug, lists, reads and updates', async () => {
    const created = await call('admin', 'POST', '/brands', {
      name: 'Night Shift!',
      domains: ['Night-Shift.Example'],
    });
    expect(created.status).toBe(201);
    expect(created.body).toMatchObject({
      slug: 'night-shift',
      name: 'Night Shift!',
      domains: ['night-shift.example'],
      themeId: null,
      theme: null,
      features: {},
    });

    const list = await call('viewer', 'GET', '/brands');
    expect(list.body.map((b: { slug: string }) => b.slug)).toEqual([
      'night-shift',
    ]);

    const updated = await call('admin', 'PATCH', `/brands/${created.body.id}`, {
      name: 'Night Shift',
      slug: 'nightshift',
      features: { clips: true },
    });
    expect(updated.status).toBe(200);
    expect(updated.body).toMatchObject({
      slug: 'nightshift',
      features: { clips: true },
    });
  });

  it('rejects invalid input with field issues and duplicate slugs with 409', async () => {
    const bad = await call('admin', 'POST', '/brands', {
      name: '',
      slug: 'Bad Slug',
      domains: ['not a host'],
    });
    expect(bad.status).toBe(400);
    expect(bad.body.issues.map((i: { path: string }) => i.path).sort()).toEqual(
      ['domains.0', 'name', 'slug'],
    );

    await call('admin', 'POST', '/brands', { name: 'One', slug: 'one' });
    const dup = await call('admin', 'POST', '/brands', {
      name: 'Uno',
      slug: 'one',
    });
    expect(dup.status).toBe(409);
    expect(dup.body.error).toContain('one');

    const empty = await call(
      'admin',
      'PATCH',
      `/brands/${(await call('viewer', 'GET', '/brands')).body[0].id}`,
      {},
    );
    expect(empty.status).toBe(400);

    const two = await call('admin', 'POST', '/brands', {
      name: 'Two',
      slug: 'two',
    });
    const rename = await call('admin', 'PATCH', `/brands/${two.body.id}`, {
      slug: 'one',
    });
    expect(rename.status).toBe(409);

    const malformed = await call('admin', 'POST', '/brands', '{not json');
    expect(malformed.status).toBe(400);
    expect(malformed.body.error).toContain('Malformed');
  });

  it('refuses a theme from another studio and unknown ids', async () => {
    const [other] = await db
      .insert(studios)
      .values({ slug: 'other', name: 'Other' })
      .returning();
    const [{ id: foreignTheme }] = await pg
      .query<{ id: string }>(
        `INSERT INTO color_themes (studio_id, slug, name) VALUES ($1, 'x', 'X') RETURNING id`,
        [other.id],
      )
      .then((r) => r.rows);
    const res = await call('admin', 'POST', '/brands', {
      name: 'B',
      themeId: foreignTheme,
    });
    expect(res.status).toBe(404);
    expect(
      (
        await call(
          'admin',
          'GET',
          '/brands/00000000-0000-0000-0000-000000000000',
        )
      ).status,
    ).toBe(404);
    expect((await call('admin', 'GET', '/nope')).status).toBe(404);
  });
});

describe('themes', () => {
  it('creates, assigns to a brand, updates colours, and unassigns on delete', async () => {
    const theme = await call('admin', 'POST', '/themes', {
      name: 'Dusk',
      colors: palette('#a'),
    });
    expect(theme.status).toBe(201);
    expect(theme.body).toMatchObject({ slug: 'dusk', name: 'Dusk' });
    expect(theme.body.colors.primary.hex).toBe('#A00000');

    const brand = await call('admin', 'POST', '/brands', {
      name: 'B',
      themeId: theme.body.id,
    });
    expect(brand.body.theme).toMatchObject({ id: 'dusk', name: 'Dusk' });

    const updated = await call('admin', 'PUT', `/themes/${theme.body.id}`, {
      name: 'Dawn',
      colors: palette('#b'),
    });
    expect(updated.body.name).toBe('Dawn');
    expect(updated.body.colors.tint.hex).toBe('#B44444');
    expect((await call('viewer', 'GET', '/themes')).body).toHaveLength(1);
    expect(
      (await call('viewer', 'GET', `/themes/${theme.body.id}`)).body.name,
    ).toBe('Dawn');

    // Reads with a theme present resolve it on both the list and the single brand.
    const withTheme = await call('viewer', 'GET', `/brands/${brand.body.id}`);
    expect(withTheme.body.theme.name).toBe('Dawn');
    expect((await call('viewer', 'GET', '/brands')).body[0].theme.name).toBe(
      'Dawn',
    );

    expect(
      (await call('owner', 'DELETE', `/themes/${theme.body.id}`)).status,
    ).toBe(204);
    const after = await call('viewer', 'GET', `/brands/${brand.body.id}`);
    expect(after.body.themeId).toBeNull();
    expect(after.body.theme).toBeNull();
    expect(
      (await call('owner', 'DELETE', `/themes/${theme.body.id}`)).status,
    ).toBe(404);
  });

  it('validates colours and slugs', async () => {
    const missing = await call('admin', 'POST', '/themes', {
      name: 'T',
      colors: { primary: palette().primary },
    });
    expect(missing.status).toBe(400);
    const badHex = await call('admin', 'POST', '/themes', {
      name: 'T',
      colors: { ...palette(), ink: { ...palette().ink, hex: 'red' } },
    });
    expect(badHex.status).toBe(400);
    expect(badHex.body.issues[0].path).toBe('colors.ink.hex');

    await call('admin', 'POST', '/themes', { name: 'Same', colors: palette() });
    expect(
      (
        await call('admin', 'POST', '/themes', {
          name: 'Same',
          colors: palette(),
        })
      ).status,
    ).toBe(409);
    const [existing] = (await call('viewer', 'GET', '/themes')).body;
    const other = await call('admin', 'POST', '/themes', {
      name: 'Other',
      colors: palette(),
    });
    const rename = await call('admin', 'PUT', `/themes/${other.body.id}`, {
      slug: existing.slug,
    });
    expect(rename.status).toBe(409);
    expect(
      (await call('admin', 'PUT', `/themes/${other.body.id}`, {})).status,
    ).toBe(400);
  });

  it('skips incomplete themes in listings and refuses assigning them', async () => {
    const [{ id }] = (
      await pg.query<{ id: string }>(
        `INSERT INTO color_themes (studio_id, slug, name) VALUES ($1, 'half', 'Half') RETURNING id`,
        [studioId],
      )
    ).rows;
    expect((await call('viewer', 'GET', '/themes')).body).toEqual([]);
    expect((await call('viewer', 'GET', `/themes/${id}`)).status).toBe(404);
    expect(
      (await call('admin', 'POST', '/brands', { name: 'B', themeId: id }))
        .status,
    ).toBe(404);
  });
});

describe('rethrowConflict', () => {
  it('maps unique violations to 409 and rethrows everything else', () => {
    expect(() => rethrowConflict({ code: '23505' }, 'dup')).toThrow(
      ConflictError,
    );
    expect(() => rethrowConflict({ cause: { code: '23505' } }, 'dup')).toThrow(
      'dup',
    );
    const other = new Error('connection reset');
    expect(() => rethrowConflict(other, 'dup')).toThrow(other);
    expect(isUniqueViolation(null)).toBe(false);
  });
});
