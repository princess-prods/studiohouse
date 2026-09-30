# @studiohouse/ui

Shared UI for every app in the workspace. Currently holds the colour-theme model.

- `ColorTheme`, `ThemeColor`, `ColorRole` — the five-role theme every outlet defines (`primary`, `ink`, `paper`, `secondary`, `tint`).
- `STUDIOHOUSE_THEME` — the product theme worn by the CMS shell (includes status colours and fonts).
- `DEMO_BRAND_THEME` — an example brand theme; real brand themes live in the database.
- `[shBrandTheme]="theme"` — scopes a brand theme to one element and its descendants.
- `provideColorTheme(theme)` — applies a theme at bootstrap; `ColorThemeService.set(theme)` switches it at runtime.
- `src/lib/theme/theme.css` — maps the `--brand-*` variables onto the Spartan/shadcn tokens and exposes `brand-*` Tailwind colours. Import it from each app's `styles.css`.

Spartan helm primitives live in the sibling `ui-helm` project and are imported as `@spartan-ng/helm/<primitive>`. Add more with:

```bash
npx nx g @spartan-ng/cli:ui --name=<primitive> --directory=packages/shared/ui-helm --tags=scope:shared,type:ui --no-interactive
```
