# @venus/engine Refactor Management

Status: Active maintenance (post-cutover hardening)
Date: 2026-05-19
Source: `ai/draft.md`
Scope: Engine internal architecture, runtime execution model, renderer/runtime split, document/compiler/extraction/composition/resource/observability layers.
Non-scope: Monorepo package topology and workspace package moves. Manage that in `ai/refactor-vnext/repo-refactor-management.md`.

## Execution Delta (2026-05-19)

- Completed vNext top-level orchestration wiring in `packages/_vnext/engine/src/api/createEngine.ts`.
- Added deterministic runtime-adapter test double in `packages/_vnext/engine/src/testing/runtimeAdapterTestDouble.ts`.
- Added runtime scheduling regression coverage in `packages/_vnext/engine/src/testing/engineRuntime.scheduling.test.ts`.
- Added lifecycle E0 parity fixture in `packages/_vnext/engine/src/testing/createEngine.lifecycle-parity.test.ts`.
- Added scheduler pressure diagnostics contract (`signals`, `reason`) in `packages/_vnext/engine/src/scheduler/frameBudgetBroker.ts`.
- Added pressure diagnostics regression test in `packages/_vnext/engine/src/testing/frameBudgetBroker.diagnostics.test.ts`.
- Propagated pressure diagnostics into public `getStats()` snapshot via `packages/_vnext/engine/src/api/createEngine.ts`.
- Extended runtime frame stats contract with `pressureReason` and `pressureSignals` in `packages/_vnext/engine/src/render-runtime/runtimeFacade.ts`.
- Added E2 document contracts in `packages/_vnext/engine/src/document/document-contracts.ts`.
- Added deterministic document store in `packages/_vnext/engine/src/document/document-store.ts`.
- Added staged incremental compiler output in `packages/_vnext/engine/src/compiler/incrementalCompiler.ts`.
- Added deterministic document/compiler replay test in `packages/_vnext/engine/src/testing/documentCompiler.replay.test.ts`.
- Wired document/compiler diagnostics into `createEngine().getStats()` in `packages/_vnext/engine/src/api/createEngine.ts`.
- Added staged E3/E4 execution-chain modules:
  - `packages/_vnext/engine/src/ecs/runtimeWorld.ts`
  - `packages/_vnext/engine/src/spatial/spatialIndex.ts`
  - `packages/_vnext/engine/src/picking/pickingPipeline.ts`
  - `packages/_vnext/engine/src/render-execution/stagedExecutionChain.ts`
- Added staged execution integration test in `packages/_vnext/engine/src/testing/stagedExecutionChain.integration.test.ts`.
- Added canonical-vs-vNext parity smoke suite in `packages/_vnext/engine/src/testing/canonicalVnext.parity-smoke.test.mjs`.
- Added cutover rehearsal automation in `scripts/engine-vnext-cutover-dry-run.mjs`.
- Added post-rename metadata checker in `scripts/engine-vnext-post-rename-check.mjs`.
- Shrunk canonical legacy bridge value-export surface to a single symbol (`createEngine`) by migrating:
  - `createEngineSpatialIndex` to `packages/engine/src/spatial/engineSpatialIndex.ts`
  - `createEngineAnimationController` to `packages/engine/src/animation/engineAnimationController.ts`
- Added parity coverage for the latest bridge migration slices:
  - `packages/engine/src/testing/spatialIndexBatchC.parity.test.ts`
  - `packages/engine/src/testing/animationControllerBatchD.parity.test.ts`
- Completed legacy bridge value-export block retirement in canonical facade by routing `createEngine` through `packages/engine/src/api/createEngineCompat.ts`.
- Added `packages/engine/src/testing/createEngineBatchD.parity.test.ts` to keep canonical `createEngine` export-path parity pinned to legacy factory during staged compatibility window.
- Executed `_vnext` archive finalize helper dry-run:
  - `node ./scripts/engine-vnext-finalize-archive.mjs .`
  - Output confirms planned move path for apply mode (`packages/_vnext/engine` -> `archive/engine-vnext-snapshot-2026-05-20`).
- Executed `_vnext` archive finalize helper apply mode:
  - `node ./scripts/engine-vnext-finalize-archive.mjs --apply --allow-dirty`
  - Moved `packages/_vnext/engine` -> `archive/engine-vnext-snapshot-2026-05-20`.
- Canonicalized additional runtime bridge implementations (no longer legacy re-exports):
  - `packages/engine/src/animation/engineAnimationController.ts`
  - `packages/engine/src/spatial/engineSpatialIndex.ts`
