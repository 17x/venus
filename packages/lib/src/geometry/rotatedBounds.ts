import {
  applyAffineMatrixToPoint,
  createAffineMatrixAroundPoint,
  invertAffineMatrix,
} from '../math/affineMatrix.ts'
import type {Point2D} from '../math/matrix.ts'
import type {NormalizedBoundsLike} from './bounds.ts'

// Use a tiny epsilon so near-zero rotations skip extra matrix work.
const ROTATION_EFFECT_EPSILON = 0.0001

/**
 * Returns whether a point lies inside bounds after inverse-rotating the pointer.
 */
export function isPointInsideRotatedBounds(
  point: Point2D,
  bounds: NormalizedBoundsLike,
  rotationDegrees: number,
): boolean {
  const centerX = (bounds.minX + bounds.maxX) / 2
  const centerY = (bounds.minY + bounds.maxY) / 2
  const localPoint = Math.abs(rotationDegrees) > ROTATION_EFFECT_EPSILON
    ? applyAffineMatrixToPoint(
        invertAffineMatrix(createAffineMatrixAroundPoint(
          {x: centerX, y: centerY},
          {rotationDegrees},
        )),
        point,
      )
    : point

  return (
    localPoint.x >= bounds.minX &&
    localPoint.x <= bounds.maxX &&
    localPoint.y >= bounds.minY &&
    localPoint.y <= bounds.maxY
  )
}

