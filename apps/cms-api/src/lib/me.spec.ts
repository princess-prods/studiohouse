import { PGlite } from '@electric-sql/pglite';
import { Database, brands, memberships, studios, users } from '@studiohouse/db';
import { drizzle } from 'drizzle-orm/pglite';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { getMe } from './me';
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
  email: 'owner@studiohouse.test',
  name: 'Owner',
};
const stranger: VerifiedUser = {
  id: 'auth_stranger',
  email: 'someone@else.test',
  name: null,
};

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
  await db.delete(users);
  await db.delete(studios);
  const [studio] = await db
    .insert(studios)
    .values({ slug: 'princess-productions', name: 'Princess Productions' })
    .returning();
  studioId = studio.id;
  await db.insert(brands).values([
    { studioId, slug: 'devinella', name: 'Devinella' },
    { studioId, slug: 'princess-productions', name: 'Princess Productions' },
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
      bootstrapOwnerEmail: 'OWNER@studiohouse.test',
    });
    expect(result.memberships).toHaveLength(1);
    const [m] = result.memberships;
    expect(m.role).toBe('owner');
    expect(m.studio).toMatchObject({ slug: 'princess-productions' });
    expect(m.brands.map((b) => b.slug)).toEqual([
      'devinella',
      'princess-productions',
    ]);
  });

  it('does not bootstrap other emails or a missing studio', async () => {
    const other = await getMe(db, stranger, {
      bootstrapOwnerEmail: owner.email,
    });
    expect(other.memberships).toEqual([]);
    const missing = await getMe(db, owner, {
      bootstrapOwnerEmail: owner.email,
      bootstrapStudioSlug: 'no-such-studio',
    });
    expect(missing.memberships).toEqual([]);
  });

  it('returns existing memberships and refreshes the profile', async () => {
    await getMe(db, owner, { bootstrapOwnerEmail: owner.email });
    const renamed = { ...owner, name: 'Renamed' };
    const result = await getMe(db, renamed);
    expect(result.memberships[0].role).toBe('owner');
    const [row] = await db.select().from(users);
    expect(row.displayName).toBe('Renamed');
    const all = await db.select().from(memberships);
    expect(all).toHaveLength(1);
  });
});
