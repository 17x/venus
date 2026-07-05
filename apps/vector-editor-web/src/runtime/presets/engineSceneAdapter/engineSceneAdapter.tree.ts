import {
  invertAffineMatrix,
  multiplyAffineMatrices,
  resolveNodeTransform,
  type AffineMatrix,
} from '@venus/engine'

type TransformSource = Parameters<typeof resolveNodeTransform>[0]

export type EngineAdapterMatrix = readonly [number, number, number, number, number, number]

const IDENTITY_AFFINE: AffineMatrix = [1, 0, 0, 1, 0, 0]

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