- Declared direct spatial runtime dependency in canonical package:
  - `packages/engine/package.json` includes `rbush-3d`.
- Canonicalized remaining interaction/API bridge re-export surfaces into wrapper-owned modules:
  - `packages/engine/src/interaction/hitTest.ts`
  - `packages/engine/src/interaction/snapping.ts`
  - `packages/engine/src/interaction/geometryPayload.ts`
  - `packages/engine/src/interaction/visibilityLod.ts`
  - `packages/engine/src/api/createEngineCompat.ts`
- Added canonical runtime legacy-boundary guard in `packages/engine/src/testing/legacyRuntimeBoundary.test.mjs`:
  - forbids direct runtime re-exports from `@venus/engine-legacy`
  - tracks wrapper-owned runtime legacy import inventory as a shrink-only contract
- Further reduced runtime legacy-import inventory by replacing wrappers with canonical implementations:
  - `packages/engine/src/interaction/visibilityLod.ts`
  - `packages/engine/src/interaction/snapping.ts`
  - `packages/engine/src/interaction/hitTest.ts`
  - `packages/engine/src/interaction/geometryPayload.ts`
  - runtime legacy import inventory now targets only `createEngineCompat` in canonical source.
- Completed createEngine compatibility assessment for bridge exit:
  - `packages/engine/src/api/createEngineCompat.ts` remains the final runtime legacy dependency by design.
  - Added `AI-TEMP` marker with removal criteria tied to vNext createEngine parity.
  - Current blocker is method-surface mismatch between legacy `Engine` API and vNext `EngineHandle` API used by vector runtime bridge.
- Removed canonical spatial-index type dependency on `@venus/engine-legacy` by defining local `EngineSpatialItem` contract in `packages/engine/src/spatial/engineSpatialIndex.ts`.
- Added createEngine compatibility-gap baseline artifacts:
  - `packages/engine/src/api/createEngineCompatGap.ts`
  - `packages/engine/src/testing/createEngineCompatGap.test.ts`
  - These lock runtime bridge method requirements and keep vNext parity blockers explicit during Task 32 closure.
- Added createEngine scene compatibility core for staged adapter migration:
  - `packages/engine/src/api/createEngineCompatSceneState.ts`
  - `packages/engine/src/testing/createEngineCompatSceneBatch.test.ts`
  - This introduces deterministic scene load/patch reducers and node/snapshot helpers required by Task 32.2 method-surface implementation.
- Cut over `packages/engine/src/api/createEngineCompat.ts` from runtime legacy delegation to a vNext-backed compatibility adapter.
- Runtime legacy import inventory in canonical source is now zero (enforced by `packages/engine/src/testing/legacyRuntimeBoundary.test.mjs`).
- Expanded adapter behavioral guards in `packages/engine/src/testing/createEngineCompat.adapter.test.ts` to cover transaction null-path semantics, no-op side-effect API callability, and lifecycle method stability.
- Shrunk compatibility type bridge scope by removing wildcard `export type *` from `packages/engine/src/api/legacyEngineCompatExports.ts` and replacing it with explicit legacy type exports required by current app consumers.
- Further migrated compatibility type ownership from `@venus/engine-legacy` to canonical sources by exporting engine-owned type contracts from animation/snapping/spatial/zoom/geometry/hit-tolerance modules and wiring `legacyEngineCompatExports.ts` to those canonical type exports.
- Added canonical createEngine compatibility type contracts in `packages/engine/src/api/createEngineCompatTypes.ts` and switched createEngine compatibility modules/facade exports to this source.
- Canonicalized `ShapeTransformBatchCommand` and `ShapeTransformBatchItem` in `packages/engine/src/interaction/shapeTransform.ts`, removing the last direct `@venus/engine-legacy` reference from `packages/engine/src/api/legacyEngineCompatExports.ts`.
- Extended compat-facade boundary guard to enforce zero direct `@venus/engine-legacy` references.
- Removed the compatibility-facade `AI-TEMP` marker in `packages/engine/src/api/legacyEngineCompatExports.ts` after canonical facade/runtime source reached zero `@venus/engine-legacy` references (parity tests remain intentionally for regression comparison).
- Post-hardening runtime fix: replaced legacy render-backend fallback with an `AI-TEMP` guarded canonical compat-canvas renderer inside `packages/engine/src/api/createEngineCompat.ts` (real-canvas context only) to resolve blank canvas and diagnostics drift while vNext render backend parity is pending.
- Verified current baseline:
  - `pnpm governance:check`
  - `pnpm governance:file-shape`
  - `pnpm typecheck`
  - `pnpm lint`
  - `pnpm test`
  - `pnpm build`
  - `pnpm --filter @venus/engine cr:check`
  - `pnpm --filter @venus/engine debug:guard`
  - `node ./scripts/engine-vnext-cutover-dry-run.mjs`
  - `node ./scripts/engine-vnext-post-rename-check.mjs`

