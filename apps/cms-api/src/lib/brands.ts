import { Database, brands, colorThemes, themeColors } from '@studiohouse/db';
import {
  BrandRecord,
  COLOR_ROLES,
  ColorRole,
  CreateBrandInput,
  CreateThemeInput,
  HexColor,
  ThemeColor,
  ThemeRecord,
  UpdateBrandInput,
  UpdateThemeInput,
  toColorTheme,
} from '@studiohouse/models';
import { and, eq, inArray } from 'drizzle-orm';
import { NotFoundError } from './authz';
import { slugify } from './validation';

export class ConflictError extends Error {
  readonly status = 409;
}

/** Postgres unique violation. */
export function isUniqueViolation(error: unknown): boolean {
  const e = error as { code?: string; cause?: { code?: string } } | null;
  return e?.code === '23505' || e?.cause?.code === '23505';
}

/** Turns a unique violation into a 409; rethrows anything else. */
export function rethrowConflict(error: unknown, message: string): never {
  if (isUniqueViolation(error)) throw new ConflictError(message);
  throw error;
}

// ---------------------------------------------------------------------------
// Themes
// ---------------------------------------------------------------------------

export async function listThemes(
  db: Database,
  studioId: string,
): Promise<ThemeRecord[]> {
  const rows = await db
    .select({
      id: colorThemes.id,
      slug: colorThemes.slug,
      name: colorThemes.name,
    })
    .from(colorThemes)
    .where(eq(colorThemes.studioId, studioId))
    .orderBy(colorThemes.name);
  if (rows.length === 0) return [];
  const colors = await db
    .select()
    .from(themeColors)
    .where(
      inArray(
        themeColors.themeId,
        rows.map((r) => r.id),
      ),
    );
  return rows
    .map((row) =>
      assemble(
        row,
        colors.filter((c) => c.themeId === row.id),
      ),
    )
    .filter((t): t is ThemeRecord => t !== null);
}

export async function getTheme(
  db: Database,
  studioId: string,
  themeId: string,
): Promise<ThemeRecord> {
  const [row] = await db
    .select({
      id: colorThemes.id,
      slug: colorThemes.slug,
      name: colorThemes.name,
    })
    .from(colorThemes)
    .where(
      and(eq(colorThemes.id, themeId), eq(colorThemes.studioId, studioId)),
    );
  if (!row) throw new NotFoundError('Theme not found');
  const colors = await db
    .select()
    .from(themeColors)
    .where(eq(themeColors.themeId, row.id));
  const theme = assemble(row, colors);
  if (!theme) throw new NotFoundError('Theme is incomplete');
  return theme;
}

export async function createTheme(
  db: Database,
  studioId: string,
  input: CreateThemeInput,
): Promise<ThemeRecord> {
  const slug = input.slug ?? slugify(input.name);
  let created: { id: string };
  try {
    [created] = await db
      .insert(colorThemes)
      .values({ studioId, slug, name: input.name })
      .returning({ id: colorThemes.id });
  } catch (error) {
    rethrowConflict(error, `A theme with slug "${slug}" already exists`);
  }
  await db.insert(themeColors).values(
    COLOR_ROLES.map((role) => ({
      themeId: created.id,
      role,
      ...input.colors[role],
    })),
  );
  return getTheme(db, studioId, created.id);
}

export async function updateTheme(
  db: Database,
  studioId: string,
  themeId: string,
  input: UpdateThemeInput,
): Promise<ThemeRecord> {
  await getTheme(db, studioId, themeId);
  if (input.name !== undefined || input.slug !== undefined) {
    try {
      await db
        .update(colorThemes)
        .set({
          ...(input.name !== undefined ? { name: input.name } : {}),
          ...(input.slug !== undefined ? { slug: input.slug } : {}),
          updatedAt: new Date(),
        })
        .where(eq(colorThemes.id, themeId));
    } catch (error) {
      rethrowConflict(
        error,
        `A theme with slug "${input.slug}" already exists`,
      );
    }
  }
  if (input.colors) {
    for (const role of COLOR_ROLES) {
      const color = input.colors[role];
      await db
        .insert(themeColors)
        .values({ themeId, role, ...color })
        .onConflictDoUpdate({
          target: [themeColors.themeId, themeColors.role],
          set: { ...color },
        });
    }
  }
  return getTheme(db, studioId, themeId);
}

