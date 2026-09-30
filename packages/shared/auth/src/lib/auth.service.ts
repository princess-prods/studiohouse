import {
  Injectable,
  InjectionToken,
  computed,
  inject,
  signal,
} from '@angular/core';
import { createAuthClient } from '@neondatabase/auth';
import { NEON_AUTH_OPTIONS } from './auth.config';

/** The signed-in user as reported by Neon Auth. */
export interface AuthUser {
  readonly id: string;
  readonly email: string;
  readonly name: string | null;
}

export type AuthStatus = 'loading' | 'signed-out' | 'signed-in';

interface Result<T = unknown> {
  data?: T | null;
  error?: { message?: string } | null;
}

/**
 * The subset of the Managed Better Auth client this service relies on.
 * Kept narrow so tests can provide a fake.
 */
export interface NeonAuthClient {
  signIn: {
    email(input: { email: string; password: string }): Promise<Result>;
  };
  signUp: {
    email(input: {
      email: string;
      password: string;
      name: string;
    }): Promise<Result>;
  };
  signOut(): Promise<unknown>;
  getSession(): Promise<
    Result<{ user: { id: string; email: string; name?: string | null } }>
  >;
  /** Short-lived JWT (EdDSA, ~15 min) for calling our own API. */
  token(): Promise<Result<{ token: string }>>;
}

export const NEON_AUTH_CLIENT = new InjectionToken<NeonAuthClient>(
  'NEON_AUTH_CLIENT',
  {
    providedIn: 'root',
    factory: () =>
      createAuthClient(
        inject(NEON_AUTH_OPTIONS).url,
      ) as unknown as NeonAuthClient,
  },
);

export class AuthError extends Error {}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly client = inject(NEON_AUTH_CLIENT);

  private readonly currentUser = signal<AuthUser | null>(null);
  private readonly currentStatus = signal<AuthStatus>('loading');
  private initial: Promise<void> | null = null;

  readonly user = this.currentUser.asReadonly();
  readonly status = this.currentStatus.asReadonly();
  readonly isSignedIn = computed(() => this.currentStatus() === 'signed-in');

  /** Resolves once the initial session check has completed. Safe to call repeatedly. */
  ready(): Promise<void> {
    this.initial ??= this.refresh();
    return this.initial;
  }

  /** Re-reads the session from Neon Auth. */
  async refresh(): Promise<void> {
    const { data } = await this.client.getSession();
    if (data?.user) {
      this.currentUser.set({
        id: data.user.id,
        email: data.user.email,
        name: data.user.name ?? null,
      });
      this.currentStatus.set('signed-in');
    } else {
      this.currentUser.set(null);
      this.currentStatus.set('signed-out');
    }
  }

  async signIn(email: string, password: string): Promise<void> {
    const { error } = await this.client.signIn.email({ email, password });
    if (error) throw new AuthError(error.message ?? 'Sign-in failed');
    await this.refresh();
  }

  async signUp(name: string, email: string, password: string): Promise<void> {
    const { error } = await this.client.signUp.email({ name, email, password });
    if (error) throw new AuthError(error.message ?? 'Sign-up failed');
    await this.refresh();
  }

  async signOut(): Promise<void> {
    await this.client.signOut();
    this.currentUser.set(null);
    this.currentStatus.set('signed-out');
  }

  /**
   * A JWT for our own API, verified server-side against Neon Auth's JWKS,
   * so the API never needs the session cookie. `null` when signed out.
   */
  async getToken(): Promise<string | null> {
    const { data } = await this.client.token();
    return data?.token ?? null;
  }
}
