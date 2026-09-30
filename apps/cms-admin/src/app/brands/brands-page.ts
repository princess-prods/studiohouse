import { Component, computed, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideChevronRight, lucidePlus } from '@ng-icons/lucide';
import { HlmBadgeImports } from '@spartan-ng/helm/badge';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { HlmLabelImports } from '@spartan-ng/helm/label';
import {
  BRAND_WRITE_ROLE,
  BrandRecord,
  COLOR_ROLES,
  ThemeRecord,
  roleAtLeast,
} from '@studiohouse/models';
import { BrandThemeDirective } from '@studiohouse/ui';
import { ApiError, BrandsApi } from '../core/brands-api.service';
import { SessionService } from '../core/session.service';
import { SLUG_PATTERN, slugify } from '../core/slug';

@Component({
  selector: 'cms-brands-page',
  imports: [
    FormsModule,
    RouterLink,
    NgIcon,
    HlmBadgeImports,
    HlmButtonImports,
    HlmCardImports,
    HlmInputImports,
    HlmLabelImports,
    BrandThemeDirective,
  ],
  providers: [provideIcons({ lucideChevronRight, lucidePlus })],
  templateUrl: './brands-page.html',
})
export class BrandsPage {
  private readonly api = inject(BrandsApi);
  private readonly router = inject(Router);
  protected readonly session = inject(SessionService);

  protected readonly roles = COLOR_ROLES;
  protected readonly slugPattern = SLUG_PATTERN;

  protected readonly brands = signal<BrandRecord[]>([]);
  protected readonly themes = signal<ThemeRecord[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);

  protected readonly canEdit = computed(() =>
    roleAtLeast(this.session.role(), BRAND_WRITE_ROLE),
  );

  // New-brand form
  protected readonly creating = signal(false);
  protected readonly saving = signal(false);
  protected readonly formError = signal<string | null>(null);
  protected name = '';
  protected slug = '';
  protected slugTouched = false;
  protected domains = '';
  protected themeId = '';

  constructor() {
    effect(() => {
      const studio = this.session.studio();
      if (studio) void this.load(studio.id);
    });
  }

  protected async load(studioId: string): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const [brands, themes] = await Promise.all([
        this.api.listBrands(studioId),
        this.api.listThemes(studioId),
      ]);
      this.brands.set(brands);
      this.themes.set(themes);
    } catch (err) {
      this.error.set(
        err instanceof Error ? err.message : 'Could not load brands.',
      );
    } finally {
      this.loading.set(false);
    }
  }

  protected onNameChange(value: string): void {
    this.name = value;
    if (!this.slugTouched) this.slug = slugify(value);
  }

  protected onSlugChange(value: string): void {
    this.slug = value;
    this.slugTouched = value.length > 0;
  }

  protected openForm(): void {
    this.creating.set(true);
    this.formError.set(null);
    this.name = '';
    this.slug = '';
    this.slugTouched = false;
    this.domains = '';
    this.themeId = '';
  }

  protected cancel(): void {
    this.creating.set(false);
  }

  protected async create(): Promise<void> {
    const studio = this.session.studio();
    if (!studio || this.saving()) return;
    this.saving.set(true);
    this.formError.set(null);
    try {
      const brand = await this.api.createBrand(studio.id, {
        name: this.name.trim(),
        slug: this.slug.trim() || undefined,
        domains: this.domains
          .split(/[\s,]+/)
          .map((d) => d.trim())
          .filter(Boolean),
        themeId: this.themeId || null,
      });
      await this.session.refresh();
      await this.router.navigate(['/brands', brand.id]);
    } catch (err) {
      this.formError.set(describe(err));
    } finally {
      this.saving.set(false);
    }
  }
}

/** Human-readable message for an API failure, including field issues. */
export function describe(err: unknown): string {
  if (err instanceof ApiError) {
    const details = err.issues.map((i) => `${i.path}: ${i.message}`).join('; ');
    return details ? `${err.message} (${details})` : err.message;
  }
  return err instanceof Error ? err.message : 'Something went wrong.';
}
