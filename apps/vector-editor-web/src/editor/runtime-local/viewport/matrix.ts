import type { Mat3 } from '@venus/engine'

export type { Mat3, Point2D } from '@venus/engine'
export { applyMatrixToPoint } from '@venus/engine'

/**
 * Build a viewport matrix from scale and translation offsets.
 */
export function createViewportMatrix(
  scale: number,
  offsetX: number,
  offsetY: number,
): Mat3 {
  return [
    scale, 0, offsetX,
    0, scale, offsetY,
    0, 0, 1,
  ]
}

/**
 * Invert the viewport matrix so pointer events can be projected from screen
 * space back into document/world space.
 */
export function invertViewportMatrix(matrix: Mat3): Mat3 {
  const [a, c, tx, b, d, ty] = matrix
  const determinant = a * d - b * c

  if (determinant === 0) {
    return [
      1, 0, 0,
      0, 1, 0,
      0, 0, 1,
    ]
  }

  const inverseDeterminant = 1 / determinant
  const nextA = d * inverseDeterminant
  const nextB = -b * inverseDeterminant
  const nextC = -c * inverseDeterminant
  const nextD = a * inverseDeterminant
  const nextTx = -(nextA * tx + nextC * ty)
  const nextTy = -(nextB * tx + nextD * ty)

  return [
    nextA, nextC, nextTx,
    nextB, nextD, nextTy,
    0, 0, 1,
  ]
}
