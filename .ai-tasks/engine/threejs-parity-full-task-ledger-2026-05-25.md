# Engine vs three.js Full Parity Task Ledger (2026-05-25)

## 0. Scope Definition

This ledger tracks full capability parity work against mainstream three.js usage for runtime and editor scenarios.

Goals:

1. Build full capability map, not partial key points.
2. Execute parity work in verifiable slices with hard gates.
3. Preserve engine governance strengths (determinism, contracts, diagnostics).
4. Keep architecture boundaries clean while expanding rendering capability.

Primary target scenarios:

1. 3D editor viewport and scene operations.
2. Runtime 3D scene rendering and interaction.
3. Asset ingestion and playback workflows.

## 1. Type Definition (Task Contracts)

### 1.1 Status

- TODO: not started
- DOING: active execution
- BLOCKED: waiting on dependency
- DONE: implemented and validated

### 1.2 Priority

- P0: rendering correctness and foundational 3D parity
- P1: editor-operable parity and production readiness
- P2: performance, scale, and ecosystem depth
- P3: advanced polish and extension surface

### 1.3 Completion Gate

A task is DONE only when all conditions hold:

1. code + test + doc updated
2. typecheck and targeted tests pass
3. no architecture boundary violations
4. cleanup and migration notes updated

## 2. CHANGE REQUEST (Execution Batch 001)

[CHANGE REQUEST]

Target:

- File / Module:
  - packages/engine/src/kernel/interaction/camera/cameraCommandProtocol.ts
  - packages/engine/src/kernel/interaction/camera/engineCameraController.ts
  - packages/engine/src/testing/cameraProjection.contract.test.mjs

Goal:

- Problem being solved:
  - close the camera-model parity gap by introducing explicit projection semantics (perspective/orthographic) as foundational capability.

Change Type:

- Add + Modify

Impact:

- Affected modules:
  - engine camera protocol
  - engine camera controller
  - engine boundary contract tests

Cleanup:

- Old logic to remove:
  - implicit projection assumptions embedded in distance-only camera state.

Tests:

- Tests to add/update:
  - add camera projection contract test
  - run camera boundary and export responsibility tests

## 3. Test Design

Execution commands for each batch:

1. pnpm -C packages/engine exec node --test src/testing/cameraBoundary.contract.test.mjs src/testing/cameraProjection.contract.test.mjs src/testing/runtimeExportResponsibilityMap.contract.test.mjs
2. pnpm -C packages/engine exec tsc -p tsconfig.json --noEmit

## 4. Full Parity Backlog

### Domain A: Scene Graph and Transform Model

- TP-001 [P0] [K/R] Add explicit scene graph hierarchy invariants (local/world transform cache, dirty propagation contract). Status: TODO
- TP-002 [P0] [K] Add deterministic world matrix compose/invert contracts for 3D nodes. Status: TODO
- TP-003 [P1] [K] Add quaternion rotation support in runtime-world entity schema. Status: TODO
- TP-004 [P1] [K/R] Add parent-child transform inheritance tests with deep hierarchy stress. Status: TODO

### Domain B: Camera System

- TP-010 [P0] [K] Add projection model (perspective/orthographic) and projection-specific parameters. Status: DOING
- TP-011 [P0] [K/R] Add camera frustum derivation contract and visible-set integration. Status: TODO
- TP-012 [P1] [K/R] Add camera aspect/fov/near/far policy and viewport resize synchronization. Status: TODO
- TP-013 [P1] [K] Add camera animation tracks and damping policy parity tests. Status: TODO

### Domain C: Geometry and Mesh Pipeline

- TP-020 [P0] [B/K] Add mesh primitive payload contract (vertex/index streams, topology). Status: DOING
- TP-021 [P0] [B] Add native mesh draw path in WebGL backend (non-rect fallback). Status: DOING
- TP-022 [P1] [B] Add instanced draw path contract and diagnostics. Status: TODO
- TP-023 [P1] [K/R] Add bounds-from-geometry derivation fallback for missing bounds input. Status: TODO

### Domain D: Material and Shading

- TP-030 [P0] [K/B] Add PBR baseline material contract (baseColor, metalness, roughness, normal, emissive, ao). Status: TODO
- TP-031 [P1] [B] Add shader binding path for material uniforms and textures. Status: TODO
- TP-032 [P1] [K/R] Add material override and inheritance policy for editor operations. Status: TODO
- TP-033 [P2] [B] Add custom shader material sandbox contract and guardrails. Status: TODO

### Domain E: Lights and Shadows

- TP-040 [P0] [K/B] Add light entity contracts (directional, point, spot, ambient, hemisphere). Status: TODO
- TP-041 [P0] [B] Add shadow-map baseline path and shadow policy controls. Status: TODO
- TP-042 [P1] [K/R] Add lighting quality tiers tied to frame-budget pressure. Status: TODO
- TP-043 [P2] [B] Add cascaded shadow strategy contract for large scenes. Status: TODO

### Domain F: Renderer and Pass Graph

- TP-050 [P0] [B] Replace packet-only rendering dependency with mesh-capable render graph. Status: TODO
- TP-051 [P1] [R/B] Add render-target contract and multipass orchestration baseline. Status: TODO
- TP-052 [P1] [R/B] Add postprocess pass chain (tone mapping, gamma, bloom baseline). Status: TODO
- TP-053 [P2] [R/B] Add extensible pass registration API under governed surface. Status: TODO

### Domain G: Visibility, Culling, and Spatial Query

- TP-060 [P0] [K] Replace 2D frustum mapping with true 3D frustum culling contract. Status: TODO
- TP-061 [P1] [K] Add occlusion-candidate and LOD-visible-set pipeline contracts. Status: TODO
- TP-062 [P1] [K/R] Add deterministic visible-set snapshots for replay/diagnostics. Status: TODO
- TP-063 [P2] [K] Add clustered culling research path and benchmark gates. Status: TODO

### Domain H: Picking and Interaction Accuracy

- TP-070 [P0] [K] Add mesh triangle-level raycast option alongside bounds-level hit. Status: TODO
- TP-071 [P1] [K/R] Add hit-layer filtering contract (mesh/helper/gizmo/overlay). Status: TODO
- TP-072 [P1] [K] Add stable hit depth ordering and tie-break determinism tests. Status: TODO
- TP-073 [P2] [K] Add high-density picking acceleration strategy. Status: TODO

### Domain I: Asset and Format Ecosystem

- TP-080 [P0] [R/K] Add canonical scene asset abstraction for external loader integration. Status: TODO
- TP-081 [P1] [R] Add glTF runtime ingestion path (geometry/material/node/animation baseline). Status: TODO
- TP-082 [P1] [R] Add texture pipeline integration for KTX2/Basis policies in runtime asset flow. Status: TODO
- TP-083 [P2] [R] Add FBX/OBJ adapter extension contracts behind optional modules. Status: TODO

### Domain J: Animation System

- TP-090 [P0] [K/R] Add keyframe animation clip/channel contracts for transform tracks. Status: TODO
- TP-091 [P1] [K/R] Add skeletal animation baseline contract (bones/skin weights). Status: TODO
- TP-092 [P1] [K/R] Add morph target animation baseline contract. Status: TODO
- TP-093 [P2] [R] Add animation mixer/state machine API and deterministic replay hooks. Status: TODO

### Domain K: Editor Runtime Parity

- TP-100 [P0] [R] Add transform gizmo pipeline (translate/rotate/scale axis constraints). Status: TODO
- TP-101 [P0] [R/K] Add selection mode matrix (single/additive/box/lasso/filter layers). Status: TODO
- TP-102 [P1] [R] Add scene hierarchy operations (reparent/visibility/lock/freeze). Status: TODO
- TP-103 [P1] [R] Add undo/redo command stack parity gates for 3D operations. Status: TODO

### Domain L: Diagnostics and Governance

- TP-110 [P0] [R] Add parity telemetry dashboard fields (render path, light count, mesh draw calls). Status: TODO
- TP-111 [P0] [R/K] Add parity contract suite with scenario snapshots and tolerance gates. Status: TODO
- TP-112 [P1] [R/O] Add performance trend benchmarks for parity domains. Status: TODO
- TP-113 [P1] [R] Add public capability maturity matrix in docs (stable/experimental/blocked). Status: TODO

## 5. Multi-Backend Strategy Decision

