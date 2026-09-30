import { NgTemplateOutlet } from '@angular/common';
import { Component, DOCUMENT, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideBell,
  lucideCalendar,
  lucideChartColumn,
  lucideClapperboard,
  lucideFilm,
  lucideHouse,
  lucideLayers,
  lucideMessageSquare,
  lucideSearch,
  lucideSettings,
  lucideSunMoon,
  lucideUsers,
  lucideWallet,
} from '@ng-icons/lucide';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { HlmSeparatorImports } from '@spartan-ng/helm/separator';

interface NavItem {
  readonly label: string;
  readonly icon: string;
  readonly path: string;
  /** Not built yet; rendered but not navigable. */
  readonly soon?: boolean;
}

@Component({
  imports: [
    NgTemplateOutlet,
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    NgIcon,
    HlmButtonImports,
    HlmInputImports,
    HlmSeparatorImports,
  ],
  providers: [
    provideIcons({
      lucideBell,
      lucideCalendar,
      lucideChartColumn,
      lucideClapperboard,
      lucideFilm,
      lucideHouse,
      lucideLayers,
      lucideMessageSquare,
      lucideSearch,
      lucideSettings,
      lucideSunMoon,
      lucideUsers,
      lucideWallet,
    }),
  ],
  selector: 'cms-root',
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  private readonly document = inject(DOCUMENT);

  protected readonly studioName = signal('Princess Productions');

  protected readonly primaryNav: readonly NavItem[] = [
    { label: 'Dashboard', icon: 'lucideHouse', path: '/' },
    { label: 'Brands', icon: 'lucideLayers', path: '/brands', soon: true },
    {
      label: 'Content',
      icon: 'lucideClapperboard',
      path: '/content',
      soon: true,
    },
    { label: 'Talent', icon: 'lucideUsers', path: '/talent', soon: true },
    { label: 'Scenes', icon: 'lucideFilm', path: '/scenes', soon: true },
  ];

  protected readonly secondaryNav: readonly NavItem[] = [
    {
      label: 'Calendar',
      icon: 'lucideCalendar',
      path: '/calendar',
      soon: true,
    },
    {
      label: 'Analytics',
      icon: 'lucideChartColumn',
      path: '/analytics',
      soon: true,
    },
    { label: 'Revenue', icon: 'lucideWallet', path: '/revenue', soon: true },
    {
      label: 'Messages',
      icon: 'lucideMessageSquare',
      path: '/messages',
      soon: true,
    },
    {
      label: 'Settings',
      icon: 'lucideSettings',
      path: '/settings',
      soon: true,
    },
  ];

  protected toggleScheme(): void {
    this.document.documentElement.classList.toggle('dark');
  }
}
