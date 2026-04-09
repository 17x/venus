# `@venus/canvas-base`

Package-scoped notes for shared canvas runtime, viewport, and interaction
infrastructure.

## Stable Knowledge

- `canvas-base` is the bridge layer between app shells and worker/renderer
  packages.
- Keep product-specific UI behavior in app layers; keep reusable interaction,
  viewport, overlay, and runtime controller behavior here.

## Recent Updates

### 2026-04-09

- Shared resize logic now handles rotated single-shape resize in local shape
  space and uses signed scaling for multi/group resize crossover behavior.

- Shared drag/hover hit-testing now relies on `document-core` stroke/fill hit
  helpers instead of selection or document bounds.

- `interaction/transformSessionManager.ts` now uses shared affine helpers from
  `document-core` for rotated move/resize math instead of package-local
  rotate-around-point helpers. This is part of the matrix-internals migration
  and keeps transform-session math aligned with shared hit-test and renderer
  transform composition.

- `react/CanvasSelectionOverlay.tsx` now uses shared affine helpers for handle
  placement and rotated selection polygon projection instead of local trig
  helpers, reducing one more package-local transform implementation.

- Active transform-session call sites in app shells now derive shape centers
  and flip/rotation state through `document-core` `resolveNodeTransform`
  before entering `canvas-base`, reducing one more source of duplicated
  decomposed box math while the runtime node model is still migrating.

- `interaction/selectionDragController.ts` now uses the shared
  `document-core` normalized box helper when arming drag-session bounds, so the
  drag-selection runtime path no longer carries its own local box
  normalization logic.

- `react/CanvasSelectionOverlay.tsx` now resolves overlay bounds and selected
  shape transform projection through shared `document-core` helpers
  (`getNormalizedBoundsFromBox` and `resolveNodeTransform`) instead of its own
  local normalization/center math.

- Shared marquee bounds normalization now also delegates to the
  `document-core` normalized box helper, so selection-box bounds match the same
  box semantics used elsewhere in the active runtime path.

- `interaction/transformSessionManager.ts` now exports
  `createTransformSessionShape` and `createTransformPreviewShape`, so app
  shells can hand document/runtime shapes to `canvas-base` through one shared
  transform-boundary contract instead of rebuilding session/preview payloads
  locally.

- `interaction/transformSessionManager.ts` now also exports
  `buildTransformBatch`, so preview-to-command transform commit payloads are
  derived in one shared place before dispatching `shape.transform.batch`.

- `canvas-base` transform session, preview, and batch item contracts now build
  on `document-core` `ShapeTransformRecord` instead of repeating inline
  `x/y/width/height/rotation/flip` payload types.

- Transform session shapes now build on
  `document-core` `ResolvedShapeTransformRecord`, so shared interaction code
  receives derived center/bounds/matrix data directly from the boundary
  contract instead of reconstructing it internally.

- Rotated single-shape resize now consumes `ResolvedShapeTransformRecord`
  `matrix`/`inverseMatrix` directly in transform-session math, so pointer
  projection and center reprojection follow the same canonical transform record
  without re-deriving ad-hoc inverse/forward matrices per update.

- Multi-shape resize now also uses `ResolvedShapeTransformRecord.bounds` for
  per-shape edge mapping during signed-scale resize, reducing one more raw
  `x + width` / `y + height` derivation path inside transform-session math.

- `react/useTransformPreviewCommitState.ts` now normalizes both document and
  preview shapes through `document-core` `createShapeTransformRecord` before
  sync checks, removing one more manual `rotation/flip` defaulting path at a
  package boundary.

- `interaction/transformSessionManager.ts` now exports
  `createTransformBatchCommand`, allowing app shells to dispatch the shared
  transform-batch command contract directly instead of manually composing
  `{type: 'shape.transform.batch', transforms}` at each app entrypoint.

- `viewport/matrix.ts` `applyMatrixToPoint` is now exported from the package
  entrypoint and consumed by both shared and app selection overlays plus vector
  runtime pointer projection and viewport zoom-anchor world-point resolution,
  and runtime-playground marquee overlay projection, reducing duplicated
  viewport matrix projection formulas across package boundaries.

- `interaction/selectionHandles.ts` now centralizes rotated selection handle
  layout and handle pick-distance hit tests (`buildSelectionHandlesFromBounds`
  and `pickSelectionHandleAtPoint`). Vector runtime, runtime-playground, and
  shared overlay paths now consume this shared handle geometry contract instead
  of carrying parallel local handle math.

- `interaction/transformTargets.ts` now centralizes group-aware resize target
  expansion (`collectResizeTransformTargets`) so vector and runtime-playground
  no longer duplicate leaf-descendant target collection logic for
  multi-selection/group resize sessions.

- Resize target collection now skips shapes that have any selected ancestor
  (not only direct-parent checks), tightening nested group/child selection
  edge behavior for mixed hierarchy selections.

- `interaction/transformPreview.ts` now centralizes group-aware preview map
  expansion and preview-geometry-to-shape remap
  (`buildGroupAwareTransformPreviewMap` and
  `applyTransformPreviewGeometryToShape`). Vector and runtime-playground now
  consume this shared preview transform contract.

- `buildGroupAwareTransformPreviewMap` now also supports optional
  clip-bound image preview propagation (`includeClipBoundImagePreview` +
  `runtimeShapes`) so clipped image preview motion during transform sessions is
  centralized in `canvas-base` instead of app-local extensions.

- `interaction/transformPreview.ts` now also exports
  `resolveTransformPreviewRuntimeState`, so app surfaces can derive
  preview-map/preview-document/preview-shapes from one shared computation
  rather than duplicating preview projection and mapping passes locally.
