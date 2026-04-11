# `@venus/editor-worker`

Package-scoped notes for worker command execution, history, collaboration, and
runtime hit-testing.

## Stable Knowledge

- Worker owns document mutation, command execution, selection updates, and
  runtime-oriented hit-testing.
- Keep React/app layers out of worker concerns unless the change is purely
  orchestration.

## Recent Updates

### 2026-04-09

- Path bounds precedence now prefers authored `bezierPoints` over raw `points`
  when runtime bounds are re-derived after transforms.

- Transform batch persistence now preserves `flipX` / `flipY` through command,
  history, and collaboration payloads.

- Worker hit-testing now consumes shared `document-core` stroke/fill hit rules.

- Worker spatial-index item creation and derived group-bounds fallback now use
  `document-core` normalized box helpers, keeping worker-side coarse bounds
  aligned with the shared transform compatibility path.

- Worker protocol `shape.transform.batch` payloads now use the shared
  `document-core` `ShapeTransformRecord` contract instead of a worker-local
  inline transform object shape.

- Worker protocol now also consumes shared `document-core`
  `ShapeTransformBatchCommand` for `shape.transform.batch`, aligning command
  typing with shared runtime command builders and app dispatch payloads.

- Worker `shape.transform.batch` patch derivation is now centralized through a
  shared transform-patch helper for both local command history entry creation
  and collaboration operation patch mapping, reducing drift between those two
  execution paths.

- Runtime shape coarse-bounds resolution now normalizes path/bezier bounds
  through the same normalized-box helper path before scene/spatial writes,
  reducing one more transform-sign drift edge in worker-side indexing.

- Worker move-patch ancestor gating now reuses one `shapeById` map per patch
  application cycle when checking moved group ancestors, reducing repeated
  hierarchy map rebuilds in nested group move paths.

### 2026-04-11

- Worker runtime coarse indexing now uses engine-owned spatial primitives
  (`createEngineSpatialIndex(...)` and `EngineSpatialItem` from
  `@venus/engine`) so worker hit-test indexing shares one mechanism surface
  with runtime interactions.
