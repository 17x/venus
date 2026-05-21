# Engine vNext Legacy Bridge Batch Plan (2026-05-20)

Status: In Progress
Scope: Task 12 migration batching for remaining `@venus/engine-legacy` value exports

## Execution Delta

- 2026-05-20: Batch A first slice completed.
  - Migrated to canonical engine modules:
    - `resolveEngineAdaptiveHitTolerance`
    - `resolveEngineCanvasLodProfile`
- 2026-05-20: Batch A second slice completed.
  - Migrated to canonical engine modules:
    - `createMatrixFirstNodeTransform`
    - `createShapeTransformRecord`
    - `resolveNodeTransform`
    - `resolveShapeTransformRecord`
    - `toLegacyShapeTransformRecord`
    - `toResolvedNodeSvgTransform`
  - Remaining in Batch A:
    - `hitTest.ts` family
- 2026-05-20: Batch A third slice completed.
  - Migrated to canonical engine modules:
    - `isPointInsideEngineClipShape`
    - `isPointInsideEngineShapeHitArea`
  - Remaining in Batch A:
    - none
- 2026-05-20: Batch B first slice completed.
  - Migrated to canonical engine modules:
    - `DEFAULT_ENGINE_ZOOM_SESSION`
    - `accumulateEngineZoomSession`
    - `detectEngineZoomInputSource`
    - `getEngineZoomSettleDelay`
    - `handleEngineZoomWheel`
    - `normalizeEngineZoomDelta`
    - `resetEngineZoomSession`
  - Remaining in Batch B:
    - `snapping.ts`
    - `geometryPayload.ts`
    - `visibilityLod.ts`
- 2026-05-20: Batch B second slice completed.
  - Migrated to canonical engine modules:
    - `accumulateEnginePointerPanOffset`
    - `accumulateEngineWheelPanOffset`
    - `createEngineViewportPanOrigin`
  - Remaining in Batch B:
    - `geometryPayload.ts`
    - `visibilityLod.ts`
- 2026-05-20: Batch B third slice completed.
  - Migrated to canonical engine modules:
    - `resolveEngineMoveSnapPreview`
  - Remaining in Batch B:
    - `geometryPayload.ts`
    - `visibilityLod.ts`
- 2026-05-20: Batch B fourth slice completed.
  - Migrated to canonical engine modules:
    - `resolveEngineGeometryPayload`
    - `resolveEngineVisibilityHitTestBudget`
  - Remaining in Batch B:
    - none
- 2026-05-20: Batch C first slice completed.
  - Migrated to canonical engine modules:
    - `resolveEngineWorkerMode`
  - Remaining in Batch C:
    - `renderScheduler.ts`
    - `scene/spatial/index.ts`
- 2026-05-20: Batch C second slice completed.
  - Migrated to canonical engine modules:
    - `createEngineRenderScheduler`
  - Remaining in Batch C:
    - `scene/spatial/index.ts`
- 2026-05-20: Batch C third slice completed.
  - Migrated to canonical engine modules:
    - `createEngineSpatialIndex`
  - Remaining in Batch C:
    - none
- 2026-05-20: Batch D first slice completed.
  - Migrated to canonical engine modules:
    - `createEngineAnimationController`
  - Remaining in Batch D:
    - `runtime/createEngine/createEngine.ts`
- 2026-05-20: Batch D second slice completed.
  - Migrated to canonical engine modules:
    - `createEngine`
  - Remaining in Batch D:
    - none

## Remaining Value Exports Grouped by Legacy Module

None

## Recommended Batch Order

1. Batch A (lowest risk): interaction math-like helpers and transform helpers

- `shapeTransform.ts`
- `hitTest.ts`
- `hitTolerance.ts`
- `lodProfile.ts`
- Rationale: primarily pure or near-pure logic with localized behavior.

2. Batch B (medium risk): interaction state helpers and payload derivation

- `zoom.ts`
- `viewportPan.ts`
- `snapping.ts`
- `geometryPayload.ts`
- `visibilityLod.ts`
- Rationale: behavior is interaction-facing and may affect runtime feel; still isolated from engine lifecycle constructor.

3. Batch C (higher risk): runtime infrastructure

- `renderScheduler.ts`
- `scene/spatial/index.ts`
- `worker/capabilities.ts`
- Rationale: scheduler/indexing/capability paths affect performance and orchestration behavior.

4. Batch D (highest risk): lifecycle orchestration

- `createEngine.ts`
- `animation/index/index.ts`
- Rationale: main lifecycle entry and animation controller touch broad runtime surfaces.

## Execution Rule

- For each batch:

1. Port symbols to canonical vNext modules.
2. Move exports in `packages/engine/src/api/legacyEngineCompatExports.ts` from `@venus/engine-legacy` to canonical source.
3. Update `packages/engine/src/testing/legacyCompatExportBoundary.test.mjs` and `packages/engine/src/testing/legacyBridgeInventory.test.mjs`.
4. Run: `pnpm --filter @venus/engine test`, `pnpm typecheck`, `pnpm build`.
