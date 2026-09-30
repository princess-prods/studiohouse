# Architecture

## Goals

1. One internal CMS (`cms-admin`) to update and monitor every brand.
2. A set of white-label apps, each built from one codebase and pointed at a specific brand.
3. One Postgres database on Neon, shared by all studios and brands, isolated by `studio_id` and `brand_id` columns.
4. A Neon Function API that is branch-agnostic: the same code runs on the dev and production branches with that branch's database and auth injected.

## Workspace layout

```
apps/
  cms-admin/        [scope:cms-admin]  Angular admin CMS
  cms-admin-e2e/                        Playwright tests for cms-admin
  <brand-app>/     [scope:<app>]       Future white-label apps (see white-label.md)
packages/
  shared/
    db/             [scope:shared,type:data]  Drizzle schema, migrations, seed, Neon client (@studiohouse/db)
    models/         [scope:shared,type:data]  Shared TypeScript models (brand, content, etc.)
    ui/             [scope:shared,type:ui]    ColorTheme model, house palette, theme.css (@studiohouse/ui)
    ui-helm/        [scope:shared,type:ui]    Spartan helm primitives (@spartan-ng/helm/<name>)
docs/               Project documentation (this folder)
```

Planned additions (not yet generated):

```
packages/
  shared/
    brands/         [scope:shared]  BrandService (active brand, loads its theme), hasFeature helper
  cms/
    feature-*/      [scope:cms-admin,type:feature]  CMS feature areas (content, media, monitoring)
    data/           [scope:cms-admin,type:data]     CMS data access
apps/
  cms-api/          [scope:api]  Neon Function API, Hono (see backend.md)
```

## Tags and module boundaries

Boundaries are enforced by `@nx/enforce-module-boundaries` in [eslint.config.mjs](../eslint.config.mjs).

| Tag               | May depend on                     |
| ----------------- | --------------------------------- |
| `scope:shared`    | `scope:shared`                    |
| `scope:cms-admin` | `scope:cms-admin`, `scope:shared` |
| `scope:api`       | `scope:api`, `scope:shared`       |
| `type:data`       | `type:data`                       |

Add a new `scope:<name>` constraint whenever a new app or app-family is generated.
White-label apps should share a single scope (for example `scope:brand-site`)
because they share almost all of their code.

## Conventions

- Generate projects with Nx generators (`npx nx g @nx/angular:app apps/<name> --tags=scope:<name> --no-interactive`).
- Angular apps use standalone components, `esbuild`, Vitest (via Analog) for unit tests and Playwright for e2e.
- Styling is Tailwind v4 plus Spartan UI (brain + generated helm primitives). Colours come from the active `ColorTheme`; see [white-label.md](./white-label.md).
- Non-buildable libraries by default; only add a bundler when publishing.
- Every table and every API call is scoped by `brand_id`. Never write a query that is not brand-aware unless it is explicitly cross-brand reporting in the CMS.