Cutover readiness note:

- Governance and repo gates are green as of 2026-05-20.
- Parity smoke, rename-back rehearsal, and post-rename executable checks are now in place.
- Cutover readiness status is `Ready (R3 Validation Complete)`; latest readiness snapshot confirms full-gate pass in canonical state.
- `_vnext` staging package has been archived to `archive/engine-vnext-snapshot-2026-05-20`; ongoing work tracks canonical hardening/maintenance.
- See `ai/operations/engine-vnext-cutover-readiness-2026-05-20.md` and `ai/operations/engine-vnext-cutover-attempt-rollback-2026-05-20.md`.

## 1. Engine Positioning

`@venus/engine` is not a canvas editor renderer and not a game-only renderer. It is the runtime kernel for a universal realtime graphics platform.

It must support:

- 2D vector editing and infinite canvas
- 3D scenes, CAD/BIM, GIS, medical visualization
- video/timeline compositing
- headless/server rendering
- streaming and remote/cloud rendering
- deterministic replay and AI-assisted scene workflows

The internal direction is:

```txt
Document Runtime
+
+Realtime Scheduler
+
+GPU Driven Renderer
+
+Streaming Runtime
+
+Unified Composition System
+
+Incremental Runtime Evaluation
```

The engine must not continue evolving as a single scene renderer.

## 2. Destructive Engine Refactor Strategy

This is a broad destructive refactor. Use a new-version engine folder while building the target architecture.

Recommended staging path:

```txt
packages/_vnext/engine/
```

Rules:

- Keep the existing `packages/engine` stable until the vNext engine can pass contract, integration, and app bridge tests.
- Do not expose `_vnext` as `@venus/engine` until cutover.
- If workspace integration is required before cutover, add explicit workspace entries and package names temporarily, then remove them before final rename.
- Build migration adapters only with clear removal conditions.
- Every temporary adapter/fallback must use `AI-TEMP: <why>; remove when <condition>; ref <task/doc>` in code.
- Final cutover must rename `packages/_vnext/engine` back to `packages/engine` and remove staging names.

This strategy allows breaking internal architecture without leaving the active app permanently broken after each intermediate step.

## 3. Target Execution Model

Complete frame execution pipeline:

```txt
DOM/Input/Event Source
↓
Input Collection
↓
Input Normalization
↓
Interaction Routing
↓
Picking Pipeline
↓
Gesture Resolution
↓
Tool Runtime
↓
Command Buffer
↓
Document Transaction
↓
Incremental Document Compilation
↓
Runtime ECS Update
↓
Visibility Update
↓
Extraction Phase
↓
Render Planning
↓
Layer Invalidation
↓
Tile Scheduling
↓
Render Graph Build
↓
GPU Resource Resolution
↓
GPU Command Encoding
↓
GPU Submission
↓
Composition
↓
Presentation
```

The most important separation:

```txt
Document State != Runtime State != Render State != GPU State
```

The renderer must never directly render document nodes.

Correct pipeline:

```txt
Document
↓ compile
Runtime ECS
↓ extract
Render World
↓ plan
Render Graph / Packets
↓ execute
GPU Commands
```

## 4. Target Internal Layers

| Layer            | Responsibility                                              | Must Not Own                          |
| ---------------- | ----------------------------------------------------------- | ------------------------------------- |
| API              | Stable public facade, createEngine, public types            | Backend internals or app policy       |
| Document         | persistent graph, versions, transactions, change sets       | GPU resources, hover, selection cache |
| Authoring bridge | command buffer, tool outputs, editor-facing mutation bridge | Renderer/backend execution            |
| Compiler         | incremental document/runtime compilation                    | Backend submission                    |
| Runtime ECS      | cache-local runtime state and simulation systems            | Persistent document source of truth   |
| Visibility       | viewport-scoped visible sets, LOD, ROI, streaming priority  | Picking priority policy alone         |
| Spatial          | 2D/3D coarse indices, bounds, ray/frustum queries           | Renderer draw order                   |
| Picking          | broad phase, narrow phase, hit stack, GPU optional picking  | Direct DOM event handling             |
| Interaction      | normalized input, gesture arena, tool dispatch              | Document persistence and GPU objects  |
| Extraction       | runtime world to render world/packets                       | Backend command encoding              |
| Composition      | layer stacks, surfaces, dirty regions, compositing graph    | Product UI panels/toolbars            |
| Render planning  | tile scheduling, QoS, progressive rendering, budgets        | Backend-specific command encoding     |
| Render execution | pass execution, uploads, barriers, packet submission        | Scene/document mutation               |
| GPU resources    | buffers, textures, heaps, residency, upload queues          | App data model                        |
| Resources        | asset/resource handles, lifetime, streaming priorities      | UI state                              |
| Scheduler/policy | frame phases, budgets, pressure arbitration                 | Scenario-specific branches            |
| Observability    | traces, metrics, replay, frame capture                      | Product analytics coupling            |
| Platform bridge  | runtime adapter integration                                 | Engine policy decisions               |

