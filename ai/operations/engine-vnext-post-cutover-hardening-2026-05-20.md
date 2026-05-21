# Engine vNext Post-Cutover Hardening (2026-05-20)

Status: In Progress
Scope: R3 full-green baseline hardening after canonical cutover

Completion note: Task ledger was previously closed on 2026-05-20 and is now reopened for Task 3 parity follow-up.

## Objective

Stabilize the canonical `@venus/engine` package after R3 cutover by constraining compatibility boundaries, planning `_vnext` retirement, and adding export-surface regression coverage.

## Task Ledger

1. Task 3: Compatibility bridge staged retirement

- Status: In Progress
- Current result:
  - Compatibility facade cleanup is completed; legacy bridge `AI-TEMP` marker has been removed from `packages/engine/src/api/legacyEngineCompatExports.ts`.

- Direct `@venus/engine-legacy` value-export block in `legacyEngineCompatExports.ts` is now retired (locked to zero by inventory test).
  - Boundary rule established: no direct `engine-legacy/src` imports from canonical package.
  - Viewport compatibility exports (`DEFAULT_ENGINE_VIEWPORT`, `resolveEngineViewportState`, pan/zoom/resize/clamp/fit + viewport types) are now sourced from `@venus/lib/viewport` instead of `@venus/engine-legacy`.
  - Matrix/geometry compatibility exports (`applyMatrixToPoint`, `applyAffineMatrixToPoint`, `createAffineMatrixAroundPoint`, `doNormalizedBoundsOverlap`, `getNormalizedBoundsFromBox` + shared math/geometry types) are now sourced from `@venus/lib`.
- Additional geometry compatibility exports (`intersectNormalizedBounds`, `isPointInsideRotatedBounds`) are now sourced from `@venus/lib`.
- Removed `export type * from "@venus/engine-legacy"` from `legacyEngineCompatExports.ts`; legacy type bridge is now explicit and consumer-driven.
- Further shrank legacy type bridge by sourcing canonical type contracts from engine-owned modules (`interaction/hitTolerance`, `interaction/geometryPayload`, `interaction/hitTest`, `interaction/shapeTransform`, `interaction/snapping`, `interaction/zoom`, `animation/engineAnimationController`, `scheduler/renderScheduler`, `spatial/engineSpatialIndex`) and from `@venus/lib` (`Point2D`).
- Added canonical `EngineSnapGuideLine` contract and exported canonical `EngineSpatialIndex`/snapping/animation type surfaces to support bridge-surface shrink without wildcard type fallback.
- Migrated `CreateEngineOptions`/`Engine`/`EngineSceneSnapshot`/`EngineRenderableNode`/`EngineHitTestResult`/`EngineOverlayDrawNode` to canonical compat contracts in `packages/engine/src/api/createEngineCompatTypes.ts`, and switched `createEngineCompat` + scene reducer + facade type exports to this canonical source.
- Canonicalized transform batch contracts (`ShapeTransformBatchCommand`, `ShapeTransformBatchItem`) in `packages/engine/src/interaction/shapeTransform.ts`; `legacyEngineCompatExports.ts` no longer references `@venus/engine-legacy`.
- Added/updated boundary guard to enforce compat facade zero-reference policy for `@venus/engine-legacy`.
- Canonical source now keeps `@venus/engine-legacy` references only in parity tests under `packages/engine/src/testing`, with no runtime/type bridge references remaining in canonical facade/runtime source.
- Post-hardening debug fix (2026-05-20): legacy render backend in `packages/engine/src/api/createEngineCompat.ts` is now explicit opt-in only (`debug.useLegacyRenderBackend: true`); default runtime route is non-legacy to keep migration direction aligned.
- Native backend follow-up (2026-05-20): canonical `createEngine` now enforces backend auto-priority order (`webgpu -> webgl -> canvas2d -> headless`) unless caller explicitly specifies backend mode.
- Compatibility adapter wiring (2026-05-20): `packages/engine/src/api/createEngineCompat.ts` keeps vNext canvas2d hook path as default, with legacy draw delegation available only as explicit debug override.
- Runtime rendering correction (2026-05-20): fixed compat canvas black-screen and offset drift by switching compat draw paint source to node `fill`/`stroke` payload and applying DPR-aware canvas transform in `packages/engine/src/api/createEngineCompat.ts`.
- Runtime stability follow-up (2026-05-20): `apps/vector-editor-web/src/runtime/engine-bridge/internal/engineRenderer/useEngineRendererViewport.ts` now guards viewport-settle forced dirty marking at extreme low scale and clamps dirty world extent to avoid 1% zoom freeze.
- Regression guard added (2026-05-20): extracted settle dirty-bounds resolver to `apps/vector-editor-web/src/runtime/engine-bridge/internal/engineRenderer/viewportSettleDirtyBounds/viewportSettleDirtyBounds.ts` with dedicated coverage in `viewportSettleDirtyBounds.test.ts` (low-scale skip, world-extent clamp, center preservation).
- Validation after follow-up mitigation remains green: `pnpm --filter @venus/engine test`, `pnpm typecheck`, `pnpm lint`, `pnpm build`.
- Runtime legacy-import inventory remains intentionally non-zero while explicit debug fallback mode exists in `api/createEngineCompat.ts` (enforced by `packages/engine/src/testing/legacyRuntimeBoundary.test.mjs`).
- Additional guard coverage: `packages/engine/src/testing/createEngine.orchestration.test.ts` now asserts auto backend resolves to `canvas2d` when surface canvas exists.
- Additional guard coverage: `packages/engine/src/testing/createEngineCompat.adapter.test.ts` now validates compat canvas draw path with explicit paint payload and stroke calls, preventing black-fill regressions.
- Follow-up (blocking for bridge retirement): remove real-canvas legacy draw fallback only after vNext scene primitive + hover composition parity is validated in app runtime.