Decision: keep multi-backend architecture, but reduce active production maintenance scope.

Reasoning:

1. keep: backend abstraction is required for headless testing, fallback safety, and platform variability.
2. adjust: parity objective requires concentrated investment; spreading equal effort across all backends will stall three.js-level capability.

Execution policy:

1. Primary backend: WebGL (parity target).
2. Secondary backend: WebGPU (experimental parity track).
3. Fallback backend: Canvas2D/Noop/Headless (correctness + diagnostics only, not full visual parity target).

Associated tasks:

- TP-120 [P0] [B/R] Define backend tier policy in capability docs and diagnostics output. Status: TODO
- TP-121 [P0] [B] Ensure WebGL parity features land first; WebGPU follows with compatibility gates. Status: TODO
- TP-122 [P1] [B/R] Freeze non-primary backend feature scope to avoid parity schedule drift. Status: TODO

## 6. Batch 001 Execution Log

- 2026-05-25 Run-001: Started TP-010 camera projection parity baseline.
- 2026-05-25 Run-001.1: Added projection contracts to camera protocol (`EngineCameraProjectionMode`, `setProjection`, projection fields in camera state).
- 2026-05-25 Run-001.2: Added projection normalization in camera controller (defaults + clamp bounds for projection parameters).
- 2026-05-25 Run-001.3: Added projection contract test (`cameraProjection.contract.test.mjs`).
- 2026-05-25 Run-001.4: Validation passed.
  - `pnpm -C packages/engine exec node --test src/testing/cameraBoundary.contract.test.mjs src/testing/cameraProjection.contract.test.mjs src/testing/runtimeExportResponsibilityMap.contract.test.mjs`
  - `pnpm -C packages/engine exec tsc -p tsconfig.json --noEmit`

## 7. Batch 002 CHANGE REQUEST

[CHANGE REQUEST]

Target:

- File / Module:
  - packages/engine/src/backend/adapters/noopBackendAdapter.ts
  - packages/engine/src/orchestration/api/createEngine.ts
  - packages/engine/src/backend/adapters/webglBackendAdapter.ts
  - packages/engine/src/testing/webAdapter.conformance.test.ts

Goal:

- Problem being solved:
  - establish baseline mesh primitive contract and execute first WebGL native mesh triangle submission path.

Change Type:

- Add + Modify

Impact:

- Affected modules:
  - backend payload contracts
  - runtime native payload builder
  - WebGL adapter render path
  - adapter conformance tests

Cleanup:

- Old logic to remove:
  - none in this batch; packet/model-complete paths remain as compatibility fallback.

Tests:

- Tests to add/update:
  - update web adapter conformance with native mesh payload test
  - rerun camera boundary and export-governance contracts

## 8. Batch 002 Execution Log

- 2026-05-25 Run-002.1: Extended native frame payload with `meshes` contract.
- 2026-05-25 Run-002.2: Added baseline mesh payload emission in `createEngine` native payload builder (quad-to-triangle baseline mapping).
- 2026-05-25 Run-002.3: Added WebGL native mesh submission path via color-triangle shader draw calls.
- 2026-05-25 Run-002.4: Added conformance test `webgl adapter emits model-complete diagnostics from native mesh payload`.
- 2026-05-25 Run-002.5: Validation passed.
  - `pnpm -C packages/engine exec tsc -p tsconfig.json --noEmit`
  - `pnpm -C packages/engine dlx tsx --test /Users/yahone/projects/venus/packages/engine/src/testing/webAdapter.conformance.test.ts`
  - `pnpm -C packages/engine exec node --test src/testing/cameraBoundary.contract.test.mjs src/testing/cameraProjection.contract.test.mjs src/testing/runtimeExportResponsibilityMap.contract.test.mjs`

## 9. Batch 003 CHANGE REQUEST

[CHANGE REQUEST]

Target:

- File / Module:
  - packages/engine/src/orchestration/api/public-types/core-foundation.types.ts
  - packages/engine/src/orchestration/api/createEngine.ts
  - packages/engine/src/testing/meshPrimitive.contract.test.ts

Goal:

- Problem being solved:
  - promote mesh primitive payload from backend-local shape to public engine graph contract, then consume authored mesh payloads directly in native frame payload generation.

Change Type:

- Add + Modify

Impact:

- Affected modules:
  - public API contracts for graph nodes
  - native frame payload mesh construction
  - contract tests for mesh payload typing guarantees

Cleanup:

- Old logic to remove:
  - none in this batch; rect-to-triangle mesh fallback is retained as compatibility path.

Tests:

- Tests to add/update:
  - add `meshPrimitive.contract.test.ts`
  - rerun backend conformance and governance contract suites

## 10. Batch 003 Execution Log

- 2026-05-25 Run-003.1: Added public `EngineMeshPrimitiveInput` contract and `EngineGraphNodeInput.mesh` field.
- 2026-05-25 Run-003.2: Updated `createEngine` native frame payload builder to prefer authored `node.mesh` primitives and keep rect-derived fallback.
- 2026-05-25 Run-003.3: Added mesh contract tests in `meshPrimitive.contract.test.ts`.
- 2026-05-25 Run-003.4: Validation passed.
  - `pnpm -C packages/engine exec tsc -p tsconfig.json --noEmit`
  - `pnpm -C packages/engine dlx tsx --test /Users/yahone/projects/venus/packages/engine/src/testing/meshPrimitive.contract.test.ts /Users/yahone/projects/venus/packages/engine/src/testing/webAdapter.conformance.test.ts`
  - `pnpm -C packages/engine exec node --test src/testing/cameraBoundary.contract.test.mjs src/testing/cameraProjection.contract.test.mjs src/testing/runtimeExportResponsibilityMap.contract.test.mjs`

## 11. Batch 004 CHANGE REQUEST

[CHANGE REQUEST]

Target:

- File / Module:
  - packages/engine/src/backend/adapters/webglNativeMeshPresenter.ts
  - packages/engine/src/backend/adapters/webglBackendAdapter.ts
  - packages/engine/src/backend/adapters/noopBackendAdapter.ts
  - packages/engine/src/backend/adapters/webgpuBackendAdapter.ts
  - packages/engine/src/orchestration/api/createEngine.runtime-backend-diagnostics.foundation.ts
  - packages/engine/src/orchestration/api/createEngine.ts
  - packages/engine/src/testing/webAdapter.conformance.test.ts

Goal:

- Problem being solved:
  - remove per-frame shader/buffer re-creation in WebGL native mesh submission path by introducing reusable pipeline cache and expose native mesh submission counters in backend diagnostics.

Change Type:

- Add + Modify

Impact:

- Affected modules:
  - WebGL backend mesh render path
  - backend diagnostics contracts
  - runtime diagnostics projection types
  - adapter conformance tests

Cleanup:

- Old logic to remove:
  - inline mesh presenter implementation in `webglBackendAdapter.ts` replaced by extracted presenter module.

Tests:

- Tests to add/update:
  - extend native mesh conformance test with pipeline reuse and diagnostics counter assertions
  - rerun typecheck, adapter conformance, and governance contract tests

## 12. Batch 004 Execution Log

- 2026-05-25 Run-004.1: Extracted native mesh presenter into `webglNativeMeshPresenter.ts` with reusable shader/buffer cache.
- 2026-05-25 Run-004.2: Wired WebGL adapter to cached presenter path and cache disposal on backend dispose.
- 2026-05-25 Run-004.3: Added diagnostics counters (`webglNativeMeshAttemptedCount`, `webglNativeMeshSubmittedCount`, `webglNativeMeshPipelineCompileCount`, `webglNativeMeshPipelineReuseCount`) to backend diagnostics contract and propagation points.
- 2026-05-25 Run-004.4: Extended conformance test to assert two-frame pipeline reuse behavior.
- 2026-05-25 Run-004.5: Validation passed.
  - `pnpm -C packages/engine exec tsc -p tsconfig.json --noEmit`
  - `pnpm -C packages/engine dlx tsx --test /Users/yahone/projects/venus/packages/engine/src/testing/webAdapter.conformance.test.ts /Users/yahone/projects/venus/packages/engine/src/testing/meshPrimitive.contract.test.ts`
  - `pnpm -C packages/engine exec node --test src/testing/cameraBoundary.contract.test.mjs src/testing/cameraProjection.contract.test.mjs src/testing/runtimeExportResponsibilityMap.contract.test.mjs`

