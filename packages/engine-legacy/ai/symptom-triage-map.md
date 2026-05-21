# Engine Symptom Triage Map

Purpose:

- Symptom-to-module routing map to reduce debug startup time.

## A) Blank Or Black Frame

Check order:

1. src/runtime/createEngine/createEngineFrameResolver.ts
2. src/renderer/webgl/webgl.ts
3. src/renderer/webgl/core/pipeline.ts
4. src/renderer/pipeline/partialRedrawPolicy.ts

Focus points:

- frame context quality and interaction flags
- packet path vs fallback path branch conditions
- dirty region carry-over and clear timing

## B) Zoom/Pan Causes Missing Region

Check order:

1. src/runtime/createEngine/createEngineShortlistFramePlanner.ts
2. src/runtime/createEngine/shortlist.ts
3. src/renderer/plan/planVisibilityCulling.ts
4. src/renderer/plan/incrementalVisibilityIndex.ts

Focus points:

- shortlist hysteresis thresholds and version sync
- candidate-id propagation to renderer context
- edge redraw and partial redraw interactions

## C) Performance Suddenly Drops

Check order:

1. src/runtime/createEngine/frameBudgetBroker/frameBudgetBroker.ts
2. src/runtime/strategy/qosController.ts
3. src/runtime/strategy/qosHardGuard.ts
4. src/runtime/strategy/qosRendererWiring.ts
5. src/runtime/createEngine/createEngineStatsHandler.ts

Focus points:

- pressure tier transitions
- budget clamping and guard trigger floods
- diagnostic panel showing stale phase/pressure

## D) Hit Test Is Wrong Or Unstable

Check order:

1. src/scene/hit/resolver.ts
2. src/renderer/hit/hitTest.ts
3. src/renderer/hit/hitTestBase.ts
4. src/renderer/hit/hitTestActive.ts

Focus points:

- point/ray query mode dispatch
- tolerance and exact check budget behavior
- active layer precedence and fallback order

## E) Tile Upload Or Cache Thrashing

Check order:

1. src/renderer/tileManager/tileManager.ts
2. src/renderer/tileManager/tileCacheEviction.ts
3. src/renderer/tileScheduler/tileScheduler.ts
4. src/renderer/webgl/tiles/textureIO.ts

Focus points:

- upload budget and queue pressure
- eviction candidate scoring
- stale resource reuse under interaction phases

## F) Diagnostics Panel Does Not Match Runtime

Check order:

1. src/runtime/createEngine/createEngineDiagnosticsInput.ts
2. src/runtime/createEngine/createEngineDiagnosticsBuilder.ts
3. src/runtime/createEngine/diagnosticsSnapshot.ts
4. src/runtime/createEngine/createEngineRuntimeFacade.ts

Focus points:

- diagnostics input assembly from latest mutable state
- snapshot normalization and field naming drift

## G) Before Patching

1. Confirm module boundary from ../../ai/module-map.md.
2. Define one minimal failing scenario.
3. Identify one authoritative state source and one rendering/output sink.
4. Patch smallest boundary first, then validate with engine-scoped checks.
