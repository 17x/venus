import type {Point2D} from './matrix.ts'

/**
 * Describes a 2D affine matrix in CSS/SVG tuple form: [a, b, c, d, e, f].
 */
export type AffineMatrix = [
  number,
  number,
  number,
  number,
  number,
  number,
]

/**
 * Configures rotation and scaling when composing a matrix around a center point.
 */
export interface AffineAroundPointOptions {
  /** Stores clockwise/counter-clockwise rotation in degrees. */
  readonly rotationDegrees?: number
  /** Stores horizontal scale, where negative values mirror across Y axis. */
  readonly scaleX?: number
  /** Stores vertical scale, where negative values mirror across X axis. */
  readonly scaleY?: number
}

// Keep inversion fallback consistent across engine/lib extraction boundaries.
const INVERT_DETERMINANT_EPSILON = 1e-9

/**
 * Creates an identity affine matrix with no transform effect.
 */
export function createIdentityAffineMatrix(): AffineMatrix {
  return [1, 0, 0, 1, 0, 0]
}

/**
 * Creates a translation matrix that offsets points by tx/ty.
 */
export function createTranslationAffineMatrix(tx: number, ty: number): AffineMatrix {
  return [1, 0, 0, 1, tx, ty]
}

/**
 * Creates a scale matrix that scales points relative to the origin.
 */
export function createScaleAffineMatrix(scaleX: number, scaleY: number): AffineMatrix {
  return [scaleX, 0, 0, scaleY, 0, 0]
}

/**
 * Creates a rotation matrix from degrees for API parity with editor interactions.
 */
export function createRotationAffineMatrix(rotationDegrees: number): AffineMatrix {
  const angle = rotationDegrees * (Math.PI / 180)
  const cos = Math.cos(angle)
  const sin = Math.sin(angle)

  return [cos, sin, -sin, cos, 0, 0]
}

/**
 * Multiplies two affine matrices using left-to-right transform order.
 */
export function multiplyAffineMatrices(left: AffineMatrix, right: AffineMatrix): AffineMatrix {
  const [la, lb, lc, ld, le, lf] = left
  const [ra, rb, rc, rd, re, rf] = right

  return [
    la * ra + lc * rb,
    lb * ra + ld * rb,
    la * rc + lc * rd,
    lb * rc + ld * rd,
    la * re + lc * rf + le,
    lb * re + ld * rf + lf,
  ]
}

/**
 * Inverts an affine matrix and falls back to identity for singular inputs.
 */
export function invertAffineMatrix(matrix: AffineMatrix): AffineMatrix {
  const [a, b, c, d, e, f] = matrix
  const determinant = a * d - b * c

  // Guard near-singular matrices to avoid unstable inverse values.
  if (Math.abs(determinant) <= INVERT_DETERMINANT_EPSILON) {
    return createIdentityAffineMatrix()
  }

  const inverseDeterminant = 1 / determinant
  const nextA = d * inverseDeterminant
  const nextB = -b * inverseDeterminant
  const nextC = -c * inverseDeterminant
  const nextD = a * inverseDeterminant

  return [
    nextA,
    nextB,
    nextC,
    nextD,
    -(nextA * e + nextC * f),
    -(nextB * e + nextD * f),
  ]
}

/**
 * Applies an affine matrix to a world/screen point.
 */
export function applyAffineMatrixToPoint(matrix: AffineMatrix, point: Point2D): Point2D {
  return {
    // Resolve transformed x coordinate using the matrix first row.
    x: matrix[0] * point.x + matrix[2] * point.y + matrix[4],
    // Resolve transformed y coordinate using the matrix second row.
    y: matrix[1] * point.x + matrix[3] * point.y + matrix[5],
  }
}

/**
 * Creates an affine matrix that rotates/scales around a specific center point.
 */
export function createAffineMatrixAroundPoint(
  center: Point2D,
  options?: AffineAroundPointOptions,
): AffineMatrix {
  const rotationDegrees = options?.rotationDegrees ?? 0
  const scaleX = options?.scaleX ?? 1
  const scaleY = options?.scaleY ?? 1

  return multiplyAffineMatrices(
    multiplyAffineMatrices(
      createTranslationAffineMatrix(center.x, center.y),
      multiplyAffineMatrices(
        createRotationAffineMatrix(rotationDegrees),
        createScaleAffineMatrix(scaleX, scaleY),
      ),
    ),
    createTranslationAffineMatrix(-center.x, -center.y),
  )
}

