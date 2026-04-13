// Runtime-facing engine facade for app shells.
//
// Keep app imports on `@venus/runtime/engine` so `@venus/engine` remains an
// implementation detail behind runtime package boundaries.
export type {
  Engine,
  EngineBackend,
  EngineRenderScheduler,
  EngineReplayRenderRequest,
  EngineReplayWorkerEvent,
  EngineReplayWorkerMessage,
} from '@venus/engine'

export {
  applyAffineMatrixToPoint,
  buildEngineSelectionHandlesFromBounds,
  createAffineMatrixAroundPoint,
  createEngine,
  createEngineRenderScheduler,
  createEngineReplayCoordinator,
  doNormalizedBoundsOverlap,
  getNormalizedBoundsFromBox,
  resolveNodeTransform,
  toResolvedNodeSvgTransform,
} from '@venus/engine'
