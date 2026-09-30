# Studiohouse monorepo

A multi-tenant content platform for adult production studios, built to be offered as SaaS.
Hierarchy: **studio** (tenant, e.g. Princess Productions) owns **brands** (consumer-facing
identities, e.g. Devinella); **users** join studios through **memberships**.
Read `docs/README.md` first; it links to the architecture, database, backend and
white-label docs. Keep those docs current when you change the things they describe.

## What lives here

- `apps/cms-admin` (+ `cms-admin-e2e`) — Angular admin CMS for updating and monitoring every brand.
- Future `apps/*` — white-label apps: one codebase per app, styled and populated per brand at build or run time. See `docs/white-label.md`.
- `apps/cms-api` — the API as a **Neon Function** (Hono), declared in the root `neon.ts` with `auth: true`. Local: `neon dev --source apps/cms-api/src/index.ts --port 3000`; deploy: `neon deploy --env .env.local`. See `docs/backend.md`.
- `packages/shared/auth` (`@studiohouse/auth`) — Managed Better Auth client for Angular: `provideNeonAuth()`, `AuthService` (signals), `authGuard`/`signedOutGuard`, and `authInterceptor` that attaches the Neon Auth JWT to API calls.
- `packages/shared/ui` (`@studiohouse/ui`) — the `ColorTheme` model (five colour roles, optional status colours and fonts), `STUDIOHOUSE_THEME` (the product theme), `PRINCESS_PRODUCTIONS_THEME` (a brand theme), `provideColorTheme()`, the `[shBrandTheme]` directive, and `theme.css` that maps `--brand-*` variables onto Spartan tokens. `packages/shared/ui-helm` holds generated Spartan helm primitives, imported as `@spartan-ng/helm/<name>`.
- `packages/shared/db` (`@studiohouse/db`) — Drizzle schema, migrations, seed and Neon client. Targets: `db:generate`, `db:migrate`, `db:push`, `db:seed`, `db:studio`.
- `packages/shared/models` — shared data models.

## Domain rules

- Studio is the tenant. Every row is reachable from a `studio_id`, directly or via `brand_id`. Never write a query that crosses studios.
- Every content row belongs to exactly one brand (`brand_id`). API calls carry studio (from the session) and brand (from the request); verify the brand belongs to the studio. Only CMS monitoring views read across a studio's brands.
- Studio selection happens at login through membership, not through a picker. Users with several memberships choose once and can switch.
- Colour roles (`primary`, `ink`, `paper`, `secondary`, `tint`) are enumerated in both `@studiohouse/ui` and the `color_role` Postgres enum. Change both together.
- The CMS shell wears the Studiohouse product theme (dark by default, Playfair Display + Inter, copper accent). A brand's theme is applied only to brand-scoped previews and editors via `[shBrandTheme]="theme"`, never to the shell.
- No brand-specific branching in code (`if (brand === 'x')`). Differences are theme tokens or feature flags stored on the brand record.
- Database: one Neon project (`holy-sun-92468174`), `production` branch = prod, `dev` branch = shared dev, feature branches via `neon checkout`. Functions and auth are branch-scoped; the same code runs against every branch. See `docs/database.md`.
- Auth: browser signs in against Managed Auth; the API verifies a bearer JWT against `NEON_AUTH_JWKS_URL`. No session cookies cross to the API. A valid token is identity, not permission: handlers resolve memberships and authorise per resource.
- Never commit connection strings or credentials. `.env.local` is written by `neon env pull` (linked via `.neon`, git-ignored); add the `neon.ts` function env keys to it by hand. Use `neon` CLI (`neon me`, `neon link`, `neon dev`, `neon deploy`) and the project-scoped Neon MCP server in `.mcp.json`. Neon agent skills live in `.claude/skills/neon*`.

## Workspace conventions

- Tags: `scope:shared`, `scope:cms-admin`, `scope:api`, plus one `scope:<name>` per new app family. Add the matching `depConstraints` entry in `eslint.config.mjs` when you add a scope.
- Angular apps: standalone components, esbuild, Vitest (Analog) unit tests, Playwright e2e, CSS styles. Selector prefix for the CMS is `cms`.
- Libraries are non-buildable unless they are published.
- Before opening a pull request, run the `coverage` skill: every changed project aims for 100% line coverage. The `coverage-gate` hook (`.claude/hooks/coverage-gate.mjs`) runs on `gh pr create`, blocks below 80% lines and reports remaining gaps; Codecov (`codecov.yml`) requires no overall regression and 95% on changed lines; note deliberate exclusions in the PR body.
- Styling: Tailwind v4 (PostCSS, `.postcssrc.json`) + Spartan UI. Add primitives with `npx nx g @spartan-ng/cli:ui --name=<primitive> --no-interactive` (config in `components.json`). Use design tokens (`bg-primary`, `text-muted-foreground`, `text-success`), brand utilities (`bg-brand-primary`), and font utilities (`font-display`, `font-sans`), never raw hex in components. Section labels use the `eyebrow` utility.

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
