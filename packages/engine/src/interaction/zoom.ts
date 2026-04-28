/**
 * Re-export zoom helpers from @venus/lib while preserving engine API names.
 */
export type {
  NormalizedZoomDelta as EngineNormalizedZoomDelta,
  ZoomInputSource as EngineZoomInputSource,
  ZoomSessionState as EngineZoomSessionState,
  ZoomWheelInput as EngineZoomWheelInput,
  ZoomWheelResult as EngineZoomWheelResult,
} from '@venus/lib/viewport'
export {
  DEFAULT_ZOOM_SESSION as DEFAULT_ENGINE_ZOOM_SESSION,
  accumulateZoomSession as accumulateEngineZoomSession,
  detectZoomInputSource as detectEngineZoomInputSource,
  getZoomSettleDelay as getEngineZoomSettleDelay,
  handleZoomWheel as handleEngineZoomWheel,
  normalizeZoomDelta as normalizeEngineZoomDelta,
  resetZoomSession as resetEngineZoomSession,
} from '@venus/lib/viewport'
