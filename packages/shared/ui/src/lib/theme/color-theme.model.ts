/**
 * A hex colour in `#RRGGBB` form.
 */
export type HexColor = `#${string}`;

/**
 * The five semantic slots every outlet theme must fill.
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
 * A complete, switchable colour theme for one outlet.
 *
 * Themes are data: they are stored on the outlet record and applied at
 * runtime with `applyColorTheme`, so no component ever hard-codes a colour.
 */
export interface ColorTheme {
  /** Stable identifier, e.g. the outlet slug. */
  readonly id: string;
  /** Human-readable name shown in the CMS theme picker. */
  readonly name: string;
  /** One colour per semantic role. */
  readonly colors: Readonly<Record<ColorRole, ThemeColor>>;
}
