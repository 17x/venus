# `@venus/runtime-interaction`

Package-scoped note for shared editor interaction algorithms.

## Stable Knowledge

- Owns framework-agnostic interaction logic such as marquee, snapping,
  selection handles, and transform session helpers.
- Keep product-specific tool behavior in app layers and keep framework glue in
  `runtime-react`.

## Recent Updates

### 2026-04-10

- Added the initial `packages/runtime-interaction` split so reusable editing
  behavior no longer lives under the runtime compatibility facade.

### 2026-04-11

- Snapping coarse-candidate lookup now uses engine-owned spatial index APIs
  (`createEngineSpatialIndex(...)` from `@venus/engine`) instead of the old
  standalone `@venus/spatial-index` package.
