/**
 * Represents a 3x3 affine matrix in row-major order.
 */
export type Mat3 = [
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
]

/**
 * Represents a two-dimensional cartesian point.
 */
export interface Point2D {
  /** Stores the horizontal axis coordinate. */
  readonly x: number
  /** Stores the vertical axis coordinate. */
  readonly y: number
}

/**
 * Applies a 3x3 affine matrix to a point and returns the transformed point.
 */
export function applyMatrixToPoint(matrix: Mat3, point: Point2D): Point2D {
  return {
    // Apply the first row to resolve the transformed x coordinate.
    x: matrix[0] * point.x + matrix[1] * point.y + matrix[2],
    // Apply the second row to resolve the transformed y coordinate.
    y: matrix[3] * point.x + matrix[4] * point.y + matrix[5],
  }
}

