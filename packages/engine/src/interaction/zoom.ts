import type {Point2D} from '../math/matrix.ts'

const DOM_DELTA_PIXEL = 0
const DOM_DELTA_LINE = 1
const DOM_DELTA_PAGE = 2
const ZOOM_SOURCE_LOCK_MS = 140

export interface EngineZoomWheelInput {
  clientX: number
  clientY: number
  ctrlKey: boolean
  metaKey: boolean
  deltaMode: number
  deltaX: number
  deltaY: number
  timeStamp?: number
}

export type EngineZoomInputSource = 'mouse' | 'trackpad'

export interface EngineNormalizedZoomDelta {
  anchor: Point2D
  delta: number
  source: EngineZoomInputSource
  timeStamp?: number
}

export interface EngineZoomSessionState {
  active: boolean
  factor: number
  anchor: Point2D | null
  lastEventAt: number
  source: EngineZoomInputSource | null
}

export interface EngineZoomWheelResult {
  session: EngineZoomSessionState
  factor: number
  anchor: Point2D
  settleDelay: number
  source: EngineZoomInputSource
}

export const DEFAULT_ENGINE_ZOOM_SESSION: EngineZoomSessionState = {
  active: false,
  factor: 1,
  anchor: null,
  lastEventAt: 0,
  source: null,
}

/**
 * Heuristic-only source detector used by higher-level adapters.
 * This intentionally avoids DOM globals so engine stays platform-agnostic.
 */
export function detectEngineZoomInputSource(
  input: Pick<EngineZoomWheelInput, 'deltaMode' | 'deltaX' | 'deltaY'>,
): EngineZoomInputSource {
  if (input.deltaMode !== DOM_DELTA_PIXEL) {
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

export function normalizeEngineZoomDelta(input: EngineZoomWheelInput): EngineNormalizedZoomDelta {
  const source = detectEngineZoomInputSource(input)
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

export function accumulateEngineZoomSession(
  session: EngineZoomSessionState,
  update: {
    anchor: {x: number; y: number}
    factor: number
    source: EngineZoomInputSource
    timeStamp?: number
  },
): EngineZoomSessionState {
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

export function getEngineZoomSettleDelay(source: EngineZoomInputSource | null) {
  return source === 'trackpad' ? 120 : 72
}

export function resetEngineZoomSession(): EngineZoomSessionState {
  return DEFAULT_ENGINE_ZOOM_SESSION
}

/**
 * Single-call zoom entry for adapters: resolves source, normalizes delta,
 * updates session state, and returns per-event zoom factor.
 */
export function handleEngineZoomWheel(
  session: EngineZoomSessionState,
  input: EngineZoomWheelInput,
): EngineZoomWheelResult {
  const source = resolveZoomSource(session, input)
  const normalized = normalizeEngineZoomDeltaWithSource(input, source)
  const factor = resolveZoomFactor(normalized)
  const nextSession = accumulateEngineZoomSession(session, {
    anchor: normalized.anchor,
    factor,
    source: normalized.source,
    timeStamp: normalized.timeStamp,
  })

  return {
    session: nextSession,
    factor,
    anchor: normalized.anchor,
    settleDelay: getEngineZoomSettleDelay(nextSession.source),
    source: normalized.source,
  }
}

function normalizeEngineZoomDeltaWithSource(
  input: EngineZoomWheelInput,
  source: EngineZoomInputSource,
): EngineNormalizedZoomDelta {
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
  session: EngineZoomSessionState,
  input: EngineZoomWheelInput,
): EngineZoomInputSource {
  const detected = detectEngineZoomInputSource(input)
  const currentTime = input.timeStamp ?? Date.now()

  // During one gesture burst, keep a stable source classification so zoom
  // response does not flicker between mouse/trackpad curves.
  if (
    session.active &&
    session.source &&
    currentTime - session.lastEventAt <= ZOOM_SOURCE_LOCK_MS
  ) {
    return session.source
  }

  return detected
}

function resolveZoomDeltaScale(deltaMode: number, source: EngineZoomInputSource) {
  if (source === 'mouse') {
    if (deltaMode === DOM_DELTA_PAGE) {
      return 0.008
    }

    if (deltaMode === DOM_DELTA_LINE) {
      return 0.004
    }

    return 0.0015
  }

  if (deltaMode === DOM_DELTA_PAGE) {
    return 0.05
  }

  if (deltaMode === DOM_DELTA_LINE) {
    return 0.022
  }

  return 0.012
}

function resolveZoomFactor(normalized: EngineNormalizedZoomDelta) {
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