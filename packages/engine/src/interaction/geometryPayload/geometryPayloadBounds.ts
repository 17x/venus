import {
  applyAffineMatrixToPoint,
} from '../shapeTransform/shapeTransform.ts'
import type { EngineEditorPoint } from '../hitTest/hitTest.ts'
import type {
  EngineGeometryBounds,
  EngineGeometryMarqueeBounds,
} from './geometryPayloadTypes.ts'
import type { GeometryMatrix2D } from './geometryPayloadTransform.ts'

/**
 * Normalizes min/max bounds so callers can accept drag rectangles from any direction.
 * @param bounds Raw min/max bounds.
 */
export function normalizeEngineGeometryBounds(
  bounds: EngineGeometryBounds | EngineGeometryMarqueeBounds,
): EngineGeometryBounds {
  return {
    minX: Math.min(bounds.minX, bounds.maxX),
    minY: Math.min(bounds.minY, bounds.maxY),
    maxX: Math.max(bounds.minX, bounds.maxX),
    maxY: Math.max(bounds.minY, bounds.maxY),
  }
}

/**
 * Resolves axis-aligned bounds for authored geometry points.
 * @param points Point list in one coordinate space.
 */
export function resolveEngineGeometryBoundsFromPoints(
  points: readonly EngineEditorPoint[],
): EngineGeometryBounds | null {
  if (points.length === 0) {
    return null
  }

  const xs = points.map((point) => point.x)
  const ys = points.map((point) => point.y)
  return {
    minX: Math.min(...xs),
    minY: Math.min(...ys),
    maxX: Math.max(...xs),
    maxY: Math.max(...ys),
  }
}

/**
 * Projects local axis-aligned bounds through an affine matrix and returns world AABB.
 * @param bounds Local bounds to project.
 * @param matrix Local-to-world matrix.
 */
export function transformEngineGeometryBounds(
  bounds: EngineGeometryBounds,
  matrix: GeometryMatrix2D,
): EngineGeometryBounds {
  const corners = engineGeometryBoundsToCornerPoints(bounds)
    .map((point) => applyAffineMatrixToPoint(matrix, point))
  const projected = resolveEngineGeometryBoundsFromPoints(corners)

  // Corner input is guaranteed non-empty, but keep a stable fallback for malformed matrices.
  return projected ?? bounds
}

/**
 * Converts min/max bounds into closed-rect corner points.
 * @param bounds Bounds to convert.
 */
export function engineGeometryBoundsToCornerPoints(
  bounds: EngineGeometryBounds,
): EngineEditorPoint[] {
  const normalized = normalizeEngineGeometryBounds(bounds)
  return [
    {x: normalized.minX, y: normalized.minY},
    {x: normalized.maxX, y: normalized.minY},
    {x: normalized.maxX, y: normalized.maxY},
    {x: normalized.minX, y: normalized.maxY},
  ]
}

/**
 * Expands two axis-aligned bounds into one union bounds.
 * @param left First bounds.
 * @param right Second bounds.
 */
export function unionEngineGeometryBounds(
  left: EngineGeometryBounds,
  right: EngineGeometryBounds,
): EngineGeometryBounds {
  return {
    minX: Math.min(left.minX, right.minX),
    minY: Math.min(left.minY, right.minY),
    maxX: Math.max(left.maxX, right.maxX),
    maxY: Math.max(left.maxY, right.maxY),
  }
}

/**
 * Checks whether outer bounds fully contain inner bounds.
 * @param outer Candidate containing bounds.
 * @param inner Candidate contained bounds.
 */
export function doEngineGeometryBoundsContain(
  outer: EngineGeometryBounds,
  inner: EngineGeometryBounds,
): boolean {
  const normalizedOuter = normalizeEngineGeometryBounds(outer)
  const normalizedInner = normalizeEngineGeometryBounds(inner)
  return (
    normalizedInner.minX >= normalizedOuter.minX &&
    normalizedInner.maxX <= normalizedOuter.maxX &&
    normalizedInner.minY >= normalizedOuter.minY &&
    normalizedInner.maxY <= normalizedOuter.maxY
  )
}

/**
 * Checks whether two bounds overlap or touch.
 * @param left First bounds.
 * @param right Second bounds.
 */
export function doEngineGeometryBoundsIntersect(
  left: EngineGeometryBounds,
  right: EngineGeometryBounds,
): boolean {
  const normalizedLeft = normalizeEngineGeometryBounds(left)
  const normalizedRight = normalizeEngineGeometryBounds(right)
  return !(
    normalizedLeft.maxX < normalizedRight.minX ||
    normalizedLeft.minX > normalizedRight.maxX ||
    normalizedLeft.maxY < normalizedRight.minY ||
    normalizedLeft.minY > normalizedRight.maxY
  )
}
