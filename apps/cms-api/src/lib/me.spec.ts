import { PGlite } from '@electric-sql/pglite';
import {
  Database,
  brands,
  colorThemes,
  memberships,
  studios,
  themeColors,
  users,
} from '@studiohouse/db';
import { drizzle } from 'drizzle-orm/pglite';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { getMe, loadBrands } from './me';
import { VerifiedUser } from './verify-token';

/**
 * Runs the real migrations into an in-memory PGlite so the handler is tested
 * against the actual schema, constraints and enums.
 */
const migrationsDir = join(
  __dirname,
  '../../../../packages/shared/db/migrations',
);

let pg: PGlite;
let db: Database;
let studioId: string;

const owner: VerifiedUser = {
  id: 'auth_owner',
  email: 'owner@example.test',
  name: 'Owner',
};
const stranger: VerifiedUser = {
  id: 'auth_stranger',
  email: 'someone@else.test',
  name: null,
};

const PALETTE = [
  ['primary', '#2563EB'],
  ['ink', '#0F172A'],
  ['paper', '#F8FAFC'],
  ['secondary', '#7C3AED'],
  ['tint', '#CBD5E1'],
] as const;

beforeAll(async () => {
  pg = new PGlite();
  for (const file of readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort()) {
    const sql = readFileSync(join(migrationsDir, file), 'utf8');
    for (const statement of sql.split('--> statement-breakpoint')) {
      if (statement.trim()) await pg.exec(statement);
    }
  }
  db = drizzle(pg) as unknown as Database;
});

afterAll(async () => {
  await pg.close();
});

beforeEach(async () => {
  await db.delete(memberships);
  await db.delete(brands);
  await db.delete(themeColors);
  await db.delete(colorThemes);
  await db.delete(users);
  await db.delete(studios);
  const [studio] = await db
    .insert(studios)
    .values({ slug: 'demo-studio', name: 'Demo Studio' })
    .returning();
  studioId = studio.id;
  const [theme] = await db
    .insert(colorThemes)
    .values({ studioId, slug: 'demo-brand', name: 'Demo Brand' })
    .returning();
  await db.insert(themeColors).values(
    PALETTE.map(([role, hex]) => ({
      themeId: theme.id,
      role,
      name: role,
      hex,
    })),
  );
  await db.insert(brands).values([
    { studioId, slug: 'brand-two', name: 'Brand Two', themeId: theme.id },
    { studioId, slug: 'brand-one', name: 'Brand One', themeId: theme.id },
  ]);
});

describe('getMe', () => {
  it('upserts the user and returns no memberships for a stranger', async () => {
    const result = await getMe(db, stranger);
    expect(result.user).toEqual(stranger);
    expect(result.memberships).toEqual([]);
    const rows = await db.select().from(users);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      id: 'auth_stranger',
      email: 'someone@else.test',
      displayName: null,
    });
  });

  it('bootstraps the configured owner into the studio on first sign-in', async () => {
    const result = await getMe(db, owner, {
      bootstrapOwnerEmail: 'OWNER@example.test',
      bootstrapStudioSlug: 'demo-studio',
    });
    expect(result.memberships).toHaveLength(1);
    const [m] = result.memberships;
    expect(m.role).toBe('owner');
    expect(m.studio).toMatchObject({ slug: 'demo-studio' });
    expect(m.brands.map((b) => b.slug)).toEqual(['brand-one', 'brand-two']);
  });

  it('returns each brand with its assembled theme', async () => {
    const result = await getMe(db, owner, {
      bootstrapOwnerEmail: owner.email,
      bootstrapStudioSlug: 'demo-studio',
    });
    const [brand] = result.memberships[0].brands;
    expect(brand.theme).toMatchObject({ id: 'demo-brand', name: 'Demo Brand' });
    expect(brand.theme?.colors.primary.hex).toBe('#2563EB');
    expect(Object.keys(brand.theme?.colors ?? {}).sort()).toEqual([
      'ink',
      'paper',
      'primary',
      'secondary',
      'tint',
    ]);
  });

  it('does not bootstrap other emails, a missing studio, or without a slug', async () => {
    const other = await getMe(db, stranger, {
      bootstrapOwnerEmail: owner.email,
      bootstrapStudioSlug: 'demo-studio',
    });
    expect(other.memberships).toEqual([]);
    const missing = await getMe(db, owner, {
      bootstrapOwnerEmail: owner.email,
      bootstrapStudioSlug: 'no-such-studio',
    });
    expect(missing.memberships).toEqual([]);
    const noSlug = await getMe(db, owner, { bootstrapOwnerEmail: owner.email });
    expect(noSlug.memberships).toEqual([]);
  });

  it('returns existing memberships and refreshes the profile', async () => {
    await getMe(db, owner, {
      bootstrapOwnerEmail: owner.email,
      bootstrapStudioSlug: 'demo-studio',
    });
    const renamed = { ...owner, name: 'Renamed' };
    const result = await getMe(db, renamed);
    expect(result.memberships[0].role).toBe('owner');
    const [row] = await db.select().from(users);
    expect(row.displayName).toBe('Renamed');
    const all = await db.select().from(memberships);
    expect(all).toHaveLength(1);
  });
});

describe('loadBrands', () => {
  it('returns null themes for brands without one or with an incomplete one', async () => {
    const [partial] = await db
      .insert(colorThemes)
      .values({ studioId, slug: 'partial', name: 'Partial' })
      .returning();
    await db.insert(themeColors).values({
      themeId: partial.id,
      role: 'primary',
      name: 'Only one',
      hex: '#000000',
    });
    await db.insert(brands).values([
      { studioId, slug: 'bare', name: 'Bare' },
      { studioId, slug: 'half', name: 'Half', themeId: partial.id },
    ]);
    const result = await loadBrands(db, studioId);
    const bySlug = Object.fromEntries(result.map((b) => [b.slug, b.theme]));
    expect(bySlug['bare']).toBeNull();
    expect(bySlug['half']).toBeNull();
    expect(bySlug['brand-one']?.id).toBe('demo-brand');
  });

  it('returns an empty list for a studio with no brands', async () => {
    const [empty] = await db
      .insert(studios)
      .values({ slug: 'empty', name: 'Empty' })
      .returning();
    expect(await loadBrands(db, empty.id)).toEqual([]);
  });
});
