// Runtime-facing engine facade for app shells.
// Keep app imports on `@vector/runtime/engine` so `@venus/engine` remains an
// implementation detail behind runtime package boundaries.
import {
  createEngine as createRawEngine,
  createEngineRenderScheduler,
  applyAffineMatrixToPoint,
  createAffineMatrixAroundPoint,
  doNormalizedBoundsOverlap,
  getNormalizedBoundsFromBox,
  resolveEngineAdaptiveHitTolerance,
  resolveNodeTransform,
  toResolvedNodeSvgTransform,
} from '@venus/engine'
import type {
  Engine as InternalEngine,
  CreateEngineOptions,
} from '@venus/engine'

/**
 * Runtime-facing engine contract for vector bridge consumers.
 * Performance-tuning mutators stay engine-internal during the debug stage.
 */
export type RuntimeEngine = Omit<
  InternalEngine,
  | 'setDpr'
  | 'setQuality'
  | 'setInteractionPreview'
  | 'startCameraAnimation'
  | 'updateCameraAnimation'
  | 'stopCameraAnimation'
>

export type {
  EngineOverlayDrawNode,
  ResolveEngineAdaptiveHitToleranceOptions,
  EngineRenderScheduler,
} from '@venus/engine'

/**
 * Creates a runtime-facing engine handle with performance mutators hidden.
 * The underlying engine still owns these APIs internally.
 */
export function createEngine(options: CreateEngineOptions): RuntimeEngine {
  return createRawEngine(options) as RuntimeEngine
}

export {
  applyAffineMatrixToPoint,
  createAffineMatrixAroundPoint,
  createEngineRenderScheduler,
  doNormalizedBoundsOverlap,
  getNormalizedBoundsFromBox,
  resolveEngineAdaptiveHitTolerance,
  resolveNodeTransform,
  toResolvedNodeSvgTransform,
}
