export interface EngineViewportPanOffset {
  x: number
  y: number
}

export interface EngineViewportPanOrigin {
  x: number
  y: number
  pointerId: number
}

/**
 * Seed a pointer-pan session from the pointerdown location.
 */
export function createEngineViewportPanOrigin(input: {
  x: number
  y: number
  pointerId: number
}): EngineViewportPanOrigin {
  return {
    x: input.x,
    y: input.y,
    pointerId: input.pointerId,
  }
}

/**
 * Convert wheel deltas into viewport pan offsets.
 *
 * Browser wheel deltas are scroll intent, while viewport offset is translation,
 * so we invert signs here to keep one shared interpretation.
 */
export function accumulateEngineWheelPanOffset(
  offset: EngineViewportPanOffset,
  input: {
    deltaX: number
    deltaY: number
  },
): EngineViewportPanOffset {
  return {
    x: offset.x - input.deltaX,
    y: offset.y - input.deltaY,
  }
}

/**
 * Update pointer-pan session and return the viewport delta to commit.
 */
export function accumulateEnginePointerPanOffset(
  offset: EngineViewportPanOffset,
  origin: EngineViewportPanOrigin,
  pointer: {
    x: number
    y: number
    pointerId: number
  },
): {offset: EngineViewportPanOffset; origin: EngineViewportPanOrigin} {
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