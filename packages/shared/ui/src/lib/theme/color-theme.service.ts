import { DOCUMENT } from '@angular/common';
import {
  EnvironmentProviders,
  Injectable,
  InjectionToken,
  inject,
  makeEnvironmentProviders,
  provideEnvironmentInitializer,
  signal,
} from '@angular/core';
import { COLOR_ROLES, ColorRole, ColorTheme } from './color-theme.model';

/** CSS custom property name for a role, e.g. `--brand-primary`. */
export function cssVariableFor(role: ColorRole): `--brand-${ColorRole}` {
  return `--brand-${role}`;
}

/**
 * Flattens a theme into the `--brand-*` custom properties that `theme.css`
 * maps onto the Spartan/Tailwind design tokens.
 */
export function colorThemeToCssVariables(
  theme: ColorTheme,
): Record<`--brand-${ColorRole}`, string> {
  return Object.fromEntries(
    COLOR_ROLES.map((role) => [cssVariableFor(role), theme.colors[role].hex]),
  ) as Record<`--brand-${ColorRole}`, string>;
}

/**
 * Writes a theme's colours onto an element (by default `<html>`), which
 * makes every Spartan component and Tailwind utility pick them up.
 */
export function applyColorTheme(theme: ColorTheme, root: HTMLElement): void {
  for (const [name, value] of Object.entries(colorThemeToCssVariables(theme))) {
    root.style.setProperty(name, value);
  }
  root.dataset['theme'] = theme.id;
}

export const INITIAL_COLOR_THEME = new InjectionToken<ColorTheme>(
  'INITIAL_COLOR_THEME',
);

/**
 * Holds the active theme and re-applies it whenever it changes. Outlet-aware
 * apps call `set()` when the outlet switches.
 */
@Injectable({ providedIn: 'root' })
export class ColorThemeService {
  private readonly document = inject(DOCUMENT);
  private readonly current = signal<ColorTheme | null>(null);

  /** The active theme, or `null` before one has been applied. */
  readonly theme = this.current.asReadonly();

  set(theme: ColorTheme): void {
    applyColorTheme(theme, this.document.documentElement);
    this.current.set(theme);
  }
}

/**
 * Applies `theme` at bootstrap. Add to an app's `providers`.
 */
export function provideColorTheme(theme: ColorTheme): EnvironmentProviders {
  return makeEnvironmentProviders([
    { provide: INITIAL_COLOR_THEME, useValue: theme },
    provideEnvironmentInitializer(() => {
      inject(ColorThemeService).set(inject(INITIAL_COLOR_THEME));
    }),
  ]);
}
