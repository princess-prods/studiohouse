import { ColorTheme } from './color-theme.model';

/**
 * Contracts shared by the API (`cms-api`) and the apps that call it.
 * Keep these plain data: no framework types, no database rows.
 */

export type MembershipRole = 'owner' | 'admin' | 'editor' | 'viewer';

export interface SessionUser {
  readonly id: string;
  readonly email: string;
  readonly name: string | null;
}

export interface StudioSummary {
  readonly id: string;
  readonly slug: string;
  readonly name: string;
}

export interface BrandSummary {
  readonly id: string;
  readonly slug: string;
  readonly name: string;
  /** The brand's stored theme, or `null` when none is assigned yet. */
  readonly theme: ColorTheme | null;
}

export interface MembershipSummary {
  readonly studio: StudioSummary;
  readonly role: MembershipRole;
  readonly brands: readonly BrandSummary[];
}

/** Response of `GET /me`: the caller and every studio they belong to. */
export interface MeResponse {
  readonly user: SessionUser;
  readonly memberships: readonly MembershipSummary[];
}
