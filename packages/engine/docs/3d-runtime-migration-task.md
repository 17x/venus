# Venus Engine 3D Runtime Migration Task Ledger

Status: Active
Owner: engine runtime
Scope: packages/engine

## Scope Definition

- Build a dimension-agnostic runtime base without breaking current 2D behavior.
- Keep editor concepts outside engine runtime boundaries.
- Execute migration in strict phases so each phase is independently verifiable.

## Target Architecture Summary

- Scene remains persistent and dimension-agnostic.
- Visibility becomes an explicit subsystem producing VisibleSet.
- Render layer moves to render-graph orchestration and backend-agnostic commands.
- Backend executes commands for WebGL/WebGPU/Canvas fallback.

## Phase Breakdown

1. Phase A: Dimension type abstraction and compatibility aliases.
2. Phase B: Transform and camera contract upgrade.
3. Phase C: Visibility subsystem extraction and 3D culling contracts.
4. Phase D: Render graph and pass orchestration migration.
5. Phase E: Material and lighting baseline for mixed 2D/3D scenes.
6. Phase F: 2D/3D hit-test dual path with shared runtime contracts.
7. Phase G: WebGPU backend path and performance gate hardening.
8. Phase H: Compatibility debt retirement and native-path convergence.
9. Phase I: Migration ledger closure and temporary-tag zero baseline.

## Type Definition (Phase A)

- Add dimension primitives: Vec2, Vec3, Vec4.
- Add matrix primitives: affine 2D matrix alias, Mat3, Mat4.
- Add bounds primitives: Rect2, AABB3.
- Add camera-space primitives: Ray3, frustum plane, frustum.
- Keep existing 2D public contracts available through compatibility aliases.

## [CHANGE REQUEST]

Target:

- File / Module:
  - packages/engine/src/math/dimension/types.ts
  - packages/engine/src/scene/types/types.ts
  - packages/engine/src/index/index.ts

Goal:

- Problem being solved:
  - Current scene and runtime contracts are 2D-specific and block staged 3D migration.
  - Phase A must introduce dimension-neutral contracts with zero runtime behavior change.

Change Type:

- Add / Modify:
  - Add dimension contract module.
  - Modify scene contract aliases to consume new primitives.
  - Modify public exports to expose new contracts.

Impact:

- Affected modules:
  - scene contracts
  - renderer contract consumers (type-level only)
  - public API type exports

Cleanup:

- Old logic to remove:
  - None in Phase A.
  - Existing 2D contracts remain as compatibility aliases until later phases remove them.

Tests:

- Tests to add/update:
  - No behavior tests required in Phase A because runtime behavior is unchanged.
  - Run full engine test suite to confirm compatibility.

## Test Design

- Backward-compatibility validation:
  - Existing tests must pass without snapshots or behavioral diffs.
- API stability validation:
  - Existing engine exports remain available.
- Type safety validation:
  - No `any` introduction, strict type compatibility remains intact.

## Validation Checklist

- Engine tests pass.
- No runtime behavior changes introduced.
- New type contracts are exported and documented.
- Existing 2D contracts remain usable.

## Execution Progress

- Completed: Phase A dimension type abstraction and compatibility alias wiring.
- Completed: Phase B contract upgrade (camera projection and pose contracts on core/renderer/public API).
- Completed: Phase C visibility subsystem extraction with VisibleSet runtime integration and 3D frustum contracts.
- Completed: Phase D render-graph contracts and pass orchestration migration wired into layered render path.
- Completed: Phase E material and lighting baseline contracts with draw-command binding integration for mixed 2D/3D scenes.
- Completed: Phase F 2D/3D hit-test dual path with shared runtime contracts and runtime API integration.
- Completed: Phase G WebGPU backend compatibility path and runtime performance gate diagnostics hardening.
- Completed: Phase H compatibility debt retirement and native-path convergence.
- Completed (H1): Replaced ray-origin fallback with deterministic ray-to-scene-plane projection in shared hit resolver.
- Completed (H2): Replaced full-scene frustum fallback with deterministic coarse frustum-plane culling over scene bounds.
- Completed (H3): Removed R-09 layered bridge fallback branches (protected-id active routing and inverse-matrix compatibility path).
- Completed (H4): Removed R-09 planner layered-candidate fallback and normalized WebGL visible-count proxy to shortlist-first semantics.
- Completed (H5): Promoted WebGPU entrypoint semantics to stable shared adapter path and refreshed migration-facing integration test wording.
- Completed: Phase I migration ledger closure and temporary-tag zero baseline.
- Completed (I1): Removed the final migration AI-TEMP marker from engine runtime path defaults.

