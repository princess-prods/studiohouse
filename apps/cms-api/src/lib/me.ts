import {
  Brand,
  Database,
  MembershipRole,
  Studio,
  brands,
  memberships,
  studios,
  users,
} from '@studiohouse/db';
import { eq } from 'drizzle-orm';
import { VerifiedUser } from './verify-token';

export interface MeResponse {
  readonly user: VerifiedUser;
  readonly memberships: readonly {
    readonly studio: Pick<Studio, 'id' | 'slug' | 'name'>;
    readonly role: MembershipRole;
    readonly brands: readonly Pick<Brand, 'id' | 'slug' | 'name' | 'themeId'>[];
  }[];
}

export interface MeOptions {
  /**
   * First-run bootstrap: if the verified email matches and the user has no
   * memberships yet, make them owner of `bootstrapStudioSlug`. Set from
   * `BOOTSTRAP_OWNER_EMAIL` / `BOOTSTRAP_STUDIO_SLUG`.
   */
  readonly bootstrapOwnerEmail?: string;
  readonly bootstrapStudioSlug?: string;
}

/**
 * Framework-agnostic handler: given a verified user, upserts their `users`
 * row and returns every studio they belong to with that studio's brands.
 * Studio selection happens here, through membership, not through a picker.
 */
export async function getMe(
  db: Database,
  user: VerifiedUser,
  options: MeOptions = {},
): Promise<MeResponse> {
  await db
    .insert(users)
    .values({ id: user.id, email: user.email, displayName: user.name })
    .onConflictDoUpdate({
      target: users.id,
      set: { email: user.email, displayName: user.name, updatedAt: new Date() },
    });

  let rows = await loadMemberships(db, user.id);

  if (
    rows.length === 0 &&
    options.bootstrapOwnerEmail &&
    user.email.toLowerCase() === options.bootstrapOwnerEmail.toLowerCase()
  ) {
    const slug = options.bootstrapStudioSlug ?? 'princess-productions';
    const [studio] = await db
      .select({ id: studios.id })
      .from(studios)
      .where(eq(studios.slug, slug));
    if (studio) {
      await db
        .insert(memberships)
        .values({ studioId: studio.id, userId: user.id, role: 'owner' })
        .onConflictDoNothing();
      rows = await loadMemberships(db, user.id);
    }
  }

  const result: MeResponse['memberships'] = [];
  for (const row of rows) {
    const studioBrands = await db
      .select({
        id: brands.id,
        slug: brands.slug,
        name: brands.name,
        themeId: brands.themeId,
      })
      .from(brands)
      .where(eq(brands.studioId, row.studio.id))
      .orderBy(brands.name);
    result.push({ studio: row.studio, role: row.role, brands: studioBrands });
  }

  return { user, memberships: result };
}

async function loadMemberships(db: Database, userId: string) {
  return db
    .select({
      role: memberships.role,
      studio: { id: studios.id, slug: studios.slug, name: studios.name },
    })
    .from(memberships)
    .innerJoin(studios, eq(studios.id, memberships.studioId))
    .where(eq(memberships.userId, userId))
    .orderBy(studios.name);
}
