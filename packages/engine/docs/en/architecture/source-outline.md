# Engine Source Outline

This document maps the current responsibilities, capabilities, and main call
paths under `packages/engine/src`. It is intended as a navigation aid for future
refactors and responsibility consolidation.

## Engine Positioning

`@venus/engine` is a mechanism layer, not a product layer.

- Inputs: scene snapshots, viewport state, interaction context, and performance
  policy.
- Outputs: rendered frames, hit-test results, candidate queries, and runtime
  diagnostics.
- Out of scope: product semantics, command history, collaboration protocols, and
  UI component state.

Core flow:

1. `runtime` owns state orchestration and render driving.
2. `scene` owns render-facing data, indexing, and candidate plans.
3. `renderer` selects WebGL or Canvas2D backends and emits frames. See
   `render-backends.md` for the WebGL-first, Canvas2D fallback, and
   Canvas2D-to-texture strategy.
4. `interaction` provides mechanism-level hit, snap, viewport, and transform
   calculations.

## Top-Level Source Map

### `runtime/`

Runtime orchestration. This domain wires scene, renderer, and interaction
mechanisms into an engine instance.

- `venus/Venus.ts` and base module services
  - Own document-tree structure APIs such as group, ungroup, child add/remove,
    parent-local layer order, clip/mask container indexing, and structure
    events.
  - Follow `tree-structure-operations.md` for selection normalization,
    tree-transaction, history, render invalidation, and Vector-validation
    boundaries.
- `createEngine.ts`
  - Public engine factory.
  - Combines render strategy, frame budget, prediction, shortlist, and layered
    bridge behavior.
  - Loads scenes, updates viewports, triggers rendering, reports stats, and
    exposes diagnostics.
- `createEngineLoop.ts`
  - Continuous and single-frame loop control.
- `renderScheduler.ts`
  - Frame coalescing, throttling, and priority scheduling.
- `createEngine/*`
  - `config.ts`: runtime option normalization.
  - `planning.ts`: frame and hit-plan assembly.
  - `strategy.ts`: interaction-phase strategy state.
  - `frameBudgetBroker.ts`: budget allocation.
  - `interactionPredictor.ts`: pan direction and velocity prediction.
  - `shortlist.ts`: candidate-set narrowing.
  - `layeredBridge.ts`: compatibility bridge for layered rendering.

### `renderer/`

Rendering backend and performance implementation domain.

- `webgl.ts`
  - Main WebGL backend entry point.
  - Runs plan -> packet -> texture/cache/tile -> composite.
  - Reports fallback reasons, LOD decisions, tile execution, snapshots, and
    overlay paths.
- `canvas2d.ts`
  - Canvas2D path and helpers for model-surface drawing, text, and clips.
- `plan.ts`, `instances.ts`, `webglPackets.ts`
  - Compile scene and frame data into backend plans and batch packets.
- `tileManager.ts`, `tileScheduler.ts`
  - Tile keys, zoom buckets, cache records, request queues, and scheduling.
- `zoomPerformance.ts`
  - Zoom strategy thresholds, bucket generation, and policy decisions.
- `webgl*`
  - `webglPipeline.ts`: GL pipeline basics.
  - `webglTextures.ts`: texture upload and cache behavior.
  - `webglTiles.ts`: tile composition and fallback.
  - `webglComposite.ts`: final composition and snapshot composition.
  - `webglInteractionPreview.ts`: reuse of interaction snapshots.
  - `webglResources.ts`: resource budgets.
  - `webglRuntimeHelpers.ts` and `webglSurfaceHelpers.ts`: path selection and
    backend helper utilities.
  - `webglSnapshotCapability.ts`, `webglTileCacheCapability.ts`,
    `webglTileQueueCapability.ts`, and `webglLodCapability.ts`: capability
    wrappers.
- `fallbackTaxonomy.ts`
  - Render fallback reason taxonomy and observability baseline.
- `initialRender.ts`
  - First-render stage control.
- `interactionPredictiveTiles.ts`
  - Prediction-driven tile preloading.

### `scene/`

Render-facing scene data, indexes, plans, patches, and geometry ownership.

- `types.ts`
  - Renderable node and scene contracts for shapes, text, images, and groups.
- `store.ts`
  - Scene storage and transactional updates.
- `patch.ts`
  - Incremental scene patch application.
- `buffer.ts`
  - Render buffer layout.
- `indexing.ts`
  - Scene index construction and synchronization.
- `worldBounds.ts`
  - Node world-bounds calculation.
- `framePlan.ts`
  - Frame candidate planning.
- `hitPlan.ts`
  - Hit candidate planning.
- `hitTest.ts`
  - Scene-level hit resolution.
