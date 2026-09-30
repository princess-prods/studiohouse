import {
  HttpClient,
  provideHttpClient,
  withInterceptors,
} from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, UrlTree, provideRouter } from '@angular/router';
import { provideNeonAuth } from './auth.config';
import { authGuard, signedOutGuard } from './auth.guard';
import { authInterceptor } from './auth.interceptor';
import {
  AUTH_FETCH,
  AuthService,
  NEON_AUTH_CLIENT,
  NeonAuthClient,
} from './auth.service';

const user = { id: 'user_1', email: 'owner@example.com', name: 'Owner' };

function fakeClient(signedIn: boolean): NeonAuthClient & { calls: string[] } {
  const calls: string[] = [];
  let session = signedIn;
  return {
    calls,
    signIn: {
      email: async () => {
        calls.push('signIn');
        session = true;
        return { error: null };
      },
    },
    signUp: {
      email: async () => {
        calls.push('signUp');
        session = true;
        return { error: null };
      },
    },
    signOut: async () => {
      calls.push('signOut');
      session = false;
    },
    getSession: async () => ({ data: session ? { user } : null, error: null }),
  };
}

function setup(signedIn: boolean) {
  const client = fakeClient(signedIn);
  TestBed.configureTestingModule({
    providers: [
      provideNeonAuth({ url: 'https://auth.example.test/neondb/auth' }),
      provideRouter([]),
      provideHttpClient(withInterceptors([authInterceptor])),
      provideHttpClientTesting(),
      { provide: NEON_AUTH_CLIENT, useValue: client },
      {
        provide: AUTH_FETCH,
        useValue: async (url: string) =>
          signedIn && url.endsWith('/token')
            ? new Response(JSON.stringify({ token: 'jwt-123' }), {
                status: 200,
              })
            : new Response('', { status: 401 }),
      },
    ],
  });
  return { client, auth: TestBed.inject(AuthService) };
}

describe('AuthService', () => {
  it('reports the session after ready()', async () => {
    const { auth } = setup(true);
    expect(auth.status()).toBe('loading');
    await auth.ready();
    expect(auth.status()).toBe('signed-in');
    expect(auth.user()?.email).toBe('owner@example.com');
  });

  it('signs in, then out', async () => {
    const { auth, client } = setup(false);
    await auth.ready();
    expect(auth.isSignedIn()).toBe(false);
    await auth.signIn('owner@example.com', 'pw');
    expect(auth.isSignedIn()).toBe(true);
    await auth.signOut();
    expect(auth.isSignedIn()).toBe(false);
    expect(client.calls).toEqual(['signIn', 'signOut']);
  });

  it('returns a JWT when signed in and null otherwise', async () => {
    expect(await setup(true).auth.getToken()).toBe('jwt-123');
    TestBed.resetTestingModule();
    expect(await setup(false).auth.getToken()).toBeNull();
  });
});

describe('guards', () => {
  it('authGuard redirects signed-out users to sign-in with returnTo', async () => {
    setup(false);
    const result = await TestBed.runInInjectionContext(() =>
      authGuard({} as never, { url: '/brands' } as never),
    );
    expect((result as UrlTree).toString()).toBe('/sign-in?returnTo=%2Fbrands');
  });

  it('authGuard allows signed-in users', async () => {
    setup(true);
    const result = await TestBed.runInInjectionContext(() =>
      authGuard({} as never, { url: '/brands' } as never),
    );
    expect(result).toBe(true);
  });

  it('signedOutGuard sends signed-in users home', async () => {
    setup(true);
    const result = await TestBed.runInInjectionContext(() =>
      signedOutGuard({} as never, {} as never),
    );
    expect(TestBed.inject(Router).serializeUrl(result as UrlTree)).toBe('/');
  });
});

describe('authInterceptor', () => {
  it('adds a bearer token to API requests only', async () => {
    setup(true);
    const http = TestBed.inject(HttpClient);
    const backend = TestBed.inject(HttpTestingController);

    http.get('/api/me').subscribe();
    http.get('https://fonts.googleapis.com/css').subscribe();
    await new Promise((r) => setTimeout(r, 0));

    expect(
      backend.expectOne('/api/me').request.headers.get('Authorization'),
    ).toBe('Bearer jwt-123');
    expect(
      backend
        .expectOne('https://fonts.googleapis.com/css')
        .request.headers.has('Authorization'),
    ).toBe(false);
    backend.verify();
  });
});