## 5. vNext Directory Shape (Authoritative)

This section is authoritative for engine structure execution and directly follows `ai/draft.md` ("NEW RECOMMENDED DIRECTORY STRUCTURE").

Target shape:

```txt
packages/_vnext/engine/src/
├── api/
├── document/
├── authoring/
├── compiler/
├── ecs/
├── simulation/
├── extraction/
├── composition/
├── render-runtime/
├── render-planning/
├── render-execution/
├── renderer/
├── render-graph/
├── resource-graph/
├── resources/
├── gpu/
├── backend/
├── presentation/
├── scheduler/
├── policy/
├── runtime/
├── platform/
├── streaming/
├── interaction/
├── picking/
├── spatial/
├── scene-runtime/
├── render-scene/
├── view/
├── memory/
├── shader/
├── text/
├── animation/
├── physics/
├── volume/
├── gis/
├── video/
├── observability/
├── testing/
└── index.ts
```

Structure alignment status:

- [x] `packages/_vnext/engine/src` directory skeleton created with the full target list.
- [x] `packages/_vnext/engine/package.json` and `packages/_vnext/engine/tsconfig.json` created for staging.
- [x] `packages/_vnext/engine/src/index.ts` created as a staging entry.
- [ ] Contracts and implementation files to be migrated into each directory.
- [ ] Canonical rename-back from `packages/_vnext/engine` to `packages/engine` after parity and full validation.

Execution note:

- No new engine structure should be added outside this target tree unless the change request updates this section first.

Initial implementation subset (order only, not structure reduction):

```txt
api/
document/
compiler/
ecs/
extraction/
composition/
render-planning/
render-execution/
gpu/
backend/
scheduler/
policy/
interaction/
picking/
spatial/
view/
observability/
testing/
```

## 6. Phase Plan

### Phase E0: Engine Baseline and Contracts

Goal: Freeze the public behavior before building vNext internals.

Tasks:

- [ ] Capture current `createEngine` public contract and diagnostics payload.
- [ ] Capture current scene load/patch/render loop behavior.
- [ ] Capture current WebGL/WebGPU fallback behavior.
- [ ] Create vNext engine CHANGE REQUEST and test matrix.
- [ ] Define parity scenarios: vector dense scene, zoom/pan path, 3D camera path, WebGPU fallback path.

Acceptance:

- Current behavior has replay or integration coverage before replacement.
- Public API compatibility requirements are explicit.

### Phase E1: API Facade and Runtime Shell

Goal: Build a stable vNext shell before deep internals.

Tasks:

- [x] Define `createEngine` vNext facade and public types.
- [x] Define lifecycle methods: start, stop, pause, resume, dispose, resize, captureFrame, getStats.
- [x] Define backend selection contract with `auto` default.
- [x] Define runtime adapter injection points.
- [x] Add no-op/headless backend for deterministic tests.

Acceptance:

- vNext shell can instantiate and dispose without DOM coupling.
- Public facade is testable before renderer implementation.

### Phase E2: Document and Compiler Boundary

Goal: Make document/runtime separation explicit.

Tasks:

- [ ] Define Document, DocumentNode, DocumentGraph, DocumentVersion, DocumentRevision.
- [ ] Define DocumentTransaction, ChangeSet, DeltaPatch, CommandBuffer.
- [ ] Define IncrementalCompiler with transform, geometry, material, text, visibility, picking, GPU upload invalidation categories.
- [ ] Compile document changes into runtime ECS updates.
- [ ] Add deterministic replay tests for repeated change-set application.

Acceptance:

- Document mutation never directly mutates render packets or GPU resources.
- Same input change sequence produces the same runtime state and extraction output.

