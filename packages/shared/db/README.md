# @studiohouse/db

Drizzle schema, migrations and Neon client for the whole workspace.

## Tables

| Table          | Owner  | Purpose                                                                |
| -------------- | ------ | ---------------------------------------------------------------------- |
| `studios`      | —      | The tenant. Highest unit of organisation.                              |
| `users`        | —      | Global identity; `id` is the auth provider's user id.                  |
| `memberships`  | studio | Links a user to a studio with a role (owner/admin/editor/viewer).      |
| `color_themes` | studio | A named palette owned by a studio.                                     |
| `theme_colors` | theme  | One row per `color_role` (primary, ink, paper, secondary, tint).       |
| `brands`       | studio | A consumer-facing identity: slug, name, domains, feature flags, theme. |

## Commands

```bash
npx nx run db:generate   # write a new SQL migration from schema changes
npx nx run db:migrate    # apply migrations to DATABASE_URL_UNPOOLED
npx nx run db:push       # dev only: sync schema without a migration file
npx nx run db:seed       # seed a demo studio, its theme and two brands
npx nx run db:studio     # open Drizzle Studio
```

All commands read the root `.env.local`. See `.env.example`.

## Usage

```ts
import { createDb, brands } from '@studiohouse/db';

const db = createDb();
const rows = await db.select().from(brands);
```

`createDb()` uses Neon's HTTP driver, suitable for Vercel Functions. Pass a
connection string explicitly to target another branch.
