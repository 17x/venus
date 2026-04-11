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

export function applyMatrixToPoint(matrix: Mat3, point: Point2D): Point2D {
  return {
    x: matrix[0] * point.x + matrix[1] * point.y + matrix[2],
    y: matrix[3] * point.x + matrix[4] * point.y + matrix[5],
  }
}
