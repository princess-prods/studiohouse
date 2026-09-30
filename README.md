# Studiohouse

[![CI](https://github.com/princess-prods/studiohouse/actions/workflows/ci.yml/badge.svg)](https://github.com/princess-prods/studiohouse/actions/workflows/ci.yml)
[![codecov](https://codecov.io/gh/princess-prods/studiohouse/graph/badge.svg)](https://codecov.io/gh/princess-prods/studiohouse)

Nx monorepo for a multi-tenant content platform for adult production studios, built so
it can be offered as SaaS. Princess Productions is the first studio. It contains the internal CMS used to update and monitor every brand, the white-label
apps that serve each brand, and the Neon Function API that connects them to Lakebase
Postgres and Managed Auth on [Neon](https://neon.com).

Full documentation lives in [docs/](./docs/README.md):

- [Architecture](./docs/architecture.md) — layout, tags, module boundaries
- [Database strategy](./docs/database.md) — Neon branches for prod/dev/preview, migrations, testing
- [White-label apps](./docs/white-label.md) — how one app serves many brands
- [Backend](./docs/backend.md) — the API as a Neon Function (Hono) with Managed Auth JWT verification

## Projects

| Project               | Type          | Tags              | Description                                   |
| --------------------- | ------------- | ----------------- | --------------------------------------------- |
| `cms-admin`           | Angular app   | `scope:cms-admin` | Admin CMS for all brands                      |
| `cms-admin-e2e`       | Playwright    |                   | End-to-end tests for `cms-admin`              |
| `cms-api`             | Neon Function | `scope:api`       | Hono API: JWT verification, `/me`             |
| `@studiohouse/auth`   | Angular lib   | `scope:shared`    | Managed Auth client, guards, interceptor      |
| `@studiohouse/db`     | TS library    | `scope:shared`    | Drizzle schema, migrations, seed, Neon client |
| `@studiohouse/models` | TS library    | `scope:shared`    | Shared data models                            |
| `@studiohouse/ui`     | Angular lib   | `scope:shared`    | Colour theme model + Spartan token mapping    |
| `ui-helm`             | Angular lib   | `scope:shared`    | Spartan helm primitives                       |

## Quick start

```bash
npm install

# API (Neon Function) at http://localhost:3000, with branch env injected
neon dev --source apps/cms-api/src/index.ts --port 3000

# CMS at http://localhost:4200 (proxies /api to the function)
npx nx serve cms-admin

# Lint, test, build and typecheck everything
npx nx run-many -t lint test build typecheck

# End-to-end tests
npx nx e2e cms-admin-e2e

# Only what changed since main
npx nx affected -t lint test build

# Dependency graph
npx nx graph
```

Copy `.env.example` to `.env.local` (git-ignored) and point `DATABASE_URL` at your Neon
`dev` branch, then:

```bash
npx nx run db:migrate
npx nx run db:seed
```

See [docs/database.md](./docs/database.md).

## Adding projects

Always use the Nx generators so new projects pick up the workspace defaults
(standalone Angular, esbuild, Vitest, Playwright, ESLint):

```bash
# A new white-label app
npx nx g @nx/angular:app apps/<name> --tags=scope:<name> --no-interactive

# A shared library
npx nx g @nx/angular:lib packages/shared/<name> --tags=scope:shared --no-interactive

# A component inside a project
npx nx g @nx/angular:component <name> --project=<project>
```

After adding a new `scope:` tag, add its dependency constraint to
[eslint.config.mjs](./eslint.config.mjs).

## Coverage

Every project runs Vitest with v8 coverage. The local target is 100% line coverage per
project; Codecov enforces the floor in `codecov.yml` on pull requests.

```bash
npx nx run-many -t test --coverage          # reports in coverage/<project>/
npx nx affected -t test --coverage --base=origin/main
```

The `coverage-gate` hook in `.claude/settings.json` runs when a PR is created, blocks
below the floor and reports remaining gaps; the `/coverage` skill describes how to close them.

## CI

[.github/workflows/ci.yml](./.github/workflows/ci.yml) runs format check, lint, test,
build, typecheck and e2e on every push and pull request, distributed through Nx Cloud.

## Nx resources

- [Nx docs](https://nx.dev/docs)
- [Module boundaries](https://nx.dev/docs/features/enforce-module-boundaries)
- [Nx Console](https://nx.dev/docs/getting-started/editor-setup) editor extension
