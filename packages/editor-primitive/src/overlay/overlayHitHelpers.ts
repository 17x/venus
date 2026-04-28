import type {Point2D} from '@venus/lib'

/**
 * Defines axis-aligned hit target bounds in screen space.
 */
export interface OverlayHitBounds {
  /** Stores minimum x coordinate. */
  minX: number
  /** Stores minimum y coordinate. */
  minY: number
  /** Stores maximum x coordinate. */
  maxX: number
  /** Stores maximum y coordinate. */
  maxY: number
}

/**
 * Expands bounds by tolerance in all directions.
 */
export function expandOverlayHitBounds(
  bounds: OverlayHitBounds,
  tolerancePx: number,
): OverlayHitBounds {
  return {
    minX: bounds.minX - tolerancePx,
    minY: bounds.minY - tolerancePx,
    maxX: bounds.maxX + tolerancePx,
    maxY: bounds.maxY + tolerancePx,
  }
}

/**
 * Returns whether point is inside bounds with optional tolerance expansion.
 */
export function isPointInsideOverlayBounds(
  point: Point2D,
  bounds: OverlayHitBounds,
  tolerancePx: number = 0,
): boolean {
  const measuredBounds = tolerancePx > 0 ? expandOverlayHitBounds(bounds, tolerancePx) : bounds

  return (
    point.x >= measuredBounds.minX
    && point.x <= measuredBounds.maxX
    && point.y >= measuredBounds.minY
    && point.y <= measuredBounds.maxY
  )
}

