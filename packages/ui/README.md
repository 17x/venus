# @venus/ui

Shared shadcn-based UI package for Venus apps.

## Entry Points

- `@venus/ui`: app-neutral shadcn controls, compact fields, theme helpers, and `cn`.
- `@venus/ui/vector`: vector-editor compatibility kit and Base UI shadcn primitives.
- `@venus/ui/globals.css`: app-neutral Tailwind v4 tokens.
- `@venus/ui/vector/styles.css`: vector editor Tailwind v4 tokens and semantic classes.

## Conventions

- Keep reusable primitives in `src/components/ui` or `src/vector/primitives`.
- Keep product-composed wrappers in `src/vector/kit`.
- Use semantic CSS variables and Tailwind utilities for layout only.
- Use `data-icon` on icons inside buttons and prefer `lucide-react`.
- Prefer `gap-*`, `size-*`, and `truncate` utilities over manual longhand classes.
- Add focused Node tests for pure utilities and compile-time coverage through `pnpm --filter @venus/ui typecheck`.
