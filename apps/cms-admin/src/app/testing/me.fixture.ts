import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { EnvironmentProviders, Provider } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import {
  AUTH_FETCH,
  NEON_AUTH_CLIENT,
  NeonAuthClient,
  provideNeonAuth,
} from '@studiohouse/auth';
import { MeResponse } from '@studiohouse/models';
import {
  DEMO_BRAND_THEME,
  STUDIOHOUSE_THEME,
  provideColorTheme,
} from '@studiohouse/ui';
import { SessionService } from '../core/session.service';

/** A `/me` response with one studio, two brands (one themed), for component tests. */
export const ME_FIXTURE: MeResponse = {
  user: { id: 'u1', email: 'owner@example.com', name: 'Owner One' },
  memberships: [
    {
      studio: { id: 's1', slug: 'demo-studio', name: 'Demo Studio' },
      role: 'owner',
      brands: [
        {
          id: 'b1',
          slug: 'brand-one',
          name: 'Brand One',
          themeId: 't1',
          theme: DEMO_BRAND_THEME,
        },
        {
          id: 'b2',
          slug: 'brand-two',
          name: 'Brand Two',
          themeId: null,
          theme: null,
        },
      ],
    },
  ],
};

/** A Managed Auth client stub that reports the fixture user as signed in (or out). */
export function fakeAuthClient(
  signedIn: boolean,
): NeonAuthClient & { signOutCalls: number } {
  let active = signedIn;
  const client = {
    signOutCalls: 0,
    signIn: { email: async () => ({ error: null }) },
    signUp: { email: async () => ({ error: null }) },
    signOut: async () => {
      client.signOutCalls++;
      active = false;
    },
    getSession: async () => ({
      data: active ? { user: ME_FIXTURE.user } : null,
    }),
  };
  return client;
}

/** Providers every shell-level component test needs. */
export function testProviders(
  signedIn: boolean,
): (Provider | EnvironmentProviders)[] {
  return [
    provideHttpClient(),
    provideHttpClientTesting(),
    provideNeonAuth({ url: 'https://auth.example.test/neondb/auth' }),
    { provide: NEON_AUTH_CLIENT, useValue: fakeAuthClient(signedIn) },
    {
      provide: AUTH_FETCH,
      useValue: async () =>
        signedIn
          ? new Response(JSON.stringify({ token: 'jwt' }), { status: 200 })
          : new Response('', { status: 401 }),
    },
    provideColorTheme(STUDIOHOUSE_THEME),
  ];
}

/** Starts the session load and answers `/me` with `body` (default: the fixture). */
export async function loadSession(
  body: MeResponse | null = ME_FIXTURE,
): Promise<void> {
  const session = TestBed.inject(SessionService);
  const http = TestBed.inject(HttpTestingController);
  const loading = session.load();
  const req = http.expectOne('/api/me');
  if (body) req.flush(body);
  else
    req.flush({ error: 'boom' }, { status: 500, statusText: 'Server Error' });
  await loading;
}
