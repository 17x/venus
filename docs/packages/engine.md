# `@venus/engine`

Package-scoped note for the framework-agnostic Venus rendering engine layer.

## Stable Knowledge

- Owns renderer-facing engine contracts and frame-time primitives.
- Owns backend-agnostic render models for text, text runs, image, and clipping.
- Must stay independent from app frameworks and editor command policy.

## Recent Updates

### 2026-04-12

- Added high-level engine facade API in
  `packages/engine/src/runtime/createEngine.ts`:
  `createEngine(...)` now provides a default-first integration surface
  (`loadScene`, `applyScenePatchBatch`, `transaction`, `renderFrame`,
  `start/stop`, `hitTest/query`, viewport controls, and diagnostics) while
  keeping advanced tuning grouped under optional config
  (`performance`, `render`, `resource`, `debug`).
- The new facade keeps write-path constraints explicit for large scenes:
  public mutation flow is batch-first (`applyScenePatchBatch` / `transaction`)
  so external callers avoid high-frequency single-node mutation patterns.
- `createEngine(...)` render defaults now follow a clarity-first policy:
  Canvas2D uses high-DPI backing-store sizing (`pixelRatio: auto`,
  `maxPixelRatio: 2`) and high-quality image smoothing, while WebGL context
  creation now requests antialias by default.
- Added runtime DPR control on engine facade:
  `engine.setDpr(number | 'auto', {maxDpr?})` allows dynamic clarity/perf
  switching without recreating the engine instance.
- Added built-in `createWebGLEngineRenderer(...)` in
  `packages/engine/src/renderer/webgl.ts` and exported it from
  `@venus/engine` root. Current implementation intentionally reuses the shared
  `prepareEngineRenderPlan(...)` + `prepareEngineRenderInstanceView(...)`
  front-half pipeline and performs a minimal clear commit, so upcoming WebGL
  draw-program work can focus on upload/commit without duplicating traversal.
- Reduced Canvas2D hot-path overhead in
  `packages/engine/src/renderer/canvas2d.ts`: clip-by-node-id now resolves
  against prepared `worldBoundsById` directly, removing per-frame full-scene
  node-id index construction.
- Added generic shape render-node support in `@venus/engine`:
  `EngineShapeNode` (`type: 'shape'`, `shape: rect/ellipse/line`) is now part
  of the scene contract, and scene buffer/index/hit-test/render-plan/canvas2d
  paths all understand this node kind.
- Extended `EngineShapeNode` geometry support with `polygon` and `path`
  branches. Canvas2D renderer now consumes point/bezier geometry for these node
  kinds, and app adapters map document `points` / `bezierPoints` into engine
  scene nodes with computed bounds so non-rect vector primitives render
  correctly.
- `EngineShapeNode` rectangle rendering now supports document-model corner
  radius semantics (`cornerRadius` and per-corner `cornerRadii`). Runtime
  preset scene adapters pass these fields through, and Canvas2D rect drawing
  uses normalized corner radii (including edge-overflow clamping) so document
  rounded-rectangle data no longer degrades to sharp-corner boxes.
- Canvas2D shape rendering now also covers more document-model semantics on the
  engine side:
  ellipse arc drawing (`ellipseStartAngle`/`ellipseEndAngle`), open-path
  arrowhead caps (`triangle`/`diamond`/`circle`/`bar`), and per-shape shadow
  style.
- Clip behavior now supports clip-rule forwarding and shape-aware clip-node
  resolution: when a node references `clipNodeId`, Canvas2D prefers rebuilding
  the referenced shape path under its world transform instead of clipping only
  by axis-aligned bounds.
- `apps/vector-editor-web` and `apps/playground` local canvas adapters now
  render through `createEngine(...)` instead of custom per-app draw loops.
  Their document/snapshot data is adapted into engine scene nodes (image/text +
  shape fallback), so both app surfaces now share the engine render entry.

### 2026-04-10

- Added the initial `packages/engine` package and baseline API families:
  renderer contracts, scene node contracts (`text`, `text run`, clipped
  `image`), system engine clock, and lightweight animation controller.
- Runtime time/animation exports now forward to `@venus/engine` so existing
  `@venus/runtime` consumers can adopt engine APIs incrementally.
- Added standalone usability primitives:
  `createCanvas2DEngineRenderer` and `createEngineLoop`, so engine can now run
  a scene/viewport render loop without requiring `@venus/runtime/react`.
- Extended `createEngineLoop` with a frame-level `beforeRender(frame)` hook so
  animation controllers or other frame-driven state can tick inside one shared
  engine loop boundary.
- Added a standalone `@venus/engine` demo block in `apps/playground` `Engine`
  tab (canvas2d backend live path + webgl reserved entry), demonstrating
  independent usage of engine scene contracts, frame clock, animation
  controller, and loop APIs without `@venus/runtime/react`.
- Added built-in engine worker capability detection and fallback mode
  resolution (`main-thread`, `worker-postmessage`,
  `worker-shared-memory`) so runtime/app layers can reuse one policy from the
  same package.

### 2026-04-11

- Added reusable scene-core mechanisms into `@venus/engine`:
  - `EngineScenePatch` + mutable scene state helpers
  - scene patch apply helper
  - flattened-node helpers
  - scene point hit-test helper
- Added built-in worker transport/bridge orchestration internals in
  `@venus/engine`:
  `createEngineWorkerBridge(...)` and `bindEngineWorkerScope(...)`.
