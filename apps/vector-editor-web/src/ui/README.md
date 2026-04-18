# Vector UI Structure

This app owns its UI stack under `src/ui`.

## Folders

- `foundation/`
  - `tokens.css`: design tokens (color, typography, spacing, radius, motion)
  - `semantic.css`: semantic utility/component classes built from tokens
  - `theme/themeProvider.tsx`: `light | dark | system` mode state and persistence
- `kit/`
  - reusable primitives (`Button`, `Input`, `Select`, `Tooltip`, `Modal`, etc.)
- `index.ts`
  - single export entry for app-wide UI imports (`@vector/ui` alias)

## Conventions

- Keep visual constants in `foundation/tokens.css`; avoid hardcoded colors in feature components.
- Keep Tailwind utility usage focused on layout/structure; route semantic colors and typography through CSS variables.
- Put primitive controls in `kit/components/ui`.
- Put feature-composed components under feature folders (`src/components/*`) and consume `@vector/ui` exports.

## Primitive Source Of Truth

- Vector UI primitives must be generated from shadcn base UI.
- Canonical generated files live in `src/components/ui/*`.
- `src/ui/kit/components/ui/*` is the compatibility/export layer for `@vector/ui` and should wrap generated primitives instead of re-implementing them.
- When introducing or updating primitives, run shadcn CLI first, then apply minimal compatibility patches.
- Semantic surfaces such as menu/context-menu/tabs/input-group must use the generated shadcn primitives (`dropdown-menu`, `context-menu`, `tabs`, `input-group`) via `@vector/ui` exports.
- Cross-reference settings in `docs/apps-vector.md`.
