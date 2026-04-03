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

const ZOOM_SOURCE_LOCK_MS = 140

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

  if (absY > 0 && absY <= 4) {
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
  const nextFactor =
    update.source === 'mouse'
      ? update.factor
      : session.factor * update.factor

  return {
    active: true,
    factor: nextFactor,
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
  const source = resolveZoomSource(session, input)
  const normalized = normalizeZoomDeltaWithSource(input, source)
  const factor = resolveZoomFactor(normalized)
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

function normalizeZoomDeltaWithSource(
  input: ZoomWheelInput,
  source: ZoomInputSource,
): NormalizedZoomDelta {
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

function resolveZoomSource(
  session: ZoomSessionState,
  input: ZoomWheelInput,
): ZoomInputSource {
  const detected = detectZoomInputSource(input)
  const currentTime = input.timeStamp ?? Date.now()

  if (
    session.active &&
    session.source &&
    currentTime - session.lastEventAt <= ZOOM_SOURCE_LOCK_MS
  ) {
    return session.source
  }

  return detected
}

function resolveZoomDeltaScale(deltaMode: number, source: ZoomInputSource) {
  if (source === 'mouse') {
    if (deltaMode === WheelEvent.DOM_DELTA_PAGE) {
      return 0.008
    }

    if (deltaMode === WheelEvent.DOM_DELTA_LINE) {
      return 0.004
    }

    return 0.0015
  }

  if (deltaMode === WheelEvent.DOM_DELTA_PAGE) {
    return 0.05
  }

  if (deltaMode === WheelEvent.DOM_DELTA_LINE) {
    return 0.022
  }

  return 0.012
}

function resolveZoomFactor(normalized: NormalizedZoomDelta) {
  if (normalized.source === 'mouse') {
    if (normalized.delta > 0) {
      return 0.992
    }

    if (normalized.delta < 0) {
      return 1.008
    }

    return 1
  }

  const clampedDelta = Math.max(-0.18, Math.min(0.18, normalized.delta))
  const softenedDelta = clampedDelta * 0.8

  return Math.exp(-softenedDelta)
}
