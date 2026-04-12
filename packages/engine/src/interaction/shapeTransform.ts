export interface Point {
  x: number
  y: number
}

export type AffineMatrix = [
  number,
  number,
  number,
  number,
  number,
  number,
]

export interface BoxTransformSource {
  x: number
  y: number
  width: number
  height: number
  rotation?: number
  flipX?: boolean
  flipY?: boolean
}

export interface ShapeTransformRecord {
  x: number
  y: number
  width: number
  height: number
  rotation: number
  flipX?: boolean
  flipY?: boolean
}

export interface NormalizedBounds {
  minX: number
  minY: number
  maxX: number
  maxY: number
  width: number
  height: number
}

export interface NormalizedBoundsLike {
  minX: number
  minY: number
  maxX: number
  maxY: number
}

export interface ResolvedNodeTransform {
  bounds: NormalizedBounds
  center: Point
  rotation: number
  flipX: boolean
  flipY: boolean
  matrix: AffineMatrix
  inverseMatrix: AffineMatrix
}

export interface MatrixFirstNodeTransform {
  matrix: AffineMatrix
  bounds: NormalizedBounds
  center: Point
  width: number
  height: number
  rotation: number
  flipX: boolean
  flipY: boolean
}

export interface ShapeTransformBatchItem {
  id: string
  fromMatrix: MatrixFirstNodeTransform
  toMatrix: MatrixFirstNodeTransform
}

export interface ShapeTransformBatchCommand {
  type: 'shape.transform.batch'
  transforms: ShapeTransformBatchItem[]
}

export interface ResolvedShapeTransformRecord extends ShapeTransformRecord {
  bounds: NormalizedBounds
  center: Point
  matrix: AffineMatrix
  inverseMatrix: AffineMatrix
}

export function createIdentityAffineMatrix(): AffineMatrix {
  return [1, 0, 0, 1, 0, 0]
}

export function createTranslationAffineMatrix(tx: number, ty: number): AffineMatrix {
  return [1, 0, 0, 1, tx, ty]
}

export function createScaleAffineMatrix(scaleX: number, scaleY: number): AffineMatrix {
  return [scaleX, 0, 0, scaleY, 0, 0]
}

export function createRotationAffineMatrix(rotationDegrees: number): AffineMatrix {
  const angle = rotationDegrees * (Math.PI / 180)
  const cos = Math.cos(angle)
  const sin = Math.sin(angle)

  return [cos, sin, -sin, cos, 0, 0]
}

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

