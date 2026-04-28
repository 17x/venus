/**
 * Describes normalized axis-aligned bounds that always satisfy min <= max.
 */
export interface NormalizedBounds {
  /** Stores the minimum x coordinate. */
  readonly minX: number
  /** Stores the minimum y coordinate. */
  readonly minY: number
  /** Stores the maximum x coordinate. */
  readonly maxX: number
  /** Stores the maximum y coordinate. */
  readonly maxY: number
  /** Stores the normalized width computed from maxX - minX. */
  readonly width: number
  /** Stores the normalized height computed from maxY - minY. */
  readonly height: number
}

/**
 * Describes lightweight bounds where width and height are not required.
 */
export interface NormalizedBoundsLike {
  /** Stores the minimum x coordinate. */
  readonly minX: number
  /** Stores the minimum y coordinate. */
  readonly minY: number
  /** Stores the maximum x coordinate. */
  readonly maxX: number
  /** Stores the maximum y coordinate. */
  readonly maxY: number
}

/**
 * Normalizes a box that may use negative width or height into canonical bounds.
 */
export function getNormalizedBoundsFromBox(
  x: number,
  y: number,
  width: number,
  height: number,
): NormalizedBounds {
  // Normalize horizontal extents even when width is negative.
  const minX = Math.min(x, x + width)
  const maxX = Math.max(x, x + width)
  // Normalize vertical extents even when height is negative.
  const minY = Math.min(y, y + height)
  const maxY = Math.max(y, y + height)

  return {
    minX,
    minY,
    maxX,
    maxY,
    width: maxX - minX,
    height: maxY - minY,
  }
}

/**
 * Returns whether two normalized bounds overlap with non-zero area.
 */
export function doNormalizedBoundsOverlap(
  left: NormalizedBoundsLike,
  right: NormalizedBoundsLike,
): boolean {
  // Treat edge-touching rectangles as non-overlap so hit areas stay stable.
  return !(
    left.maxX <= right.minX ||
    right.maxX <= left.minX ||
    left.maxY <= right.minY ||
    right.maxY <= left.minY
  )
}

/**
 * Computes the geometric intersection of two normalized bounds.
 */
export function intersectNormalizedBounds(
  left: NormalizedBoundsLike,
  right: NormalizedBoundsLike,
): NormalizedBoundsLike | null {
  const minX = Math.max(left.minX, right.minX)
  const minY = Math.max(left.minY, right.minY)
  const maxX = Math.min(left.maxX, right.maxX)
  const maxY = Math.min(left.maxY, right.maxY)

  // Return null when intersection collapses to a line or point.
  if (maxX <= minX || maxY <= minY) {
    return null
  }

  return {
    minX,
    minY,
    maxX,
    maxY,
  }
}

