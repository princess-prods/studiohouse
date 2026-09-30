import { sql } from 'drizzle-orm';
import {
  check,
  index,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

/*
 * Tenancy model
 * -------------
 * studio      the tenant; the highest unit of organisation (e.g. Princess Productions)
 * brand       a consumer-facing identity owned by a studio (e.g. Devinella)
 * user        a global identity, one row per person, id issued by the auth provider
 * membership  links a user to a studio with a role
 * color_theme a switchable palette owned by a studio and assigned to brands
 *
 * Every row is reachable from a studio, directly or through a brand. Nothing
 * is shared across studios.
 */

const timestamps = {
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
};

export const membershipRole = pgEnum('membership_role', [
  'owner',
  'admin',
  'editor',
  'viewer',
]);

/** Mirrors `ColorRole` in `@studiohouse/ui`. Keep the two in sync. */
export const colorRole = pgEnum('color_role', [
  'primary',
  'ink',
  'paper',
  'secondary',
  'tint',
]);

export const studios = pgTable('studios', {
  id: uuid('id').primaryKey().defaultRandom(),
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
  ...timestamps,
});

export const users = pgTable('users', {
  /** Id issued by the auth provider (Neon Auth). */
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  displayName: text('display_name'),
  ...timestamps,
});

export const memberships = pgTable(
  'memberships',
  {
    studioId: uuid('studio_id')
      .notNull()
      .references(() => studios.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    role: membershipRole('role').notNull().default('editor'),
    createdAt: timestamps.createdAt,
  },
  (t) => [
    primaryKey({ columns: [t.studioId, t.userId] }),
    index('memberships_user_id_idx').on(t.userId),
  ],
);

export const colorThemes = pgTable(
  'color_themes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    studioId: uuid('studio_id')
      .notNull()
      .references(() => studios.id, { onDelete: 'cascade' }),
    slug: text('slug').notNull(),
    name: text('name').notNull(),
    ...timestamps,
  },
  (t) => [uniqueIndex('color_themes_studio_slug_idx').on(t.studioId, t.slug)],
);

export const themeColors = pgTable(
  'theme_colors',
  {
    themeId: uuid('theme_id')
      .notNull()
      .references(() => colorThemes.id, { onDelete: 'cascade' }),
    /** The semantic slot. Exactly one row per role per theme. */
    role: colorRole('role').notNull(),
    /** Brand name for the colour, e.g. "Princess Pink". */
    name: text('name').notNull(),
    /** Plain-language description, e.g. "Vivid hot pink". */
    description: text('description').notNull().default(''),
    /** `#RRGGBB`. */
    hex: text('hex').notNull(),
    /** What the colour is for, e.g. "Primary brand color". */
    purpose: text('purpose').notNull().default(''),
  },
  (t) => [
    primaryKey({ columns: [t.themeId, t.role] }),
    check('theme_colors_hex_format', sql`${t.hex} ~ '^#[0-9A-Fa-f]{6}$'`),
  ],
);

export const brands = pgTable(
  'brands',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    studioId: uuid('studio_id')
      .notNull()
      .references(() => studios.id, { onDelete: 'cascade' }),
    slug: text('slug').notNull(),
    name: text('name').notNull(),
    /** Hostnames this brand answers on, e.g. ["devinella.com"]. */
    domains: text('domains')
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    /** Feature flags, e.g. {"clipsStore": true}. */
    features: jsonb('features')
      .$type<Record<string, boolean>>()
      .notNull()
      .default({}),
    themeId: uuid('theme_id').references(() => colorThemes.id, {
      onDelete: 'set null',
    }),
    ...timestamps,
  },
  (t) => [
    uniqueIndex('brands_studio_slug_idx').on(t.studioId, t.slug),
    index('brands_theme_id_idx').on(t.themeId),
  ],
);

export type Studio = typeof studios.$inferSelect;
export type NewStudio = typeof studios.$inferInsert;
export type User = typeof users.$inferSelect;
export type Membership = typeof memberships.$inferSelect;
export type MembershipRole = (typeof membershipRole.enumValues)[number];
export type ColorThemeRow = typeof colorThemes.$inferSelect;
export type ThemeColorRow = typeof themeColors.$inferSelect;
export type ColorRoleValue = (typeof colorRole.enumValues)[number];
export type Brand = typeof brands.$inferSelect;
export type NewBrand = typeof brands.$inferInsert;
