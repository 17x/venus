# Venus Engine 3D Runtime Migration Task Ledger

Status: Accepted
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
10. Phase J: WebGPU native-probe hybrid execution bootstrap.
11. Phase K: Blueprint folder-structure alignment and domain barrels.
12. Phase L: Domain-boundary hardening and import-governance closure.
13. Phase M: Render-domain internalization and sub-entrypoint consolidation.
14. Phase N: Compatibility-forwarder retirement and public-boundary freeze.
15. Phase O: Final acceptance, regression closure, and ledger sign-off.
16. Phase P: Post-acceptance ledger governance automation.
17. Phase Q: Ledger guard testability and contract hardening.

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
- Completed: Phase J WebGPU native-probe hybrid execution bootstrap.
- Completed (J1): Added WebGPU native context/device probe with one no-op clear submission while preserving shared WebGL render fallback.
- Completed (J2): Strengthened integration coverage for webgpu backend selection plus successful render stats.
- Completed: Phase K blueprint folder-structure alignment and domain barrels.
- Completed (K1): Added blueprint-aligned top-level domains (render/gpu/visibility/spatial/geometry/transform/resource/scheduler/platform/debug/types/tests/assets).
- Completed (K2): Added compatibility-forwarder barrels so structure aligns without breaking current runtime paths.
- Completed (K3): Switched public/runtime/high-frequency module references to blueprint domain barrels.
- Completed (K4): Switched renderer layer/hit/camera/type references from core paths to render domain barrel.
- Completed (L1): Routed `types` domain render contracts through `render` barrel instead of direct `core` imports.
- Completed (L2): Added lint guard that blocks non-render domains from importing `core/types.ts` directly.
- Completed (L3): Added lint guard that blocks non-render domains from importing `core/renderGraph/*` directly.
- Completed (L4): Verified no remaining direct imports violating new guards in active source paths.
- Completed (L5): Full regression validation passed (test + tsc + eslint).
- Completed: Phase L domain-boundary hardening and import-governance closure.
- Completed (M1): Split render domain into local sub-entrypoints (`contracts`, `graph`, `runtime`) and rewired render barrel to aggregate local exports.
- Completed (M1-Validation): Post-change regression gate passed (test + tsc + eslint).
- Completed (M2): Added render-owned graph contract module and switched render graph type exports to render-local ownership.
- Completed (M3): Removed direct `core/renderGraph/*` re-export paths from render outward entrypoints via render-local runtime bridge.
- Completed (M4): Full regression validation passed (test + tsc + eslint).
- Completed: Phase M render-domain internalization and sub-entrypoint consolidation.
- Completed (N1): Audited compatibility-forwarder usage and classified `core/materialLighting` direct exposure as safe-to-retire from public and renderer outward paths.
- Completed (N2): Added material/lighting domain barrels and repointed public API plus renderer-layer shading imports away from direct core material-lighting paths.
- Completed (N3): Added lint guard to block non-core/non-material direct imports of `core/materialLighting/*` and freeze the domain boundary.
- Completed (N4): Full regression validation passed (test + tsc + eslint).
- Completed: Phase N compatibility-forwarder retirement and public-boundary freeze.
- Completed (O1): Collected phase evidence across A-N and confirmed all phase checklists are closed in this ledger.
- Completed (O2): Final acceptance regression gate passed (test + tsc + eslint).
- Completed (O3): Marked migration ledger status as Accepted and recorded final sign-off notes.
- Completed: Phase O final acceptance, regression closure, and ledger sign-off.
- Completed (P1): Added migration-ledger guard script to assert accepted-state invariants (status/checklists/no in-progress markers).
- Completed (P2): Wired guard command as `guard:migration-ledger` in engine package scripts.
- Completed (P3): Executed migration-ledger guard and full regression validation (test + tsc + eslint).
- Completed: Phase P post-acceptance ledger governance automation.
- Completed (Q1): Refactored migration ledger guard into exported, testable functions with explicit CLI entrypoint behavior.
- Completed (Q2): Added governance tests covering accepted-state and failure-case ledger scenarios.
- Completed (Q3): Added governance test command and executed governance + full regression validation (test + tsc + eslint).
- Completed: Phase Q ledger guard testability and contract hardening.

