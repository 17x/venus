# `@venus/engine`

Package-scoped note for the framework-agnostic Venus rendering engine layer.

## Stable Knowledge

- Owns renderer-facing engine contracts and frame-time primitives.
- Owns backend-agnostic render models for text, text runs, image, and clipping.
- Must stay independent from app frameworks and editor command policy.

## Recent Updates

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
