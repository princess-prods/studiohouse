import { Route } from '@angular/router';
import { authGuard, signedOutGuard } from '@studiohouse/auth';
import { appConfig } from './app.config';
import { appRoutes } from './app.routes';
import { sessionGuard } from './core/session.guard';
import { Dashboard } from './dashboard/dashboard';
import { SignIn } from './sign-in/sign-in';

function route(path: string, routes: Route[] = appRoutes): Route {
  const found = routes.find((r) => r.path === path);
  if (!found) throw new Error(`no route for "${path}"`);
  return found;
}

describe('appRoutes', () => {
  it('keeps the sign-in page for signed-out users only', async () => {
    const signIn = route('sign-in');
    expect(signIn.canActivate).toEqual([signedOutGuard]);
    await expect(signIn.loadComponent?.()).resolves.toBe(SignIn);
  });

  it('guards the shell and lazy-loads the dashboard', async () => {
    const shell = route('');
    expect(shell.canActivate).toEqual([authGuard, sessionGuard]);
    const dashboard = route('', shell.children);
    expect(dashboard.pathMatch).toBe('full');
    await expect(dashboard.loadComponent?.()).resolves.toBe(Dashboard);
  });

  it('redirects unknown paths home', () => {
    expect(route('**').redirectTo).toBe('');
  });
});

describe('appConfig', () => {
  it('registers router, http, auth and theme providers', () => {
    expect(appConfig.providers.length).toBeGreaterThanOrEqual(5);
  });
});