## 13. Batch 005 CHANGE REQUEST

[CHANGE REQUEST]

Target:

- File / Module:
  - packages/engine/src/backend/adapters/webglNativeMeshPresenter.ts
  - packages/engine/src/backend/adapters/webglBackendAdapter.ts
  - packages/engine/src/backend/adapters/noopBackendAdapter.ts
  - packages/engine/src/backend/adapters/webgpuBackendAdapter.ts
  - packages/engine/src/orchestration/api/createEngine.runtime-backend-diagnostics.foundation.ts
  - packages/engine/src/orchestration/api/createEngine.ts
  - packages/engine/src/testing/webAdapter.conformance.test.ts

Goal:

- Problem being solved:
  - harden native mesh submission validation for indexed/non-indexed paths and expose deterministic rejection-reason diagnostics for parity telemetry and debugging.

Change Type:

- Add + Modify

Impact:

- Affected modules:
  - WebGL native mesh presenter validation pipeline
  - backend diagnostics contracts and runtime projection types
  - adapter conformance classification tests

Cleanup:

- Old logic to remove:
  - permissive index filtering fallback that masked invalid mesh payload reasons.

Tests:

- Tests to add/update:
  - extend native mesh success-path assertions with new rejection counters
  - add rejection-classification conformance test for invalid position/index/stream payloads
  - rerun typecheck, adapter conformance, and governance contract tests

## 14. Batch 005 Execution Log

- 2026-05-25 Run-005.1: Added mesh rejection counters to native mesh submission diagnostics (`rejected`, `invalid-position`, `invalid-index`, `insufficient-stream`, `capability-gate`).
- 2026-05-25 Run-005.2: Hardened indexed/non-indexed mesh validation rules in `webglNativeMeshPresenter.ts` (triangle-compatible index cardinality, bounds validation, non-indexed stream cardinality).
- 2026-05-25 Run-005.3: Propagated new rejection counters through backend diagnostics contracts, runtime diagnostics projection, and default snapshots.
- 2026-05-25 Run-005.4: Added conformance test `webgl adapter classifies native mesh rejection diagnostics` and updated success-path assertions.
- 2026-05-25 Run-005.5: Validation passed.
  - `pnpm -C packages/engine exec tsc -p tsconfig.json --noEmit`
  - `pnpm -C packages/engine dlx tsx --test /Users/yahone/projects/venus/packages/engine/src/testing/webAdapter.conformance.test.ts /Users/yahone/projects/venus/packages/engine/src/testing/meshPrimitive.contract.test.ts`
  - `pnpm -C packages/engine exec node --test src/testing/cameraBoundary.contract.test.mjs src/testing/cameraProjection.contract.test.mjs src/testing/runtimeExportResponsibilityMap.contract.test.mjs`

## 15. Batch 006 CHANGE REQUEST

[CHANGE REQUEST]

Target:

- File / Module:
  - packages/engine/src/testing/webAdapter.conformance.test.ts

Goal:

- Problem being solved:
  - close diagnostics coverage gap by asserting native mesh capability-gate rejection counters when required WebGL submission APIs are unavailable.

Change Type:

- Modify

Impact:

- Affected modules:
  - adapter conformance diagnostics coverage

Cleanup:

- Old logic to remove:
  - none; this batch extends verification coverage only.

Tests:

- Tests to add/update:
  - add `webgl adapter classifies native mesh capability-gate diagnostics`
  - rerun web adapter conformance and typecheck

## 16. Batch 006 Execution Log

- 2026-05-25 Run-006.1: Added capability-gate conformance test for WebGL native mesh diagnostics.
- 2026-05-25 Run-006.2: Validation passed.
  - `pnpm -C packages/engine dlx tsx --test /Users/yahone/projects/venus/packages/engine/src/testing/webAdapter.conformance.test.ts`
  - `pnpm -C packages/engine exec tsc -p tsconfig.json --noEmit`

## 17. Batch 007 CHANGE REQUEST

[CHANGE REQUEST]

Target:

- File / Module:
  - packages/engine/src/orchestration/api/public-types/core-foundation.types.ts
  - packages/engine/src/orchestration/api/createEngine.ts
  - packages/engine/src/backend/adapters/noopBackendAdapter.ts
  - packages/engine/src/backend/adapters/webglNativeMeshPresenter.ts
  - packages/engine/src/backend/adapters/webglBackendAdapter.ts
  - packages/engine/src/backend/adapters/webgpuBackendAdapter.ts
  - packages/engine/src/orchestration/api/createEngine.runtime-backend-diagnostics.foundation.ts
  - packages/engine/src/testing/meshPrimitive.contract.test.ts
  - packages/engine/src/testing/webAdapter.conformance.test.ts

Goal:

- Problem being solved:
  - promote mesh topology to public graph contract while keeping runtime submission deterministic by accepting triangles only and classifying unsupported topology rejections.

Change Type:

- Add + Modify

Impact:

- Affected modules:
  - public mesh contract and native payload builder
  - WebGL mesh submission diagnostics classification
  - backend diagnostics contract propagation
  - mesh contract and adapter conformance tests

Cleanup:

- Old logic to remove:
  - implicit topology assumption with no explicit diagnostics for non-triangle payloads.

Tests:

- Tests to add/update:
  - update mesh primitive contract tests for topology field
  - extend rejection diagnostics conformance with unsupported topology coverage
  - rerun typecheck, adapter conformance, and governance contract tests

## 18. Batch 007 Execution Log

- 2026-05-25 Run-007.1: Added public mesh topology contract token (`triangles | lines | points`) to `EngineMeshPrimitiveInput`.
- 2026-05-25 Run-007.2: Propagated topology through native frame payload generation with deterministic default (`triangles`).
- 2026-05-25 Run-007.3: Added triangles-only runtime guard in `webglNativeMeshPresenter.ts` and introduced unsupported-topology rejection diagnostics counter.
- 2026-05-25 Run-007.4: Propagated unsupported-topology diagnostics through backend contracts, runtime diagnostics projection, and backend emitters.
- 2026-05-25 Run-007.5: Updated mesh contract tests and conformance rejection scenario to cover topology acceptance/rejection behavior.
- 2026-05-25 Run-007.6: Validation passed.
  - `pnpm -C packages/engine exec tsc -p tsconfig.json --noEmit`
  - `pnpm -C packages/engine dlx tsx --test /Users/yahone/projects/venus/packages/engine/src/testing/meshPrimitive.contract.test.ts /Users/yahone/projects/venus/packages/engine/src/testing/webAdapter.conformance.test.ts`
  - `pnpm -C packages/engine exec node --test src/testing/cameraBoundary.contract.test.mjs src/testing/cameraProjection.contract.test.mjs src/testing/runtimeExportResponsibilityMap.contract.test.mjs`

## 19. Batch 008 CHANGE REQUEST

[CHANGE REQUEST]

Target:

- File / Module:
  - packages/engine/src/backend/adapters/noopBackendAdapter.ts
  - packages/engine/src/backend/adapters/webglNativeMeshPresenter.ts
  - packages/engine/src/backend/adapters/webglBackendAdapter.ts
  - packages/engine/src/backend/adapters/webgpuBackendAdapter.ts
  - packages/engine/src/orchestration/api/createEngine.runtime-backend-diagnostics.foundation.ts
  - packages/engine/src/orchestration/api/createEngine.ts
  - packages/engine/src/testing/webAdapter.conformance.test.ts

Goal:

- Problem being solved:
  - expose topology capability diagnostics (supported/rejected sets) and stage line-topology planning hooks without enabling line draw submission.

Change Type:

- Modify

Impact:

- Affected modules:
  - WebGL native mesh diagnostics payload model
  - backend diagnostics contract propagation
  - adapter conformance assertions

Cleanup:

- Old logic to remove:
  - implicit topology capability reporting via counters only (no explicit supported/rejected topology sets).

Tests:

- Tests to add/update:
  - extend rejection/capability-gate conformance assertions with supported/rejected topology sets and line-planning counter
  - rerun typecheck, adapter conformance, and governance contract tests

## 20. Batch 008 Execution Log

