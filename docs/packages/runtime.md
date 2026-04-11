# `@venus/runtime`

Package-scoped note for the framework-agnostic Venus runtime core.

## Stable Knowledge

- Owns worker bridge, runtime lifecycle, viewport state/math, and extensibility
  contracts.
- Must remain framework-agnostic.
- Do not move React hooks, components, or opinionated presets into this
  package.

## Recent Updates

### 2026-04-10

- Added the initial `packages/runtime` split from the old shared runtime
  implementation and made it the new home for shared runtime core code.
- Runtime time and animation exports now forward to `@venus/engine`
  (`createSystemRuntimeClock`, `createAnimationController`) so runtime remains
  a stable bridge surface while engine mechanism ownership moves into the new
  dedicated engine package.

### 2026-04-11

- Consolidated worker contracts/entrypoints into the runtime package at
  `packages/runtime/src/worker` and added `@venus/runtime/worker` as the
  public worker subpath. The standalone `packages/editor-worker` package was
  removed.

- Added unified runtime namespace alias entries for `@venus/runtime`
  subpaths: `@venus/runtime/interaction`, `@venus/runtime/react`, and
  `@venus/runtime/presets` (plus `@venus/runtime/presets/*`).
  This keeps physical package boundaries (`runtime-*`) while giving app code a
  single logical import namespace.

- Moved viewport gesture collection/dispatch ownership out of runtime core into
  `@venus/runtime/interaction` (`bindViewportGestures(...)`), keeping runtime
  focused on viewport state transitions (`zoomViewportState`, `panViewportState`)
  and controller orchestration.
- Runtime viewport matrix helper now forwards `Mat3`/`Point2D`/`applyMatrixToPoint`
  from `@venus/engine` so matrix primitives have one mechanism owner.
- Runtime viewport controller (`viewport/controller.ts`) and zoom core
  (`zoom/index.ts`) now forward to engine-owned interaction mechanisms
  (`@venus/engine` viewport + zoom modules) as compatibility bridges, so
  existing runtime import surfaces stay stable while ownership moves to engine.
