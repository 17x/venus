type Matrix2D = readonly [number, number, number, number, number, number]

const IDENTITY_MATRIX: Matrix2D = [1, 0, 0, 0, 1, 0]

// Keep transform helpers isolated so hitTest.ts can focus on hit dispatch
// instead of matrix bookkeeping.
export function resolveShapeHitPointer(
  pointer: {x: number; y: number},
  shape: {
    id: string
    parentId?: string | null
    x: number
    y: number
    width: number
    height: number
    rotation?: number
    flipX?: boolean
    flipY?: boolean
  },
  shapeById?: Map<string, {
    id: string
    parentId?: string | null
    x: number
    y: number
    width: number
    height: number
    rotation?: number
    flipX?: boolean
    flipY?: boolean
  }>,
) {
  const world = resolveWorldMatrix(shape, shapeById)
  const inverse = invertMatrix(world)
  if (!inverse) {
    return pointer
  }

  return {
    x: inverse[0] * pointer.x + inverse[1] * pointer.y + inverse[2],
    y: inverse[3] * pointer.x + inverse[4] * pointer.y + inverse[5],
  }
}

function resolveWorldMatrix(
  shape: {
    id: string
    parentId?: string | null
    x: number
    y: number
    width: number
    height: number
    rotation?: number
    flipX?: boolean
    flipY?: boolean
  },
  shapeById?: Map<string, {
    id: string
    parentId?: string | null
    x: number
    y: number
    width: number
    height: number
    rotation?: number
    flipX?: boolean
    flipY?: boolean
  }>,
  cache = new Map<string, Matrix2D>(),
): Matrix2D {
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

  const world = multiplyMatrix(resolveWorldMatrix(parent, shapeById, cache), local)
  cache.set(shape.id, world)
  return world
}

function resolveLocalMatrix(shape: {
  x: number
  y: number
  width: number
  height: number
  rotation?: number
  flipX?: boolean
  flipY?: boolean
}): Matrix2D {
  const rotation = shape.rotation ?? 0
  const flipX = shape.flipX ? -1 : 1
  const flipY = shape.flipY ? -1 : 1
  if (Math.abs(rotation) <= 1e-6 && flipX === 1 && flipY === 1) {
    return IDENTITY_MATRIX
  }

  const rad = (rotation * Math.PI) / 180
  const cos = Math.cos(rad)
  const sin = Math.sin(rad)
  const centerX = shape.x + shape.width / 2
  const centerY = shape.y + shape.height / 2

  const rotationScale: Matrix2D = [
    cos * flipX,
    -sin * flipY,
    0,
    sin * flipX,
    cos * flipY,
    0,
  ]

  return multiplyMatrix(
    multiplyMatrix([1, 0, centerX, 0, 1, centerY], rotationScale),
    [1, 0, -centerX, 0, 1, -centerY],
  )
}

function multiplyMatrix(left: Matrix2D, right: Matrix2D): Matrix2D {
  return [
    left[0] * right[0] + left[1] * right[3],
    left[0] * right[1] + left[1] * right[4],
    left[0] * right[2] + left[1] * right[5] + left[2],
    left[3] * right[0] + left[4] * right[3],
    left[3] * right[1] + left[4] * right[4],
    left[3] * right[2] + left[4] * right[5] + left[5],
  ]
}

function invertMatrix(matrix: Matrix2D): Matrix2D | null {
  const determinant = matrix[0] * matrix[4] - matrix[1] * matrix[3]
  if (Math.abs(determinant) < 1e-8) {
    return null
  }

  const inv = 1 / determinant
  return [
    matrix[4] * inv,
    -matrix[1] * inv,
    (matrix[1] * matrix[5] - matrix[4] * matrix[2]) * inv,
    -matrix[3] * inv,
    matrix[0] * inv,
    (matrix[3] * matrix[2] - matrix[0] * matrix[5]) * inv,
  ]
}