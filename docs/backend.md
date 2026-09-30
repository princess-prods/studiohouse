# Backend: Neon Functions

## Hosting

The API is a **Neon Function**: a long-running serverless Hono app that runs next to
the database. It is declared in the root [`neon.ts`](../neon.ts) under `functions.cmsapi`
and lives in `apps/cms-api`. Functions are branch-scoped: `dev` and `production` each
run their own deployment at their own URL, with that branch's `DATABASE_URL` and
Managed Auth injected at runtime.

Neon Auth is also declared there (`auth: true`), so every branch has an isolated auth
environment with users in the `neon_auth` schema.

## Commands

```bash
neon dev --source apps/cms-api/src/index.ts --port 3000   # local, hot reload, branch env injected
neon deploy --env .env.local                               # apply neon.ts to the linked branch
neon functions get cmsapi                                  # invocation_url for the linked branch
neon config plan                                           # dry-run diff before deploy
```

`neon dev` and `neon deploy` evaluate `neon.ts`, which reads the `env` block from
`process.env`. Keep `ALLOWED_ORIGINS`, `BOOTSTRAP_OWNER_EMAIL` and `BOOTSTRAP_STUDIO_SLUG`
in `.env.local` (see `.env.example`) and export them before `neon dev`.

## Authentication

Sign-in happens in the browser against Managed Auth (`@studiohouse/auth`). To call the
API, the client asks Neon Auth for a short-lived JWT (`authClient.token()`, EdDSA,
about 15 minutes) and sends it as `Authorization: Bearer`. The Function verifies it with
`jose` against the branch's `NEON_AUTH_JWKS_URL` and checks `iss` and `aud` equal the
auth host origin (`NEON_AUTH_BASE_URL` without its path). No session cookie ever reaches the API, so the CMS and the API
can live on different hosts.

Every route except `/health` sits behind that check. A valid token is identity, not
permission: handlers then resolve the caller's studio memberships and enforce
authorization per resource.

## Shape

```
neon.ts                     infrastructure as code: auth + functions
apps/cms-api/
  src/index.ts              entry: pg pool at module scope, env wiring, default export
  src/app.ts                createApp(deps): Hono app, CORS, bearer middleware, routes
  src/lib/verify-token.ts   JWKS verification, VerifiedUser
  src/lib/me.ts             GET /me: upsert user, memberships + brands, first-run bootstrap
```

`createApp` takes explicit dependencies so tests inject a local signing key and a fake
database. Handlers query through `@studiohouse/db` with the pooled node-postgres client
(`createPooledDb`), never the serverless HTTP driver, because an isolate is reused across
many requests.

## Routes

| Route     | Auth   | Returns                                                                   |
| --------- | ------ | ------------------------------------------------------------------------- |
| `/health` | none   | `{ ok: true }`                                                            |
| `/me`     | bearer | The caller, and every studio they belong to with its role and its brands. |

## First-run bootstrap

A fresh database has a studio but no members. When `BOOTSTRAP_OWNER_EMAIL` matches the
verified email of a caller with no memberships, `/me` makes them **owner** of
`BOOTSTRAP_STUDIO_SLUG`. Clear both variables and redeploy once the owner exists.

## Local development

- The Angular dev server proxies `/api/*` to `http://localhost:3000` (`apps/cms-admin/proxy.conf.json`),
  so the browser sees one origin and CORS is not involved.
- In production the CMS calls the Function's invocation URL directly; `ALLOWED_ORIGINS`
  must list the CMS origin, and the origin must be a Neon Auth trusted domain.

## Testing

- **Unit** (Vitest): tokens signed with a generated EdDSA key and verified through a local
  JWKS; Hono routes exercised with `app.request()`.
- **Integration**: run `neon dev` against the `dev` branch and drive the CMS.
