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

export interface Point2D {
  x: number
  y: number
}

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

export function applyMatrixToPoint(matrix: Mat3, point: Point2D): Point2D {
  return {
    x: matrix[0] * point.x + matrix[1] * point.y + matrix[2],
    y: matrix[3] * point.x + matrix[4] * point.y + matrix[5],
  }
}