### Phase E3: Runtime ECS and Scene Runtime

Goal: Replace object-graph traversal with runtime-oriented state.

Tasks:

- [ ] Define entity ids, component ids, component stores, sparse/packed storage.
- [ ] Define runtime scene/world independent from document graph.
- [ ] Implement transform/material/geometry registration through compiler output.
- [ ] Add runtime versioning and dirty propagation.
- [ ] Keep ECS pragmatic; do not force persistent document into ECS.

Acceptance:

- Runtime iteration is cache-friendly and deterministic.
- Persistent document remains source of truth.

### Phase E4: Spatial, Visibility, and Picking Runtime

Goal: Make large-scene culling and interaction scalable.

Tasks:

- [ ] Implement spatial index strategy for 2D/3D: quadtree/R-tree/BVH/octree-ready contracts.
- [ ] Implement viewport-scoped VisibilityContext and VisibleSet.
- [ ] Add overscan and zoom-aware visibility thresholds.
- [ ] Implement picking pipeline: BroadPhase -> CandidateSet -> NarrowPhase -> PriorityResolution -> HitStack.
- [ ] Support penetration picking and layer-specific picking contexts.
- [ ] Add optional GPU picking contract without making it required.

Acceptance:

- Hit testing does not use full scene traversal.
- Visibility and picking can share projected bounds and visible sets.
- Pan/zoom does not produce blank edge regions due to missing overscan.

### Phase E5: Interaction Runtime

Goal: Replace direct pointer callbacks with a runtime interaction pipeline.

Tasks:

- [ ] Define InputSystem, PointerTracker, InputRouter, InteractionContext.
- [ ] Define GestureArena and GestureRecognizer.
- [ ] Define ToolRuntime, ToolDispatcher, ToolContext.
- [ ] Route tool output into CommandBuffer instead of direct scene mutation.
- [ ] Keep DOM event collection outside engine core; engine receives normalized runtime input.

Acceptance:

- `pointermove -> mutate scene -> redraw all` is not possible in vNext internals.
- Each viewport can own independent interaction state.

### Phase E6: Extraction Layer

Goal: Ensure render execution consumes extracted render state only.

Tasks:

- [ ] Define ExtractionContext, ExtractedScene, ExtractedCamera, ExtractedMesh, ExtractedText, ExtractedOverlay, ExtractedTile, RenderWorld.
- [ ] Extract only visible/runtime candidates.
- [ ] Generate backend-independent render packets.
- [ ] Add extraction diagnostics: candidates, packets, batches, skipped reasons.
- [ ] Add deterministic extraction snapshots.

Acceptance:

- Render execution does not traverse document/runtime scene directly.
- WebGL/WebGPU/headless backends can consume the same extracted input.

### Phase E7: Composition and Layer Runtime

Goal: Treat layers as compositing runtimes, not draw-order buckets.

Tasks:

- [ ] Define CompositionGraph, CompositionLayer, LayerStack, LayerSurface, LayerPolicy.
- [ ] Define default layers: Background, Document, Interaction, Selection, Hover, Guide, Overlay, Debug, Presentation.
- [ ] Implement layer invalidation, dirty regions, cache state, redraw policy, upload policy.
- [ ] Add viewport-local layer stacks.
- [ ] Support retained document layer and realtime interaction layer.

Acceptance:

- Drag/hover/selection does not rebuild stable document layer.
- Overlay rendering is budget-isolated.
- Multi-viewport layer ownership is possible.

### Phase E8: Render Planning and Scheduler

Goal: Move orchestration from renderer-centric to scheduler-centric.

Tasks:

- [ ] Define frame phases: Input, Simulation, Extraction, Render Planning, GPU Execution, Presentation.
- [ ] Define budgets: CPU, GPU, upload, streaming, tile build, visibility, interaction, text layout.
- [ ] Define policy graph with constraints, priorities, fallback, degradation, specialization.
- [ ] Implement ROI, tile scheduling, progressive refinement, upload throttling.
- [ ] Add pressure signals: memory, GPU, upload, visibility, thermal, worker queue.

Acceptance:

- High-pressure runtime behavior is policy-driven, not scattered conditionals.
- Interaction latency can be prioritized over visual completeness during active manipulation.

### Phase E9: Render Execution, GPU, and Backends

Goal: Make backend execution real and separable.

Tasks:

