# @studiohouse/auth

Angular client for Neon Managed Better Auth, shared by every app.

- `provideNeonAuth({ url, signInPath?, apiPrefixes? })` — configure with the branch's `NEON_AUTH_BASE_URL`.
- `AuthService` — signals `user`, `status`, `isSignedIn`; `ready()`, `signIn()`, `signUp()`, `signOut()`, `getToken()`.
- `authGuard` / `signedOutGuard` — route guards; `authGuard` redirects to sign-in with `returnTo`.
- `authInterceptor` — adds `Authorization: Bearer <jwt>` to requests whose URL starts with an `apiPrefixes` entry.

```ts
provideHttpClient(withInterceptors([authInterceptor])),
provideNeonAuth({ url: environment.neonAuthUrl, apiPrefixes: [environment.apiBaseUrl] }),
```

The JWT comes from `authClient.token()` (EdDSA, ~15 min) and is verified by the API
against the branch's JWKS, so no session cookie crosses to the API. See `docs/backend.md`.

Tests replace the real client through the `NEON_AUTH_CLIENT` token.
