# Vector UI Compatibility Layer

The shared source of truth lives in `packages/ui/src/vector/`.
This folder is a thin re-export layer: `index.ts` re-exports `@venus/ui/vector`.

## Structure

- `index.ts` — re-exports all components, theme, and utilities from `@venus/ui/vector`.
  Prefer this entry for app-wide UI imports: `from '../../ui'` or `from '../../ui/index.ts'`.

## Conventions

- Keep visual constants in `packages/ui/src/vector/foundation/tokens.css`; avoid hardcoded colors in feature components.
- Keep Tailwind utility usage focused on layout/structure; route semantic colors and typography through CSS variables.
- Borders and shadows are opt-in at call sites; shared primitives should default to borderless and shadowless surfaces.
- `useTheme()` exposes both mode state and the resolved theme palette (`primary`, `secondary`, `tertiary` / `thirdly`, hover colors).
- Put feature-composed components under feature folders (`src/components/*`) and consume `src/ui` exports.

## Primitive Source Of Truth

- Canonical shared files live in `packages/ui/src/vector/*`.
- `src/ui/index.ts` is the compatibility/export layer and re-exports `@venus/ui/vector`.
- When introducing or updating primitives, run shadcn CLI first, then apply minimal compatibility patches.
- Semantic surfaces such as menu/context-menu/tabs/input-group must use the generated shadcn primitives (`dropdown-menu`, `context-menu`, `tabs`, `input-group`) via `src/ui` exports.
