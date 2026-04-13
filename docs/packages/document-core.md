# `@venus/document-core`

Package-scoped notes for runtime document types and shared geometry/transform
helpers.

## Stable Knowledge

- `DocumentNode` is still a flattened runtime adapter, not the canonical file
  model.
- Prefer putting reusable geometry and transform math here before duplicating
  logic in app, worker, or renderer packages.

## Recent Updates

### 2026-04-13

- Runtime scene ownership moved into `@venus/document-core`.
  `src/runtimeSceneTypes.ts` now defines the persisted JSON runtime scene
  contracts (`RuntimeSceneLatest` and related feature/node aliases), and
  `src/parseRuntimeScene.ts` now provides
  `parseRuntimeSceneToEditorDocument(...)`.
- `packages/file-format` was removed after active adapters and config surfaces
  were migrated to import parser/types from `@venus/document-core` directly.

### 2026-04-12

- Editor/runtime shape-transform and hit-test mechanisms are now engine-owned.
  `@venus/document-core` no longer exports shape-transform command/types or
  transform-session helpers.
- `src/shapeTransform.ts` was removed from document-core after callsites were
  migrated to `@venus/engine` interaction exports.
- `src/geometry.ts` remains the home for low-level reusable math primitives,
  including `getNormalizedBoundsFromBox(...)`, so non-engine packages can still
  use normalized bounds math without taking an engine dependency.

### 2026-04-09

- Bezier path bounds solve cubic derivative extrema in `src/geometry.ts` for
  exact curve MBR calculation.
