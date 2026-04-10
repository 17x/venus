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
