import {
  Component,
  computed,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideArrowLeft, lucideTrash2 } from '@ng-icons/lucide';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { HlmLabelImports } from '@spartan-ng/helm/label';
import { HlmSeparatorImports } from '@spartan-ng/helm/separator';
import {
  BRAND_DELETE_ROLE,
  BRAND_WRITE_ROLE,
  BrandRecord,
  CreateThemeInput,
  ThemeRecord,
  roleAtLeast,
} from '@studiohouse/models';
import { BrandsApi } from '../core/brands-api.service';
import { SessionService } from '../core/session.service';
import { SLUG_PATTERN } from '../core/slug';
import { describe } from './brands-page';
import { ThemeEditor } from './theme-editor';

/** Sentinel option value for "create a new theme" in the picker. */
const NEW_THEME = '__new__';

@Component({
  selector: 'cms-brand-page',
  imports: [
    FormsModule,
    RouterLink,
    NgIcon,
    HlmButtonImports,
    HlmCardImports,
    HlmInputImports,
    HlmLabelImports,
    HlmSeparatorImports,
    ThemeEditor,
  ],
  providers: [provideIcons({ lucideArrowLeft, lucideTrash2 })],
  templateUrl: './brand-page.html',
})
export class BrandPage {
  /** From the route (`withComponentInputBinding`). */
  readonly brandId = input.required<string>();

  private readonly api = inject(BrandsApi);
  private readonly router = inject(Router);
  protected readonly session = inject(SessionService);

  protected readonly NEW_THEME = NEW_THEME;
  protected readonly slugPattern = SLUG_PATTERN;

  protected readonly brand = signal<BrandRecord | null>(null);
  protected readonly themes = signal<ThemeRecord[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);

  protected readonly canEdit = computed(() =>
    roleAtLeast(this.session.role(), BRAND_WRITE_ROLE),
  );
  protected readonly canDelete = computed(() =>
    roleAtLeast(this.session.role(), BRAND_DELETE_ROLE),
  );

  // Brand form
  protected name = '';
  protected slug = '';
  protected domains = '';
  protected readonly saving = signal(false);
  protected readonly saveError = signal<string | null>(null);
  protected readonly saved = signal(false);

  // Theme picker + editor
  protected readonly selectedThemeId = signal<string>('');
  protected readonly selectedTheme = computed<ThemeRecord | null>(() => {
    const id = this.selectedThemeId();
    return id && id !== NEW_THEME
      ? (this.themes().find((t) => t.id === id) ?? null)
      : null;
  });
  protected readonly creatingTheme = computed(
    () => this.selectedThemeId() === NEW_THEME,
  );
  protected readonly themeSaving = signal(false);
  protected readonly themeError = signal<string | null>(null);

  constructor() {
    effect(() => {
      const studio = this.session.studio();
      const brandId = this.brandId();
      if (studio && brandId) void this.load(studio.id, brandId);
    });
  }

  protected async load(studioId: string, brandId: string): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const [brand, themes] = await Promise.all([
        this.api.getBrand(studioId, brandId),
        this.api.listThemes(studioId),
      ]);
      this.brand.set(brand);
      this.themes.set(themes);
      this.name = brand.name;
      this.slug = brand.slug;
      this.domains = brand.domains.join(', ');
      this.selectedThemeId.set(brand.themeId ?? '');
    } catch (err) {
      this.error.set(describe(err));
    } finally {
      this.loading.set(false);
    }
  }

  protected async saveBrand(): Promise<void> {
    const studio = this.session.studio();
    const brand = this.brand();
    if (!studio || !brand || this.saving()) return;
    this.saving.set(true);
    this.saveError.set(null);
    this.saved.set(false);
    try {
      const themeId = this.selectedThemeId();
      const updated = await this.api.updateBrand(studio.id, brand.id, {
        name: this.name.trim(),
        slug: this.slug.trim(),
        domains: this.domains
          .split(/[\s,]+/)
          .map((d) => d.trim())
          .filter(Boolean),
        themeId: themeId && themeId !== NEW_THEME ? themeId : null,
      });
      this.brand.set(updated);
      this.saved.set(true);
      await this.session.refresh();
    } catch (err) {
      this.saveError.set(describe(err));
    } finally {
      this.saving.set(false);
    }
  }

  protected onThemePick(value: string): void {
    this.selectedThemeId.set(value);
    this.themeError.set(null);
  }

  /** Create or update the theme from the editor, then assign it to the brand. */
  protected async saveTheme(input: CreateThemeInput): Promise<void> {
    const studio = this.session.studio();
    const brand = this.brand();
    if (!studio || !brand || this.themeSaving()) return;
    this.themeSaving.set(true);
    this.themeError.set(null);
    try {
      const existing = this.selectedTheme();
      const theme = existing
        ? await this.api.updateTheme(studio.id, existing.id, input)
        : await this.api.createTheme(studio.id, input);
      this.themes.update((all) => {
        const rest = all.filter((t) => t.id !== theme.id);
        return [...rest, theme].sort((a, b) => a.name.localeCompare(b.name));
      });
      this.selectedThemeId.set(theme.id);
      if (brand.themeId !== theme.id) {
        this.brand.set(
          await this.api.updateBrand(studio.id, brand.id, {
            themeId: theme.id,
          }),
        );
      } else {
        this.brand.set(await this.api.getBrand(studio.id, brand.id));
      }
      await this.session.refresh();
    } catch (err) {
      this.themeError.set(describe(err));
    } finally {
      this.themeSaving.set(false);
    }
  }

  protected async deleteBrand(): Promise<void> {
    const studio = this.session.studio();
    const brand = this.brand();
    if (!studio || !brand) return;
    if (
      !globalThis.confirm?.(`Delete "${brand.name}"? This cannot be undone.`)
    ) {
      return;
    }
    try {
      await this.api.deleteBrand(studio.id, brand.id);
      await this.session.refresh();
      await this.router.navigate(['/brands']);
    } catch (err) {
      this.saveError.set(describe(err));
    }
  }
}
