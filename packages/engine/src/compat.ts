/**
 * Compatibility entrypoint for legacy non-prefixed engine exports.
 *
 * New integrations should import canonical `Engine*` names from `@venus/engine`.
 * Keep this surface as a migration bridge only.
 */
export {
  createEngineMarqueeState as createMarqueeState,
  getEngineNormalizedBounds as getNormalizedBounds,
  intersectsEngineBounds as intersectsBounds,
  resolveEngineMarqueeBounds as resolveMarqueeBounds,
  resolveEngineMarqueeSelection as resolveMarqueeSelection,
  updateEngineMarqueeState as updateMarqueeState,
} from './interaction/marquee.ts'

export {
  buildEngineSelectionHandlesFromBounds as buildSelectionHandlesFromBounds,
  pickEngineSelectionHandleAtPoint as pickSelectionHandleAtPoint,
} from './interaction/selectionHandles.ts'

export {
  resolveEngineMoveSnapPreview as resolveMoveSnapPreview,
} from './interaction/snapping.ts'

export {
  DEFAULT_ENGINE_VIEWPORT as DEFAULT_VIEWPORT,
  clampEngineViewportScale as clampViewportScale,
  fitEngineViewportToDocument as fitViewportToDocument,
  panEngineViewportState as panViewportState,
  resolveEngineViewportState as resolveViewportState,
  resizeEngineViewportState as resizeViewportState,
  zoomEngineViewportState as zoomViewportState,
} from './interaction/viewport.ts'

export {
  DEFAULT_ENGINE_ZOOM_SESSION as DEFAULT_ZOOM_SESSION,
  detectEngineZoomInputSource as detectZoomInputSource,
  getEngineZoomSettleDelay as getZoomSettleDelay,
  handleEngineZoomWheel as handleZoomWheel,
  normalizeEngineZoomDelta as normalizeZoomDelta,
  resetEngineZoomSession as resetZoomSession,
} from './interaction/zoom.ts'
