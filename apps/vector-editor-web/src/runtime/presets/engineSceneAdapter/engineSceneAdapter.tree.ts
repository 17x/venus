import {resolveNodeTransform} from '@venus/engine'

type AffineMatrix = [number, number, number, number, number, number]
type TransformSource = Parameters<typeof resolveNodeTransform>[0]

export type EngineAdapterMatrix = readonly [number, number, number, number, number, number]

const IDENTITY_AFFINE: AffineMatrix = [1, 0, 0, 1, 0, 0]
const INVERT_EPSILON = 1e-9

/**
 * Converts a Canvas/SVG affine tuple [a,b,c,d,e,f] into the engine row-major
 * tuple [a,c,e,b,d,f].
 */
export function vectorAffineToEngineMatrix(matrix: AffineMatrix): EngineAdapterMatrix {
  return [matrix[0], matrix[2], matrix[4], matrix[1], matrix[3], matrix[5]]
}

/**
 * Converts an engine row-major transform tuple [a,c,e,b,d,f] back to a
 * Canvas/SVG affine tuple [a,b,c,d,e,f].
 */
export function engineMatrixToVectorAffine(matrix: EngineAdapterMatrix): AffineMatrix {
  return [matrix[0], matrix[3], matrix[1], matrix[4], matrix[2], matrix[5]]
}

/**
 * Resolves the transform that should be attached to a child when it is nested
 * under `parent` in an engine render tree while preserving the child's current
 * world-space visual result.
 */
export function resolveParentLocalEngineTransform(
  child: TransformSource,
  parent?: TransformSource | null,
) {
  const childWorld = resolveNodeTransform(child).matrix as AffineMatrix
  const parentWorld = parent
    ? resolveNodeTransform(parent).matrix as AffineMatrix
    : IDENTITY_AFFINE
  const local = multiplyAffineMatrices(invertAffineMatrix(parentWorld), childWorld)

  return {
    matrix: vectorAffineToEngineMatrix(local),
  }
}

export function multiplyEngineMatrices(
  left: EngineAdapterMatrix,
  right: EngineAdapterMatrix,
): EngineAdapterMatrix {
  return vectorAffineToEngineMatrix(
    multiplyAffineMatrices(
      engineMatrixToVectorAffine(left),
      engineMatrixToVectorAffine(right),
    ),
  )
}

function multiplyAffineMatrices(left: AffineMatrix, right: AffineMatrix): AffineMatrix {
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

function invertAffineMatrix(matrix: AffineMatrix): AffineMatrix {
  const [a, b, c, d, e, f] = matrix
  const determinant = a * d - b * c

  if (Math.abs(determinant) <= INVERT_EPSILON) {
    return IDENTITY_AFFINE
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
