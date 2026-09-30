# Studiohouse — Documentation

This monorepo holds a multi-tenant content platform for adult production studios.
Princess Productions is the first studio; the platform is designed so other studios
can be onboarded as a SaaS offering. Start here:

| Doc                                  | What it covers                                                             |
| ------------------------------------ | -------------------------------------------------------------------------- |
| [architecture.md](./architecture.md) | Workspace layout, apps, libraries, tags and module boundaries              |
| [database.md](./database.md)         | Neon Postgres strategy: branches for dev/prod, migrations, testing         |
| [white-label.md](./white-label.md)   | How brand-aware ("white-label") apps select styling and data per brand     |
| [backend.md](./backend.md)           | Backend functions: where they live, how they reach Neon, environment setup |

## Vocabulary

- **Studio** — the tenant and highest unit of organisation, e.g. Princess Productions. Everything in the system belongs to exactly one studio.
- **Brand** — a consumer-facing identity owned by a studio: a name, a look, one or more domains, and a content lane (e.g. Princess Productions POV, Devinella). Every piece of content belongs to exactly one brand.
- **User** — a global identity, one row per person, issued by the auth provider.
- **Membership** — links a user to a studio with a role (owner, admin, editor, viewer). A user with one membership lands in that studio automatically at login.
- **Color theme** — a named five-colour palette owned by a studio and assigned to brands; switchable at runtime.
- **CMS** — the internal admin app (`cms-admin`) used to create, update and monitor content across all brands.
- **White-label app** — a single codebase that is built or configured once per brand and swaps theme and data based on the selected brand.