- 2026-05-25 Run-008.1: Added topology capability diagnostics fields (`webglNativeMeshSupportedTopologies`, `webglNativeMeshRejectedTopologies`, `webglNativeMeshLineTopologyPlannedCount`) to backend contracts and runtime projection types.
- 2026-05-25 Run-008.2: Extended native mesh presenter diagnostics to report supported/rejected topology sets and line-topology planning hook count.
- 2026-05-25 Run-008.3: Propagated topology capability diagnostics through WebGL/WebGPU emitters and engine default diagnostics snapshot.
- 2026-05-25 Run-008.4: Extended conformance tests to assert topology capability sets and line-planning behavior in both rejection and capability-gate scenarios.
- 2026-05-25 Run-008.5: Validation passed.
  - `pnpm -C packages/engine exec tsc -p tsconfig.json --noEmit`
  - `pnpm -C packages/engine dlx tsx --test /Users/yahone/projects/venus/packages/engine/src/testing/meshPrimitive.contract.test.ts /Users/yahone/projects/venus/packages/engine/src/testing/webAdapter.conformance.test.ts`
  - `pnpm -C packages/engine exec node --test src/testing/cameraBoundary.contract.test.mjs src/testing/cameraProjection.contract.test.mjs src/testing/runtimeExportResponsibilityMap.contract.test.mjs`

## 21. Batch 009 CHANGE REQUEST

[CHANGE REQUEST]

Target:

- File / Module:
  - packages/engine/src/backend/adapters/noopBackendAdapter.ts
  - packages/engine/src/backend/adapters/webglNativeMeshPresenter.ts
  - packages/engine/src/backend/adapters/webglBackendAdapter.ts
  - packages/engine/src/backend/adapters/webgpuBackendAdapter.ts
  - packages/engine/src/orchestration/api/createEngine.runtime-backend-diagnostics.foundation.ts
  - packages/engine/src/orchestration/api/createEngine.ts
  - packages/engine/src/testing/webAdapter.conformance.test.ts

Goal:

- Problem being solved:
  - introduce strict line-topology preflight diagnostics (attempted/passed/rejected + rejection sub-reasons) while keeping line submission disabled.

Change Type:

- Modify

Impact:

- Affected modules:
  - WebGL native mesh presenter validation diagnostics
  - backend diagnostics contract propagation
  - adapter conformance assertions

Cleanup:

- Old logic to remove:
  - line planning diagnostics without explicit preflight acceptance/rejection breakdown.

Tests:

- Tests to add/update:
  - extend rejection/capability-gate conformance assertions with line preflight diagnostics counters
  - rerun typecheck, adapter conformance, and governance contract tests

## 22. Batch 009 Execution Log

- 2026-05-25 Run-009.1: Added line-topology preflight diagnostics counters to native mesh presenter (`attempted`, `passed`, `rejected`, and rejection sub-reasons).
- 2026-05-25 Run-009.2: Propagated line preflight diagnostics through backend contracts, runtime diagnostics projection, and WebGL/WebGPU emitters.
- 2026-05-25 Run-009.3: Updated conformance tests to assert line preflight counters in rejection and capability-gate scenarios.
- 2026-05-25 Run-009.4: Validation passed.
  - `pnpm -C packages/engine exec tsc -p tsconfig.json --noEmit`
  - `pnpm -C packages/engine dlx tsx --test /Users/yahone/projects/venus/packages/engine/src/testing/meshPrimitive.contract.test.ts /Users/yahone/projects/venus/packages/engine/src/testing/webAdapter.conformance.test.ts`
  - `pnpm -C packages/engine exec node --test src/testing/cameraBoundary.contract.test.mjs src/testing/cameraProjection.contract.test.mjs src/testing/runtimeExportResponsibilityMap.contract.test.mjs`

## 23. Batch 010 CHANGE REQUEST

[CHANGE REQUEST]

Target:

- File / Module:
  - packages/engine/src/backend/adapters/noopBackendAdapter.ts
  - packages/engine/src/backend/adapters/webglNativeMeshPresenter.ts
  - packages/engine/src/backend/adapters/webglBackendAdapter.ts
  - packages/engine/src/backend/adapters/webgpuBackendAdapter.ts
  - packages/engine/src/orchestration/api/createEngine.runtime-backend-diagnostics.foundation.ts
  - packages/engine/src/orchestration/api/createEngine.ts
  - packages/engine/src/testing/webAdapter.conformance.test.ts

Goal:

- Problem being solved:
  - add diagnostics-only line draw-plan synthesis counters so line payload batching readiness can be measured before enabling GL.LINES submission.

Change Type:

- Modify

Impact:

- Affected modules:
  - WebGL native mesh presenter line-topology planning diagnostics
  - backend diagnostics contract propagation
  - adapter conformance assertions for line draw-plan counters

Cleanup:

- Old logic to remove:
  - no explicit line draw-plan synthesis counters for preflight-passed line payloads.

Tests:

- Tests to add/update:
  - extend rejection/capability-gate conformance assertions with line draw-plan attempt/command/deferred counters
  - rerun typecheck, adapter conformance, and governance contract tests

## 24. Batch 010 Execution Log

- 2026-05-26 Run-010.1: Added line draw-plan synthesis diagnostics in native mesh presenter (`lineTopologyDrawPlanAttemptedCount`, `lineTopologyDrawPlanCommandCount`, `lineTopologySubmissionDeferredCount`) while keeping line submission disabled.
- 2026-05-26 Run-010.2: Propagated line draw-plan diagnostics through backend contracts, runtime diagnostics projection, and WebGL/WebGPU emitters/defaults.
- 2026-05-26 Run-010.3: Updated conformance tests to assert line draw-plan counters in rejection and capability-gate scenarios.
- 2026-05-26 Run-010.4: Validation passed.
  - `pnpm -C packages/engine exec tsc -p tsconfig.json --noEmit`
  - `pnpm -C packages/engine dlx tsx --test /Users/yahone/projects/venus/packages/engine/src/testing/meshPrimitive.contract.test.ts /Users/yahone/projects/venus/packages/engine/src/testing/webAdapter.conformance.test.ts`
  - `pnpm -C packages/engine exec node --test src/testing/cameraBoundary.contract.test.mjs src/testing/cameraProjection.contract.test.mjs src/testing/runtimeExportResponsibilityMap.contract.test.mjs`

## 25. Batch 011 CHANGE REQUEST

[CHANGE REQUEST]

Target:

- File / Module:
  - packages/engine/src/backend/adapters/noopBackendAdapter.ts
  - packages/engine/src/backend/adapters/webglNativeMeshPresenter.ts
  - packages/engine/src/backend/adapters/webglBackendAdapter.ts
  - packages/engine/src/backend/adapters/webgpuBackendAdapter.ts
  - packages/engine/src/orchestration/api/createEngine.runtime-backend-diagnostics.foundation.ts
  - packages/engine/src/orchestration/api/createEngine.ts
  - packages/engine/src/testing/webAdapter.conformance.test.ts

Goal:

- Problem being solved:
  - enable native GL.LINES submission behind an explicit payload gate and publish deterministic line submission counters (attempted/succeeded/failed/gate-blocked).

Change Type:

- Modify

Impact:

- Affected modules:
  - WebGL native mesh presenter topology handling and submission diagnostics
  - backend diagnostics contract propagation
  - native payload mesh shaping for non-triangle topologies
  - adapter conformance assertions for line gate enabled/disabled behavior

Cleanup:

- Old logic to remove:
  - diagnostics-only line topology branch that always rejected lines as unsupported regardless of gate intent.

Tests:

- Tests to add/update:
  - extend rejection/capability-gate assertions with line submission counters
  - add explicit conformance coverage for gate-enabled GL.LINES submission
  - rerun typecheck, adapter conformance, and governance contract tests

## 26. Batch 011 Execution Log

- 2026-05-26 Run-011.1: Added payload-level line submission gate and GL.LINES submission path for preflight-passed line meshes.
- 2026-05-26 Run-011.2: Added line submission diagnostics counters (`attempted`, `succeeded`, `failed`, `gate-blocked`) and propagated them through backend/runtime contracts and defaults.
- 2026-05-26 Run-011.3: Updated native payload mesh shaping to preserve topology-specific minimum stream requirements and optional indices for line payloads.
- 2026-05-26 Run-011.4: Extended conformance tests with gate-enabled line submission coverage and updated gate-disabled/capability-gate assertions for new counters.
- 2026-05-26 Run-011.5: Validation passed.
  - `pnpm -C packages/engine exec tsc -p tsconfig.json --noEmit`
  - `pnpm -C packages/engine dlx tsx --test /Users/yahone/projects/venus/packages/engine/src/testing/meshPrimitive.contract.test.ts /Users/yahone/projects/venus/packages/engine/src/testing/webAdapter.conformance.test.ts`
  - `pnpm -C packages/engine exec node --test src/testing/cameraBoundary.contract.test.mjs src/testing/cameraProjection.contract.test.mjs src/testing/runtimeExportResponsibilityMap.contract.test.mjs`

