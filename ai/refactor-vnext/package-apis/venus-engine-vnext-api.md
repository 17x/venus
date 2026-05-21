# @venus/engine Public API (Historical vNext Baseline)

Status: Historical baseline; canonical post-cutover management now lives in `ai/refactor-vnext/engine-headless-modular-runtime-management.md`
Source anchors:

- `packages/engine/src/index.ts`
- `packages/engine/src/api/public-types.ts`
- `packages/engine/src/api/createEngine.ts`
- `packages/engine/src/api/createEngineContracts.ts`
- `packages/engine/src/policy/createEnginePolicyBootstrap.ts`
- `packages/engine/src/render-planning/createEngineFrameResolver.ts`
- `packages/engine/src/view/viewportFacade.ts`
- `packages/engine/src/render-runtime/strategy.ts`
- `packages/engine/src/render-runtime/runtimeFrameController.ts`
- `packages/engine/src/render-runtime/runtimeFacade.ts`
- `packages/engine/src/scheduler/frameBudgetBroker.ts`

## Overview

This document records the vNext public API baseline after canonical cutover. Active forward planning for headless modular runtime, protocol/adapters, and profiles is tracked in `engine-headless-modular-runtime-management.md`.

It currently provides a minimal runtime shell and deterministic no-op backend path used for contract stabilization.

## Public API

### `createEngine(options)`

Creates an `EngineHandle`.

Input contract (`EngineCreateOptions`):

- `surface`: `{ width, height }`
- `backend?`: `"auto" | "webgpu" | "webgl" | "canvas2d" | "headless"`
- `runtimeAdapter?`: frame scheduling and clock adapter
- `debug?`: debug toggle

### `EngineHandle`

- `start()`
- `stop()`
- `pause()`
- `resume()`
- `resize(width, height)`
- `captureFrame()`
- `getStats()`
- `getBackendInfo()`
- `dispose()`

### Public types

- `EngineBackendMode`
- `EngineLifecycleState`
- `EngineRuntimeAdapter`
- `EngineSurface`
- `EngineCreateOptions`
- `BackendSelectionResult`
- `EngineStatsSnapshot`
- `EngineHandle`

### Staged migration helpers

- `resolveEnginePerformanceOptions(options)`
- `resolveCreateEnginePolicyBootstrap(options)`
- `resolveCreateEngineFrame(options)`
- `resolveViewportState(current, patch)`
- `panViewportState(current, deltaX, deltaY)`
- `zoomViewportState(current, scale, anchor)`
- `createViewportFacade(options)`
- `resolveEngineRenderStrategy(input)`
- `resolveRuntimeFrameController(input)`
- `createEngineRuntimeFacade(options)`
- `resolveFrameBudgetPressure(input)`
- `resolvePhaseBudget(input)`
- `applyPressureContraction(budget, pressure)`
- `resolveEngineFrameBudget(input)`

Additional exported staged contracts:

- `CreateEngineVNextOptions`
- `EnginePerformanceToggle<T>`
- `EnginePerformanceOptionsObject`
- `EnginePerformanceOptions`
- `EngineOverscanOptions`
- `EngineCullingOptions`
- `ResolvedEnginePerformanceOptions`
- `EnginePolicyProfile`
- `EngineQualityPreset`
- `EngineRuntimeBudgetSettings`
- `CreateEnginePolicyBootstrapSnapshot`
- `EnginePlanningViewport`
- `EnginePlanningSceneSummary`
- `EngineFramePlanningDecision`
- `EngineBudgetPressure`
- `EngineViewportState`
- `EngineViewportPatch`
- `EngineViewportAnchor`
- `EngineViewportFacade`
- `EngineInteractionMutationKind`
- `EngineRenderStrategyPhase`
- `EngineRenderStrategyInput`
- `EngineRenderStrategyDecision`
- `EngineRuntimeFrameControllerInput`
- `EngineRuntimeFrameControllerDecision`
- `EngineRuntimeLoopAdapter`
- `EngineRuntimeRenderAdapter`
- `EngineRuntimeDiagnosticsAdapter<T>`
- `EngineRuntimeFacade<T>`
- `EngineRenderFrameStats`
- `EngineFrameBudget`
- `EngineFrameBudgetBrokerInput`
- `EngineFrameBudgetBrokerDecision`
- `EngineFrameBudgetPressure`

### Test helper

- `createTestSurface(width, height)`

## Staging Behavior Notes

- `backend: "auto"` resolves by architecture priority: `webgpu -> webgl -> canvas2d -> headless` unless caller explicitly pins a backend.
- WebGPU/WebGL/Canvas2D native execution is not implemented yet in this shell.
- The package is canonical `@venus/engine`; `_vnext` is historical staging terminology.
- Current planning/policy/frame helpers are staged migrations inspired by legacy engine modules and will be replaced by full runtime-layer implementations.
- View/runtime/scheduler helpers are now staged under `src/view`, `src/render-runtime`, and `src/scheduler` to mirror the target architecture layering.
- `createEngine(options)` now wires top-level orchestration through viewport + frame-planning + runtime-frame-controller + runtime-facade, while keeping the public `EngineHandle` surface stable.
