import {
  Database,
  brands,
  colorThemes,
  memberships,
  studios,
  themeColors,
  users,
} from '@studiohouse/db';
import {
  BrandSummary,
  COLOR_ROLES,
  ColorRole,
  ColorTheme,
  HexColor,
  MeResponse,
  MembershipSummary,
  ThemeColor,
} from '@studiohouse/models';
import { eq, inArray } from 'drizzle-orm';
import { VerifiedUser } from './verify-token';

export interface MeOptions {
  /**
   * First-run bootstrap: if the verified email matches and the user has no
   * memberships yet, make them owner of `bootstrapStudioSlug`. Set from
   * `BOOTSTRAP_OWNER_EMAIL` / `BOOTSTRAP_STUDIO_SLUG`; both are required.
   */
  readonly bootstrapOwnerEmail?: string;
  readonly bootstrapStudioSlug?: string;
}

/**
 * Framework-agnostic handler: given a verified user, upserts their `users`
 * row and returns every studio they belong to with that studio's brands and
 * each brand's stored theme. Studio selection happens here, through
 * membership, not through a picker.
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
    options.bootstrapStudioSlug &&
    user.email.toLowerCase() === options.bootstrapOwnerEmail.toLowerCase()
  ) {
    const [studio] = await db
      .select({ id: studios.id })
      .from(studios)
      .where(eq(studios.slug, options.bootstrapStudioSlug));
    if (studio) {
      await db
        .insert(memberships)
        .values({ studioId: studio.id, userId: user.id, role: 'owner' })
        .onConflictDoNothing();
      rows = await loadMemberships(db, user.id);
    }
  }

  const result: MembershipSummary[] = [];
  for (const row of rows) {
    result.push({
      studio: row.studio,
      role: row.role,
      brands: await loadBrands(db, row.studio.id),
    });
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

/** Brands of one studio, each with its theme assembled from `theme_colors`. */
export async function loadBrands(
  db: Database,
  studioId: string,
): Promise<BrandSummary[]> {
  const brandRows = await db
    .select({
      id: brands.id,
      slug: brands.slug,
      name: brands.name,
      themeId: brands.themeId,
    })
    .from(brands)
    .where(eq(brands.studioId, studioId))
    .orderBy(brands.name);

  const themeIds = [
    ...new Set(
      brandRows.map((b) => b.themeId).filter((id): id is string => !!id),
    ),
  ];
  const themes = new Map<string, ColorTheme>();
  if (themeIds.length > 0) {
    const themeRows = await db
      .select({
        id: colorThemes.id,
        slug: colorThemes.slug,
        name: colorThemes.name,
      })
      .from(colorThemes)
      .where(inArray(colorThemes.id, themeIds));
    const colorRows = await db
      .select()
      .from(themeColors)
      .where(inArray(themeColors.themeId, themeIds));
    for (const t of themeRows) {
      const colors = {} as Record<ColorRole, ThemeColor>;
      for (const c of colorRows.filter((c) => c.themeId === t.id)) {
        colors[c.role] = {
          name: c.name,
          description: c.description,
          hex: c.hex as HexColor,
          purpose: c.purpose,
        };
      }
      // Only a complete theme is usable by the apps.
      if (COLOR_ROLES.every((role) => colors[role])) {
        themes.set(t.id, { id: t.slug, name: t.name, colors });
      }
    }
  }

  return brandRows.map((brand) => ({
    ...brand,
    theme: (brand.themeId && themes.get(brand.themeId)) || null,
  }));
}
