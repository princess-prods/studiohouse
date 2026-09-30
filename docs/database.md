# Database strategy (Neon Postgres)

## Recommendation: one Neon project, separate branches for prod and dev

Neon's branching model makes separate _projects_ for dev and prod unnecessary in most
cases. A branch is a copy-on-write fork of another branch's schema and data, created in
seconds and billed only for the data that diverges. The recommended layout is:

| Neon branch    | Purpose                                                                        | Lifetime                   |
| -------------- | ------------------------------------------------------------------------------ | -------------------------- |
| `production`   | **Production**. The only branch real apps and the CMS point at in prod.        | Permanent                  |
| `dev`          | Shared development database. Reset from `production` when you want fresh data. | Permanent                  |
| `preview/<pr>` | One branch per pull request, created from `dev` (or `main`) by CI.             | Deleted when the PR closes |
| local scratch  | Optional per-developer branches for risky migrations.                          | Delete when done           |

Why branches rather than two projects:

- **Same schema by construction.** `dev` and every preview branch are forked from prod, so drift is impossible to introduce accidentally.
- **Realistic data for free.** Forking gives you production-shaped data without copying dumps around.
- **Cheap resets.** Reset `dev` from `main` in one click or one API call when it gets messy.
- **Feature branches.** `neon checkout <name> --create --env .env.local` forks a branch from `dev`, applies `neon.ts` (auth + functions) to it and pulls its env, so a feature gets its own database, auth and API. Delete it when the PR merges.

When a separate Neon **project** for prod _is_ worth it:

- You want a hard billing or access-control wall between prod and everything else (for example, only one person should hold prod credentials).
- Compliance or contractual rules require it.

If you go that route, the branching scheme above still applies inside each project; the only difference is that `dev` is forked from a seed/anonymised snapshot instead of live prod.

### Sensitive data

Forked branches contain real production rows. Performer records, payout details and
anything legally sensitive should either be excluded from `dev`/preview branches or
scrubbed by a post-fork script. Decide this before the first fork, not after.

## Can the same functions be tested against each database?

Yes. The only thing that changes between environments is the connection string.
Every backend function reads `DATABASE_URL` from its environment and nothing else
about the code changes. Concretely:

| Context                   | `DATABASE_URL` points at            |
| ------------------------- | ----------------------------------- |
| Local development         | `dev` branch (or a personal branch) |
| CI unit/integration tests | The PR's `preview/<pr>` branch      |
| Production deploy         | `main` branch                       |

Rules that keep this true:

1. Functions never hard-code a connection string, host or branch name.
2. Functions never branch on "am I in prod?" to change query behaviour. Feature flags live in the database or in config, not in `if (process.env.NODE_ENV === 'production')`.
3. Migrations run from CI against the target branch before the functions are deployed, so a function always meets the schema it was written for.

Use Neon's pooled connection string (`-pooler` host) from serverless functions and the
direct (non-pooled) string for migrations.

## Multi-tenant data model

All studios share one database. Tenant isolation is by column, not by schema or database.
The schema lives in `packages/shared/db` (`@studiohouse/db`):

| Table          | Belongs to | Notes                                                                   |
| -------------- | ---------- | ----------------------------------------------------------------------- |
| `studios`      | —          | The tenant. `slug` is unique.                                           |
| `users`        | —          | Global identity; `id` is the auth provider user id.                     |
| `memberships`  | studio     | `(studio_id, user_id)` primary key, `role` enum.                        |
| `color_themes` | studio     | Named palette; `(studio_id, slug)` unique.                              |
| `theme_colors` | theme      | `(theme_id, role)` primary key; `role` is the `color_role` enum.        |
| `brands`       | studio     | `(studio_id, slug)` unique; `domains`, `features`, optional `theme_id`. |

Rules:

- Every tenant table carries a non-null `studio_id` (directly, or through `brand_id` for content tables) and an index that starts with it.
- Every request resolves a studio from the session and a brand from the request, and the backend checks the brand belongs to the studio before touching data.
- Planned hardening: Postgres row-level security keyed on a session setting (`SET app.studio_id = ...`) so a missed `WHERE` clause cannot leak across studios. Add this before onboarding a second studio.

Within a studio, the CMS is the only client that queries across brands (for monitoring
dashboards); every white-label app queries a single brand.

### Colour themes

A theme is one `color_themes` row plus exactly five `theme_colors` rows, one per role
(`primary`, `ink`, `paper`, `secondary`, `tint`). The role is a Postgres enum because the
apps depend on those slots by name; the colour's `name`, `description` and `purpose` are free
text because they vary per brand. The enum mirrors `ColorRole` in `@studiohouse/ui`; a unit test in
`@studiohouse/db` fails if the two drift.

## Tooling

- **Schema and migrations:** Drizzle ORM with `drizzle-kit` in `packages/shared/db`. Migrations are SQL files under `packages/shared/db/migrations`, checked into git.
- **Driver:** `@neondatabase/serverless` HTTP driver via `createDb()` from `@studiohouse/db`.
- **Commands:** `nx run db:generate` (new migration from schema changes), `db:migrate`, `db:push` (dev only), `db:seed`, `db:studio`.
- **Migrate on deploy:** run `db:migrate` against the target branch with `DATABASE_URL_UNPOOLED` before the functions deploy.

## Environment variables

| Variable                                                                            | Where it is set                                                                                                     |
| ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`, `DATABASE_URL_UNPOOLED`, `NEON_AUTH_BASE_URL`, `NEON_AUTH_JWKS_URL` | Written to `.env.local` by `neon env pull` for the linked branch (`.neon`); injected into Neon Functions at runtime |

Never commit a real connection string. Commit `.env.example` with placeholder values.
