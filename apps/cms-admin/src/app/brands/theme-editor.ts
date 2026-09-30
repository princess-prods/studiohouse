import {
  Component,
  computed,
  effect,
  input,
  output,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { HlmLabelImports } from '@spartan-ng/helm/label';
import {
  COLOR_ROLES,
  ColorRole,
  ColorTheme,
  CreateThemeInput,
  HexColor,
  ThemeColor,
  ThemeRecord,
} from '@studiohouse/models';
import { BrandThemeDirective, DEMO_BRAND_THEME } from '@studiohouse/ui';

/** Editable copy of a theme: one row per role. */
interface ColorRow {
  role: ColorRole;
  label: string;
  hint: string;
  name: string;
  hex: string;
  description: string;
  purpose: string;
}

const ROLE_META: Record<ColorRole, { label: string; hint: string }> = {
  primary: { label: 'Primary', hint: 'Buttons, links, active navigation' },
  ink: { label: 'Ink', hint: 'Dark backgrounds and text' },
  paper: { label: 'Paper', hint: 'Light backgrounds and text on dark' },
  secondary: { label: 'Secondary', hint: 'Accent and destructive states' },
  tint: { label: 'Tint', hint: 'Muted text, borders, graphics' },
};

const HEX = /^#[0-9A-Fa-f]{6}$/;

/**
 * Edits a theme's name and five colours with a live preview rendered in the
 * theme itself. Emits the full theme on save; the parent decides whether that
 * is a create or an update.
 */
@Component({
  selector: 'cms-theme-editor',
  imports: [
    FormsModule,
    HlmButtonImports,
    HlmCardImports,
    HlmInputImports,
    HlmLabelImports,
    BrandThemeDirective,
  ],
  templateUrl: './theme-editor.html',
})
export class ThemeEditor {
  /** The theme to edit, or `null` to start from the demo palette. */
  readonly theme = input<ThemeRecord | null>(null);
  readonly canEdit = input(true);
  readonly busy = input(false);
  readonly error = input<string | null>(null);

  readonly save = output<CreateThemeInput>();

  protected readonly name = signal('');
  protected readonly rows = signal<ColorRow[]>([]);

  constructor() {
    effect(() => this.reset(this.theme()));
  }

  /** The theme as currently edited, for the live preview. */
  protected readonly preview = computed<ColorTheme>(() => ({
    id: 'preview',
    name: this.name() || 'Untitled',
    colors: Object.fromEntries(
      this.rows().map((r) => [
        r.role,
        {
          name: r.name,
          description: r.description,
          hex: (HEX.test(r.hex) ? r.hex.toUpperCase() : '#888888') as HexColor,
          purpose: r.purpose,
        } satisfies ThemeColor,
      ]),
    ) as Record<ColorRole, ThemeColor>,
  }));

  protected readonly valid = computed(
    () =>
      this.name().trim().length > 0 &&
      this.rows().every((r) => r.name.trim().length > 0 && HEX.test(r.hex)),
  );

  protected setName(value: string): void {
    this.name.set(value);
  }

  protected update(role: ColorRole, patch: Partial<ColorRow>): void {
    this.rows.update((rows) =>
      rows.map((r) => (r.role === role ? { ...r, ...patch } : r)),
    );
  }

  protected submit(): void {
    if (!this.valid() || this.busy() || !this.canEdit()) return;
    const preview = this.preview();
    this.save.emit({ name: this.name().trim(), colors: preview.colors });
  }

  protected reset(theme: ThemeRecord | null): void {
    const source = theme?.colors ?? DEMO_BRAND_THEME.colors;
    this.name.set(theme?.name ?? '');
    this.rows.set(
      COLOR_ROLES.map((role) => ({
        role,
        ...ROLE_META[role],
        name: source[role].name,
        hex: source[role].hex,
        description: source[role].description,
        purpose: source[role].purpose,
      })),
    );
  }
}
