# @studiohouse/models

Plain TypeScript contracts shared by the API and every app. No framework
types, no database rows.

- `color-theme.model.ts` — `ColorTheme`, `ThemeColor`, `ColorRole` / `COLOR_ROLES`,
  `StatusRole` / `STATUS_ROLES`, `ThemeFonts`. Mirrored by the `color_role` Postgres enum
  in `@studiohouse/db`; change both together.
- `session.model.ts` — the `GET /me` contract: `MeResponse`, `MembershipSummary`,
  `StudioSummary`, `BrandSummary` (with its assembled `theme`), `SessionUser`,
  `MembershipRole`.

`@studiohouse/ui` re-exports the theme types for convenience. Add new API contracts
here first, then implement them in `cms-api` and consume them in the apps.
