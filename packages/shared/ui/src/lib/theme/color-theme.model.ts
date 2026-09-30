/**
 * A hex colour in `#RRGGBB` form.
 */
export type HexColor = `#${string}`;

/**
 * The five semantic slots every theme must fill.
 *
 * | Role        | Princess Productions default | Purpose                                   |
 * | ----------- | ---------------------------- | ----------------------------------------- |
 * | `primary`   | Princess Pink `#EE2762`      | Primary brand colour                      |
 * | `ink`       | After Dark `#181518`         | Backgrounds (dark mode), typography       |
 * | `paper`     | Champagne `#F5E7D5`          | Softer alternative to stark white         |
 * | `secondary` | Boudoir Red `#861D3B`        | Secondary accent                          |
 * | `tint`      | Blush `#F4B5C5`              | Backgrounds and secondary graphics        |
 */
export type ColorRole = 'primary' | 'ink' | 'paper' | 'secondary' | 'tint';

export const COLOR_ROLES: readonly ColorRole[] = [
  'primary',
  'ink',
  'paper',
  'secondary',
  'tint',
] as const;

/**
 * Optional status slots. When a theme omits one, `theme.css` derives it
 * from the five core roles.
 */
export type StatusRole = 'success' | 'warning' | 'danger' | 'info';

export const STATUS_ROLES: readonly StatusRole[] = [
  'success',
  'warning',
  'danger',
  'info',
] as const;

/**
 * One named colour inside a theme.
 */
export interface ThemeColor {
  /** Brand name for the colour, e.g. "Princess Pink". */
  readonly name: string;
  /** Plain-language description, e.g. "Vivid hot pink". */
  readonly description: string;
  /** Hex value in `#RRGGBB` form. */
  readonly hex: HexColor;
  /** What the colour is for, e.g. "Primary brand color". */
  readonly purpose: string;
}

/**
 * Font stacks. Each value is a CSS `font-family` list; the faces themselves
 * are loaded by the app (for example from Google Fonts in `index.html`).
 */
export interface ThemeFonts {
  /** Headings and display text. */
  readonly display: string;
  /** UI and body copy. */
  readonly body: string;
}

/**
 * A complete, switchable colour theme.
 *
 * Themes are data: brand themes are stored on the brand record and applied at
 * runtime, so no component ever hard-codes a colour. The product itself
 * (Studiohouse) is also a theme, applied to the CMS shell.
 */
export interface ColorTheme {
  /** Stable identifier, e.g. the brand slug. */
  readonly id: string;
  /** Human-readable name shown in the CMS theme picker. */
  readonly name: string;
  /** One colour per semantic role. */
  readonly colors: Readonly<Record<ColorRole, ThemeColor>>;
  /** Optional status colours. */
  readonly status?: Readonly<Partial<Record<StatusRole, ThemeColor>>>;
  /** Optional font stacks. */
  readonly fonts?: ThemeFonts;
}
