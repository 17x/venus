/**
 * Re-export viewport primitives from @venus/lib while preserving engine API names.
 */
export type {
  CanvasViewportState as EngineCanvasViewportState,
  ViewportScaleRange as EngineViewportScaleRange,
  ViewportFitDocumentLike as EngineViewportFitDocumentLike,
} from '@venus/lib/viewport'
export {
  DEFAULT_VIEWPORT as DEFAULT_ENGINE_VIEWPORT,
  DEFAULT_VIEWPORT_SCALE_RANGE as DEFAULT_ENGINE_VIEWPORT_SCALE_RANGE,
  clampViewportScale as clampEngineViewportScale,
  fitViewportToDocument as fitEngineViewportToDocument,
  panViewportState as panEngineViewportState,
  resolveViewportState as resolveEngineViewportState,
  resizeViewportState as resizeEngineViewportState,
  zoomViewportState as zoomEngineViewportState,
} from '@venus/lib/viewport'
