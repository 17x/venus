/**
 * Declares engine zoom delta contract through canonical interaction namespace.
 */
export type {
  NormalizedZoomDelta as EngineNormalizedZoomDelta,
  ZoomInputSource as EngineZoomInputSource,
  ZoomSessionState as EngineZoomSessionState,
  ZoomWheelInput as EngineZoomWheelInput,
  ZoomWheelResult as EngineZoomWheelResult,
} from "@venus/lib/viewport";

/**
 * Re-exports default zoom session from canonical interaction namespace.
 */
export { DEFAULT_ZOOM_SESSION as DEFAULT_ENGINE_ZOOM_SESSION } from "@venus/lib/viewport";

/**
 * Re-exports zoom-session accumulator from canonical interaction namespace.
 */
export { accumulateZoomSession as accumulateEngineZoomSession } from "@venus/lib/viewport";

/**
 * Re-exports zoom input-source detector from canonical interaction namespace.
 */
export { detectZoomInputSource as detectEngineZoomInputSource } from "@venus/lib/viewport";

/**
 * Re-exports zoom settle-delay resolver from canonical interaction namespace.
 */
export { getZoomSettleDelay as getEngineZoomSettleDelay } from "@venus/lib/viewport";

/**
 * Re-exports wheel-zoom handler from canonical interaction namespace.
 */
export { handleZoomWheel as handleEngineZoomWheel } from "@venus/lib/viewport";

/**
 * Re-exports zoom delta normalizer from canonical interaction namespace.
 */
export { normalizeZoomDelta as normalizeEngineZoomDelta } from "@venus/lib/viewport";

/**
 * Re-exports zoom session reset helper from canonical interaction namespace.
 */
export { resetZoomSession as resetEngineZoomSession } from "@venus/lib/viewport";