## 27. Batch 012 CHANGE REQUEST

[CHANGE REQUEST]

Target:

- File / Module:
  - packages/engine/src/backend/adapters/noopBackendAdapter.ts
  - packages/engine/src/backend/adapters/webglNativeMeshPresenter.ts
  - packages/engine/src/backend/adapters/webglBackendAdapter.ts
  - packages/engine/src/backend/adapters/webgpuBackendAdapter.ts
  - packages/engine/src/orchestration/api/createEngine.runtime-backend-diagnostics.foundation.ts
  - packages/engine/src/orchestration/api/createEngine.ts
  - packages/engine/src/testing/webAdapter.conformance.test.ts

Goal:

- Problem being solved:
  - add a dedicated diagnostics reason for gate-enabled line submission failures when GL.LINES primitive is unavailable, and separate this from unsupported-topology rejection classification.

Change Type:

- Modify

Impact:

- Affected modules:
  - WebGL native mesh line-topology submission failure classification
  - backend diagnostics contract propagation
  - adapter conformance assertions for missing-LINES failure path

Cleanup:

- Old logic to remove:
  - classifying missing GL.LINES primitive submission failures as unsupported topology.

Tests:

- Tests to add/update:
  - add conformance coverage for gate-enabled line submission with missing GL.LINES primitive
  - extend rejection/success/capability-gate assertions with dedicated missing-LINES failure counter
  - rerun typecheck, adapter conformance, and governance contract tests

## 28. Batch 012 Execution Log

- 2026-05-26 Run-012.1: Added dedicated counter `lineTopologySubmissionFailedMissingLinesPrimitiveCount` and wired it through backend/runtime diagnostics contracts and defaults.
- 2026-05-26 Run-012.2: Updated line submission branch to classify missing GL.LINES primitive as submission failure (not unsupported topology).
- 2026-05-26 Run-012.3: Added conformance test covering gate-enabled line submission when GL.LINES primitive is unavailable, and updated related assertions for new counter.
- 2026-05-26 Run-012.4: Validation passed.
  - `pnpm -C packages/engine exec tsc -p tsconfig.json --noEmit`
  - `pnpm -C packages/engine dlx tsx --test /Users/yahone/projects/venus/packages/engine/src/testing/meshPrimitive.contract.test.ts /Users/yahone/projects/venus/packages/engine/src/testing/webAdapter.conformance.test.ts`
  - `pnpm -C packages/engine exec node --test src/testing/cameraBoundary.contract.test.mjs src/testing/cameraProjection.contract.test.mjs src/testing/runtimeExportResponsibilityMap.contract.test.mjs`

## 29. Batch 013 CHANGE REQUEST

[CHANGE REQUEST]

Target:

- File / Module:
  - packages/engine/src/backend/adapters/noopBackendAdapter.ts
  - packages/engine/src/backend/adapters/webglNativeMeshPresenter.ts
  - packages/engine/src/backend/adapters/webglBackendAdapter.ts
  - packages/engine/src/backend/adapters/webgpuBackendAdapter.ts
  - packages/engine/src/orchestration/api/createEngine.runtime-backend-diagnostics.foundation.ts
  - packages/engine/src/orchestration/api/createEngine.ts
  - packages/engine/src/testing/webAdapter.conformance.test.ts

Goal:

- Problem being solved:
  - expose a structured line submission failure reason token (`none` / `missing-lines-primitive` / `insufficient-stream`) in backend diagnostics so telemetry consumers do not need counter-diff inference.

Change Type:

- Modify

Impact:

- Affected modules:
  - WebGL native mesh line submission diagnostics classification
  - backend diagnostics contract propagation
  - adapter conformance assertions for reason token semantics

Cleanup:

- Old logic to remove:
  - failure classification relying only on counters without explicit reason token.

Tests:

- Tests to add/update:
  - extend gate-disabled, gate-enabled-success, missing-LINES, and capability-gate assertions with reason token checks
  - rerun typecheck, adapter conformance, and governance contract tests

## 30. Batch 013 Execution Log

- 2026-05-26 Run-013.1: Added structured line submission failure reason token (`lineTopologySubmissionFailureReason`) to native mesh presenter diagnostics.
- 2026-05-26 Run-013.2: Classified line submission failure branches with deterministic reason token updates (`missing-lines-primitive`, `insufficient-stream`) while preserving existing counters.
- 2026-05-26 Run-013.3: Propagated reason token through backend diagnostics contracts, WebGL/WebGPU emitters/defaults, runtime projection, and createEngine default diagnostics.
- 2026-05-26 Run-013.4: Updated conformance assertions to verify reason token behavior across gate-disabled, gate-enabled-success, missing-LINES, and capability-gate scenarios.
- 2026-05-26 Run-013.5: Validation passed.
  - `pnpm -C packages/engine exec tsc -p tsconfig.json --noEmit`
  - `pnpm -C packages/engine dlx tsx --test /Users/yahone/projects/venus/packages/engine/src/testing/meshPrimitive.contract.test.ts /Users/yahone/projects/venus/packages/engine/src/testing/webAdapter.conformance.test.ts`
  - `pnpm -C packages/engine exec node --test src/testing/cameraBoundary.contract.test.mjs src/testing/cameraProjection.contract.test.mjs src/testing/runtimeExportResponsibilityMap.contract.test.mjs`

## 31. Batch 014 CHANGE REQUEST

[CHANGE REQUEST]

Target:

- File / Module:
  - packages/engine/src/backend/adapters/noopBackendAdapter.ts
  - packages/engine/src/backend/adapters/webglNativeMeshPresenter.ts
  - packages/engine/src/backend/adapters/webglBackendAdapter.ts
  - packages/engine/src/backend/adapters/webgpuBackendAdapter.ts
  - packages/engine/src/orchestration/api/createEngine.runtime-backend-diagnostics.foundation.ts
  - packages/engine/src/orchestration/api/createEngine.ts
  - packages/engine/src/testing/webAdapter.conformance.test.ts

Goal:

- Problem being solved:
  - expose per-frame line submission reason histogram buckets alongside latest reason token so telemetry can distinguish aggregate failure distribution from last-event reason.

Change Type:

- Modify

Impact:

- Affected modules:
  - WebGL native mesh line submission diagnostics counters and reason aggregation
  - backend diagnostics contract propagation
  - adapter conformance assertions for histogram behavior

Cleanup:

- Old logic to remove:
  - single-bucket reason counting that could not represent multiple failing line submissions in one frame.

Tests:

- Tests to add/update:
  - extend existing assertions with insufficient-stream histogram bucket checks
  - update missing-LINES failure test to assert aggregate histogram counts across multiple failing meshes in one frame
  - rerun typecheck, adapter conformance, and governance contract tests

## 32. Batch 014 Execution Log

- 2026-05-26 Run-014.1: Added per-frame insufficient-stream histogram bucket (`lineTopologySubmissionFailedInsufficientStreamCount`) alongside existing missing-lines bucket and reason token.
- 2026-05-26 Run-014.2: Propagated new histogram bucket through backend diagnostics contracts, WebGL/WebGPU emitters/defaults, runtime projection, and createEngine default diagnostics.
- 2026-05-26 Run-014.3: Updated conformance assertions for all key paths and expanded missing-LINES test to validate aggregate histogram behavior with two failing line meshes in one frame.
- 2026-05-26 Run-014.4: Validation passed.
  - `pnpm -C packages/engine exec tsc -p tsconfig.json --noEmit`
  - `pnpm -C packages/engine dlx tsx --test /Users/yahone/projects/venus/packages/engine/src/testing/meshPrimitive.contract.test.ts /Users/yahone/projects/venus/packages/engine/src/testing/webAdapter.conformance.test.ts`
  - `pnpm -C packages/engine exec node --test src/testing/cameraBoundary.contract.test.mjs src/testing/cameraProjection.contract.test.mjs src/testing/runtimeExportResponsibilityMap.contract.test.mjs`

## 33. Batch 015 CHANGE REQUEST