- [ ] Define backend-neutral render packet contract.
- [ ] Implement WebGL execution path.
- [ ] Implement native WebGPU execution path without WebGL submission fallback for core primitives.
- [ ] Define GPU resources: buffers, textures, upload queues, pipeline cache, shader cache.
- [ ] Implement transient/persistent resource lifetime and deferred destruction.
- [ ] Add fallback diagnostics for backend selection and execution failure.

Acceptance:

- WebGPU native path can render core primitives independently.
- Backend fallback is explicit, observable, and tested.
- GPU upload bursts are budgeted.

### Phase E10: Resources, Streaming, and Tile Runtime

Goal: Build large-scene resource control.

Tasks:

- [ ] Define AssetHandle, ResourceHandle, ResourceLifetime, ResourceResidency.
- [ ] Define tile state: visibility, residency, build version, upload state, priority, cache state, refinement level.
- [ ] Connect visibility prediction to streaming priority.
- [ ] Implement background tile build and progressive refinement.
- [ ] Implement texture/geometry/glyph cache residency policy.

Acceptance:

- Pan/zoom can reuse retained tiles and schedule refinement.
- Streaming and upload stay within budget.

### Phase E11: Observability and Replay

Goal: Make the engine inspectable, testable, and debuggable at runtime scale.

Tasks:

- [ ] Define Trace, Metric, Counter, TimelineEvent, FrameCapture, RuntimeReplay.
- [ ] Expose invalidation propagation, tile rebuilds, upload bursts, visibility cost, extraction cost, GPU stalls, memory pressure, interaction latency.
- [ ] Add replay harness for input/document/viewport sequences.
- [ ] Add scenario benchmarks for vector, 3D, GIS-like tiles, video-like composition.

Acceptance:

- Core runtime regressions can be reproduced from recorded input and document changes.
- Diagnostics do not depend on app private state.

### Phase E12: Cutover to Canonical Engine

Goal: Replace `packages/engine` with the validated vNext engine.

Tasks:

- [ ] Freeze writes to old `packages/engine`.
- [ ] Run parity tests old vs vNext.
- [ ] Move old engine to a non-workspace archive.
- [ ] Rename `packages/_vnext/engine` to `packages/engine`.
- [ ] Update package name, exports, tsconfig, imports, scripts.
- [ ] Run full repo validation.
- [ ] Remove migration adapters after rollback window.

Acceptance:

- Canonical `packages/engine` has no `_vnext` naming.
- App bridge uses public engine facade only.
- Full validation passes.

## 7. Engine CHANGE REQUEST Template

```txt
[CHANGE REQUEST]

Target:
- Engine layer / module:

Goal:
- Runtime problem being solved:

Change Type:
- Add / Modify / Move / Remove

Impact:
- Affected engine layers:
- Public API impact:
- Backend/runtime impact:

Cleanup:
- Old logic/shims/fallbacks to remove:
- Rename-back or cutover condition:

Tests:
- Unit/integration/replay/perf/diagnostic gates:
```

## 8. Validation Matrix

| Area                | Required Validation                                                            |
| ------------------- | ------------------------------------------------------------------------------ |
| API facade          | lifecycle tests, public type tests, adapter injection tests                    |
| Document/compiler   | transaction/change-set replay, invalidation category tests                     |
| Runtime ECS         | deterministic update, dirty propagation, storage tests                         |
| Spatial/visibility  | 2D/3D bounds, frustum, overscan, LOD tests                                     |
| Picking             | broad/narrow, penetration stack, miss classification, layer-specific hit tests |
| Interaction         | gesture ownership, command generation, viewport isolation tests                |
| Extraction          | deterministic render world snapshots                                           |
| Composition         | layer dirty regions, retained surfaces, partial redraw tests                   |
| Render planning     | budget arbitration, pressure fallback, progressive scheduling tests            |
| WebGPU/WebGL        | native path, fallback path, upload path, fake backend harness                  |
| Resources/streaming | residency, eviction, upload throttling, deferred destruction tests             |
| Observability       | trace fields, replay reproducibility, diagnostics compatibility tests          |

Required final gates:

