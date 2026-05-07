# Lib Restrictions

This document applies engine-style governance to `@venus/lib` based on its package role.

## Scope

- `@venus/lib` is the foundational layer for shared primitives.
- It must stay framework-agnostic and product-agnostic.
- It must not absorb engine runtime/rendering policy or app semantics.

## Ownership

- `math|geometry|ids|events|lifecycle|scheduler|patch|collections|logger|worker|serialization|assert|viewport`
  own reusable primitives only.
- `index.ts` is the package entrypoint barrel and must not add behavior.

## Dependency Rules

- Allowed:
  - Internal low-level dependencies among primitive modules when needed.
  - `geometry -> math`, `viewport -> math` style primitive composition.
- Forbidden:
  - Any dependency on `@venus/engine`.
  - Any dependency on `@venus/editor-primitive`.
  - Any dependency on `@vector/*` app/product modules.
  - Any dependency on React (`react`, `react/*`).

## API Rules

- Export only stable primitive contracts and deterministic helpers.
- Avoid product/domain naming in public contracts.
- Keep package entrypoint exports explicit and responsibility-scoped.

## Validation

- `pnpm --filter @venus/lib test`
- `pnpm --filter @venus/lib typecheck:test`
- Root lint/typecheck gates must remain green.

## Executable Governance

- Lib module folder governance is checked against `packages/lib/package.json`
  export subpaths by `scripts/module-governance-check.mjs --scope lib`.
- Lib import-identification governance verifies that workspace imports use only
  exported subpaths (for example `@venus/lib/math`) and forbids deep source
  paths (for example `@venus/lib/src/*`).
