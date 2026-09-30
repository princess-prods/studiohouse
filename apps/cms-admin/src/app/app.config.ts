import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideRouter } from '@angular/router';
import { PRINCESS_PRODUCTIONS_THEME, provideColorTheme } from '@studiohouse/ui';
import { appRoutes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(appRoutes),
    provideColorTheme(PRINCESS_PRODUCTIONS_THEME),
  ],
};
