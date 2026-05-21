# Engine Hotspot Index

Purpose:

- Task-first entry index for fast file locking.

## 1) Runtime Orchestration

Primary entry:

- src/runtime/createEngine/createEngine.ts

Core split modules:

- src/runtime/createEngine/createEngineFrameResolver.ts
- src/runtime/createEngine/createEngineRuntimeFacade.ts
- src/runtime/createEngine/createEngineSceneFacade.ts
- src/runtime/createEngine/createEngineViewportFacade.ts
- src/runtime/createEngine/createEngineDiagnosticsBuilder.ts
- src/runtime/createEngine/createEngineDiagnosticsInput.ts

When to start here:

- frame assembly drift
- strategy/budget not reflected in renderer context
- diagnostics mismatch with runtime state

## 2) Strategy And Budget

Primary files:

- src/runtime/createEngine/strategy/strategy.ts
- src/runtime/createEngine/frameBudgetBroker/frameBudgetBroker.ts
- src/runtime/strategy/strategyInputV2.ts
- src/runtime/strategy/degradationLadder.ts
- src/runtime/strategy/qosController.ts
- src/runtime/strategy/qosHardGuard.ts
- src/runtime/strategy/qosRendererWiring.ts
- src/runtime/strategy/qosDiagnosticsPanel.ts
- src/runtime/strategy/strategyConvergence.ts
- src/runtime/strategy/hybridAutoPolicy.ts

When to start here:

- quality oscillation
- pressure tier regressions
- fallback/degradation policy confusion

## 3) WebGL Renderer Core

Primary file:

- src/renderer/webgl/webgl.ts

Extracted subareas:

- src/renderer/webgl/core/pipeline.ts
- src/renderer/webgl/core/packets.ts
- src/renderer/webgl/runtime/index.ts
- src/renderer/webgl/runtime/runtimeHelpers.ts
- src/renderer/webgl/runtime/resources.ts
- src/renderer/webgl/runtime/textures.ts
- src/renderer/webgl/tiles/compositor.ts
- src/renderer/webgl/tiles/textureIO.ts

When to start here:

- blank/black frames
- packet/fallback inconsistency
- upload budget and tile scheduling regressions

## 4) Plan, Visibility, Culling

Primary files:

- src/renderer/plan/plan.ts
- src/renderer/plan/planVisibilityCulling.ts
- src/renderer/plan/planFrameContext.ts
- src/renderer/plan/incrementalVisibilityIndex.ts
- src/scene/visibility/visibility.ts

When to start here:

- visible set mismatch
- over-culling or under-culling
- viewport shortlist anomalies

## 5) Tile Cache And Scheduler

Primary files:

- src/renderer/tileManager/tileManager.ts
- src/renderer/tileManager/tileMath.ts
- src/renderer/tileManager/tileCacheEviction.ts
- src/renderer/tileScheduler/tileScheduler.ts
- src/renderer/cache/tileCache.ts

When to start here:

- cache hit-rate drops
- eviction thrash
- partial redraw stale regions

## 6) Hit Testing

Primary files:

- src/scene/hit/resolver.ts
- src/renderer/hit/hitTest.ts
- src/renderer/hit/hitTestBase.ts
- src/renderer/hit/hitTestActive.ts

When to start here:

- hit misses at high zoom
- active layer hit precedence issues

## 7) Fallback Taxonomy And Pipeline Governance

Primary files:

- src/renderer/fallbackTaxonomy/fallbackTaxonomy.ts
- src/renderer/fallbackTaxonomy/fallbackReasonModel.ts
- src/renderer/pipeline/backendFallbackMatrix.ts
- src/renderer/pipeline/backendCompatibilityGate.ts
- src/renderer/pipeline/partialRedrawPolicy.ts

When to start here:

- fallback reason drift
- backend parity failures
- regressions hidden by compatibility fallbacks

## 8) Fast Search Protocol (Engine Scope)

1. Scope search to packages/engine/src/\*\*.
2. Locate creator/entry symbol first (create/resolve/apply/handle prefixes).
3. Follow symbol usages before text grep.
4. Read one contiguous block around the winning symbol.
5. Only then fan out to sibling modules.

Search budget:

- max 2 broad scans before switching to entrypoint-driven navigation.
