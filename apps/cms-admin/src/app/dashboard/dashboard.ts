import { Component } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideChevronRight,
  lucideEye,
  lucideLayers,
  lucidePlay,
  lucideUsers,
} from '@ng-icons/lucide';
import { HlmBadgeImports } from '@spartan-ng/helm/badge';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmCardImports } from '@spartan-ng/helm/card';
import {
  BrandThemeDirective,
  COLOR_ROLES,
  ColorTheme,
  PRINCESS_PRODUCTIONS_THEME,
} from '@studiohouse/ui';

interface Stat {
  readonly label: string;
  readonly value: string;
  readonly icon: string;
}

interface BrandSummary {
  readonly slug: string;
  readonly name: string;
  readonly theme: ColorTheme;
}

@Component({
  imports: [
    NgIcon,
    HlmBadgeImports,
    HlmButtonImports,
    HlmCardImports,
    BrandThemeDirective,
  ],
  providers: [
    provideIcons({
      lucideChevronRight,
      lucideEye,
      lucideLayers,
      lucidePlay,
      lucideUsers,
    }),
  ],
  selector: 'cms-dashboard',
  templateUrl: './dashboard.html',
})
export class Dashboard {
  protected readonly roles = COLOR_ROLES;

  // Placeholder figures until the API exists.
  protected readonly stats: readonly Stat[] = [
    { label: 'Brands', value: '2', icon: 'lucideLayers' },
    { label: 'Videos', value: '0', icon: 'lucidePlay' },
    { label: 'Performers', value: '0', icon: 'lucideUsers' },
    { label: 'Total views', value: '0', icon: 'lucideEye' },
  ];

  // Mirrors the seed in @studiohouse/db until brands are served by the API.
  protected readonly brands: readonly BrandSummary[] = [
    {
      slug: 'princess-productions',
      name: 'Princess Productions',
      theme: PRINCESS_PRODUCTIONS_THEME,
    },
    {
      slug: 'devinella',
      name: 'Devinella',
      theme: PRINCESS_PRODUCTIONS_THEME,
    },
  ];
}
