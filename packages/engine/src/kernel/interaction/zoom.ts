import type { Point2D } from "@venus/lib/math";

const DOM_DELTA_PIXEL = 0;
const DOM_DELTA_LINE = 1;
const DOM_DELTA_PAGE = 2;
const ZOOM_SOURCE_LOCK_MS = 140;
const TRACKPAD_HORIZONTAL_BURST_THRESHOLD = 16;
const TRACKPAD_VERTICAL_BURST_THRESHOLD = 4;
const WHEEL_DELTA_CLAMP = 160;
const TRACKPAD_SETTLE_DELAY_MS = 120;
const MOUSE_SETTLE_DELAY_MS = 72;
const MOUSE_PAGE_DELTA_SCALE = 0.008;
const MOUSE_LINE_DELTA_SCALE = 0.004;
const MOUSE_PIXEL_DELTA_SCALE = 0.0015;
const TRACKPAD_PAGE_DELTA_SCALE = 0.05;
const TRACKPAD_LINE_DELTA_SCALE = 0.022;
const TRACKPAD_PIXEL_DELTA_SCALE = 0.012;
const MOUSE_ZOOM_DOWN_FACTOR = 0.992;
const MOUSE_ZOOM_UP_FACTOR = 1.008;
const TRACKPAD_DELTA_CLAMP = 0.18;
const TRACKPAD_SOFTENING_FACTOR = 0.8;

/**
 * Defines raw wheel input shape consumed by zoom normalization logic.
 */
export interface EngineZoomWheelInput {
  /** Stores wheel event client x coordinate. */
  clientX: number;
  /** Stores wheel event client y coordinate. */
  clientY: number;
  /** Stores whether Control key is pressed. */
  ctrlKey: boolean;
  /** Stores whether Meta key is pressed. */
  metaKey: boolean;
  /** Stores wheel delta mode. */
  deltaMode: number;
  /** Stores wheel horizontal delta. */
  deltaX: number;
  /** Stores wheel vertical delta. */
  deltaY: number;
  /** Stores optional event timestamp. */
  timeStamp?: number;
}

/**
 * Defines normalized zoom input source classes.
 */
export type EngineZoomInputSource = "mouse" | "trackpad";

/**
 * Defines normalized zoom delta used by zoom factor calculation.
 */
export interface EngineNormalizedZoomDelta {
  /** Stores zoom anchor in screen space. */
  anchor: Point2D;
  /** Stores normalized zoom delta. */
  delta: number;
  /** Stores detected input source. */
  source: EngineZoomInputSource;
  /** Stores optional event timestamp. */
  timeStamp?: number;
}

/**
 * Defines zoom-session state used to smooth input source transitions.
 */
export interface EngineZoomSessionState {
  /** Indicates whether zoom gesture is currently active. */
  active: boolean;
  /** Stores accumulated zoom factor for trackpad gestures. */
  factor: number;
  /** Stores most recent zoom anchor. */
  anchor: Point2D | null;
  /** Stores most recent zoom timestamp. */
  lastEventAt: number;
  /** Stores locked zoom input source during gesture burst. */
  source: EngineZoomInputSource | null;
}

/**
 * Defines processed zoom-wheel result used by adapters.
 */
export interface EngineZoomWheelResult {
  /** Stores next session state. */
  session: EngineZoomSessionState;
  /** Stores per-event zoom factor. */
  factor: number;
  /** Stores zoom anchor in screen space. */
  anchor: Point2D;
  /** Stores settle delay for ending interaction phase. */
  settleDelay: number;
  /** Stores detected input source. */
  source: EngineZoomInputSource;
}

/**
 * Defines default zoom session baseline.
 */
export const DEFAULT_ENGINE_ZOOM_SESSION: EngineZoomSessionState = {
  active: false,
  factor: 1,
  anchor: null,
  lastEventAt: 0,
  source: null,
};

/**
 * Detects zoom input source using wheel delta heuristics.
 * @param input Wheel delta and mode fields.
 */
export function detectEngineZoomInputSource(
  input: Pick<EngineZoomWheelInput, "deltaMode" | "deltaX" | "deltaY">,
): EngineZoomInputSource {
  if (input.deltaMode !== DOM_DELTA_PIXEL) {
    return "mouse";
  }

  const absX = Math.abs(input.deltaX);
  const absY = Math.abs(input.deltaY);

  if (!Number.isInteger(input.deltaX) || !Number.isInteger(input.deltaY)) {
    return "trackpad";
  }

  if (absX > 0 && absY < TRACKPAD_HORIZONTAL_BURST_THRESHOLD) {
    return "trackpad";
  }

  if (absY > 0 && absY <= TRACKPAD_VERTICAL_BURST_THRESHOLD) {
    return "trackpad";
  }

  return "mouse";
}

/**
 * Normalizes wheel delta into a zoom-delta contract shared by adapters.
 * @param input Raw wheel input.
 */
export function normalizeEngineZoomDelta(input: EngineZoomWheelInput): EngineNormalizedZoomDelta {
  const source = detectEngineZoomInputSource(input);
  const normalizedDelta = Math.max(-WHEEL_DELTA_CLAMP, Math.min(WHEEL_DELTA_CLAMP, input.deltaY));
  const deltaScale = resolveZoomDeltaScale(input.deltaMode, source);

  return {
    anchor: {
      x: input.clientX,
      y: input.clientY,
    },
    delta: normalizedDelta * deltaScale,
    source,
    timeStamp: input.timeStamp,
  };
}