2. Task 4: `_vnext` archival lifecycle and disposal
   - Status: Completed
   - Current result:
     - R3 is validated with canonical package in place and legacy package preserved.
     - Added finalize helper script: `scripts/engine-vnext-finalize-archive.mjs` (dry-run by default, `--apply` for execution).
     - Added apply-mode safety guard in finalize helper: clean worktree required unless `--allow-dirty` is explicitly provided.
     - Verified dry-run output on 2026-05-20:
       - `FINALIZE_ARCHIVE_DRY_RUN would move /Users/yahone/projects/venus/packages/_vnext/engine -> /Users/yahone/projects/venus/archive/engine-vnext-snapshot-2026-05-20`
     - Applied archive finalize on 2026-05-20:
       - `FINALIZE_ARCHIVE_APPLY_DONE moved /Users/yahone/projects/venus/packages/_vnext/engine -> /Users/yahone/projects/venus/archive/engine-vnext-snapshot-2026-05-20`
       - Confirmed `packages/_vnext/engine` no longer exists in workspace.
   - Execution plan:
     - Freeze `_vnext` writes immediately.
     - Keep `_vnext` as rollback snapshot during observation window.
     - After observation closes, move `_vnext/engine` to archive and remove workspace references if still present.

3. Task 5: Export-surface regression tests
   - Status: Completed
   - Current result:
     - Added `packages/engine/src/testing/legacyCompatExportBoundary.test.mjs`.
     - Added `packages/engine/src/testing/legacyBridgeInventory.test.mjs`.
     - New test coverage:
       - Asserts canonical compat facade does not import from `engine-legacy/src` paths.
       - Asserts required canonical bridge and de-bridged symbols stay exported from `@venus/engine`.
       - Locks the remaining `@venus/engine-legacy` value-export inventory so bridge scope can only shrink intentionally.

4. Task 8: App-side engine export consumption guard
   - Status: Completed
   - Current result:
     - Added `apps/vector-editor-web/src/runtime/engine-bridge/engineExports.contract.ts`.
     - Guard coverage:
       - Forces compile-time resolution of key `@venus/engine` exports consumed by vector runtime bridge.
       - Fails `pnpm typecheck` on export-name drift in canonical package.