[CHANGE REQUEST]

Target:

- File / Module:
  - packages/engine/src/backend/adapters/noopBackendAdapter.ts
  - packages/engine/src/backend/adapters/webglNativeMeshPresenter.ts
  - packages/engine/src/backend/adapters/webglBackendAdapter.ts
  - packages/engine/src/backend/adapters/webgpuBackendAdapter.ts
  - packages/engine/src/orchestration/api/createEngine.runtime-backend-diagnostics.foundation.ts
  - packages/engine/src/orchestration/api/createEngine.ts
  - packages/engine/src/testing/webAdapter.conformance.test.ts

Goal:

- Problem being solved:
  - expose a compact line-submission failure summary tuple (`failedCount`, `latestReason`, reason histogram buckets) on runtime/backend diagnostics so telemetry exporters can consume a stable shape without recomputation.

Change Type:

- Modify

Impact:

- Affected modules:
  - WebGL line submission diagnostics packaging
  - backend diagnostics contract propagation
  - conformance assertions for tuple shape stability across WebGL and WebGPU paths

Cleanup:

- Old logic to remove:
  - relying on separate scalar counters/tokens only for telemetry export composition.

Tests:

- Tests to add/update:
  - assert compact summary tuple in WebGL missing-LINES failure scenario
  - assert compact summary tuple default shape in WebGPU native submission diagnostics path
  - rerun typecheck, adapter conformance, and governance contract tests

## 34. Batch 015 Execution Log

- 2026-05-26 Run-015.1: Added compact line submission failure summary tuple to native mesh presenter diagnostics and normalized it before return.
- 2026-05-26 Run-015.2: Propagated summary tuple through backend diagnostics contracts, WebGL/WebGPU emitters/defaults, runtime projection, and createEngine default diagnostics.
- 2026-05-26 Run-015.3: Added integration-style conformance assertions validating stable summary tuple shape on both WebGL failure path and WebGPU diagnostics path.
- 2026-05-26 Run-015.4: Validation passed.
  - `pnpm -C packages/engine exec tsc -p tsconfig.json --noEmit`
  - `pnpm -C packages/engine dlx tsx --test /Users/yahone/projects/venus/packages/engine/src/testing/meshPrimitive.contract.test.ts /Users/yahone/projects/venus/packages/engine/src/testing/webAdapter.conformance.test.ts`
  - `pnpm -C packages/engine exec node --test src/testing/cameraBoundary.contract.test.mjs src/testing/cameraProjection.contract.test.mjs src/testing/runtimeExportResponsibilityMap.contract.test.mjs`

## 35. Batch 016 CHANGE REQUEST

[CHANGE REQUEST]

Target:

- File / Module:
  - packages/engine/src/backend/adapters/webglNativeMeshPresenter.ts
  - packages/engine/src/testing/webAdapter.conformance.test.ts

Goal:

- Problem being solved:
  - close insufficient-stream reason token branch coverage for gate-enabled line submission by classifying preflight insufficient-stream cases into submission failure telemetry summary.

Change Type:

- Modify

Impact:

- Affected modules:
  - WebGL native mesh presenter line preflight failure classification
  - WebGL adapter conformance branch coverage for insufficient-stream reason path

Cleanup:

- Old logic to remove:
  - untested/under-observable insufficient-stream reason path lacking dedicated scenario coverage.

Tests:

- Tests to add/update:
  - add gate-enabled insufficient-stream conformance scenario (LINES present, underpopulated stream)
  - assert reason token and compact summary tuple resolve to `insufficient-stream`
  - rerun typecheck, adapter conformance, and governance contract tests

## 36. Batch 016 Execution Log

- 2026-05-26 Run-016.1: Updated line preflight insufficient-stream branch to classify gate-enabled cases as line submission failures for telemetry parity.
- 2026-05-26 Run-016.2: Added dedicated conformance test for gate-enabled insufficient-stream scenario and assertions over reason token + compact summary tuple.
- 2026-05-26 Run-016.3: Validation passed.
  - `pnpm -C packages/engine exec tsc -p tsconfig.json --noEmit`
  - `pnpm -C packages/engine dlx tsx --test /Users/yahone/projects/venus/packages/engine/src/testing/meshPrimitive.contract.test.ts /Users/yahone/projects/venus/packages/engine/src/testing/webAdapter.conformance.test.ts`
  - `pnpm -C packages/engine exec node --test src/testing/cameraBoundary.contract.test.mjs src/testing/cameraProjection.contract.test.mjs src/testing/runtimeExportResponsibilityMap.contract.test.mjs`

## 37. Batch 017 CHANGE REQUEST

[CHANGE REQUEST]

Target:

- File / Module:
  - packages/engine/src/backend/adapters/webglNativeMeshPresenter.ts
  - packages/engine/src/backend/adapters/noopBackendAdapter.ts
  - packages/engine/src/backend/adapters/webglBackendAdapter.ts
  - packages/engine/src/backend/adapters/webgpuBackendAdapter.ts
  - packages/engine/src/orchestration/api/createEngine.runtime-backend-diagnostics.foundation.ts
  - packages/engine/src/orchestration/api/createEngine.ts
  - packages/engine/src/testing/webAdapter.conformance.test.ts

Goal:

- Problem being solved:
  - expose an explicit line-topology submission gate-state token (`enabled` / `disabled`) in backend/runtime diagnostics so telemetry consumers can distinguish gate-deferred behavior from submission failures without inferring from counters.

Change Type:

- Modify

Impact:

- Affected modules:
  - WebGL native mesh presenter diagnostics envelope
  - backend diagnostics contract propagation and default snapshots
  - WebGL/WebGPU diagnostics emitters
  - adapter conformance assertions for gate-state semantics

Cleanup:

- Old logic to remove:
  - implicit gate-state inference via deferred/gate-blocked counters only.

Tests:

- Tests to add/update:
  - extend WebGL gate-disabled and gate-enabled line-topology conformance assertions with explicit gate-state checks
  - extend WebGPU native diagnostics conformance assertion with deterministic `disabled` gate-state default
  - rerun typecheck, adapter conformance, and governance contract tests

## 38. Batch 017 Execution Log

- 2026-05-26 Run-017.1: Added line-topology submission gate-state token to native mesh presenter diagnostics and normalized per-frame value from payload gate.
- 2026-05-26 Run-017.2: Propagated gate-state token through backend diagnostics contracts, WebGL/WebGPU emitters, runtime diagnostics foundation typing, and createEngine default diagnostics snapshot.
- 2026-05-26 Run-017.3: Updated conformance assertions to verify gate-state behavior across WebGL gate-disabled, WebGL gate-enabled, and WebGPU default diagnostics paths.
- 2026-05-26 Run-017.4: Validation passed.
  - `pnpm -C packages/engine exec tsc -p tsconfig.json --noEmit`
  - `pnpm -C packages/engine dlx tsx --test /Users/yahone/projects/venus/packages/engine/src/testing/meshPrimitive.contract.test.ts /Users/yahone/projects/venus/packages/engine/src/testing/webAdapter.conformance.test.ts`
  - `pnpm -C packages/engine exec node --test src/testing/cameraBoundary.contract.test.mjs src/testing/cameraProjection.contract.test.mjs src/testing/runtimeExportResponsibilityMap.contract.test.mjs`

## 39. Batch 018 CHANGE REQUEST

[CHANGE REQUEST]

Target:

- File / Module:
  - packages/engine/src/backend/adapters/webglNativeMeshPresenter.ts
  - packages/engine/src/testing/webAdapter.conformance.test.ts

Goal:

- Problem being solved:
  - align mesh-level insufficient-stream rejection accounting with gate-enabled line preflight insufficient-stream classification so aggregate mesh rejection telemetry stays reason-consistent.

Change Type:

- Modify

Impact:

- Affected modules:
  - WebGL native mesh presenter line preflight insufficient-stream branch
  - WebGL adapter conformance assertion for insufficient-stream rejection counters

Cleanup:

- Old logic to remove:
  - undercount path where gate-enabled line insufficient-stream failures updated line submission failure counters but not mesh-level insufficient-stream rejection counter.

Tests:

- Tests to add/update:
  - update gate-enabled insufficient-stream conformance expectation for mesh-level insufficient-stream rejection counter
  - rerun typecheck, adapter conformance, and governance contract tests

## 40. Batch 018 Execution Log

