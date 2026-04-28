import type {Point2D} from '../math/matrix.ts'

const DOM_DELTA_PIXEL = 0
const DOM_DELTA_LINE = 1
const DOM_DELTA_PAGE = 2
const ZOOM_SOURCE_LOCK_MS = 140

/**
 * Defines raw wheel input shape consumed by zoom normalization logic.
 */
export interface ZoomWheelInput {
  /** Stores wheel event client x coordinate. */
  clientX: number
  /** Stores wheel event client y coordinate. */
  clientY: number
  /** Stores whether Control key is pressed. */
  ctrlKey: boolean
  /** Stores whether Meta key is pressed. */
  metaKey: boolean
  /** Stores wheel delta mode. */
  deltaMode: number
  /** Stores wheel horizontal delta. */
  deltaX: number
  /** Stores wheel vertical delta. */
  deltaY: number
  /** Stores optional event timestamp. */
  timeStamp?: number
}

/**
 * Defines normalized zoom input source classes.
 */
export type ZoomInputSource = 'mouse' | 'trackpad'

/**
 * Defines normalized zoom delta used by zoom factor calculation.
 */
export interface NormalizedZoomDelta {
  /** Stores zoom anchor in screen space. */
  anchor: Point2D
  /** Stores normalized zoom delta. */
  delta: number
  /** Stores detected input source. */
  source: ZoomInputSource
  /** Stores optional event timestamp. */
  timeStamp?: number
}

/**
 * Defines zoom-session state used to smooth input source transitions.
 */
export interface ZoomSessionState {
  /** Indicates whether zoom gesture is currently active. */
  active: boolean
  /** Stores accumulated zoom factor for trackpad gestures. */
  factor: number
  /** Stores most recent zoom anchor. */
  anchor: Point2D | null
  /** Stores most recent zoom timestamp. */
  lastEventAt: number
  /** Stores locked zoom input source during gesture burst. */
  source: ZoomInputSource | null
}

/**
 * Defines processed zoom-wheel result used by adapters.
 */
export interface ZoomWheelResult {
  /** Stores next session state. */
  session: ZoomSessionState
  /** Stores per-event zoom factor. */
  factor: number
  /** Stores zoom anchor in screen space. */
  anchor: Point2D
  /** Stores settle delay for ending interaction phase. */
  settleDelay: number
  /** Stores detected input source. */
  source: ZoomInputSource
}

/**
 * Defines default zoom session baseline.
 */
export const DEFAULT_ZOOM_SESSION: ZoomSessionState = {
  active: false,
  factor: 1,
  anchor: null,
  lastEventAt: 0,
  source: null,
}

/**
 * Detects zoom input source using wheel delta heuristics.
 */
export function detectZoomInputSource(
  input: Pick<ZoomWheelInput, 'deltaMode' | 'deltaX' | 'deltaY'>,
): ZoomInputSource {
  if (input.deltaMode !== DOM_DELTA_PIXEL) {
    return 'mouse'
  }

  const absX = Math.abs(input.deltaX)
  const absY = Math.abs(input.deltaY)

  // Non-integer wheel deltas are a strong trackpad signal.
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

/**
 * Normalizes wheel delta into a zoom-delta contract shared by adapters.
 */
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

/**
 * Accumulates zoom-session state from one normalized zoom update.
 */
export function accumulateZoomSession(
  session: ZoomSessionState,
  update: {
    /** Stores normalized zoom anchor. */
    anchor: {x: number; y: number}
    /** Stores normalized zoom factor. */
    factor: number
    /** Stores normalized input source. */
    source: ZoomInputSource
    /** Stores optional event timestamp. */
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

/**
 * Resolves settle delay by source class.
 */
export function getZoomSettleDelay(source: ZoomInputSource | null): number {
  return source === 'trackpad' ? 120 : 72
}

/**
 * Resets zoom-session state back to the default baseline.
 */
export function resetZoomSession(): ZoomSessionState {
  return DEFAULT_ZOOM_SESSION
}

/**
 * Handles one wheel event by resolving source, delta, factor, and next session.
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

/**
 * Normalizes wheel delta while preserving caller-provided source lock.
 */
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

/**
 * Resolves zoom source and applies gesture-burst source lock.
 */
function resolveZoomSource(
  session: ZoomSessionState,
  input: ZoomWheelInput,
): ZoomInputSource {
  const detected = detectZoomInputSource(input)
  const currentTime = input.timeStamp ?? Date.now()

  // Keep one source during burst windows so response curve does not flicker.
  if (
    session.active &&
    session.source &&
    currentTime - session.lastEventAt <= ZOOM_SOURCE_LOCK_MS
  ) {
    return session.source
  }

  return detected
}

/**
 * Resolves delta scale coefficients by wheel mode and input source.
 */
function resolveZoomDeltaScale(deltaMode: number, source: ZoomInputSource): number {
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

/**
 * Resolves final zoom factor from normalized input source and delta.
 */
function resolveZoomFactor(normalized: NormalizedZoomDelta): number {
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