5. Task 12: Remaining legacy export batch planning
   - Status: Completed
   - Current result:
     - Added `ai/operations/engine-vnext-legacy-bridge-batch-plan-2026-05-20.md`.
     - Remaining legacy value exports are grouped by source module with migration batch order from low risk to high risk.

6. Task 13: Batch A first migration slice
   - Status: Completed
   - Current result:
     - Moved `resolveEngineAdaptiveHitTolerance` and `resolveEngineCanvasLodProfile` value exports from legacy bridge to canonical modules under `packages/engine/src/interaction`.
     - Added `packages/engine/src/testing/interactionBatchA.parity.test.ts` to assert canonical-vs-legacy parity for adaptive hit tolerance and canvas LOD profile.
     - Updated bridge inventory and boundary tests to reflect the reduced legacy value export surface.

7. Task 14: Batch A second migration slice
   - Status: Completed
   - Current result:
     - Moved shape-transform value exports (`createMatrixFirstNodeTransform`, `createShapeTransformRecord`, `resolveNodeTransform`, `resolveShapeTransformRecord`, `toLegacyShapeTransformRecord`, `toResolvedNodeSvgTransform`) from legacy bridge to canonical module `packages/engine/src/interaction/shapeTransform.ts`.
     - Added `packages/engine/src/testing/shapeTransformBatchA.parity.test.ts` to assert canonical-vs-legacy parity for transform record/matrix/SVG serialization behavior.
     - Updated bridge inventory and boundary tests to reflect the reduced legacy value export surface.

8. Task 15: Batch A third migration slice
   - Status: Completed
   - Current result:
     - Moved hit-test value exports (`isPointInsideEngineClipShape`, `isPointInsideEngineShapeHitArea`) from legacy bridge block to canonical module `packages/engine/src/interaction/hitTest.ts`.
     - Added `packages/engine/src/testing/hitTestBatchA.parity.test.ts` to assert canonical-vs-legacy parity for clip-shape and shape-hit-area behavior.
     - Updated bridge inventory and boundary tests to reflect the reduced legacy value export surface.

9. Task 16: Batch B first migration slice
   - Status: Completed
   - Current result:
     - Moved zoom-family value exports (`DEFAULT_ENGINE_ZOOM_SESSION`, `accumulateEngineZoomSession`, `detectEngineZoomInputSource`, `getEngineZoomSettleDelay`, `handleEngineZoomWheel`, `normalizeEngineZoomDelta`, `resetEngineZoomSession`) from legacy bridge block to canonical module `packages/engine/src/interaction/zoom.ts`.
     - Added `packages/engine/src/testing/zoomBatchB.parity.test.ts` to assert canonical-vs-legacy parity for zoom defaults, source detection, normalization, accumulation, wheel handling, and reset behavior.
     - Updated bridge inventory and boundary tests to reflect the reduced legacy value export surface.

10. Task 17: Batch B second migration slice
    - Status: Completed
    - Current result:
      - Moved viewport-pan value exports (`accumulateEnginePointerPanOffset`, `accumulateEngineWheelPanOffset`, `createEngineViewportPanOrigin`) from legacy bridge block to canonical module `packages/engine/src/interaction/viewportPan.ts`.
      - Added `packages/engine/src/testing/viewportPanBatchB.parity.test.ts` to assert canonical-vs-legacy parity for origin creation and pointer/wheel accumulation behavior.
      - Updated bridge inventory and boundary tests to reflect the reduced legacy value export surface.

11. Task 18: Batch B third migration slice
    - Status: Completed
    - Current result:
      - Moved move-snap preview value export (`resolveEngineMoveSnapPreview`) from legacy bridge block to canonical module `packages/engine/src/interaction/snapping.ts`.
      - Added `packages/engine/src/testing/snappingBatchB.parity.test.ts` to assert canonical-vs-legacy parity for move-snap preview result generation.
      - Updated bridge inventory and boundary tests to reflect the reduced legacy value export surface.

