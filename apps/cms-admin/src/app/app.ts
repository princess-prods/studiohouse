import { Component, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { COLOR_ROLES, ColorThemeService } from '@studiohouse/ui';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmCardImports } from '@spartan-ng/helm/card';

@Component({
  imports: [RouterModule, HlmButtonImports, HlmCardImports],
  selector: 'cms-root',
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  protected readonly title = 'cms-admin';
  protected readonly roles = COLOR_ROLES;
  protected readonly theme = inject(ColorThemeService).theme;

  protected toggleDark(): void {
    document.documentElement.classList.toggle('dark');
  }
}
