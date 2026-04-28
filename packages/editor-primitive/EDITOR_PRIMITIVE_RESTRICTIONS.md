# Editor Primitive Restrictions

This document applies engine-style ownership and dependency governance to `@venus/editor-primitive`.

## Scope

- `@venus/editor-primitive` owns package-agnostic editor interaction primitives.
- It provides deterministic contracts for input normalization, gesture resolution,
  operation lifecycle, selection, targeting, and runtime event dispatch.
- It must not absorb product shell behavior.

## Module Ownership

- Primitive layers:
  - `input|pointer|keyboard|shortcut|gesture|tool|selection|target|policy|capture|cursor|hover|overlay|overlay-model|control|viewport|command|operation`
- Runtime orchestration layer:
  - `runtime`
- Entry layer:
  - `index.ts` barrel only.

## Dependency Rules

- Allowed:
  - Primitive modules depending on lower-level primitive modules.
  - `runtime` depending on primitive modules.
- Forbidden:
  - Primitive modules importing `runtime` modules.
  - Any dependency on `@venus/engine`.
  - Any dependency on `@vector/*` app/product modules.
  - Any dependency on React (`react`, `react/*`).

## API Rules

- Keep contracts package-agnostic and runtime/pure where possible.
- Keep `runtime` as orchestration-only, not UI ownership.
- Keep top-level exports stable and explicit.

## Validation

- `pnpm --filter @venus/editor-primitive test`
- `pnpm --filter @venus/editor-primitive typecheck`
- Root lint/typecheck gates must remain green.

## Executable Governance

- Module folder governance is checked against
  `packages/editor-primitive/package.json` export subpaths by
  `scripts/module-governance-check.mjs --scope primitive`.
