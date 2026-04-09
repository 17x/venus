# `@venus/document-core`

Package-scoped notes for runtime document types, geometry helpers, and shared
hit-test behavior.

## Stable Knowledge

- `DocumentNode` is still a flattened runtime adapter, not the canonical file
  model.
- Prefer putting reusable geometry and transform math here before duplicating
  logic in app, worker, or renderer packages.

## Recent Updates

### 2026-04-09

- Bezier path bounds now solve cubic derivative extrema in
  `src/geometry.ts` for exact curve MBR calculation.

- `flipX` / `flipY` are first-class transform state in the active runtime path.

- Shared stroke/fill hit-testing now lives in `src/hitTest.ts`.

- Phase 1 matrix-internals work has started: shared affine helpers now live in
  `src/geometry.ts`, and inverse affine shape-local pointer resolution is used
  in hit-testing.

- The shared affine helpers are now consumed by both `renderer-canvas` and
  `canvas-base` transform-session math, so new transform-sensitive code should
  prefer them over local rotation/flip helpers.

- Vector app selection handle placement, rotated selection-box interior checks,
  and shared overlay polygon rotation now also consume the shared affine
  helpers. The current migration direction is to eliminate duplicated
  rotate-around-point math from app/shared interaction layers before changing
  the runtime node contract.

- `src/shapeTransform.ts` now exposes `resolveNodeTransform` and
  `getNormalizedBoundsFromBox` as the shared compatibility layer from
  decomposed runtime box fields into normalized bounds, center, affine matrix,
  and inverse matrix. New transform-sensitive runtime code should consume that
  contract instead of rebuilding center/flip/rotation state ad hoc.

- Shared overlay and selection-box consumers now also use the same normalized
  bounds / transform contract, so the migration path reaches through renderer,
  hit-test, transform sessions, drag arming, and selection chrome.

- App helper code that derives primitive construction centers or image overlay
  placement should also prefer normalized box and resolved transform helpers so
  negative-width/height compatibility stays consistent outside the worker.

- Mock/stress/demo shape generators and shared-memory bounds helpers now also
  consume normalized box helpers, reducing remaining transform-model drift in
  diagnostics and seeded sample content.

- `shapeTransform.ts` now also exports `ShapeTransformRecord` as the canonical
  cross-package decomposed transform payload shape (`x/y/width/height/rotation/
  flipX/flipY`) for runtime/session/protocol boundaries.

- `shapeTransform.ts` now also exports `ResolvedShapeTransformRecord`, which
  layers derived bounds, center, matrix, and inverseMatrix onto
  `ShapeTransformRecord` for boundary consumers that need both persisted-style
  fields and computed transform data together.

- `shapeTransform.ts` now also exports `ShapeTransformBatchItem` and
  `ShapeTransformBatchCommand` so transform-batch command payloads can be typed
  from one shared source across app, canvas-base, and worker protocol layers.

- `shapeTransform.ts` now also exports `isPointInsideRotatedBounds`, a shared
  inverse-affine bounds containment helper for rotated selection-box interior
  checks. Vector and runtime-playground now consume this helper instead of
  carrying local duplicated selection-box rotation math.

- `shapeTransform.ts` now also exports shared transform string formatters
  (`toResolvedNodeSvgTransform` and `toResolvedNodeCssTransform`) plus
  `hasResolvedNodeTransformEffect`, so overlay/renderer transform attribute
  assembly no longer duplicates rotate/flip string composition logic.

- `shapeTransform.ts` now also exports normalized bounds overlap/intersection
  helpers (`doNormalizedBoundsOverlap`, `intersectNormalizedBounds`) so worker
  runtime clipping/intersection and app-level overlap checks can share one
  strict area-overlap semantic.

- Phase-5 scaffold APIs now exist in `shapeTransform.ts`:
  `MatrixFirstNodeTransform`, `createMatrixFirstNodeTransform`, and
  `toLegacyShapeTransformRecord`. These support matrix-first runtime migration
  while legacy decomposed fields remain compatibility adapters.
