# Vector UI Compatibility Layer

The shared source of truth now lives in `packages/ui`.
This folder remains as an app-local compatibility layer so existing imports from `src/ui` keep working while consuming `@venus/ui/vector`.

## Folders

- `foundation/`
  - `tokens.css`: design tokens (color, typography, spacing, radius, motion)
  - `semantic.css`: semantic utility/component classes built from tokens
  - `theme/themeProvider.tsx`: `light | dark | system` mode state and persistence
- `primitives/`
  - shadcn/base-ui generated primitive source files adapted for the vector app
- `kit/`
  - compatibility and product-facing wrappers exported through `src/ui`
- `index.ts`
  - re-exports `@venus/ui/vector`; prefer this entry for app-wide UI imports.

## Conventions

- Keep visual constants in `foundation/tokens.css`; avoid hardcoded colors in feature components.
- Keep Tailwind utility usage focused on layout/structure; route semantic colors and typography through CSS variables.
- Borders and shadows are opt-in at call sites; shared primitives should default to borderless and shadowless surfaces.
- `useTheme()` exposes both mode state and the resolved theme palette (`primary`, `secondary`, `tertiary` / `thirdly`, hover colors).
- Keep primitive source files in `primitives/`, then wrap or theme them from `kit/components/ui` when needed.
- Put feature-composed components under feature folders (`src/components/*`) and consume `src/ui` exports.

## Primitive Source Of Truth

- Vector UI primitives must be generated from shadcn Base UI.
- Canonical shared files live in `packages/ui/src/vector/*`.
- `src/ui/index.ts` is the compatibility/export layer and should re-export `@venus/ui/vector`.
- When introducing or updating primitives, run shadcn CLI first, then apply minimal compatibility patches.
- Semantic surfaces such as menu/context-menu/tabs/input-group must use the generated shadcn primitives (`dropdown-menu`, `context-menu`, `tabs`, `input-group`) via `src/ui` exports.