- 2026-05-26 Run-018.1: Updated line preflight insufficient-stream classification to increment mesh-level insufficient-stream rejection histogram in `webglNativeMeshPresenter`.
- 2026-05-26 Run-018.2: Updated gate-enabled insufficient-stream conformance assertion to expect aligned mesh-level insufficient-stream rejection count.
- 2026-05-26 Run-018.3: Validation passed.
  - `pnpm -C packages/engine exec tsc -p tsconfig.json --noEmit`
  - `pnpm -C packages/engine dlx tsx --test /Users/yahone/projects/venus/packages/engine/src/testing/meshPrimitive.contract.test.ts /Users/yahone/projects/venus/packages/engine/src/testing/webAdapter.conformance.test.ts`
  - `pnpm -C packages/engine exec node --test src/testing/cameraBoundary.contract.test.mjs src/testing/cameraProjection.contract.test.mjs src/testing/runtimeExportResponsibilityMap.contract.test.mjs`

## 41. Batch 019 CHANGE REQUEST

[CHANGE REQUEST]

Target:

- File / Module:
  - packages/engine/src/backend/adapters/webglNativeMeshPresenter.ts
  - packages/engine/src/backend/adapters/noopBackendAdapter.ts
  - packages/engine/src/backend/adapters/webglBackendAdapter.ts
  - packages/engine/src/backend/adapters/webgpuBackendAdapter.ts
  - packages/engine/src/orchestration/api/createEngine.runtime-backend-diagnostics.foundation.ts
  - packages/engine/src/orchestration/api/createEngine.ts
  - packages/engine/src/testing/webAdapter.conformance.test.ts

Goal:

- Problem being solved:
  - add one compact line-topology submission outcome token (`none`, `deferred-gate-disabled`, `submitted`, `failed`) so telemetry and replay tooling can consume final per-frame line submission status without counter-diff inference.

Change Type:

- Modify

Impact:

- Affected modules:
  - WebGL native mesh presenter diagnostics summary normalization
  - backend diagnostics contract propagation and defaults
  - WebGL/WebGPU diagnostics emitters
  - adapter conformance assertions for deterministic outcome semantics

Cleanup:

- Old logic to remove:
  - implicit outcome interpretation via multiple scalar counters only.

Tests:

- Tests to add/update:
  - update WebGL conformance assertions to validate outcome token across gate-disabled, gate-enabled-success, and failure paths
  - update WebGPU diagnostics conformance assertion for deterministic default outcome token
  - rerun typecheck, adapter conformance, and governance contract tests

## 42. Batch 019 Execution Log

- 2026-05-26 Run-019.1: Added compact line-topology submission outcome token (`none`, `deferred-gate-disabled`, `submitted`, `failed`) to native mesh presenter diagnostics and normalized terminal value from frame counters.
- 2026-05-26 Run-019.2: Propagated outcome token through backend diagnostics contracts, WebGL/WebGPU emitters, runtime diagnostics foundation typing, and createEngine default diagnostics snapshot.
- 2026-05-26 Run-019.3: Extended conformance assertions to verify deterministic outcome token semantics across gate-disabled, gate-enabled success, failure, and WebGPU default paths.
- 2026-05-26 Run-019.4: Validation passed.
  - `pnpm -C packages/engine exec tsc -p tsconfig.json --noEmit`
  - `pnpm -C packages/engine dlx tsx --test /Users/yahone/projects/venus/packages/engine/src/testing/meshPrimitive.contract.test.ts /Users/yahone/projects/venus/packages/engine/src/testing/webAdapter.conformance.test.ts`
  - `pnpm -C packages/engine exec node --test src/testing/cameraBoundary.contract.test.mjs src/testing/cameraProjection.contract.test.mjs src/testing/runtimeExportResponsibilityMap.contract.test.mjs`

## 43. Batch 020 CHANGE REQUEST

[CHANGE REQUEST]

Target:

- File / Module:
  - packages/engine/src/testing/webAdapter.conformance.test.ts

Goal:

- Problem being solved:
  - lock deterministic line submission outcome precedence for mixed frames where gate-enabled line payloads include both successful and failed submissions.

Change Type:

- Modify

Impact:

- Affected modules:
  - WebGL adapter conformance coverage for line diagnostics outcome token and reason-summary consistency

Cleanup:

- Old logic to remove:
  - missing regression coverage for mixed success/failure frames that could allow outcome-token semantics drift.

Tests:

- Tests to add/update:
  - add gate-enabled mixed line frame scenario with one successful line submission and one insufficient-stream failure
  - assert outcome token resolves to `failed` while preserving submitted count and failure summary consistency
  - rerun typecheck, adapter conformance, and governance contract tests

## 44. Batch 020 Execution Log

- 2026-05-26 Run-020.1: Added conformance scenario `webgl adapter normalizes mixed line submission outcome precedence` covering gate-enabled mixed line payloads with one successful submission and one insufficient-stream failure.
- 2026-05-26 Run-020.2: Asserted deterministic mixed-frame semantics for render path (`model-complete`), submission/rejection counters, failure summary histogram, and outcome token precedence (`failed`).
- 2026-05-26 Run-020.3: Validation passed.
  - `pnpm -C packages/engine exec tsc -p tsconfig.json --noEmit`
  - `pnpm -C packages/engine dlx tsx --test /Users/yahone/projects/venus/packages/engine/src/testing/meshPrimitive.contract.test.ts /Users/yahone/projects/venus/packages/engine/src/testing/webAdapter.conformance.test.ts`
  - `pnpm -C packages/engine exec node --test src/testing/cameraBoundary.contract.test.mjs src/testing/cameraProjection.contract.test.mjs src/testing/runtimeExportResponsibilityMap.contract.test.mjs`

## 45. Batch 021 CHANGE REQUEST

[CHANGE REQUEST]

Target:

- File / Module:
  - packages/engine/src/backend/adapters/webglNativeMeshPresenter.ts
  - packages/engine/src/backend/adapters/noopBackendAdapter.ts
  - packages/engine/src/backend/adapters/webglBackendAdapter.ts
  - packages/engine/src/backend/adapters/webgpuBackendAdapter.ts
  - packages/engine/src/orchestration/api/createEngine.runtime-backend-diagnostics.foundation.ts
  - packages/engine/src/orchestration/api/createEngine.ts
  - packages/engine/src/testing/webAdapter.conformance.test.ts

Goal:

- Problem being solved:
  - expose successful line draw command cardinality (`lineTopologySubmissionSucceededCommandCount`) so telemetry can distinguish mesh-level success count from segment-level submission volume.

Change Type:

- Modify

Impact:

- Affected modules:
  - WebGL native mesh presenter submission diagnostics
  - backend/runtime diagnostics contract propagation and defaults
  - WebGL/WebGPU diagnostics emitters
  - adapter conformance assertions for successful command-count semantics

Cleanup:

- Old logic to remove:
  - inferring successful line command volume from preflight draw-plan counters.

Tests:

- Tests to add/update:
  - update gate-enabled success and mixed success/failure assertions with successful command count checks
  - update failure-path assertions to verify zero successful command count
  - rerun typecheck, adapter conformance, and governance contract tests

## 46. Batch 022 CHANGE REQUEST

[CHANGE REQUEST]

Target:

- File / Module:
  - packages/engine/src/testing/webAdapter.conformance.test.ts

Goal:

- Problem being solved:
  - lock line command-count correctness for indexed line payloads so segment-level submission telemetry remains deterministic across indexed and non-indexed line streams.

Change Type:

- Modify

Impact:

- Affected modules:
  - WebGL adapter conformance coverage for indexed line submission command counts

Cleanup:

- Old logic to remove:
  - missing conformance coverage for indexed line segment command-count mapping.

Tests:

- Tests to add/update:
  - add gate-enabled indexed line submission scenario asserting command-count parity with index-pair segments
  - rerun typecheck, adapter conformance, and governance contract tests

## 47. Batch 021 Execution Log

- 2026-05-26 Run-021.1: Added `lineTopologySubmissionSucceededCommandCount` to native mesh presenter diagnostics and incremented it from successful line submission command cardinality.
- 2026-05-26 Run-021.2: Propagated successful line command-count metric through backend diagnostics contracts, WebGL/WebGPU emitters, runtime diagnostics foundation typing, and createEngine default diagnostics snapshot.
- 2026-05-26 Run-021.3: Extended conformance assertions across success/failure/mixed paths to lock zero-vs-positive successful command-count semantics.

