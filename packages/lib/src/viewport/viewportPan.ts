/**
 * Defines accumulated viewport pan offsets in screen space.
 */
export interface ViewportPanOffset {
  /** Stores x-axis pan offset. */
  x: number
  /** Stores y-axis pan offset. */
  y: number
}

/**
 * Defines pointer origin state for viewport pan sessions.
 */
export interface ViewportPanOrigin {
  /** Stores latest pointer x coordinate. */
  x: number
  /** Stores latest pointer y coordinate. */
  y: number
  /** Stores active pointer id tied to this pan session. */
  pointerId: number
}

/**
 * Seeds a pointer-pan session from the pointerdown location.
 */
export function createViewportPanOrigin(input: {
  /** Stores initial pointer x coordinate. */
  x: number
  /** Stores initial pointer y coordinate. */
  y: number
  /** Stores initial pointer id. */
  pointerId: number
}): ViewportPanOrigin {
  return {
    x: input.x,
    y: input.y,
    pointerId: input.pointerId,
  }
}

/**
 * Converts wheel deltas into viewport pan offsets.
 */
export function accumulateWheelPanOffset(
  offset: ViewportPanOffset,
  input: {
    /** Stores wheel delta on x-axis. */
    deltaX: number
    /** Stores wheel delta on y-axis. */
    deltaY: number
  },
): ViewportPanOffset {
  return {
    // Invert wheel direction so scrolling intent maps to viewport translation intent.
    x: offset.x - input.deltaX,
    y: offset.y - input.deltaY,
  }
}

/**
 * Updates pointer-pan session and returns the accumulated viewport delta.
 */
export function accumulatePointerPanOffset(
  offset: ViewportPanOffset,
  origin: ViewportPanOrigin,
  pointer: {
    /** Stores current pointer x coordinate. */
    x: number
    /** Stores current pointer y coordinate. */
    y: number
    /** Stores current pointer id. */
    pointerId: number
  },
): {offset: ViewportPanOffset; origin: ViewportPanOrigin} {
  // Ignore pointer updates from other pointers so multi-touch does not corrupt drag state.
  if (origin.pointerId !== pointer.pointerId) {
    return {offset, origin}
  }

  const deltaX = pointer.x - origin.x
  const deltaY = pointer.y - origin.y

  return {
    offset: {
      x: offset.x + deltaX,
      y: offset.y + deltaY,
    },
    origin: {
      x: pointer.x,
      y: pointer.y,
      pointerId: pointer.pointerId,
    },
  }
}

