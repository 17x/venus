# Matrix Compatibility Invariants

Use this file as the package-level invariant reference while runtime storage
remains decomposed (`x/y/width/height/rotation/flipX/flipY`) and matrix math is
incrementally centralized.

## Vector Model (`@vector/model`)

- Owns canonical shared transform compatibility helpers:
  - normalized bounds (`getNormalizedBoundsFromBox`)
  - resolved transform contract (`resolveNodeTransform`)
  - transform records (`ShapeTransformRecord`, batch command/item contracts)
  - inverse-affine local projection (`isPointInsideRotatedBounds`)
- New transform-sensitive runtime logic should prefer vector model helpers
  over package-local trig/rotate/flip math.
- Shared SVG/CSS rotate/flip transform string assembly belongs here.

## `@venus/runtime` + `@venus/runtime/interaction` + app-local runtime bridge

- `@venus/runtime` acts as the framework-agnostic app/runtime bridge.
- `@venus/runtime/interaction` owns transform session, handle geometry,
  preview map, and commit payload shaping so they are not copied in app layers.
- React adapter ownership lives in app-local runtime bridge files.
- Interaction paths must consume vector model transform compatibility
  helpers rather than re-deriving center/bounds/matrix ad hoc.
- `shape.transform.batch` command payload construction is shared through
  `createTransformBatchCommand`.
- Viewport world/screen projection should route through shared matrix helpers.

## `@venus/runtime/worker`

- Worker remains command/history/collaboration authority.
- Worker protocol and command parsing should consume shared transform contracts
  from vector model helpers where available.
- Local and collaboration paths must derive equivalent transform-history patches
  from one shared worker helper path.
- Runtime mutation remains decomposed for now; matrix-first node storage is not
  yet active.

## Canvas2D Renderer (app bridge + `@venus/engine`)

- Renderer consumes resolved transform compatibility state from
  `document-core`; it should not become an alternate source of transform truth.
- Shape draw transforms and preview overlays should align with the same
  resolved center/rotation/flip interpretation used by interaction/hit-test.

## `@venus/runtime/shared-memory`

- Shared-memory scene geometry currently stores decomposed scalar fields.
- Bounds/hit/indexing logic should normalize box semantics consistently when
  width/height signs can vary.
- Snapshot/stat reads remain transport-oriented; transform interpretation
  belongs in shared runtime/document helpers.

## Cross-Package Rules

- File-format remains canonical persisted semantics (`node + feature` model).
- Runtime adapter shape (`DocumentNode`) remains compatibility-focused until an
  explicit matrix-first runtime-model RFC is approved.
- Any matrix-internals migration slice must keep app, worker, overlay, and
  renderer behavior aligned for:
  - rotated resize
  - group/multi signed-scale crossover flips
  - selection-box interior behavior
  - clip-preview + commit consistency