## 48. Batch 022 Execution Log

- 2026-05-26 Run-022.1: Added indexed line conformance scenario `webgl adapter tracks indexed line submission command counts` to validate index-pair to line-command cardinality mapping.
- 2026-05-26 Run-022.2: Asserted draw-plan command count and successful command-count parity for indexed line streams (2 index pairs -> 2 successful commands).
- 2026-05-26 Run-022.3: Validation passed.
  - `pnpm -C packages/engine exec tsc -p tsconfig.json --noEmit`
  - `pnpm -C packages/engine dlx tsx --test /Users/yahone/projects/venus/packages/engine/src/testing/meshPrimitive.contract.test.ts /Users/yahone/projects/venus/packages/engine/src/testing/webAdapter.conformance.test.ts`
  - `pnpm -C packages/engine exec node --test src/testing/cameraBoundary.contract.test.mjs src/testing/cameraProjection.contract.test.mjs src/testing/runtimeExportResponsibilityMap.contract.test.mjs`

## 49. Batch 023 CHANGE REQUEST

[CHANGE REQUEST]

Target:

- File / Module:
  - packages/engine/src/backend/adapters/webglNativeMeshPresenter.ts
  - packages/engine/src/backend/adapters/noopBackendAdapter.ts
  - packages/engine/src/backend/adapters/webglBackendAdapter.ts
  - packages/engine/src/backend/adapters/webgpuBackendAdapter.ts
  - packages/engine/src/orchestration/api/createEngine.runtime-backend-diagnostics.foundation.ts
  - packages/engine/src/orchestration/api/createEngine.ts
  - packages/engine/src/testing/webAdapter.conformance.test.ts

Goal:

- Problem being solved:
  - expose command-level line submission attempt/failure counters so telemetry can separate mesh-level failures from segment-level submission volume on missing primitive and preflight-mixed frames.

Change Type:

- Modify

Impact:

- Affected modules:
  - WebGL native mesh line submission diagnostics accounting
  - backend/runtime diagnostics contract propagation and defaults
  - WebGL/WebGPU diagnostics emission
  - adapter conformance assertions for attempted/failed command-count semantics

Cleanup:

- Old logic to remove:
  - reliance on successful command count alone for segment-level line submission telemetry.

Tests:

- Tests to add/update:
  - extend existing gate-enabled success/failure/mixed assertions with attempted and failed command-count expectations
  - rerun typecheck, adapter conformance, and governance contract tests

## 50. Batch 023 Execution Log

- 2026-05-26 Run-023.1: Added line submission command-level counters (`lineTopologySubmissionAttemptedCommandCount`, `lineTopologySubmissionFailedCommandCount`) to native mesh presenter diagnostics and wired command accounting on line submission attempt/success/failure branches.
- 2026-05-26 Run-023.2: Propagated attempted/failed command counters through backend diagnostics contracts, WebGL/WebGPU emitters, runtime diagnostics foundation typing, and createEngine default diagnostics snapshot.
- 2026-05-26 Run-023.3: Extended existing WebGL conformance assertions to lock attempted/failed command-count semantics across gate-disabled, success, missing-LINES failure, insufficient-stream preflight failure, mixed frames, and indexed line submission coverage.
- 2026-05-26 Run-023.4: Validation passed.
  - `pnpm -C packages/engine exec tsc -p tsconfig.json --noEmit`
  - `pnpm -C packages/engine dlx tsx --test /Users/yahone/projects/venus/packages/engine/src/testing/meshPrimitive.contract.test.ts /Users/yahone/projects/venus/packages/engine/src/testing/webAdapter.conformance.test.ts`
  - `pnpm -C packages/engine exec node --test src/testing/cameraBoundary.contract.test.mjs src/testing/cameraProjection.contract.test.mjs src/testing/runtimeExportResponsibilityMap.contract.test.mjs`

## 51. Batch 024 CHANGE REQUEST

[CHANGE REQUEST]

Target:

- File / Module:
  - packages/engine/src/backend/adapters/webglNativeMeshPresenter.ts
  - packages/engine/src/backend/adapters/noopBackendAdapter.ts
  - packages/engine/src/backend/adapters/webglBackendAdapter.ts
  - packages/engine/src/backend/adapters/webgpuBackendAdapter.ts
  - packages/engine/src/orchestration/api/createEngine.runtime-backend-diagnostics.foundation.ts
  - packages/engine/src/orchestration/api/createEngine.ts
  - packages/engine/src/testing/webAdapter.conformance.test.ts

Goal:

- Problem being solved:
  - expose reason-bucketed failed line command counters so telemetry can distinguish missing-LINES vs insufficient-stream segment failure volume without recomputing from mixed frame signals.

Change Type:

- Modify

Impact:

- Affected modules:
  - WebGL native mesh line submission failure command accounting
  - backend/runtime diagnostics contract propagation and defaults
  - WebGL/WebGPU diagnostics emission
  - adapter conformance assertions for reason-bucketed failed command counters

Cleanup:

- Old logic to remove:
  - single failed command counter with no reason-bucket attribution.

Tests:

- Tests to add/update:
  - extend missing-LINES and insufficient-stream conformance assertions with failed-command reason buckets
  - rerun typecheck, adapter conformance, and governance contract tests

## 52. Batch 024 Execution Log

- 2026-05-26 Run-024.1: Added reason-bucketed failed line command counters (`lineTopologySubmissionFailedMissingLinesPrimitiveCommandCount`, `lineTopologySubmissionFailedInsufficientStreamCommandCount`) to native mesh presenter diagnostics.
- 2026-05-26 Run-024.2: Wired failed-command reason-bucket accounting on missing-LINES and insufficient-stream submission-failure branches while preserving existing mesh-level and summary reason counters.
- 2026-05-26 Run-024.3: Propagated new counters through backend diagnostics contracts, WebGL/WebGPU emitters, runtime diagnostics foundation typing, and createEngine default diagnostics snapshot.
- 2026-05-26 Run-024.4: Extended conformance assertions with reason-bucketed failed command expectations across gate-disabled, gate-enabled success, missing-LINES, insufficient-stream, and mixed line submission scenarios.
- 2026-05-26 Run-024.5: Validation passed.
  - `pnpm -C packages/engine exec tsc -p tsconfig.json --noEmit`
  - `pnpm -C packages/engine dlx tsx --test /Users/yahone/projects/venus/packages/engine/src/testing/meshPrimitive.contract.test.ts /Users/yahone/projects/venus/packages/engine/src/testing/webAdapter.conformance.test.ts`
  - `pnpm -C packages/engine exec node --test src/testing/cameraBoundary.contract.test.mjs src/testing/cameraProjection.contract.test.mjs src/testing/runtimeExportResponsibilityMap.contract.test.mjs`

## 53. Batch 025 CHANGE REQUEST

[CHANGE REQUEST]

Target:

- File / Module:
  - packages/engine/src/backend/adapters/webglNativeMeshPresenter.ts
  - packages/engine/src/backend/adapters/noopBackendAdapter.ts
  - packages/engine/src/backend/adapters/webglBackendAdapter.ts
  - packages/engine/src/backend/adapters/webgpuBackendAdapter.ts
  - packages/engine/src/orchestration/api/createEngine.runtime-backend-diagnostics.foundation.ts
  - packages/engine/src/orchestration/api/createEngine.ts
  - packages/engine/src/testing/webAdapter.conformance.test.ts

Goal:

- Problem being solved:
  - expose compact line-topology submission efficiency metrics so telemetry can distinguish mesh-level success from command-level execution efficiency and detect draw-plan waste deterministically.

Change Type:

- Modify

Impact:

- Affected modules:
  - WebGL native mesh line submission diagnostics accounting
  - backend/runtime diagnostics contract propagation and defaults
  - WebGL/WebGPU diagnostics emission
  - adapter conformance assertions for efficiency metric semantics

Cleanup:

- Old logic to remove:
  - deriving line command execution efficiency externally from multiple counters without stable per-frame computed metrics.

Tests:

- Tests to add/update:
  - extend gate-enabled success, failure, and mixed conformance assertions with line submission efficiency metrics
  - ensure gate-disabled and capability-gate paths emit deterministic zero/default efficiency metrics
  - rerun typecheck, adapter conformance, and governance contract tests
