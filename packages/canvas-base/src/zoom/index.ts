import type {Point2D} from '../viewport/matrix.ts'

export interface ZoomWheelInput {
  clientX: number
  clientY: number
  ctrlKey: boolean
  metaKey: boolean
  deltaMode: number
  deltaX: number
  deltaY: number
  timeStamp?: number
}

export type ZoomInputSource = 'mouse' | 'trackpad'

export interface NormalizedZoomDelta {
  anchor: Point2D
  delta: number
  source: ZoomInputSource
  timeStamp?: number
}

export interface ZoomSessionState {
  active: boolean
  factor: number
  anchor: Point2D | null
  lastEventAt: number
  source: ZoomInputSource | null
}

export interface ZoomWheelResult {
  session: ZoomSessionState
  factor: number
  anchor: Point2D
  settleDelay: number
  source: ZoomInputSource
}

export const DEFAULT_ZOOM_SESSION: ZoomSessionState = {
  active: false,
  factor: 1,
  anchor: null,
  lastEventAt: 0,
  source: null,
}

export function detectZoomInputSource(
  input: Pick<ZoomWheelInput, 'deltaMode' | 'deltaX' | 'deltaY'>,
): ZoomInputSource {
  if (input.deltaMode !== WheelEvent.DOM_DELTA_PIXEL) {
    return 'mouse'
  }

  const absX = Math.abs(input.deltaX)
  const absY = Math.abs(input.deltaY)

  if (!Number.isInteger(input.deltaX) || !Number.isInteger(input.deltaY)) {
    return 'trackpad'
  }

  if (absX > 0 && absY < 16) {
    return 'trackpad'
  }

  if (absY > 0 && absY < 12) {
    return 'trackpad'
  }

  return 'mouse'
}

export function normalizeZoomDelta(input: ZoomWheelInput): NormalizedZoomDelta {
  const source = detectZoomInputSource(input)
  const normalizedDelta = Math.max(-160, Math.min(160, input.deltaY))
  const deltaScale = resolveZoomDeltaScale(input.deltaMode, source)

  return {
    anchor: {
      x: input.clientX,
      y: input.clientY,
    },
    delta: normalizedDelta * deltaScale,
    source,
    timeStamp: input.timeStamp,
  }
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
  return {
    active: true,
    factor: session.factor * update.factor,
    anchor: update.anchor,
    lastEventAt: update.timeStamp ?? Date.now(),
    source: update.source,
  }
}

export function getZoomSettleDelay(source: ZoomInputSource | null) {
  return source === 'trackpad' ? 120 : 72
}

export function resetZoomSession(): ZoomSessionState {
  return DEFAULT_ZOOM_SESSION
}

/**
 * Main entry for framework adapters.
 *
 * It hides the device heuristics and session accumulation details behind a
 * single call so React/Vue/Angular integrations can stay simple.
 */
export function handleZoomWheel(
  session: ZoomSessionState,
  input: ZoomWheelInput,
): ZoomWheelResult {
  const normalized = normalizeZoomDelta(input)
  const factor = Math.exp(-normalized.delta)
  const nextSession = accumulateZoomSession(session, {
    anchor: normalized.anchor,
    factor,
    source: normalized.source,
    timeStamp: normalized.timeStamp,
  })

  return {
    session: nextSession,
    factor,
    anchor: normalized.anchor,
    settleDelay: getZoomSettleDelay(nextSession.source),
    source: normalized.source,
  }
}

function resolveZoomDeltaScale(deltaMode: number, source: ZoomInputSource) {
  if (source === 'mouse') {
    if (deltaMode === WheelEvent.DOM_DELTA_PAGE) {
      return 0.03
    }

    if (deltaMode === WheelEvent.DOM_DELTA_LINE) {
      return 0.018
    }

    return 0.008
  }

  if (deltaMode === WheelEvent.DOM_DELTA_PAGE) {
    return 0.08
  }

  if (deltaMode === WheelEvent.DOM_DELTA_LINE) {
    return 0.04
  }

  return 0.02
}
