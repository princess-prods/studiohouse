import { Component, computed, inject } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideChevronRight,
  lucideEye,
  lucideLayers,
  lucidePlay,
  lucideUsers,
} from '@ng-icons/lucide';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { BrandThemeDirective, COLOR_ROLES } from '@studiohouse/ui';
import { SessionService } from '../core/session.service';

interface Stat {
  readonly label: string;
  readonly value: string;
  readonly icon: string;
}

@Component({
  imports: [NgIcon, HlmButtonImports, HlmCardImports, BrandThemeDirective],
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
  protected readonly session = inject(SessionService);
  protected readonly roles = COLOR_ROLES;

  // Content, performer and view counts arrive with their features.
  protected readonly stats = computed<readonly Stat[]>(() => [
    {
      label: 'Brands',
      value: String(this.session.brands().length),
      icon: 'lucideLayers',
    },
    { label: 'Videos', value: '0', icon: 'lucidePlay' },
    { label: 'Performers', value: '0', icon: 'lucideUsers' },
    { label: 'Total views', value: '0', icon: 'lucideEye' },
  ]);
}