/** Deletes a theme; brands that used it fall back to no theme (FK `set null`). */
export async function deleteTheme(
  db: Database,
  studioId: string,
  themeId: string,
): Promise<void> {
  const deleted = await db
    .delete(colorThemes)
    .where(and(eq(colorThemes.id, themeId), eq(colorThemes.studioId, studioId)))
    .returning({ id: colorThemes.id });
  if (deleted.length === 0) throw new NotFoundError('Theme not found');
}

function assemble(
  row: { id: string; slug: string; name: string },
  colors: (typeof themeColors.$inferSelect)[],
): ThemeRecord | null {
  const byRole = {} as Record<ColorRole, ThemeColor>;
  for (const c of colors) {
    byRole[c.role] = {
      name: c.name,
      description: c.description,
      hex: c.hex as HexColor,
      purpose: c.purpose,
    };
  }
  if (!COLOR_ROLES.every((role) => byRole[role])) return null;
  return { id: row.id, slug: row.slug, name: row.name, colors: byRole };
}

// ---------------------------------------------------------------------------
// Brands
// ---------------------------------------------------------------------------

export async function listBrands(
  db: Database,
  studioId: string,
): Promise<BrandRecord[]> {
  const rows = await db
    .select()
    .from(brands)
    .where(eq(brands.studioId, studioId))
    .orderBy(brands.name);
  const themes = new Map(
    (await listThemes(db, studioId)).map((t) => [t.id, t]),
  );
  return rows.map((row) => toRecord(row, themes));
}

export async function getBrand(
  db: Database,
  studioId: string,
  brandId: string,
): Promise<BrandRecord> {
  const [row] = await db
    .select()
    .from(brands)
    .where(and(eq(brands.id, brandId), eq(brands.studioId, studioId)));
  if (!row) throw new NotFoundError('Brand not found');
  const themes = new Map(
    (await listThemes(db, studioId)).map((t) => [t.id, t]),
  );
  return toRecord(row, themes);
}

export async function createBrand(
  db: Database,
  studioId: string,
  input: CreateBrandInput,
): Promise<BrandRecord> {
  const slug = input.slug ?? slugify(input.name);
  if (input.themeId) await getTheme(db, studioId, input.themeId); // must belong to this studio
  try {
    const [row] = await db
      .insert(brands)
      .values({
        studioId,
        slug,
        name: input.name,
        domains: [...(input.domains ?? [])],
        themeId: input.themeId ?? null,
      })
      .returning({ id: brands.id });
    return getBrand(db, studioId, row.id);
  } catch (error) {
    rethrowConflict(error, `A brand with slug "${slug}" already exists`);
  }
}

export async function updateBrand(
  db: Database,
  studioId: string,
  brandId: string,
  input: UpdateBrandInput,
): Promise<BrandRecord> {
  await getBrand(db, studioId, brandId);
  if (input.themeId) await getTheme(db, studioId, input.themeId);
  try {
    await db
      .update(brands)
      .set({
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.slug !== undefined ? { slug: input.slug } : {}),
        ...(input.domains !== undefined ? { domains: [...input.domains] } : {}),
        ...(input.themeId !== undefined ? { themeId: input.themeId } : {}),
        ...(input.features !== undefined
          ? { features: { ...input.features } }
          : {}),
        updatedAt: new Date(),
      })
      .where(eq(brands.id, brandId));
  } catch (error) {
    rethrowConflict(error, `A brand with slug "${input.slug}" already exists`);
  }
  return getBrand(db, studioId, brandId);
}

export async function deleteBrand(
  db: Database,
  studioId: string,
  brandId: string,
): Promise<void> {
  const deleted = await db
    .delete(brands)
    .where(and(eq(brands.id, brandId), eq(brands.studioId, studioId)))
    .returning({ id: brands.id });
  if (deleted.length === 0) throw new NotFoundError('Brand not found');
}

function toRecord(
  row: typeof brands.$inferSelect,
  themes: Map<string, ThemeRecord>,
): BrandRecord {
  const theme = row.themeId ? themes.get(row.themeId) : undefined;
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    domains: row.domains,
    features: row.features,
    themeId: row.themeId,
    theme: theme ? toColorTheme(theme) : null,
  };
}