export function invertAffineMatrix(matrix: AffineMatrix): AffineMatrix {
  const [a, b, c, d, e, f] = matrix
  const determinant = a * d - b * c

  if (Math.abs(determinant) <= 1e-9) {
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

export function applyAffineMatrixToPoint(matrix: AffineMatrix, point: Point): Point {
  return {
    x: matrix[0] * point.x + matrix[2] * point.y + matrix[4],
    y: matrix[1] * point.x + matrix[3] * point.y + matrix[5],
  }
}

export function createAffineMatrixAroundPoint(
  center: Point,
  options?: {
    rotationDegrees?: number
    scaleX?: number
    scaleY?: number
  },
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

export function getNormalizedBoundsFromBox(
  x: number,
  y: number,
  width: number,
  height: number,
): NormalizedBounds {
  const minX = Math.min(x, x + width)
  const maxX = Math.max(x, x + width)
  const minY = Math.min(y, y + height)
  const maxY = Math.max(y, y + height)

  return {
    minX,
    minY,
    maxX,
    maxY,
    width: maxX - minX,
    height: maxY - minY,
  }
}

export function doNormalizedBoundsOverlap(
  left: NormalizedBoundsLike,
  right: NormalizedBoundsLike,
): boolean {
  return !(
    left.maxX <= right.minX ||
    right.maxX <= left.minX ||
    left.maxY <= right.minY ||
    right.maxY <= left.minY
  )
}

export function intersectNormalizedBounds(
  left: NormalizedBoundsLike,
  right: NormalizedBoundsLike,
): NormalizedBoundsLike | null {
  const minX = Math.max(left.minX, right.minX)
  const minY = Math.max(left.minY, right.minY)
  const maxX = Math.min(left.maxX, right.maxX)
  const maxY = Math.min(left.maxY, right.maxY)

  if (maxX <= minX || maxY <= minY) {
    return null
  }

  return {
    minX,
    minY,
    maxX,
    maxY,
  }
}

export function createShapeTransformRecord(source: BoxTransformSource): ShapeTransformRecord {
  return {
    x: source.x,
    y: source.y,
    width: source.width,
    height: source.height,
    rotation: source.rotation ?? 0,
    flipX: source.flipX ?? false,
    flipY: source.flipY ?? false,
  }
}

export function resolveNodeTransform(source: BoxTransformSource): ResolvedNodeTransform {
  const transform = createShapeTransformRecord(source)
  const bounds = getNormalizedBoundsFromBox(transform.x, transform.y, transform.width, transform.height)
  const center = {
    x: (bounds.minX + bounds.maxX) / 2,
    y: (bounds.minY + bounds.maxY) / 2,
  }
  const rotation = transform.rotation
  const flipX = transform.flipX ?? false
  const flipY = transform.flipY ?? false
  const matrix = createAffineMatrixAroundPoint(center, {
    rotationDegrees: rotation,
    scaleX: flipX ? -1 : 1,
    scaleY: flipY ? -1 : 1,
  })

  return {
    bounds,
    center,
    rotation,
    flipX,
    flipY,
    matrix,
    inverseMatrix: invertAffineMatrix(matrix),
  }
}

export function resolveShapeTransformRecord(source: BoxTransformSource): ResolvedShapeTransformRecord {
  const transform = createShapeTransformRecord(source)
  const resolved = resolveNodeTransform(transform)

  return {
    ...transform,
    bounds: resolved.bounds,
    center: resolved.center,
    matrix: resolved.matrix,
    inverseMatrix: resolved.inverseMatrix,
  }
}

export function createMatrixFirstNodeTransform(source: BoxTransformSource): MatrixFirstNodeTransform {
  const resolved = resolveNodeTransform(source)

  return {
    matrix: resolved.matrix,
    bounds: resolved.bounds,
    center: resolved.center,
    width: resolved.bounds.width,
    height: resolved.bounds.height,
    rotation: resolved.rotation,
    flipX: resolved.flipX,
    flipY: resolved.flipY,
  }
}

export function toLegacyShapeTransformRecord(
  transform: Pick<MatrixFirstNodeTransform, 'bounds' | 'rotation' | 'flipX' | 'flipY' | 'width' | 'height'>,
): ShapeTransformRecord {
  const width = typeof transform.width === 'number'
    ? transform.width
    : (transform.bounds.maxX - transform.bounds.minX)
  const height = typeof transform.height === 'number'
    ? transform.height
    : (transform.bounds.maxY - transform.bounds.minY)
  const x = width >= 0 ? transform.bounds.minX : transform.bounds.maxX
  const y = height >= 0 ? transform.bounds.minY : transform.bounds.maxY

  return {
    x,
    y,
    width,
    height,
    rotation: transform.rotation,
    flipX: transform.flipX,
    flipY: transform.flipY,
  }
}

export function isPointInsideRotatedBounds(
  point: Point,
  bounds: Pick<NormalizedBounds, 'minX' | 'minY' | 'maxX' | 'maxY'>,
  rotationDegrees: number,
): boolean {
  const centerX = (bounds.minX + bounds.maxX) / 2
  const centerY = (bounds.minY + bounds.maxY) / 2
  const localPoint = Math.abs(rotationDegrees) > 0.0001
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

export function hasResolvedNodeTransformEffect(transform: ResolvedNodeTransform): boolean {
  return (
    Math.abs(transform.rotation) > 0.0001 ||
    transform.flipX ||
    transform.flipY
  )
}

export function toResolvedNodeSvgTransform(transform: ResolvedNodeTransform): string | undefined {
  if (!hasResolvedNodeTransformEffect(transform)) {
    return undefined
  }

  return `translate(${transform.center.x} ${transform.center.y}) rotate(${transform.rotation}) scale(${transform.flipX ? -1 : 1} ${transform.flipY ? -1 : 1}) translate(${-transform.center.x} ${-transform.center.y})`
}

export function toResolvedNodeCssTransform(transform: ResolvedNodeTransform): string | undefined {
  if (!hasResolvedNodeTransformEffect(transform)) {
    return undefined
  }

  return `translate(${transform.center.x}px, ${transform.center.y}px) rotate(${transform.rotation}deg) scale(${transform.flipX ? -1 : 1}, ${transform.flipY ? -1 : 1}) translate(${-transform.center.x}px, ${-transform.center.y}px)`
}
