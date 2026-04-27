# Vector UI Structure

This app owns its UI stack under `src/ui`.

## Folders

- `foundation/`
  - `tokens.css`: design tokens (color, typography, spacing, radius, motion)
  - `semantic.css`: semantic utility/component classes built from tokens
  - `theme/themeProvider.tsx`: `light | dark | system` mode state and persistence
- `primitives/`
  - shadcn/base-ui generated primitive source files adapted for the vector app
- `kit/`
  - compatibility and product-facing wrappers exported through `@vector/ui`
- `index.ts`
  - single export entry for app-wide UI imports (`@vector/ui` alias)

## Conventions

- Keep visual constants in `foundation/tokens.css`; avoid hardcoded colors in feature components.
- Keep Tailwind utility usage focused on layout/structure; route semantic colors and typography through CSS variables.
- Borders and shadows are opt-in at call sites; shared primitives should default to borderless and shadowless surfaces.
- `useTheme()` exposes both mode state and the resolved theme palette (`primary`, `secondary`, `tertiary` / `thirdly`, hover colors).
- Keep primitive source files in `primitives/`, then wrap or theme them from `kit/components/ui` when needed.
- Put feature-composed components under feature folders (`src/components/*`) and consume `@vector/ui` exports.

## Primitive Source Of Truth

- Vector UI primitives must be generated from shadcn base UI.
- Canonical generated files live in `src/ui/primitives/*`.
- `src/ui/kit/components/ui/*` is the compatibility/export layer for `@vector/ui` and should wrap `src/ui/primitives/*` instead of re-implementing them.
- When introducing or updating primitives, run shadcn CLI first, then apply minimal compatibility patches.
- Semantic surfaces such as menu/context-menu/tabs/input-group must use the generated shadcn primitives (`dropdown-menu`, `context-menu`, `tabs`, `input-group`) via `@vector/ui` exports.