- Narrowed the root public API of `@venus/engine` to reduce integration
  complexity: worker bridge/protocol internals are no longer exported from
  `@venus/engine` root, while `resolveEngineWorkerMode(...)` remains the
  stable fallback policy entry for runtime/app layers.
- Updated package README with a standalone "minimal integration" path
  (scene -> renderer -> clock -> loop) and explicit worker fallback guidance.
- Upgraded engine scene hit-test and Canvas2D culling to matrix-first behavior:
  both now resolve node checks against composed world transforms (including
  parent-group transforms) instead of relying on axis-aligned local bounds only.
- Added shared render-plan preparation in
  `packages/engine/src/renderer/plan.ts`:
  `prepareEngineRenderPlan(...)` now centralizes matrix-aware node preparation,
  culling decisions, draw-list generation, and bucket metadata so Canvas2D and
  future WebGL backends can share optimization logic before backend-specific
  commit.
- Added built-in coarse spatial index primitives in
  `packages/engine/src/spatial/index.ts`
  (`createEngineSpatialIndex`, `EngineSpatialIndex`, `EngineSpatialItem`).
  Worker/runtime consumers now use this engine-owned mechanism instead of the
  old standalone `@venus/spatial-index` package.
- Moved reusable interaction mechanisms into engine-owned APIs so runtime/app
  layers can consume them directly:
  - marquee state/bounds/selection helpers in
    `packages/engine/src/interaction/marquee.ts`
  - selection handle generation/picking in
    `packages/engine/src/interaction/selectionHandles.ts`
  - move snapping solver in `packages/engine/src/interaction/snapping.ts`
    Runtime-interaction now acts as a compatibility/adapter layer for these
    engine mechanisms instead of hosting duplicate implementations.
- Viewport core state mechanisms now live in
  `packages/engine/src/interaction/viewport.ts`
  (`resolve/pan/resize/zoom/fit + clamping + default viewport state`) so
  runtime/runtime-interaction can reuse one matrix-first viewport state owner.
- Zoom wheel/session core mechanisms now live in
  `packages/engine/src/interaction/zoom.ts`
  (`handle/reset/normalize/session accumulate + settle policy`) with
  browser-agnostic delta-mode constants, while runtime-interaction keeps
  device-feel policy (for example discrete mouse-wheel preset snapping).
- Engine scene mutation now has an explicit batch-first direction:
  `packages/engine/src/scene/patch.ts` exports
  `EngineScenePatchBatch`, `EngineScenePatchApplyResult`, and
  `applyEngineScenePatchBatch(...)`, while mutable scene state now keeps an
  incrementally maintained `nodeMap` and coarse `spatialIndex`.
- Added `createEngineSceneStore(...)` in
  `packages/engine/src/scene/store.ts` as the engine-owned scene-state entry.
  Runtime layers can now initialize engine from a full scene snapshot and then
  drive later CRUD through `applyScenePatchBatch(...)` or `transaction(...)`
  without directly owning engine buffers/indexes.
- `createEngineSceneStore(...)` now also keeps a stable render snapshot plus a
  first-pass buffer-backed layout skeleton
  (`packages/engine/src/scene/buffer.ts`: ids, kind codes, parent indices,
  dirty flags, bounds, transform, order). This layout is still a baseline
  skeleton, but it establishes engine-owned storage that future Canvas2D/WebGL
  renderers can consume without moving buffer ownership back into runtime.
- Scene-store sync now prefers incremental buffer updates when patches are
  non-structural: dirty node ids and removed ids from
  `EngineScenePatchApplyResult` drive `syncEngineSceneBufferLayout(...)`, while
  structure changes still fall back to a safe full rewrite.
- Worker bridge mutation APIs now prefer batched writes:
  `createEngineWorkerBridge(...)` exposes
  `applyScenePatchBatch(...)` and `transaction(...)` so callers can merge many
  small scene edits before crossing the main-thread/worker boundary. The older
  single-patch path remains as a compatibility wrapper around batch apply.
- Engine worker bridge and worker scope now both use `createEngineSceneStore()`
  as their internal scene owner instead of keeping separate mutable-scene logic.
- Render-plan caching now prefers scene-store metadata versioning
  (`scene.metadata.planVersion`) over raw `scene.revision` so future
  incremental plan invalidation can hang off engine-owned dirty/version data.
- Scene snapshots now carry a typed `metadata.bufferLayout` reference and
  Canvas2D renderer cache invalidation now reads `scene.metadata.bufferVersion`
  instead of treating raw scene revision as the only render-facing invalidation
  signal.
- `prepareEngineRenderPlan(...)` now has a buffer-backed fast path:
  it prefers `scene.metadata.bufferLayout` (`parentIndices`, `transform`,
  `bounds`, `order`) to build prepared nodes/culling/draw order, and falls back
  to object-tree traversal when buffer and scene snapshot drift. This keeps the
  current path safe while moving render planning toward engine-owned storage.
- Canvas2D draw path now also reads local geometry from `bufferLayout.bounds`
  when available (text/image draw origin and extents), so renderer-side object
  field reads are reduced on the hot draw loop while preserving fallback logic.
- Added `prepareEngineRenderInstanceView(...)` in
  `packages/engine/src/renderer/instances.ts` as a backend-agnostic instance
  view builder (indices/transforms/bounds/batches). This provides a shared
  typed-array bridge for future WebGL upload paths.