```txt
pnpm --filter @venus/engine test
pnpm --filter @venus/engine cr:check
pnpm --filter @venus/engine debug:guard
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

## 9. Risk Register

| Risk                                      | Impact                        | Mitigation                                                           |
| ----------------------------------------- | ----------------------------- | -------------------------------------------------------------------- |
| vNext diverges from app needs             | Cutover failure               | Maintain public facade parity tests and app bridge integration tests |
| Document/compiler overbuilt too early     | Slow progress                 | Implement contracts needed by runtime first; defer full CRDT         |
| ECS becomes mandatory for authoring state | Model mismatch                | Keep persistent document out of ECS                                  |
| Renderer remains god object               | Coupled runtime               | Split extraction/planning/execution before new renderer features     |
| WebGPU remains hybrid                     | No real backend benefit       | Native path must render core primitives before default selection     |
| Layer invalidation storms                 | Blank regions or frame spikes | Dirty-region tests and tile diagnostics                              |
| Policy graph becomes opaque               | Hard debugging                | Every policy decision emits reason diagnostics                       |
| Resource graph added prematurely          | Complexity without payoff     | Add only after upload/residency baselines exist                      |

## 10. Immediate Engine Tasks

1. Create vNext engine CHANGE REQUEST and parity test list.
2. Define vNext public API facade and no-op/headless backend.
3. Define Document/ChangeSet/IncrementalCompiler contracts.
4. Define ExtractionContext and RenderWorld before renderer implementation grows.
5. Define CompositionLayer/LayerStack/LayerInvalidation to protect partial redraw architecture.
6. Implement native WebGPU core primitive path as a real execution target, not a hybrid probe.
7. Add deterministic replay harness early, before migration volume grows.

## 11. Post-Cutover Task Delta (2026-05-20)

1. Task 3: Compatibility bridge staged retirement

- Status: In Progress
- Note: bridge remains active by design under `AI-TEMP` until native vNext replacements close parity.
- Delta: viewport export family migrated from legacy bridge to `@venus/lib/viewport` to reduce dependency surface.
- Delta: matrix/geometry export family migrated from legacy bridge to `@venus/lib` to reduce dependency surface.
- Delta: geometry-only exports `intersectNormalizedBounds` and `isPointInsideRotatedBounds` migrated from legacy bridge to `@venus/lib`.
- Delta: runtime stability mitigation added for extreme low-scale viewport settle invalidation in `apps/vector-editor-web/src/runtime/engine-bridge/internal/engineRenderer/useEngineRendererViewport.ts` to prevent 1% zoom freeze (settle dirty-mark minimum scale + world-extent clamp).
- Delta: extracted settle dirty-bounds computation into `apps/vector-editor-web/src/runtime/engine-bridge/internal/engineRenderer/viewportSettleDirtyBounds/viewportSettleDirtyBounds.ts` and added regression coverage at `viewportSettleDirtyBounds.test.ts` for low-scale skip, world-extent clamp, and center-preserving bounds.
- Delta: runtime import of `@venus/engine-legacy` in `packages/engine/src/api/createEngineCompat.ts` was temporarily restored for real-canvas fallback after parity regression (box-only primitives and missing hover composition behavior).
- Delta: added compat-canvas render-path regression in `packages/engine/src/testing/createEngineCompat.adapter.test.ts` to guard draw-count/visible-count parity without legacy runtime delegation.
- Delta: canonical `createEngine` now auto-selects `canvas2d` backend for canvas surfaces via `packages/engine/src/backend/canvas2dBackend.ts` and backend resolver updates.
- Delta: backend auto-selection policy is corrected to architecture priority order (`webgpu -> webgl -> canvas2d -> headless`) unless caller explicitly pins backend.
- Delta: added backend selection guard in `packages/engine/src/testing/createEngine.orchestration.test.ts` to enforce `auto -> canvas2d` resolution when surface canvas is available.
- Delta: fixed compat-canvas black-screen/offset regression by using node paint payload (`fill`/`stroke`) and DPR-aware transform in `packages/engine/src/api/createEngineCompat.ts`; added paint-path guard assertions in `createEngineCompat.adapter.test.ts`.
- Delta: real-canvas runtime path now prefers legacy render delegation again, while compat-canvas path remains available for explicit non-legacy testing (`debug.useLegacyRenderBackend: false`).
- Delta: legacy render delegation is now explicit opt-in only (`debug.useLegacyRenderBackend: true`); default compatibility runtime path is non-legacy.
- Validation: post-mitigation required gates remain green (`pnpm --filter @venus/engine test`, `pnpm typecheck`, `pnpm lint`, `pnpm build`).
- Next: remove legacy debug fallback mode entirely after vNext native scene primitive + hover composition parity is validated in app runtime.

2. Task 42: Native scene submission parity slice (post-Task3)

- Status: In Progress
- Goal: move current compat-canvas scene draw responsibility from compat adapter into vNext runtime scene submission path so `createEngineCompat` can shrink method-surface shims.
- Current result:
  - Added canonical canvas2d scene submission module: `packages/engine/src/render-runtime/canvas2dSceneDrawPayload.ts` (`Canvas2DSceneDrawPayload`, `Canvas2DSceneDrawRect`, `drawCanvas2DScenePayload`).
  - Wired `createEngineCompat` canvas draw path to shared payload module, reducing adapter-local draw logic ownership.
  - Exported new canvas2d scene payload contracts from package entry (`packages/engine/src/index.ts`) for follow-up vNext runtime ownership migration.
  - Validation remains green (`pnpm --filter @venus/engine test`, `pnpm typecheck`, `pnpm lint`, `pnpm build`).
- Next checkpoints:
  - Route draw payload production from vNext staged execution snapshot instead of compat adapter-owned scene state.
  - Add backend-capability detection tests for auto-priority order (`webgpu -> webgl -> canvas2d -> headless`).
  - Keep current adapter tests green while adding parity guards for draw payload ownership boundary.

2. Task 4: `_vnext` archival lifecycle and disposal

- Status: Planned
- Note: keep `_vnext` as rollback snapshot during observation window, then archive/remove.
- Delta: finalize helper script added at `scripts/engine-vnext-finalize-archive.mjs` (dry-run default; `--apply` for execution).
- Delta: finalize helper now requires clean worktree on `--apply` unless `--allow-dirty` is explicitly set.

3. Task 5: Export-surface regression hardening

- Status: Completed
- Deliverable: `packages/engine/src/testing/legacyCompatExportBoundary.test.mjs`.
- Deliverable: `packages/engine/src/testing/legacyBridgeInventory.test.mjs`.

4. Task 8: App-side export consumption hardening

- Status: Completed
- Deliverable: `apps/vector-editor-web/src/runtime/engine-bridge/engineExports.contract.ts`.

5. Task 12: Remaining legacy export batch planning

- Status: Completed
- Deliverable: `ai/operations/engine-vnext-legacy-bridge-batch-plan-2026-05-20.md`.

6. Task 13: Batch A first migration slice

- Status: Completed
- Delta: `resolveEngineAdaptiveHitTolerance` and `resolveEngineCanvasLodProfile` migrated to canonical `packages/engine/src/interaction` modules.
- Deliverable: `packages/engine/src/testing/interactionBatchA.parity.test.ts`.

7. Task 14: Batch A second migration slice

- Status: Completed
- Delta: shape-transform value exports migrated to canonical `packages/engine/src/interaction/shapeTransform.ts`.
- Deliverable: `packages/engine/src/testing/shapeTransformBatchA.parity.test.ts`.

8. Task 15: Batch A third migration slice

- Status: Completed
- Delta: hit-test value exports migrated to canonical `packages/engine/src/interaction/hitTest.ts`.
- Deliverable: `packages/engine/src/testing/hitTestBatchA.parity.test.ts`.

9. Task 16: Batch B first migration slice

- Status: Completed
- Delta: zoom-family value exports migrated to canonical `packages/engine/src/interaction/zoom.ts`.
- Deliverable: `packages/engine/src/testing/zoomBatchB.parity.test.ts`.

10. Task 17: Batch B second migration slice

- Status: Completed
- Delta: viewport-pan value exports migrated to canonical `packages/engine/src/interaction/viewportPan.ts`.
- Deliverable: `packages/engine/src/testing/viewportPanBatchB.parity.test.ts`.

11. Task 18: Batch B third migration slice

- Status: Completed
- Delta: move-snap preview value export migrated to canonical `packages/engine/src/interaction/snapping.ts`.
- Deliverable: `packages/engine/src/testing/snappingBatchB.parity.test.ts`.

12. Task 19: Batch B fourth migration slice

- Status: Completed
- Delta: geometry payload and visibility budget value exports migrated to canonical `packages/engine/src/interaction/geometryPayload.ts` and `packages/engine/src/interaction/visibilityLod.ts`.
- Deliverable: `packages/engine/src/testing/geometryPayloadBatchB.parity.test.ts`.
- Deliverable: `packages/engine/src/testing/visibilityLodBatchB.parity.test.ts`.

13. Task 21: Batch C first migration slice

- Status: Completed
- Delta: worker-mode value export migrated to canonical `packages/engine/src/interaction/workerCapabilities.ts`.
- Deliverable: `packages/engine/src/testing/workerModeBatchC.parity.test.ts`.

14. Task 22: Batch C second migration slice

- Status: Completed
- Delta: render scheduler value export migrated to canonical `packages/engine/src/scheduler/renderScheduler.ts`.
- Deliverable: `packages/engine/src/testing/renderSchedulerBatchC.parity.test.ts`.
