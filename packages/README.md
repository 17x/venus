# Packages Workspace

Packages under `packages/*` are reusable implementation layers shared by apps.

## Responsibility Boundary

- Own reusable low-level libraries and package-level implementation surfaces.
- Keep product-specific UI policy and route-level orchestration in app layers.
- Keep cross-package APIs explicit at package roots.

## Current Packages

- `@venus/lib`: shared low-level primitives and common utility contracts.
- `@venus/editor-primitive`: package-agnostic interaction runtime primitives.
- `@venus/engine`: render, hit-test, geometry, and spatial mechanics.

## `@venus/lib` Module Coverage

- `math`, `geometry`, `ids`, `events`, `lifecycle`, `scheduler`
- `patch`, `collections`, `logger`, `worker`, `serialization`, `assert`, `viewport`

Each module is implemented under `packages/lib/src/<module>` and includes
`node:test` coverage in the same folder.

## `@venus/editor-primitive` Module Coverage

- `pointer`, `keyboard`, `shortcut`, `gesture`, `tool`, `operation`
- `target`, `command`, `selection`, `policy`, `hover`, `overlay`
- `cursor`, `viewport`, `capture`, `runtime`

Each module is implemented under `packages/editor-primitive/src/<module>` and
includes `node:test` coverage in the same folder.

## Usage Rules

- Apps compose package capabilities; packages do not import app modules.
- `@venus/editor-primitive` may depend on `@venus/lib` only.
- `@vector/runtime/interaction` should re-export package-owned primitives from `@venus/editor-primitive` before app-local compatibility adapters.
- `@venus/engine` must not depend on app-level product semantics.
- Public package APIs should evolve with backward-compatible intent whenever practical.