12. Task 19: Batch B fourth migration slice
    - Status: Completed
    - Current result:
      - Moved geometry/visibility value exports (`resolveEngineGeometryPayload`, `resolveEngineVisibilityHitTestBudget`) from legacy bridge block to canonical modules `packages/engine/src/interaction/geometryPayload.ts` and `packages/engine/src/interaction/visibilityLod.ts`.
      - Added `packages/engine/src/testing/geometryPayloadBatchB.parity.test.ts` and `packages/engine/src/testing/visibilityLodBatchB.parity.test.ts` to assert canonical-vs-legacy parity for geometry payload and visibility budget behavior.
      - Updated bridge inventory and boundary tests to reflect the reduced legacy value export surface.

13. Task 21: Batch C first migration slice
    - Status: Completed
    - Current result:
      - Moved worker-mode value export (`resolveEngineWorkerMode`) from legacy bridge block to canonical module `packages/engine/src/interaction/workerCapabilities.ts`.
      - Added `packages/engine/src/testing/workerModeBatchC.parity.test.ts` to assert canonical-vs-legacy parity for worker mode resolution behavior.
      - Updated bridge inventory and boundary tests to reflect the reduced legacy value export surface.

14. Task 22: Batch C second migration slice
    - Status: Completed
    - Current result:
      - Moved render scheduler value export (`createEngineRenderScheduler`) from legacy bridge block to canonical module `packages/engine/src/scheduler/renderScheduler.ts`.
      - Added `packages/engine/src/testing/renderSchedulerBatchC.parity.test.ts` to assert canonical-vs-legacy parity for scheduler diagnostics and cancellation behavior.
      - Updated bridge inventory and boundary tests to reflect the reduced legacy value export surface.

15. Task 23: Batch C third migration slice
    - Status: Completed
    - Current result:
      - Moved spatial-index value export (`createEngineSpatialIndex`) from legacy bridge block to canonical module `packages/engine/src/spatial/engineSpatialIndex.ts`.
      - Added `packages/engine/src/testing/spatialIndexBatchC.parity.test.ts` to assert canonical-vs-legacy parity for load/search/update/remove behavior.
      - Updated bridge inventory and boundary tests to reflect the reduced legacy value export surface.

16. Task 24: Batch D first migration slice
    - Status: Completed
    - Current result:
      - Moved animation-controller value export (`createEngineAnimationController`) from legacy bridge block to canonical module `packages/engine/src/animation/engineAnimationController.ts`.
      - Added `packages/engine/src/testing/animationControllerBatchD.parity.test.ts` to assert canonical-vs-legacy parity for tick/update/completion sequencing.
      - Updated bridge inventory and boundary tests to reflect the reduced legacy value export surface.

17. Task 25: Batch D second migration slice
    - Status: Completed
    - Current result:
      - Moved `createEngine` value export out of the legacy bridge block to canonical module `packages/engine/src/api/createEngineCompat.ts`.
      - Added `packages/engine/src/testing/createEngineBatchD.parity.test.ts` to assert canonical export-path parity with the legacy factory.
      - Updated bridge inventory test so direct `@venus/engine-legacy` value exports are now locked to zero.

18. Task 26: Task 3.1 animation bridge implementation slice
    - Status: Completed
    - Current result:
      - Replaced legacy re-export in `packages/engine/src/animation/engineAnimationController.ts` with canonical in-module implementation.
      - Kept behavior parity with existing `animationControllerBatchD.parity` coverage; no public export regression observed.

19. Task 27: Task 3.2 spatial bridge implementation slice
    - Status: Completed
    - Current result:
      - Replaced legacy re-export in `packages/engine/src/spatial/engineSpatialIndex.ts` with canonical in-module implementation backed by `rbush-3d`.
      - Added direct runtime dependency declaration `rbush-3d` in `packages/engine/package.json` for canonical ownership of spatial index runtime.
      - Kept behavior parity with existing `spatialIndexBatchC.parity` coverage; no public export regression observed.

20. Task 28: Task 3.3-1 hit-test bridge implementation slice
    - Status: Completed
    - Current result:
      - Replaced direct legacy re-exports in `packages/engine/src/interaction/hitTest.ts` with canonical wrapper functions and local option contracts.
      - Preserved behavior by delegating to legacy implementation while stabilizing canonical function ownership and call surface.
      - Existing `packages/engine/src/testing/hitTestBatchA.parity.test.ts` remains green after this migration step.