## [CHANGE REQUEST] (Phase I)

Target:

- File / Module:
  - packages/engine/src/renderer/webgl/capabilities/snapshotCapability.ts
  - packages/engine/docs/3d-runtime-migration-task.md

Goal:

- Problem being solved:
  - One migration-era AI-TEMP marker remained in the runtime path despite completed convergence work.
  - Phase I closes the migration ledger with zero migration temporary tags in engine runtime paths.

Change Type:

- Modify / Remove:
  - Remove final migration temporary tag and promote behavior note to stable policy wording.
  - Record closure phase and completion result in migration ledger.

Impact:

- Affected modules:
  - webgl snapshot capability defaults
  - migration tracking documentation

Cleanup:

- Old logic to remove:
  - Remaining migration temporary marker in snapshot preview defaults.

Tests:

- Tests to add/update:
  - No behavior tests required; runtime behavior is unchanged.
  - Run full engine tests + typecheck + lint for regression safety.

## [CHANGE REQUEST] (Phase H)

Target:

- File / Module:
  - packages/engine/src/scene/visibility/visibility.ts
  - packages/engine/src/runtime/createEngine/layeredBridge/layeredBridge.ts
  - packages/engine/src/renderer/plan/planFrameContext.ts
  - packages/engine/src/renderer/webgl/webgl.ts
  - packages/engine/src/renderer/webgpu/webgpu.ts
  - packages/engine/src/runtime/createEngine/layeredBridge/layeredBridge.test.ts
  - packages/engine/src/scene/visibility/visibility.test.ts

Goal:

- Problem being solved:
  - Remaining migration-time compatibility branches still carry R-09 and Phase C/G temporary assumptions.
  - Phase H should retire removable compatibility fallback paths and converge to current runtime contracts.

Change Type:

- Add / Modify / Remove:
  - Modify frustum fallback from full-scene conservative return to deterministic frustum-plane coarse culling.
  - Remove layered-bridge fallbacks that rely on protected ids and missing inverse matrix assumptions.
  - Remove planner layered-candidate fallback branch used during shortlist migration.
  - Modify WebGL visible-count proxy logic to consume shortlist candidates first.
  - Reclassify WebGPU entrypoint as stable adapter semantics instead of temporary branch tagging.

Impact:

- Affected modules:
  - visibility resolver
  - layered render bridge
  - render-plan frame context
  - webgl/webgpu renderer adapter surfaces
  - runtime integration tests for layered bridge and frustum behavior

Cleanup:

- Old logic to remove:
  - R-09 fallback branches in layered bridge and planner candidate resolution.
  - Full-scene frustum fallback behavior in visibility resolver.
  - Temporary-tagged WebGPU bridge note once behavior is promoted to stable adapter contract.

Tests:

- Tests to add/update:
  - Update visibility frustum tests to assert coarse culling behavior.
  - Update layered bridge tests to assert interaction-active-only active-layer routing.
  - Run full engine tests + typecheck + lint.

## Cleanup Check

- No parallel behavior implementation introduced.
- No editor-specific policy moved into engine runtime.
- Migration staging remains explicit and reversible.
- Phase C/F/G/R-09 migration-temporary tags are retired from engine runtime migration paths.
- Engine runtime migration path now has zero remaining AI-TEMP tags.