/**
 * Accumulates zoom-session state from one normalized zoom update.
 * @param session Existing zoom session state.
 * @param update Normalized zoom update.
 */
export function accumulateEngineZoomSession(
  session: EngineZoomSessionState,
  update: {
    /** Stores normalized zoom anchor. */
    anchor: {x: number; y: number};
    /** Stores normalized zoom factor. */
    factor: number;
    /** Stores normalized input source. */
    source: EngineZoomInputSource;
    /** Stores optional event timestamp. */
    timeStamp?: number;
  },
): EngineZoomSessionState {
  const nextFactor =
    update.source === "mouse"
      ? update.factor
      : session.factor * update.factor;

  return {
    active: true,
    factor: nextFactor,
    anchor: update.anchor,
    lastEventAt: update.timeStamp ?? Date.now(),
    source: update.source,
  };
}

/**
 * Resolves settle delay by source class.
 * @param source Current zoom source.
 */
export function getEngineZoomSettleDelay(source: EngineZoomInputSource | null): number {
  return source === "trackpad" ? TRACKPAD_SETTLE_DELAY_MS : MOUSE_SETTLE_DELAY_MS;
}

/**
 * Resets zoom-session state back to the default baseline.
 */
export function resetEngineZoomSession(): EngineZoomSessionState {
  return DEFAULT_ENGINE_ZOOM_SESSION;
}

/**
 * Handles one wheel event by resolving source, delta, factor, and next session.
 * @param session Existing zoom session state.
 * @param input Raw wheel input.
 */
export function handleEngineZoomWheel(
  session: EngineZoomSessionState,
  input: EngineZoomWheelInput,
): EngineZoomWheelResult {
  const source = resolveZoomSource(session, input);
  const normalized = normalizeEngineZoomDeltaWithSource(input, source);
  const factor = resolveZoomFactor(normalized);
  const nextSession = accumulateEngineZoomSession(session, {
    anchor: normalized.anchor,
    factor,
    source: normalized.source,
    timeStamp: normalized.timeStamp,
  });

  return {
    session: nextSession,
    factor,
    anchor: normalized.anchor,
    settleDelay: getEngineZoomSettleDelay(nextSession.source),
    source: normalized.source,
  };
}

/**
 * Normalizes wheel delta while preserving caller-provided source lock.
 * @param input Raw wheel input.
 * @param source Resolved source lock.
 */
function normalizeEngineZoomDeltaWithSource(
  input: EngineZoomWheelInput,
  source: EngineZoomInputSource,
): EngineNormalizedZoomDelta {
  const normalizedDelta = Math.max(-WHEEL_DELTA_CLAMP, Math.min(WHEEL_DELTA_CLAMP, input.deltaY));
  const deltaScale = resolveZoomDeltaScale(input.deltaMode, source);

  return {
    anchor: {
      x: input.clientX,
      y: input.clientY,
    },
    delta: normalizedDelta * deltaScale,
    source,
    timeStamp: input.timeStamp,
  };
}

/**
 * Resolves zoom source and applies gesture-burst source lock.
 * @param session Existing zoom session state.
 * @param input Raw wheel input.
 */
function resolveZoomSource(
  session: EngineZoomSessionState,
  input: EngineZoomWheelInput,
): EngineZoomInputSource {
  const detected = detectEngineZoomInputSource(input);
  const currentTime = input.timeStamp ?? Date.now();

  if (
    session.active &&
    session.source &&
    currentTime - session.lastEventAt <= ZOOM_SOURCE_LOCK_MS
  ) {
    return session.source;
  }

  return detected;
}

/**
 * Resolves delta scale coefficients by wheel mode and input source.
 * @param deltaMode Browser wheel delta mode.
 * @param source Resolved input source.
 */
function resolveZoomDeltaScale(deltaMode: number, source: EngineZoomInputSource): number {
  if (source === "mouse") {
    if (deltaMode === DOM_DELTA_PAGE) {
      return MOUSE_PAGE_DELTA_SCALE;
    }

    if (deltaMode === DOM_DELTA_LINE) {
      return MOUSE_LINE_DELTA_SCALE;
    }

    return MOUSE_PIXEL_DELTA_SCALE;
  }

  if (deltaMode === DOM_DELTA_PAGE) {
    return TRACKPAD_PAGE_DELTA_SCALE;
  }

  if (deltaMode === DOM_DELTA_LINE) {
    return TRACKPAD_LINE_DELTA_SCALE;
  }

  return TRACKPAD_PIXEL_DELTA_SCALE;
}

/**
 * Resolves final zoom factor from normalized input source and delta.
 * @param normalized Normalized zoom delta payload.
 */
function resolveZoomFactor(normalized: EngineNormalizedZoomDelta): number {
  if (normalized.source === "mouse") {
    if (normalized.delta > 0) {
      return MOUSE_ZOOM_DOWN_FACTOR;
    }

    if (normalized.delta < 0) {
      return MOUSE_ZOOM_UP_FACTOR;
    }

    return 1;
  }

  const clampedDelta = Math.max(-TRACKPAD_DELTA_CLAMP, Math.min(TRACKPAD_DELTA_CLAMP, normalized.delta));
  const softenedDelta = clampedDelta * TRACKPAD_SOFTENING_FACTOR;

  return Math.exp(-softenedDelta);
}
