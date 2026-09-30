# Studiohouse monorepo

A multi-tenant content platform for adult production studios, built to be offered as SaaS.
Hierarchy: **studio** (tenant, e.g. Princess Productions) owns **brands** (consumer-facing
identities, e.g. Devinella); **users** join studios through **memberships**.
Read `docs/README.md` first; it links to the architecture, database, backend and
white-label docs. Keep those docs current when you change the things they describe.

## What lives here

- `apps/cms-admin` (+ `cms-admin-e2e`) — Angular admin CMS for updating and monitoring every brand.
- Future `apps/*` — white-label apps: one codebase per app, styled and populated per brand at build or run time. See `docs/white-label.md`.
- Backend functions (planned `apps/cms-api`) — **Vercel Functions** that talk to Postgres on **Neon**, wired together through the Neon ↔ Vercel integration (managed from the Neon dashboard). See `docs/backend.md`.
- `packages/shared/ui` (`@studiohouse/ui`) — the `ColorTheme` model, the house palette, `provideColorTheme()`, and `theme.css` that maps brand colours onto Spartan tokens. `packages/shared/ui-helm` holds generated Spartan helm primitives, imported as `@spartan-ng/helm/<name>`.
- `packages/shared/db` (`@studiohouse/db`) — Drizzle schema, migrations, seed and Neon client. Targets: `db:generate`, `db:migrate`, `db:push`, `db:seed`, `db:studio`.
- `packages/shared/models` — shared data models.

## Domain rules

- Studio is the tenant. Every row is reachable from a `studio_id`, directly or via `brand_id`. Never write a query that crosses studios.
- Every content row belongs to exactly one brand (`brand_id`). API calls carry studio (from the session) and brand (from the request); verify the brand belongs to the studio. Only CMS monitoring views read across a studio's brands.
- Studio selection happens at login through membership, not through a picker. Users with several memberships choose once and can switch.
- Colour roles (`primary`, `ink`, `paper`, `secondary`, `tint`) are enumerated in both `@studiohouse/ui` and the `color_role` Postgres enum. Change both together.
- No brand-specific branching in code (`if (brand === 'x')`). Differences are theme tokens or feature flags stored on the brand record.
- Database: one Neon project, `main` branch = prod, `dev` branch = shared dev, one preview branch per PR. Functions read only `DATABASE_URL`; the same code runs against every branch. See `docs/database.md`.
- Never commit connection strings or credentials. Use `.env.local` and CI secrets.

## Workspace conventions

- Tags: `scope:shared`, `scope:cms-admin`, `scope:api`, plus one `scope:<name>` per new app family. Add the matching `depConstraints` entry in `eslint.config.mjs` when you add a scope.
- Angular apps: standalone components, esbuild, Vitest (Analog) unit tests, Playwright e2e, CSS styles. Selector prefix for the CMS is `cms`.
- Libraries are non-buildable unless they are published.
- Styling: Tailwind v4 (PostCSS, `.postcssrc.json`) + Spartan UI. Add primitives with `npx nx g @spartan-ng/cli:ui --name=<primitive> --no-interactive` (config in `components.json`). Use design tokens (`bg-primary`, `text-muted-foreground`) or brand utilities (`bg-brand-primary`), never raw hex in components.

# General Guidelines for working with Nx

- For navigating/exploring the workspace, invoke the `nx-workspace` skill first - it has patterns for querying projects, targets, and dependencies
- When running tasks (for example build, lint, test, e2e, etc.), always prefer running the task through `nx` (i.e. `nx run`, `nx run-many`, `nx affected`) instead of using the underlying tooling directly
- Prefix nx commands with the workspace's package manager (e.g., `pnpm nx build`, `npm exec nx test`) - avoids using globally installed CLI
- You have access to the Nx MCP server and its tools, use them to help the user
- For Nx plugin best practices, check `node_modules/@nx/<plugin>/PLUGIN.md`. Not all plugins have this file - proceed without it if unavailable.
- NEVER guess CLI flags - always check nx_docs or `--help` first when unsure

## Scaffolding & Generators

- For scaffolding tasks (creating apps, libs, project structure, setup), ALWAYS invoke the `nx-generate` skill FIRST before exploring or calling MCP tools

## When to use nx_docs

- USE for: advanced config options, unfamiliar flags, migration guides, plugin configuration, edge cases
- DON'T USE for: basic generator syntax (`nx g @nx/react:app`), standard commands, things you already know
- The `nx-generate` skill handles generator discovery internally - don't call nx_docs just to look up generator syntax
