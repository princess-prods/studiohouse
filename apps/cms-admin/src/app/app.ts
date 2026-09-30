import { NgTemplateOutlet } from '@angular/common';
import { Component, DOCUMENT, computed, inject } from '@angular/core';
import {
  Router,
  RouterLink,
  RouterLinkActive,
  RouterOutlet,
} from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideBell,
  lucideCalendar,
  lucideChartColumn,
  lucideClapperboard,
  lucideFilm,
  lucideHouse,
  lucideLayers,
  lucideLogOut,
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
import { AuthService } from '@studiohouse/auth';
import { SessionService } from './core/session.service';

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
      lucideLogOut,
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
  private readonly router = inject(Router);
  protected readonly auth = inject(AuthService);
  protected readonly session = inject(SessionService);

  /** Two-letter avatar from the user's name or email. */
  protected readonly initials = computed(() => {
    const user = this.auth.user();
    const source = user?.name || user?.email || '';
    const parts = source.split(/[\s@._-]+/).filter(Boolean);
    return parts
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? '')
      .join('');
  });

  protected readonly primaryNav: readonly NavItem[] = [
    { label: 'Dashboard', icon: 'lucideHouse', path: '/' },
    { label: 'Brands', icon: 'lucideLayers', path: '/brands' },
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

  protected selectStudio(event: Event): void {
    this.session.selectStudio((event.target as HTMLSelectElement).value);
  }

  protected async signOut(): Promise<void> {
    await this.auth.signOut();
    this.session.clear();
    await this.router.navigateByUrl('/sign-in');
  }
}
