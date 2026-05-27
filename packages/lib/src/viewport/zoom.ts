import type { Point2D } from '../math/index.ts'

/**
 * Declares wheel input payload used by zoom normalizers.
 */
export interface ZoomWheelInput {
  /** Stores pointer client x coordinate. */
  clientX: number
  /** Stores pointer client y coordinate. */
  clientY: number
  /** Stores ctrl key state. */
  ctrlKey: boolean
  /** Stores meta key state. */
  metaKey: boolean
  /** Stores wheel delta mode from browser input. */
  deltaMode: number
  /** Stores wheel horizontal delta. */
  deltaX: number
  /** Stores wheel vertical delta. */
  deltaY: number
  /** Stores optional event timestamp. */
  timeStamp?: number
}

/**
 * Enumerates normalized zoom input source categories.
 */
export type ZoomInputSource = 'mouse' | 'trackpad'

/**
 * Declares normalized zoom delta payload returned by wheel normalization.
 */
export interface NormalizedZoomDelta {
  /** Stores zoom anchor in screen-space coordinates. */
  anchor: Point2D
  /** Stores multiplicative zoom factor delta. */
  delta: number
  /** Stores detected input source category. */
  source: ZoomInputSource
  /** Stores optional source event timestamp. */
  timeStamp?: number
}

/**
 * Declares mutable zoom session state carried across wheel events.
 */
export interface ZoomSessionState {
  /** Stores whether the session is currently active. */
  active: boolean
  /** Stores latest accumulated zoom factor. */
  factor: number
  /** Stores latest zoom anchor or null when inactive. */
  anchor: Point2D | null
  /** Stores latest event timestamp. */
  lastEventAt: number
  /** Stores latest detected input source or null when inactive. */
  source: ZoomInputSource | null
}

/**
 * Declares high-level zoom wheel handling result payload.
 */
export interface ZoomWheelResult {
  /** Stores updated zoom session state. */
  session: ZoomSessionState
  /** Stores zoom factor for the current wheel event. */
  factor: number
  /** Stores zoom anchor for the current wheel event. */
  anchor: Point2D
  /** Stores settle delay in milliseconds used by runtime policies. */
  settleDelay: number
  /** Stores detected input source category. */
  source: ZoomInputSource
}

/**
 * Stores initial zoom session state before wheel interaction begins.
 */
export const DEFAULT_ZOOM_SESSION: ZoomSessionState = {
  active: false,
  factor: 1,
  anchor: null,
  lastEventAt: 0,
  source: null,
}

/**
 * Detects one zoom input source from wheel delta profile.
 * @param input Wheel delta profile.
 */
export function detectZoomInputSource(
  input: Pick<ZoomWheelInput, 'deltaMode' | 'deltaX' | 'deltaY'>,
): ZoomInputSource {
  const absoluteY = Math.abs(input.deltaY)
  const absoluteX = Math.abs(input.deltaX)
  if (input.deltaMode === 0 && absoluteY < 16 && absoluteX < 16) {
    return 'trackpad'
  }
  return 'mouse'
}

/**
 * Normalizes one wheel input into a stable multiplicative zoom delta.
 * @param input Raw wheel payload.
 */
export function normalizeZoomDelta(input: ZoomWheelInput): NormalizedZoomDelta {
  const source = detectZoomInputSource(input)
  const dominantAxisDelta = Math.abs(input.deltaY) >= Math.abs(input.deltaX)
    ? input.deltaY
    : input.deltaX
  const normalizedDelta = input.deltaMode === 1
    ? dominantAxisDelta * 16
    : input.deltaMode === 2
      ? dominantAxisDelta * 100
      : dominantAxisDelta
  const delta = Math.exp(-normalizedDelta / 300)

  return {
    anchor: { x: input.clientX, y: input.clientY },
    delta,
    source,
    timeStamp: input.timeStamp,
  }
}

/**
 * Accumulates one zoom session update into stable session state.
 * @param session Existing zoom session state.
 * @param update Normalized zoom update payload.
 */
export function accumulateZoomSession(
  session: ZoomSessionState,
  update: {
    /** Stores current zoom anchor. */
    anchor: { x: number; y: number }
    /** Stores current zoom factor. */
    factor: number
    /** Stores current zoom source category. */
    source: ZoomInputSource
    /** Stores optional event timestamp. */
    timeStamp?: number
  },
): ZoomSessionState {
  return {
    active: true,
    factor: update.factor,
    anchor: { x: update.anchor.x, y: update.anchor.y },
    lastEventAt: update.timeStamp ?? session.lastEventAt,
    source: update.source,
  }
}

/**
 * Resolves one zoom settle delay from detected zoom source category.
 * @param source Optional zoom source category.
 */
export function getZoomSettleDelay(source: ZoomInputSource | null): 120 | 72 {
  return source === 'trackpad' ? 72 : 120
}

/**
 * Resets zoom session state to shared defaults.
 */
export function resetZoomSession(): ZoomSessionState {
  return { ...DEFAULT_ZOOM_SESSION }
}

/**
 * Handles one zoom wheel event and returns normalized factor plus next session state.
 * @param session Existing zoom session state.
 * @param input Raw wheel input payload.
 */
export function handleZoomWheel(
  session: ZoomSessionState,
  input: ZoomWheelInput,
): ZoomWheelResult {
  const normalized = normalizeZoomDelta(input)
  const nextSession = accumulateZoomSession(session, {
    anchor: normalized.anchor,
    factor: normalized.delta,
    source: normalized.source,
    timeStamp: normalized.timeStamp,
  })

  return {
    session: nextSession,
    factor: normalized.delta,
    anchor: normalized.anchor,
    settleDelay: getZoomSettleDelay(normalized.source),
    source: normalized.source,
  }
}
