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
  resolveNodeTransform,
} from './engine.ts'
import type {
  CreateEngineOptions,
} from '@venus/engine'

/**
 * Compile-time export contract for vector app engine consumption.
 * Keeping this object typed and exported forces typecheck to fail
 * when canonical @venus/engine export names drift during refactors.
 */
export const ENGINE_EXPORT_CONTRACT: {
  createEngine: (options: CreateEngineOptions) => RuntimeEngine
  createEngineRenderScheduler: typeof createEngineRenderScheduler
  applyAffineMatrixToPoint: typeof applyAffineMatrixToPoint
  createAffineMatrixAroundPoint: typeof createAffineMatrixAroundPoint
  doNormalizedBoundsOverlap: typeof doNormalizedBoundsOverlap
  getNormalizedBoundsFromBox: typeof getNormalizedBoundsFromBox
  resolveEngineGeometryPayload: typeof resolveEngineGeometryPayload
  resolveEngineAdaptiveHitTolerance: typeof resolveEngineAdaptiveHitTolerance
  resolveNodeTransform: typeof resolveNodeTransform
  schedulerType: EngineRenderScheduler | null
} = {
  createEngine,
  createEngineRenderScheduler,
  applyAffineMatrixToPoint,
  createAffineMatrixAroundPoint,
  doNormalizedBoundsOverlap,
  getNormalizedBoundsFromBox,
  resolveEngineGeometryPayload,
  resolveEngineAdaptiveHitTolerance,
  resolveNodeTransform,
  schedulerType: null,
}