- `scene/spatial/`
  - Spatial index implementation and query entry points.
- `scene/geometry/`
  - Bounds, path, bezier, and related geometry helpers.

### `interaction/`

Mechanism-level interaction algorithms. This domain avoids product semantics.

- `hitTest.ts`, `hitTolerance.ts`
  - Hit-testing and tolerance policy.
- `snapping.ts`
  - Movement snapping mechanisms.
- `viewport.ts`, `viewportPan.ts`, `zoom.ts`
  - Viewport updates, pan accumulation, and zoom sessions.
- `shapeTransform.ts`
  - Transform matrices and compatibility transform records.
- `geometryPayload.ts`
  - Geometry payloads for external interaction and overlay use.
- `overlayCanvas.ts`
  - Overlay drawing node contract and draw entry point.
- `lodProfile.ts`, `lodConfig.ts`, `lodTypes.ts`, `visibilityLod.ts`
  - Interactive LOD and visibility-budget policy.
- `interaction/hitTest/*`
  - Path, geometry, and matrix sub-capabilities.

### `core/`

Backend-neutral layered rendering protocols and shared mechanisms.

- `types.ts`: layered input/output contracts.
- `compose.ts`: base, active, and overlay composition rules.
- `render.ts`: layered render execution.
- `core/camera/*`: projection and unprojection contracts.
- `core/hit/*`: active/base layered hit priority.
- `core/cache/*`: geometry cache and layered tile cache contracts.

### `renderer/layers/*` and Compatibility Forwarders

The renderer domain owns backend execution and render planning. Backend-neutral
camera, hit, and cache mechanisms belong under `core/*`. `renderer/camera`,
`renderer/hit`, and `renderer/cache` are compatibility forwarders only.

- `renderer/layers/base/*`: base-layer generation, clipping, and base cache.
- `renderer/layers/active/*`: active layer and preview transforms.
- `renderer/layers/overlay/*`: hover and selection overlay command layout.
- `renderer/camera/*`: compatibility forwards to `core/camera/*`.
- `renderer/hit/*`: compatibility forwards to `core/hit/*`.
- `renderer/cache/*`: compatibility forwards to `core/cache/*`.

### Supporting Domains

- `math/`: matrices and point transforms.
- `animation/`: animation controller and easing.
- `time/`: clock abstraction.
- `utils/`: assertions and small utilities.
- `worker/`: worker capability switches and compatibility boundaries.
- `bench/`: performance benchmark scenes and runners.

### `index.ts` and `index.d.ts`

The package entrypoints define the public contract. They should expose stable
engine APIs while keeping internal renderer/backend details private.

## Main Logic Paths

### Render Path

1. `runtime` creates a frame context with viewport, quality, budget, and
   interaction phase.
2. `renderer` reads the frame plan and shortlist candidates.
3. The WebGL path executes packets, tiles, snapshots, composition, and overlays.
4. Runtime receives fallback taxonomy and performance statistics.

### Hit and Query Path

1. `scene/spatial` returns coarse candidates.
2. `scene/hitPlan` or `interaction/hitTest` refines the result.
3. `runtime` maps mechanism hits into caller-level behavior.

### Interaction and Viewport Path

1. `interaction` owns zoom, pan, transform math, and session state.
2. Runtime strategy chooses interactive or settled behavior.
3. Frame budgeting and prediction drive tile scheduling and upload budgets.

## Current Structure Assessment

The latest consolidation leaves one main track for each responsibility:

1. Layered protocols, camera, layered hit, and cache live in backend-neutral
   `core/*`.
2. Spatial indexing and geometry mechanisms live in `scene/*`.
3. Renderer owns backend execution, render plans, and compatibility forwarding.
4. Public exports and core call paths use the consolidated directories.

The main ongoing risk is new behavior bypassing these ownership boundaries.
Future work should keep each responsibility on one implementation track.

## Responsibility Boundaries

Use these boundaries when adding or moving engine features:

1. `runtime`: orchestration and state machines.
2. `scene`: render-facing data, indexes, and candidate plans.
3. `core`: backend-neutral layered protocols, cache, camera, and layered hit.
4. `renderer`: backend execution and performance mechanisms.
5. `interaction`: mechanism algorithms such as hit, snap, viewport, transform.
6. `math`, `time`, `animation`, `utils`: infrastructure.
7. `worker`, `bench`: environment support and validation.

Keep one primary implementation track per responsibility domain.

## How To Use This Document

1. Before adding a feature, decide which domain owns it.
2. When fixing a bug, follow the main logic path before applying cross-domain
   patches.
3. During consolidation, remove duplicate tracks first, then update the public
   export surface.
