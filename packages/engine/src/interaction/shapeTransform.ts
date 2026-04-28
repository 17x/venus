import {
  applyAffineMatrixToPoint as applyAffineMatrixToPointFromLib,
  createAffineMatrixAroundPoint as createAffineMatrixAroundPointFromLib,
  createIdentityAffineMatrix as createIdentityAffineMatrixFromLib,
  createRotationAffineMatrix as createRotationAffineMatrixFromLib,
  createScaleAffineMatrix as createScaleAffineMatrixFromLib,
  createTranslationAffineMatrix as createTranslationAffineMatrixFromLib,
  invertAffineMatrix as invertAffineMatrixFromLib,
  multiplyAffineMatrices as multiplyAffineMatricesFromLib,
} from '@venus/lib/math'
import {
  doNormalizedBoundsOverlap as doNormalizedBoundsOverlapFromLib,
  getNormalizedBoundsFromBox as getNormalizedBoundsFromBoxFromLib,
  intersectNormalizedBounds as intersectNormalizedBoundsFromLib,
  isPointInsideRotatedBounds as isPointInsideRotatedBoundsFromLib,
} from '@venus/lib/geometry'

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

/**
 * Returns the identity affine matrix for compatibility with legacy engine callers.
 */
export function createIdentityAffineMatrix(): AffineMatrix {
  return createIdentityAffineMatrixFromLib()
}

/**
 * Returns a translation affine matrix for compatibility with legacy engine callers.
 */
export function createTranslationAffineMatrix(tx: number, ty: number): AffineMatrix {
  return createTranslationAffineMatrixFromLib(tx, ty)
}

/**
 * Returns a scale affine matrix for compatibility with legacy engine callers.
 */
export function createScaleAffineMatrix(scaleX: number, scaleY: number): AffineMatrix {
  return createScaleAffineMatrixFromLib(scaleX, scaleY)
}

/**
 * Returns a rotation affine matrix for compatibility with legacy engine callers.
 */
export function createRotationAffineMatrix(rotationDegrees: number): AffineMatrix {
  return createRotationAffineMatrixFromLib(rotationDegrees)
}

/**
 * Multiplies affine matrices while preserving existing engine call signatures.
 */
export function multiplyAffineMatrices(left: AffineMatrix, right: AffineMatrix): AffineMatrix {
  return multiplyAffineMatricesFromLib(left, right)
}

/**
 * Inverts an affine matrix while preserving existing engine fallback behavior.
 */
export function invertAffineMatrix(matrix: AffineMatrix): AffineMatrix {
  return invertAffineMatrixFromLib(matrix)
}

/**
 * Applies an affine matrix to a point while preserving existing engine call signatures.
 */
export function applyAffineMatrixToPoint(matrix: AffineMatrix, point: Point): Point {
  return applyAffineMatrixToPointFromLib(matrix, point)
}

/**
 * Composes a matrix around a center point while preserving existing engine call signatures.
 */
export function createAffineMatrixAroundPoint(
  center: Point,
  options?: {
    rotationDegrees?: number
    scaleX?: number
    scaleY?: number
  },
): AffineMatrix {
  return createAffineMatrixAroundPointFromLib(center, options)
}

/**
 * Normalizes possibly negative-size boxes while preserving existing engine call signatures.
 */
export function getNormalizedBoundsFromBox(
  x: number,
  y: number,
  width: number,
  height: number,
): NormalizedBounds {
  return getNormalizedBoundsFromBoxFromLib(x, y, width, height)
}

/**
 * Checks overlap of normalized bounds while preserving existing engine call signatures.
 */
export function doNormalizedBoundsOverlap(
  left: NormalizedBoundsLike,
  right: NormalizedBoundsLike,
): boolean {
  return doNormalizedBoundsOverlapFromLib(left, right)
}

/**
 * Intersects normalized bounds while preserving existing engine call signatures.
 */
export function intersectNormalizedBounds(
  left: NormalizedBoundsLike,
  right: NormalizedBoundsLike,
): NormalizedBoundsLike | null {
  return intersectNormalizedBoundsFromLib(left, right)
}

/**
 * Normalizes raw box transform input into a fully-populated record.
 */
export function createShapeTransformRecord(source: BoxTransformSource): ShapeTransformRecord {
  return {
    x: source.x,
    y: source.y,
    width: source.width,
    height: source.height,
    // Default optional flags to stable values to keep downstream math deterministic.
    rotation: source.rotation ?? 0,
    flipX: source.flipX ?? false,
    flipY: source.flipY ?? false,
  }
}

/**
 * Resolves runtime transform data including matrix and inverse matrix.
 */
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
  // Compose rotation and mirror around bounds center so local geometry origin stays unchanged.
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

/**
 * Resolves legacy record fields together with computed matrix metadata.
 */
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

/**
 * Converts source transform into matrix-first structure expected by batch commands.
 */
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

/**
 * Converts matrix-first transform snapshots back into legacy shape transform records.
 */
export function toLegacyShapeTransformRecord(
  transform: Pick<MatrixFirstNodeTransform, 'bounds' | 'rotation' | 'flipX' | 'flipY' | 'width' | 'height'>,
): ShapeTransformRecord {
  // Fallback to bounds extents for compatibility with older callsites that omit width/height.
  const width = typeof transform.width === 'number'
    ? transform.width
    : (transform.bounds.maxX - transform.bounds.minX)
  const height = typeof transform.height === 'number'
    ? transform.height
    : (transform.bounds.maxY - transform.bounds.minY)
  // Preserve negative-size anchor semantics used by resize workflows.
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

/**
 * Performs rotated bounds hit testing while preserving existing engine call signatures.
 */
export function isPointInsideRotatedBounds(
  point: Point,
  bounds: Pick<NormalizedBounds, 'minX' | 'minY' | 'maxX' | 'maxY'>,
  rotationDegrees: number,
): boolean {
  return isPointInsideRotatedBoundsFromLib(point, bounds, rotationDegrees)
}

/**
 * Returns whether a resolved node transform has any visual effect.
 */
export function hasResolvedNodeTransformEffect(transform: ResolvedNodeTransform): boolean {
  // Apply a small epsilon to avoid insignificant float drift toggling transform strings.
  return (
    Math.abs(transform.rotation) > 0.0001 ||
    transform.flipX ||
    transform.flipY
  )
}

/**
 * Serializes resolved transform state into SVG transform attribute syntax.
 */
export function toResolvedNodeSvgTransform(transform: ResolvedNodeTransform): string | undefined {
  // Skip transform serialization when matrix effect is effectively identity.
  if (!hasResolvedNodeTransformEffect(transform)) {
    return undefined
  }

  return `translate(${transform.center.x} ${transform.center.y}) rotate(${transform.rotation}) scale(${transform.flipX ? -1 : 1} ${transform.flipY ? -1 : 1}) translate(${-transform.center.x} ${-transform.center.y})`
}

/**
 * Serializes resolved transform state into CSS transform syntax.
 */
export function toResolvedNodeCssTransform(transform: ResolvedNodeTransform): string | undefined {
  // Skip transform serialization when matrix effect is effectively identity.
  if (!hasResolvedNodeTransformEffect(transform)) {
    return undefined
  }

  return `translate(${transform.center.x}px, ${transform.center.y}px) rotate(${transform.rotation}deg) scale(${transform.flipX ? -1 : 1}, ${transform.flipY ? -1 : 1}) translate(${-transform.center.x}px, ${-transform.center.y}px)`
}
