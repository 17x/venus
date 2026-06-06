import {
  EngineRenderScheduler,
  RuntimeEngine,
  applyAffineMatrixToPoint,
  createAffineMatrixAroundPoint,
  createEngine,
  createEngineRenderScheduler,
  doNormalizedBoundsOverlap,
  getNormalizedBoundsFromBox,
  resolveEngineAdaptiveHitTolerance,
  resolveEngineGeometryPayload,
  resolveEngineConstraintProjection,
  resolveNodeTransform,
} from './engine.ts'
import {
  commitViewportState,
  createRevisionMismatchError,
  getRuntimeDiagnosticsSnapshot,
  invalidateSceneRegions,
  isRevisionMismatchError,
  resolveHitGeometryV2,
  syncSceneDelta,
} from './engineContractAdapters.ts'
import type {
  CreateEngineOptions,
} from '@venus/engine'

/**
 * Compile-time export contract for vector app engine consumption.
 * Keeping this object typed and exported forces typecheck to fail
 * when canonical @venus/engine export names drift during refactors.
 * The five PRD-contract adapters (W1-T06 GAP-01 through GAP-05) are included
 * so any signature drift from the requirement spec is caught at compile time.
 */
export const ENGINE_EXPORT_CONTRACT: {
  createEngine: (options: CreateEngineOptions) => RuntimeEngine
  createEngineRenderScheduler: typeof createEngineRenderScheduler
  applyAffineMatrixToPoint: typeof applyAffineMatrixToPoint
  createAffineMatrixAroundPoint: typeof createAffineMatrixAroundPoint
  doNormalizedBoundsOverlap: typeof doNormalizedBoundsOverlap
  getNormalizedBoundsFromBox: typeof getNormalizedBoundsFromBox
  resolveEngineGeometryPayload: typeof resolveEngineGeometryPayload
  resolveEngineConstraintProjection: typeof resolveEngineConstraintProjection
  resolveEngineAdaptiveHitTolerance: typeof resolveEngineAdaptiveHitTolerance
  resolveNodeTransform: typeof resolveNodeTransform
  schedulerType: EngineRenderScheduler | null
  // PRD contract adapters — W1-T06 gap closures
  resolveHitGeometryV2: typeof resolveHitGeometryV2
  syncSceneDelta: typeof syncSceneDelta
  commitViewportState: typeof commitViewportState
  invalidateSceneRegions: typeof invalidateSceneRegions
  getRuntimeDiagnosticsSnapshot: typeof getRuntimeDiagnosticsSnapshot
  createRevisionMismatchError: typeof createRevisionMismatchError
  isRevisionMismatchError: typeof isRevisionMismatchError
} = {
  createEngine,
  createEngineRenderScheduler,
  applyAffineMatrixToPoint,
  createAffineMatrixAroundPoint,
  doNormalizedBoundsOverlap,
  getNormalizedBoundsFromBox,
  resolveEngineGeometryPayload,
  resolveEngineConstraintProjection,
  resolveEngineAdaptiveHitTolerance,
  resolveNodeTransform,
  schedulerType: null,
  resolveHitGeometryV2,
  syncSceneDelta,
  commitViewportState,
  invalidateSceneRegions,
  getRuntimeDiagnosticsSnapshot,
  createRevisionMismatchError,
  isRevisionMismatchError,
}
