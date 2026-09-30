import { DOCUMENT } from '@angular/common';
import {
  Directive,
  ElementRef,
  EnvironmentProviders,
  Injectable,
  InjectionToken,
  effect,
  inject,
  input,
  makeEnvironmentProviders,
  provideEnvironmentInitializer,
  signal,
} from '@angular/core';
import {
  COLOR_ROLES,
  ColorRole,
  ColorTheme,
  STATUS_ROLES,
  StatusRole,
} from './color-theme.model';

type BrandVariable = `--brand-${ColorRole | StatusRole}`;
type FontVariable = '--font-display' | '--font-body';
export type ThemeVariables = Partial<
  Record<BrandVariable | FontVariable, string>
>;

/** All variables a theme can set, used to clear stale values on switch. */
const ALL_VARIABLES: readonly (BrandVariable | FontVariable)[] = [
  ...COLOR_ROLES.map((r) => `--brand-${r}` as const),
  ...STATUS_ROLES.map((r) => `--brand-${r}` as const),
  '--font-display',
  '--font-body',
];

/** CSS custom property name for a role, e.g. `--brand-primary`. */
export function cssVariableFor(role: ColorRole | StatusRole): BrandVariable {
  return `--brand-${role}`;
}

/**
 * Flattens a theme into the custom properties that `theme.css` maps onto
 * the Spartan/Tailwind design tokens. Optional slots are omitted so the
 * stylesheet's fallbacks apply.
 */
export function colorThemeToCssVariables(theme: ColorTheme): ThemeVariables {
  const vars: ThemeVariables = {};
  for (const role of COLOR_ROLES) {
    vars[cssVariableFor(role)] = theme.colors[role].hex;
  }
  for (const role of STATUS_ROLES) {
    const color = theme.status?.[role];
    if (color) vars[cssVariableFor(role)] = color.hex;
  }
  if (theme.fonts) {
    vars['--font-display'] = theme.fonts.display;
    vars['--font-body'] = theme.fonts.body;
  }
  return vars;
}

/**
 * Writes a theme onto an element. On `<html>` it themes the whole app; on
 * any other element it themes just that subtree, which is how the CMS
 * previews a brand's theme inside the Studiohouse shell.
 */
export function applyColorTheme(theme: ColorTheme, root: HTMLElement): void {
  const vars = colorThemeToCssVariables(theme);
  for (const name of ALL_VARIABLES) {
    const value = vars[name];
    if (value === undefined) root.style.removeProperty(name);
    else root.style.setProperty(name, value);
  }
  root.dataset['theme'] = theme.id;
}

export const INITIAL_COLOR_THEME = new InjectionToken<ColorTheme>(
  'INITIAL_COLOR_THEME',
);

/**
 * Holds the app-level theme and re-applies it whenever it changes.
 */
@Injectable({ providedIn: 'root' })
export class ColorThemeService {
  private readonly document = inject(DOCUMENT);
  private readonly current = signal<ColorTheme | null>(null);

  /** The active app-level theme, or `null` before one has been applied. */
  readonly theme = this.current.asReadonly();

  set(theme: ColorTheme): void {
    applyColorTheme(theme, this.document.documentElement);
    this.current.set(theme);
  }
}

/**
 * Applies `theme` to the whole app at bootstrap. Add to an app's `providers`.
 */
export function provideColorTheme(theme: ColorTheme): EnvironmentProviders {
  return makeEnvironmentProviders([
    { provide: INITIAL_COLOR_THEME, useValue: theme },
    provideEnvironmentInitializer(() => {
      inject(ColorThemeService).set(inject(INITIAL_COLOR_THEME));
    }),
  ]);
}

/**
 * Scopes a theme to one element and its descendants:
 *
 * ```html
 * <div [shBrandTheme]="brand.theme">…rendered in the brand's colours…</div>
 * ```
 */
@Directive({ selector: '[shBrandTheme]' })
export class BrandThemeDirective {
  readonly theme = input.required<ColorTheme>({ alias: 'shBrandTheme' });
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  constructor() {
    effect(() => applyColorTheme(this.theme(), this.host.nativeElement));
  }
}
