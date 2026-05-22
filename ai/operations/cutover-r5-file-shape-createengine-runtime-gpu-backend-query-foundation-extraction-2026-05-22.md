[CHANGE REQUEST]

Target:

- File / Module:
  - packages/engine/src/api/createEngine.ts
  - packages/engine/src/api/createEngine.runtime-gpu-backend-query.foundation.ts

Goal:

- Problem being solved:
  - Further reduce createEngine.ts by extracting runtime GPU/upload/barrier/readback, backend switch state helpers, and spatial query helpers into one cohesive foundation module.

Change Type:

- Modify
- Add

Impact:

- Affected modules:
  - packages/engine/src/api/createEngine.ts
  - packages/engine/src/api/createEngine.runtime.facade.ts (indirect wiring only)

Cleanup:

- Old logic to remove:
  - Inline helpers in createEngine.ts:
    - destroyRuntimeGpuResource
    - createRuntimeUploadBatch
    - createRuntimeBarrierPlan
    - applyRuntimeBarrierPlan
    - readbackRuntimeResource
    - queryRuntimeViewportCandidates
    - queryRuntimeFrustumVisibleSet
    - queryRuntimeSpatialIndex
    - resolveRuntimeBackendState
    - switchRuntimeBackend
    - resolveRuntimeBackendFallbackHistory
    - setRuntimeBackendDebugOptions
    - captureRuntimeCommandTrace
    - resolveRuntimePublicMetrics
    - resolveSpatialQueryNodes
    - resolveRayPickCandidates
    - queryGraph
    - pickGraph
    - raycastGraph

Tests:

- Tests to add/update:
  - No behavior changes intended; validate with strict typecheck and file-shape gates.