21. Task 29: Task 3.3-2 snapping bridge implementation slice
    - Status: Completed
    - Current result:

- Replaced direct legacy re-export in `packages/engine/src/interaction/snapping.ts` with canonical in-module implementation backed by canonical spatial index.
- Existing `packages/engine/src/testing/snappingBatchB.parity.test.ts` remains green after this migration step.

22. Task 30: Task 3.3-3 geometry/visibility bridge implementation slice
    - Status: Completed
    - Current result:

- Replaced direct legacy re-export in `packages/engine/src/interaction/visibilityLod.ts` with canonical in-module implementation.
- `packages/engine/src/interaction/geometryPayload.ts` remained wrapper-owned in this slice and was scheduled for a dedicated follow-up migration.
- Existing parity coverage (`geometryPayloadBatchB` / `visibilityLodBatchB`) remains green after this migration step.

23. Task 31: Task 3.3-4 createEngine bridge implementation slice
    - Status: Completed
    - Current result:
      - Replaced direct legacy re-export in `packages/engine/src/api/createEngineCompat.ts` with canonical wrapper function.
      - Existing `packages/engine/src/testing/createEngineBatchD.parity.test.ts` remains green after this migration step.

24. Task 32: Bridge exit readiness checkpoint
    - Status: Completed
    - Current result:
      - Direct runtime re-exports from `@venus/engine-legacy` in canonical source are retired.
      - Runtime legacy imports remain in wrapper-owned modules and are now explicitly tracked as a shrink-only inventory.

- Runtime legacy import inventory has reached 0 canonical source modules.
- `packages/engine/src/api/createEngineCompat.ts` now uses canonical vNext-backed compatibility adapter plus local scene-state reducer core, without runtime import from `@venus/engine-legacy`.
- Runtime legacy import inventory was temporarily reopened for `packages/engine/src/api/createEngineCompat.ts` via guarded fallback (`AI-TEMP`) to restore real rendering output and coherent diagnostics under app runtime.

30. Task 32.1: createEngine method-surface compatibility baseline
    - Status: Completed
    - Current result:

- Added canonical compatibility-gap contract at `packages/engine/src/api/createEngineCompatGap.ts`.
- Locked runtime bridge required `createEngine` method inventory (derived from app callsites) and vNext-handle method inventory.
- Added guard test `packages/engine/src/testing/createEngineCompatGap.test.ts` to keep missing-method blockers explicit until parity lands.
- Validation: `pnpm --filter @venus/engine test` remains green with the new guard coverage.

31. Task 32.2: createEngine scene mutation/query compatibility core (phase 1)

- Status: Completed (phase 1)
- Current result:

- Added canonical scene-state compatibility core at `packages/engine/src/api/createEngineCompatSceneState.ts`.
- Implemented deterministic `loadScene` and patch-batch reducers (`applyEngineCompatScenePatchBatch` / `applyEngineCompatScenePatch`) with snapshot/node lookup helpers.
- Added coverage `packages/engine/src/testing/createEngineCompatSceneBatch.test.ts` for full-load and incremental patch semantics.
- This phase does not switch runtime `createEngineCompat` behavior yet; it prepares the scene adapter core for safe createEngine method-surface migration.

32. Task 32.3: createEngineCompat vNext adapter cutover

- Status: Completed
- Current result:

- Replaced runtime legacy delegation in `packages/engine/src/api/createEngineCompat.ts` with a vNext-backed compatibility adapter.
- Adapter now serves runtime bridge-required methods (`loadScene`, `applyScenePatchBatch`, `setViewport`, `updateCameraAnimation`, `markDirtyBounds`, `getDiagnostics`, `renderFrame`, `resize`, `dispose`) using canonical viewport helpers and the scene-state reducer core.
- Updated `packages/engine/src/testing/legacyRuntimeBoundary.test.mjs` expected runtime legacy import inventory to zero.
- Validation remained green across required gates (`engine test`, `typecheck`, `lint`, `build`).

