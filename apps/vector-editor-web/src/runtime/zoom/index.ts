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

// Runtime zoom API preserves historical names while delegating mechanism logic to engine.
export type ZoomWheelInput = EngineZoomWheelInput
export type ZoomInputSource = EngineZoomInputSource
export type NormalizedZoomDelta = EngineNormalizedZoomDelta
export type ZoomSessionState = EngineZoomSessionState
export type ZoomWheelResult = EngineZoomWheelResult

export const DEFAULT_ZOOM_SESSION: ZoomSessionState = DEFAULT_ENGINE_ZOOM_SESSION

// Derive zoom input source (trackpad vs wheel-like) using the shared engine heuristic.
export function detectZoomInputSource(
  input: Pick<ZoomWheelInput, 'deltaMode' | 'deltaX' | 'deltaY'>,
): ZoomInputSource {
  return detectEngineZoomInputSource(input)
}

// Normalize wheel deltas into runtime zoom factors with consistent cross-device behavior.
export function normalizeZoomDelta(input: ZoomWheelInput): NormalizedZoomDelta {
  return normalizeEngineZoomDelta(input)
}

// Accumulate gesture session state so burst wheel events resolve to coherent zoom intent.
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

// Resolve settle delay by input source so trackpad and wheel end-states remain stable.
export function getZoomSettleDelay(source: ZoomInputSource | null) {
  return getEngineZoomSettleDelay(source)
}

// Reset zoom session state when a gesture burst ends or runtime state is reinitialized.
export function resetZoomSession(): ZoomSessionState {
  return resetEngineZoomSession()
}

// Convert wheel input to zoom output while preserving runtime compatibility contracts.
export function handleZoomWheel(
  session: ZoomSessionState,
  input: ZoomWheelInput,
): ZoomWheelResult {
  return handleEngineZoomWheel(session, input)
}