## [CHANGE REQUEST] (Phase Q)

Target:

- File / Module:
  - packages/engine/scripts/migration-ledger-guard.mjs
  - packages/engine/scripts/ledger-guard.test.mjs
  - packages/engine/package.json
  - packages/engine/docs/3d-runtime-migration-task.md

Goal:

- Problem being solved:
  - Current ledger guard is executable-only and lacks direct test coverage.
  - Phase Q hardens guard contracts by exposing pure validation APIs and adding automated tests.

Change Type:

- Modify / Add:
  - Refactor guard script to export testable helpers while preserving CLI behavior.
  - Add governance tests for accepted/failing ledger scenarios.
  - Wire governance test command into engine package scripts.

Impact:

- Affected modules:
  - migration ledger governance tooling
  - package script automation

Cleanup:

- Old logic to remove:
  - Implicit run-on-import behavior that blocks direct unit-style testing.

Tests:

- Tests to add/update:
  - Run governance test command.
  - Run guard command.
  - Run full engine tests + typecheck + lint.

## Phase Q Task List

- [x] Q1: Refactor migration ledger guard into testable exported functions with explicit CLI entrypoint.
- [x] Q2: Add governance tests that cover accepted and failure scenarios.
- [x] Q3: Add package script for governance tests and execute full validation closure.

## [CHANGE REQUEST] (Phase M)

Target:

- File / Module:
  - packages/engine/src/render/index.ts
  - packages/engine/src/render/contracts.ts
  - packages/engine/src/render/graph.ts
  - packages/engine/src/render/graphContracts.ts
  - packages/engine/src/render/graphRuntime.ts
  - packages/engine/src/render/runtime.ts
  - packages/engine/docs/3d-runtime-migration-task.md

Goal:

- Problem being solved:
  - Render domain currently exposes a single barrel that directly forwards multiple core paths.
  - Phase M begins sub-entrypoint consolidation so render-facing boundaries are explicit and easier to govern for future core-internal migration.

Change Type:

- Modify / Add:
  - Add render domain sub-entrypoint files by concern (`contracts`, `graph`, `runtime`).
  - Rewire render barrel to aggregate from local render files.
  - Track migration progress and remaining task list in ledger.

Impact:

- Affected modules:
  - render domain import surfaces
  - public/runtime consumers that import via render barrel

Cleanup:

- Old logic to remove:
  - Direct multi-path forwarding from render barrel to core modules.

Tests:

- Tests to add/update:
  - No behavior tests required for export-surface rewiring.
  - Run full engine tests + typecheck + lint for regression safety.

## Phase M Task List

- [x] M1: Split render domain entrypoint into `contracts.ts`, `graph.ts`, `runtime.ts` and keep `render/index.ts` as aggregate barrel.
- [x] M2: Move render-graph contract ownership from core path to render-owned contract file (type-compatible forward transition).
- [x] M3: Remove remaining direct `core/renderGraph` exports from render domain outward surfaces.
- [x] M4: Run full regression validation (test + tsc + eslint) and record closure.

## [CHANGE REQUEST] (Phase N)

Target:

- File / Module:
  - packages/engine/src/index/index.ts
  - packages/engine/src/render/\*\*
  - packages/engine/src/core/\*\*
  - packages/engine/src/material/index.ts
  - packages/engine/src/lighting/index.ts
  - packages/engine/src/renderer/layers/base/baseRenderer.ts
  - packages/engine/src/renderer/layers/active/activeRenderer.ts
  - eslint.config.js
  - packages/engine/docs/3d-runtime-migration-task.md

Goal:

