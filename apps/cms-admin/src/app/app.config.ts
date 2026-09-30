import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { STUDIOHOUSE_THEME, provideColorTheme } from '@studiohouse/ui';
import { appRoutes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(appRoutes, withComponentInputBinding()),
    // The CMS shell wears the product theme; brand themes are scoped with [shBrandTheme].
    provideColorTheme(STUDIOHOUSE_THEME),
  ],
};
