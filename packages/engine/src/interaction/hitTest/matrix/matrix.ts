import {
  applyAffineMatrixToPoint,
  createAffineMatrixAroundPoint,
  createIdentityAffineMatrix,
  invertAffineMatrix,
  multiplyAffineMatrices,
  type AffineMatrix,
} from '@venus/lib/math'

interface HitTestTransformNode {
  id: string
  parentId?: string | null
  x: number
  y: number
  width: number
  height: number
  rotation?: number
  flipX?: boolean
  flipY?: boolean
}

const ROTATION_EPSILON = 1e-6
const SHAPE_CENTER_DIVISOR = 2
const MATRIX_DETERMINANT_EPSILON = 1e-8
const MATRIX_DETERMINANT_M10_OFFSET = 3
const MATRIX_DETERMINANT_M01_OFFSET = 2

// Keep transform helpers isolated so hitTest.ts can focus on hit dispatch
// instead of matrix bookkeeping.
/**
 * Handles resolveShapeHitPointer.
 * @param pointer Pointer position.
 * @param shape shape parameter.
 * @param shapeById shapeById parameter.
 */
export function resolveShapeHitPointer(
  pointer: {x: number; y: number},
  shape: HitTestTransformNode,
  shapeById?: Map<string, HitTestTransformNode>,
): {x: number; y: number} {
  const world = resolveWorldMatrix(shape, shapeById)
  const inverse = resolveInvertibleMatrix(world)
  if (!inverse) {
    return pointer
  }

  return applyAffineMatrixToPoint(inverse, pointer)
}

// Resolve one node's world matrix recursively with parent composition and memoization.
/**
 * Handles resolveWorldMatrix.
 * @param shape shape parameter.
 * @param shapeById shapeById parameter.
 * @param cache Cache instance.
 */
function resolveWorldMatrix(
  shape: HitTestTransformNode,
  shapeById?: Map<string, HitTestTransformNode>,
  cache = new Map<string, AffineMatrix>(),
): AffineMatrix {
  const cached = cache.get(shape.id)
  if (cached) {
    return cached
  }

  const local = resolveLocalMatrix(shape)
  const parentId = shape.parentId
  if (!parentId || !shapeById) {
    cache.set(shape.id, local)
    return local
  }

  const parent = shapeById.get(parentId)
  if (!parent) {
    cache.set(shape.id, local)
    return local
  }

  const world = multiplyAffineMatrices(resolveWorldMatrix(parent, shapeById, cache), local)
  cache.set(shape.id, world)
  return world
}

// Build local transform around shape center so rotation/flip keep visual pivot stable.
/**
 * Handles resolveLocalMatrix.
 * @param shape shape parameter.
 */
function resolveLocalMatrix(shape: HitTestTransformNode): AffineMatrix {
  const rotation = shape.rotation ?? 0
  const flipX = shape.flipX ? -1 : 1
  const flipY = shape.flipY ? -1 : 1
  if (Math.abs(rotation) <= ROTATION_EPSILON && flipX === 1 && flipY === 1) {
    return createIdentityAffineMatrix()
  }

  const centerX = shape.x + shape.width / SHAPE_CENTER_DIVISOR
  const centerY = shape.y + shape.height / SHAPE_CENTER_DIVISOR

  return createAffineMatrixAroundPoint(
    {x: centerX, y: centerY},
    {
      rotationDegrees: rotation,
      scaleX: flipX,
      scaleY: flipY,
    },
  )
}

// Preserve hit-test semantics by rejecting near-singular transforms instead of identity fallback.
/**
 * Handles resolveInvertibleMatrix.
 * @param matrix Transform matrix.
 */
function resolveInvertibleMatrix(matrix: AffineMatrix): AffineMatrix | null {
  const determinant = matrix[0] * matrix[MATRIX_DETERMINANT_M10_OFFSET] - matrix[1] * matrix[MATRIX_DETERMINANT_M01_OFFSET]
  // Degenerate or non-finite transforms cannot be inverted reliably for pointer projection.
  if (!Number.isFinite(determinant) || Math.abs(determinant) < MATRIX_DETERMINANT_EPSILON) {
    return null
  }

  return invertAffineMatrix(matrix)
}