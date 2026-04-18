import {
  DEFAULT_ENGINE_ZOOM_SESSION,
  accumulateEngineZoomSession,
  detectEngineZoomInputSource,
  getEngineZoomSettleDelay,
  handleEngineZoomWheel,
  normalizeEngineZoomDelta,
  resetEngineZoomSession,
  type EngineNormalizedZoomDelta,
  type EngineZoomInputSource,
  type EngineZoomSessionState,
  type EngineZoomWheelInput,
  type EngineZoomWheelResult,
} from '@venus/engine'

// Compatibility bridge: zoom mechanism ownership moved to @venus/engine.
// Runtime keeps historical names so existing integrations do not break.
export type ZoomWheelInput = EngineZoomWheelInput
export type ZoomInputSource = EngineZoomInputSource
export type NormalizedZoomDelta = EngineNormalizedZoomDelta
export type ZoomSessionState = EngineZoomSessionState
export type ZoomWheelResult = EngineZoomWheelResult

export const DEFAULT_ZOOM_SESSION: ZoomSessionState = DEFAULT_ENGINE_ZOOM_SESSION

export function detectZoomInputSource(
  input: Pick<ZoomWheelInput, 'deltaMode' | 'deltaX' | 'deltaY'>,
): ZoomInputSource {
  return detectEngineZoomInputSource(input)
}

export function normalizeZoomDelta(input: ZoomWheelInput): NormalizedZoomDelta {
  return normalizeEngineZoomDelta(input)
}

export function accumulateZoomSession(
  session: ZoomSessionState,
  update: {
    anchor: {x: number; y: number}
    factor: number
    source: ZoomInputSource
    timeStamp?: number
  },
): ZoomSessionState {
  return accumulateEngineZoomSession(session, update)
}

export function getZoomSettleDelay(source: ZoomInputSource | null) {
  return getEngineZoomSettleDelay(source)
}

export function resetZoomSession(): ZoomSessionState {
  return resetEngineZoomSession()
}

export function handleZoomWheel(
  session: ZoomSessionState,
  input: ZoomWheelInput,
): ZoomWheelResult {
  return handleEngineZoomWheel(session, input)
}
