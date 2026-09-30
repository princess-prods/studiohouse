import { provideHttpClient, withInterceptors } from '@angular/common/http';
import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { authInterceptor, provideNeonAuth } from '@studiohouse/auth';
import { STUDIOHOUSE_THEME, provideColorTheme } from '@studiohouse/ui';
import { environment } from '../environments/environment';
import { appRoutes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(appRoutes, withComponentInputBinding()),
    provideHttpClient(withInterceptors([authInterceptor])),
    provideNeonAuth({
      url: environment.neonAuthUrl,
      apiPrefixes: [environment.apiBaseUrl],
    }),
    // The CMS shell wears the product theme; brand themes are scoped with [shBrandTheme].
    provideColorTheme(STUDIOHOUSE_THEME),
  ],
};
