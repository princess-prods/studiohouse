# Backend functions

## Hosting: Vercel Functions, connected to Neon

Backend functions are deployed as **Vercel Functions**. Neon hosts the Postgres
database; the two are linked through the Neon ↔ Vercel integration, which is set up and
managed from the Neon dashboard (Integrations → Vercel). The integration:

- injects `DATABASE_URL` (pooled) and `DATABASE_URL_UNPOOLED` into the Vercel project's environment for production, preview and development;
- creates a Neon branch for every Vercel preview deployment and removes it when the deployment is deleted;
- points production deployments at the `main` branch.

Pull those variables locally with:

```bash
vercel env pull .env.local
```

## Shape of a function

```
apps/cms-api/               [scope:api]   (planned)
  api/<route>.ts            Vercel Function entry points (thin; import from src/)
  src/
    handlers/<name>.ts      one exported handler per route, framework-agnostic
    lib/db.ts               creates the Neon client from DATABASE_URL
    lib/brand.ts           resolves and validates brand_id from the request
```

Keep the Vercel-specific entry points thin so handlers stay unit-testable and portable.
Use `@neondatabase/serverless` for queries (HTTP driver for one-shot queries, WebSocket
driver when a transaction is needed).

Every handler:

1. Resolves the caller's identity and the target `brand_id`.
2. Rejects the request if the caller is not allowed to act on that brand.
3. Runs queries through `packages/shared/db`, always filtered by `brand_id`.

Because the only environment-specific input is `DATABASE_URL`, the same handler runs
unchanged against the dev, preview and prod branches. See [database.md](./database.md).

## Deploy and migrations

- Vercel builds from this repo; the Nx build for `cms-api` produces the `api/` directory Vercel deploys.
- Migrations run in the Vercel build step (or a preceding GitHub Action) against the branch the deployment targets, using `DATABASE_URL_UNPOOLED`.

## Testing

- **Unit tests** (Vitest) mock the db client.
- **Integration tests** run against a real Neon branch. In CI that is the preview branch the integration created for the deployment; locally it is `dev`. They are gated behind `DATABASE_URL` being set so `nx test` still passes without one.
