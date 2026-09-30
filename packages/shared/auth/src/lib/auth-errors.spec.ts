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
import { provideRouter } from '@angular/router';
import { NEON_AUTH_OPTIONS, provideNeonAuth } from './auth.config';
import { authInterceptor } from './auth.interceptor';
import {
  AUTH_FETCH,
  AuthError,
  AuthService,
  NEON_AUTH_CLIENT,
  NeonAuthClient,
} from './auth.service';

/** A client whose every call fails, to exercise the error branches. */
function failingClient(): NeonAuthClient {
  return {
    signIn: { email: async () => ({ error: { message: 'Bad credentials' } }) },
    signUp: { email: async () => ({ error: {} }) },
    signOut: async () => undefined,
    getSession: async () => ({
      data: { user: { id: 'u', email: 'e@x.test' } },
    }),
  };
}

function setup(client: NeonAuthClient, options = {}) {
  TestBed.configureTestingModule({
    providers: [
      provideNeonAuth({
        url: 'https://auth.example.test/neondb/auth',
        ...options,
      }),
      provideRouter([]),
      provideHttpClient(withInterceptors([authInterceptor])),
      provideHttpClientTesting(),
      { provide: NEON_AUTH_CLIENT, useValue: client },
      // No session: the token endpoint answers 401.
      {
        provide: AUTH_FETCH,
        useValue: async () => new Response('', { status: 401 }),
      },
    ],
  });
  return TestBed.inject(AuthService);
}

describe('AuthService error paths', () => {
  it('surfaces the provider message on sign-in failure', async () => {
    const auth = setup(failingClient());
    await expect(auth.signIn('e@x.test', 'pw')).rejects.toThrow(
      new AuthError('Bad credentials'),
    );
  });

  it('falls back to a generic message when the provider gives none', async () => {
    const auth = setup(failingClient());
    await expect(auth.signUp('N', 'e@x.test', 'pw')).rejects.toThrow(
      'Sign-up failed',
    );
  });

  it('reports a user without a name as name: null', async () => {
    const auth = setup(failingClient());
    await auth.ready();
    expect(auth.user()).toEqual({ id: 'u', email: 'e@x.test', name: null });
  });

  it('runs the initial session check only once', async () => {
    let calls = 0;
    const client = failingClient();
    client.getSession = async () => {
      calls++;
      return { data: null };
    };
    const auth = setup(client);
    await Promise.all([auth.ready(), auth.ready()]);
    await auth.ready();
    expect(calls).toBe(1);
    expect(auth.status()).toBe('signed-out');
  });

  it('sends API requests without a header when no token is available', async () => {
    setup(failingClient());
    const http = TestBed.inject(HttpClient);
    const backend = TestBed.inject(HttpTestingController);
    http.get('/api/me').subscribe();
    await new Promise((r) => setTimeout(r, 0));
    expect(
      backend.expectOne('/api/me').request.headers.has('Authorization'),
    ).toBe(false);
    backend.verify();
  });
});

describe('AuthService sign-up', () => {
  it('signs up and reads the new session', async () => {
    const client = failingClient();
    let signedUp = false;
    client.signUp = {
      email: async () => {
        signedUp = true;
        return { error: null };
      },
    };
    client.getSession = async () => ({
      data: signedUp
        ? { user: { id: 'n', email: 'new@x.test', name: 'New' } }
        : null,
    });
    const auth = setup(client);
    await auth.ready();
    expect(auth.isSignedIn()).toBe(false);
    await auth.signUp('New', 'new@x.test', 'password1');
    expect(auth.user()?.email).toBe('new@x.test');
  });
});

describe('NEON_AUTH_CLIENT', () => {
  it('builds the Managed Auth client from the configured URL by default', () => {
    TestBed.configureTestingModule({
      providers: [
        provideNeonAuth({ url: 'https://auth.example.test/neondb/auth' }),
      ],
    });
    const client = TestBed.inject(NEON_AUTH_CLIENT);
    expect(typeof client.signIn.email).toBe('function');
    expect(typeof client.getSession).toBe('function');
    expect(typeof client.token).toBe('function');
  });
});

describe('AUTH_FETCH', () => {
  it('defaults to the global fetch', () => {
    TestBed.configureTestingModule({
      providers: [
        provideNeonAuth({ url: 'https://auth.example.test/neondb/auth' }),
      ],
    });
    expect(typeof TestBed.inject(AUTH_FETCH)).toBe('function');
  });
});

describe('AuthService.getToken', () => {
  it('returns null when the token endpoint answers with a malformed body', async () => {
    TestBed.configureTestingModule({
      providers: [
        provideNeonAuth({ url: 'https://auth.example.test/neondb/auth' }),
        { provide: NEON_AUTH_CLIENT, useValue: failingClient() },
        {
          provide: AUTH_FETCH,
          useValue: async () => new Response('not json', { status: 200 }),
        },
      ],
    });
    expect(await TestBed.inject(AuthService).getToken()).toBeNull();
  });
});

describe('provideNeonAuth', () => {
  it('applies defaults and honours overrides', () => {
    setup(failingClient(), { signInPath: '/login', apiPrefixes: ['/v1/'] });
    const options = TestBed.inject(NEON_AUTH_OPTIONS);
    expect(options.signInPath).toBe('/login');
    expect(options.apiPrefixes).toEqual(['/v1/']);
    expect(options.url).toBe('https://auth.example.test/neondb/auth');
  });
});
