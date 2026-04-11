# `@venus/runtime`

Package-scoped note for the framework-agnostic Venus runtime core.

## Stable Knowledge

- Owns worker bridge, runtime lifecycle, viewport state/math, gesture
  plumbing, and extensibility contracts.
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
