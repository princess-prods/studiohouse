import { ColorRole, ColorTheme, ThemeColor } from './color-theme.model';
import { MembershipRole } from './session.model';

/**
 * Contracts for the brand and theme endpoints under `/studios/:studioId`.
 */

/** A stored theme with its database id (unlike `ColorTheme.id`, which is the slug). */
export interface ThemeRecord {
  readonly id: string;
  readonly slug: string;
  readonly name: string;
  readonly colors: Readonly<Record<ColorRole, ThemeColor>>;
}

export function toColorTheme(record: ThemeRecord): ColorTheme {
  return { id: record.slug, name: record.name, colors: record.colors };
}

/** Full brand as returned by the brand endpoints. */
export interface BrandRecord {
  readonly id: string;
  readonly slug: string;
  readonly name: string;
  readonly domains: readonly string[];
  readonly features: Readonly<Record<string, boolean>>;
  readonly themeId: string | null;
  readonly theme: ColorTheme | null;
}

export interface CreateBrandInput {
  readonly name: string;
  /** Defaults to a slug derived from the name. */
  readonly slug?: string;
  readonly domains?: readonly string[];
  readonly themeId?: string | null;
}

export type UpdateBrandInput = Partial<CreateBrandInput> & {
  readonly features?: Readonly<Record<string, boolean>>;
};

export interface CreateThemeInput {
  readonly name: string;
  readonly slug?: string;
  readonly colors: Readonly<Record<ColorRole, ThemeColor>>;
}

export type UpdateThemeInput = Partial<CreateThemeInput>;

/** Ordered from least to most privileged. */
export const ROLE_RANK: Readonly<Record<MembershipRole, number>> = {
  viewer: 0,
  editor: 1,
  admin: 2,
  owner: 3,
};

export function roleAtLeast(
  role: MembershipRole | null | undefined,
  required: MembershipRole,
): boolean {
  return role != null && ROLE_RANK[role] >= ROLE_RANK[required];
}

/** Who may change brands and themes. Viewers and editors read only. */
export const BRAND_WRITE_ROLE: MembershipRole = 'admin';
/** Who may delete brands and themes. */
export const BRAND_DELETE_ROLE: MembershipRole = 'owner';
