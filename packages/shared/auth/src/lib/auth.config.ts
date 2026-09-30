import {
  EnvironmentProviders,
  InjectionToken,
  makeEnvironmentProviders,
} from '@angular/core';

export interface NeonAuthOptions {
  /**
   * The Neon Auth base URL for the branch this build talks to, e.g.
   * `https://ep-xxx.neonauth.c-2.us-east-2.aws.neon.build/neondb/auth`.
   * Not a secret, but branch-specific: dev and prod differ.
   */
  readonly url: string;
  /** Where unauthenticated users are sent. Defaults to `/sign-in`. */
  readonly signInPath?: string;
  /** Requests whose URL starts with one of these get a bearer token. Defaults to `['/api/']`. */
  readonly apiPrefixes?: readonly string[];
}

export const NEON_AUTH_OPTIONS = new InjectionToken<Required<NeonAuthOptions>>(
  'NEON_AUTH_OPTIONS',
);

export function provideNeonAuth(
  options: NeonAuthOptions,
): EnvironmentProviders {
  return makeEnvironmentProviders([
    {
      provide: NEON_AUTH_OPTIONS,
      useValue: {
        signInPath: '/sign-in',
        apiPrefixes: ['/api/'],
        ...options,
      },
    },
  ]);
}
