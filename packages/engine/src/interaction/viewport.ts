/**
 * Re-export viewport primitives from @venus/lib while preserving engine API names.
 */
export type {
  CanvasViewportState as EngineCanvasViewportState,
  ViewportFitDocumentLike as EngineViewportFitDocumentLike,
} from '@venus/lib/viewport'
export {
  DEFAULT_VIEWPORT as DEFAULT_ENGINE_VIEWPORT,
  clampViewportScale as clampEngineViewportScale,
  fitViewportToDocument as fitEngineViewportToDocument,
  panViewportState as panEngineViewportState,
  resolveViewportState as resolveEngineViewportState,
  resizeViewportState as resizeEngineViewportState,
  zoomViewportState as zoomEngineViewportState,
} from '@venus/lib/viewport'
