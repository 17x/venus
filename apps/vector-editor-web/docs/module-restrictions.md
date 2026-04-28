# Vector Module Restrictions

This document applies engine-style ownership and one-way dependency governance to
`apps/vector-editor-web/src`, adapted to current module split and usage.

## Scope

- Product shell and composition stay in app-level modules.
- Runtime mechanism remains React-free and independent from app/product/views/ui.
- UI primitives remain presentation-oriented and layer-independent.

## Ownership Layers

- `runtime/`: framework-agnostic runtime mechanism.
- `ui/`: reusable UI primitives and tokens.
- `views/`: composed view surfaces.
- `product/`: product hooks and intent-to-runtime bridge.
- `app/`: top-level shell/bootstrap.
- `assets|i18n|testing`: support modules.

## Dependency Rules

- Enforced:
  - `runtime` must not import `app|product|views|ui|testing`.
  - `ui` must not import `app|product|views|runtime|testing`.
  - `views` must not import `app`.
  - `product` must not import `app`.
  - `app` must not import `product`.

## Runtime Purity

- Runtime modules must stay React-free.
- Runtime modules must not import app contexts or hook-owned helpers.
- Runtime-local implementation modules must not import `@vector/runtime` facade back.

## Runtime Primitive Alignment (Mandatory)

- Runtime interaction/overlay/cursor/shortcut/event handling must map to
  `@venus/editor-primitive` module definitions first.
- Local runtime modules may adapt primitive contracts, but must not create
  independent abstraction tracks that duplicate primitive ownership.
- Runtime modules must not define class-based abstraction layers for primitive
  concerns; prefer pure functions + explicit state contracts.
- Exception process:
  - AI-TEMP: when a required capability is missing in `@venus/editor-primitive`,
    local extension is allowed only with an `AI-TEMP:` comment that explains why,
    removal condition, and reference doc/task.
  - The temporary extension must be documented in current work notes and removed
    once primitive coverage is available.

## Validation

- `pnpm --filter @venus/vector-editor-web lint`
- `pnpm --filter @venus/vector-editor-web exec tsc -p tsconfig.app.json --noEmit`
- Root lint/typecheck gates must remain green.

## Executable Governance Gates

- Runtime one-way dependency governance is checked by
  `scripts/module-governance-check.mjs --scope vector`.
- Vector full-src one-way governance is checked by the same command and covers
  `runtime|ui|views|product|app` layer directions.
- Runtime class-abstraction governance is checked by the same command and
  forbids local class declarations in runtime modules.
- Runtime folder governance is checked by validating runtime top-level module
  ownership folders against the approved module set.
- Stem-family folder governance is checked by validating same-stem file
  families (except `index`) against `<stem>/<stem>.ts` placement, with
  explicit AI-TEMP exception ledger for legacy families.
- File-size governance is checked in root scope:
  - soft threshold: 400 lines (warning)
  - hard threshold: 500 lines (error unless explicitly allowlisted)
- Vector-scope lint also runs vector file-size governance for `src/**` with
  explicit AI-TEMP exception ledgers for remaining legacy large files.
- Same-stem family governance is tracked through module ownership docs and
  ongoing refactors; new module surfaces must follow stem-folder conventions.
- Governance tests:
  - `node --test ./scripts/module-governance-check.test.mjs`