33. Task 40: createEngineCompat adapter behavioral guard expansion

- Status: Completed
- Current result:

- Added `packages/engine/src/testing/createEngineCompat.adapter.test.ts` coverage for adapter fallback semantics: transaction null-path, visible/frustum query ids, hit-test null fallbacks, frame/hit plan defaults, camera3D snapshot set/get/clear, and resize->diagnostics output pixel ratio behavior.
- Guard coverage now tracks both runtime-bridge critical calls and deterministic fallback behavior, reducing regression risk while compatibility adapter remains active.

34. Task 41: createEngineCompat transaction/query/hit edge guard expansion

- Status: Completed
- Current result:

- Extended `packages/engine/src/testing/createEngineCompat.adapter.test.ts` with edge-case assertions for transaction callback non-invocation in current null-path behavior, no-throw side-effect setter APIs, and lifecycle method callability (`start`/`stop`/`isRunning`).
- Adapter fallback surface now has explicit guards for both return-value contracts and side-effect API stability under empty-scene and no-op inputs.

29. Task 39: createEngineCompat replacement and bridge-removal assessment
    - Status: Completed (assessment)
    - Current result:

- Verified initial blocker and method-surface gap for `createEngineCompat` replacement.
- Added explicit `AI-TEMP` compatibility marker to `packages/engine/src/api/createEngineCompat.ts` with removal condition bound to method/contract parity.
- Reduced remaining legacy coupling on canonical side by removing `@venus/engine-legacy` type import from `packages/engine/src/spatial/engineSpatialIndex.ts` (local canonical `EngineSpatialItem` contract now owns index payload typing).
- Follow-up cutover work is now captured in Task 32.3.

28. Task 38: Task 3.3-6 geometry payload bridge implementation slice
    - Status: Completed
    - Current result:

- Replaced runtime legacy wrapper in `packages/engine/src/interaction/geometryPayload.ts` with canonical in-module implementation.
- Added canonical helper modules under `packages/engine/src/interaction/geometryPayload/` for hints/selection/transform/path/ellipse/text/type payload routines.
- Updated `packages/engine/src/testing/legacyRuntimeBoundary.test.mjs` runtime legacy inventory to remove `interaction/geometryPayload.ts`.
- Existing `packages/engine/src/testing/geometryPayloadBatchB.parity.test.ts` remains green after this migration step.

27. Task 37: Task 3.3-5 hit-test bridge implementation slice
    - Status: Completed
    - Current result:

- Replaced runtime legacy wrapper in `packages/engine/src/interaction/hitTest.ts` with canonical in-module implementation.
- Added canonical helper modules under `packages/engine/src/interaction/hitTest/` for geometry/path/ellipse-arc/matrix hit routines.
- Existing `packages/engine/src/testing/hitTestBatchA.parity.test.ts` remains green after this migration step.

25. Task 33: Legacy boundary hardening gate
    - Status: Completed
    - Current result:
      - Added `packages/engine/src/testing/legacyRuntimeBoundary.test.mjs` with two guards:
        - forbids direct runtime re-exports from `@venus/engine-legacy` across canonical source
        - locks runtime legacy-import file inventory so scope can only shrink intentionally

26. Task 34: `_vnext` archive apply preflight checklist
    - Status: Completed (preflight only)
    - Current result:
      - Prepared deterministic apply preflight steps:
        1. ensure observation window is closed
        2. ensure clean worktree (or explicitly allow dirty override)
        3. run `node ./scripts/engine-vnext-finalize-archive.mjs --apply`
        4. run post-apply validation gates (`engine test`, `typecheck`, `lint`, `build`)
      - Apply action itself remains deferred until release window approval.

## Required Validation (R4)

- `pnpm --filter @venus/engine test`
- `pnpm typecheck`
- `pnpm lint`
- `pnpm build`

## Rollback Rule

If any hardening step regresses canonical app/runtime consumers, revert the specific hardening change and keep bridge active until parity is re-established.
