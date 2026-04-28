import type {Point2D} from '@venus/lib'

/**
 * Stores the default drag threshold in screen pixels.
 */
export const DEFAULT_DRAG_THRESHOLD_PX = 3

/**
 * Resolves euclidean drag distance between two points.
 */
export function resolveDragDistance(start: Point2D, current: Point2D): number {
  // Keep distance math centralized so pointer reducers share one threshold basis.
  const deltaX = current.x - start.x
  const deltaY = current.y - start.y
  return Math.hypot(deltaX, deltaY)
}

/**
 * Returns whether drag distance crossed the configured threshold.
 */
export function hasPassedDragThreshold(
  dragDistancePx: number,
  thresholdPx: number = DEFAULT_DRAG_THRESHOLD_PX,
): boolean {
  // Use ">=" so exact-threshold drags become active deterministically.
  return dragDistancePx >= thresholdPx
}