- Problem being solved:
  - Compatibility-forwarder paths remain broadly available and can obscure the finalized domain boundary.
  - Phase N freezes public import boundaries and retires unneeded compatibility paths where safe.

Change Type:

- Modify / Remove:
  - Deprecate and retire safe-to-remove compatibility forwarders.
  - Ensure index/public surfaces only expose finalized domain contracts.

Impact:

- Affected modules:
  - public API export surfaces
  - compatibility import paths

Cleanup:

- Old logic to remove:
  - Redundant forwarder exports that no longer serve active compatibility requirements.

Tests:

- Tests to add/update:
  - Update tests that assert old forwarder paths if present.
  - Run full engine tests + typecheck + lint.

## Phase N Task List

- [x] N1: Audit compatibility-forwarder usage and classify keep/remove set.
- [x] N2: Remove safe forwarders and repoint remaining internal imports.
- [x] N3: Freeze and document final public export boundary.
- [x] N4: Run full regression validation (test + tsc + eslint) and record closure.

## [CHANGE REQUEST] (Phase O)

Target:

- File / Module:
  - packages/engine/docs/3d-runtime-migration-task.md
  - packages/engine/README.md
  - packages/engine/src/index/index.ts

Goal:

- Problem being solved:
  - Migration phases are implemented but final acceptance criteria and sign-off records must be explicit.
  - Phase O finalizes acceptance evidence, closure statements, and handoff notes.

Change Type:

- Modify:
  - Add explicit final acceptance checklist and sign-off section.
  - Mark migration status from Active to Accepted when all criteria pass.

Impact:

- Affected modules:
  - migration ledger and runtime handoff documentation

Cleanup:

- Old logic to remove:
  - None.

Tests:

- Tests to add/update:
  - Re-run full engine tests + typecheck + lint as final acceptance gate.

## Phase O Task List

- [x] O1: Collect validation evidence for all completed phases (A-N).
- [x] O2: Execute final acceptance gate (test + tsc + eslint) on final tree state.
- [x] O3: Mark ledger as Accepted and record sign-off notes.

## Final Acceptance Checklist

- [x] Phase A-N execution items are closed and reflected in Execution Progress.
- [x] Domain-boundary governance rules are active for render/types/material-lighting import surfaces.
- [x] Final acceptance regression gate is executed on the accepted tree state.

## Sign-Off Notes

- Accepted by: engine runtime migration execution log.
- Acceptance date: 2026-05-15.
- Scope closed: 2D->3D staged runtime migration plan (Phase A to Phase O).

## [CHANGE REQUEST] (Phase P)

Target:

- File / Module:
  - packages/engine/scripts/migration-ledger-guard.mjs
  - packages/engine/package.json
  - packages/engine/docs/3d-runtime-migration-task.md

Goal:

- Problem being solved:
  - Accepted migration state existed only as manual document discipline and could regress silently.
  - Phase P adds executable governance checks to lock accepted-state invariants.

Change Type:

- Add / Modify:
  - Add one script to validate ledger acceptance invariants.
  - Add one package script entry for repeated execution.
  - Record Phase P execution and closure in ledger.

Impact:

- Affected modules:
  - migration ledger governance automation
  - engine package scripts

Cleanup:

- Old logic to remove:
  - None.

Tests:

- Tests to add/update:
  - Run `pnpm -C packages/engine run guard:migration-ledger`.
  - Run full engine tests + typecheck + lint.

## Phase P Task List

- [x] P1: Add script to validate accepted-state invariants in migration ledger.
- [x] P2: Wire script into engine package commands.
- [x] P3: Execute guard and full regression validation, then record closure.

## [CHANGE REQUEST] (Phase L)

Target:

- File / Module:
  - packages/engine/src/types/index.ts
  - packages/engine/docs/3d-runtime-migration-task.md
  - eslint.config.js

Goal:

- Problem being solved:
  - Blueprint-aligned folders are present, but import governance still allows accidental bypass of domain barrels.
  - Phase L hardens boundaries so new code converges on domain entry points by default.

Change Type:

- Modify / Add:
  - Continue replacing remaining direct `core` imports in non-render domains.
  - Add or tighten lint import governance for domain-boundary enforcement.
  - Keep compatibility barrels while removing accidental direct-path usage.

Impact:

- Affected modules:
  - domain barrel usage consistency
  - import governance and lint gates

Cleanup:

- Old logic to remove:
  - Remaining direct cross-domain imports that bypass blueprint barrel entry points.

Tests:

- Tests to add/update:
  - No behavior tests required for import-only rewires.
  - Run full engine tests + typecheck + lint after each batch.

## Phase L Task List

- [x] L1: Convert `types` domain render contract exports to route through `render/index.ts`.
- [x] L2: Add lint guard to block non-render domains from importing `core/types.ts` directly.
- [x] L3: Add lint guard to block non-render domains from importing `core/renderGraph/*` directly.
- [x] L4: Rewire remaining direct core imports discovered by lint guards.
- [x] L5: Full regression validation (test + tsc + eslint) and closure update.

## [CHANGE REQUEST] (Phase K)

Target:

- File / Module:
  - packages/engine/src/render/index.ts
  - packages/engine/src/gpu/\*\*
  - packages/engine/src/visibility/index.ts
  - packages/engine/src/spatial/index.ts
  - packages/engine/src/geometry/index.ts
  - packages/engine/src/transform/index.ts
  - packages/engine/src/resource/index.ts
  - packages/engine/src/scheduler/index.ts
  - packages/engine/src/platform/index.ts
  - packages/engine/src/debug/index.ts
  - packages/engine/src/types/index.ts
  - packages/engine/src/tests/README.md
  - packages/engine/src/assets/README.md

Goal:

- Problem being solved:
  - Runtime architecture direction aligned with 2D->3D blueprint, but top-level folder domains were not yet structurally aligned.
  - Phase K aligns folder structure in one pass while preserving API/runtime compatibility.

Change Type:

- Add / Modify:
  - Add blueprint-aligned domain directories and forwarder barrels.
  - Keep existing implementation ownership stable through compatibility forwarding.
  - Repoint public/runtime/high-frequency imports and exports to new domain barrels.
  - Continue internal renderer-chain import rewiring toward domain barrels.

Impact:

- Affected modules:
  - source tree organization
  - domain-level import entry points

Cleanup:

- Old logic to remove:
  - None in this phase; behavior changes are intentionally avoided.

Tests:

- Tests to add/update:
  - No behavior tests required; structure-only alignment.
  - Run full engine tests + typecheck + lint.

## [CHANGE REQUEST] (Phase J)

Target:

- File / Module:
  - packages/engine/src/renderer/webgpu/webgpu.ts
  - packages/engine/src/runtime/createEngine.integration.test.ts

Goal:

- Problem being solved:
  - WebGPU backend selection still relied purely on adapter semantics without any native runtime/device probe.
  - Phase J should bootstrap one safe native execution skeleton while preserving deterministic fallback behavior.

Change Type:

- Modify / Add:
  - Add native WebGPU initialization/probe lifecycle in the WebGPU backend module.
  - Add one no-op clear pass submission as native execution bootstrap.
  - Preserve shared WebGL rendering as stable fallback path.
  - Update integration test assertions for webgpu backend render success.

Impact:

- Affected modules:
  - webgpu backend entry
  - runtime createEngine integration tests

Cleanup:

- Old logic to remove:
  - None in this phase; this is a bootstrap extension over existing stable fallback path.

Tests:

- Tests to add/update:
  - Update createEngine integration test for webgpu path with render stats assertion.
  - Run full engine tests + typecheck + lint.

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
- WebGPU backend now includes a native-probe bootstrap step with stable fallback rendering.
- Source tree now exposes blueprint-aligned domain folders with compatibility-forwarder barrels.
- Migration ledger status is Accepted with final sign-off notes recorded.
