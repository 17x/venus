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

const BOUNDS_CENTER_DIVISOR = 2
const RESOLVED_TRANSFORM_EFFECT_EPSILON = 0.0001

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

export interface EngineGeometryRotationSource {
  /** Bounds used when points are absent and for the returned aggregate bounds. */
  bounds: NormalizedBoundsLike
  /** Optional geometry points to rotate; use bounds corners for box-like geometry. */
  points?: readonly Point[]
  /** Rotation pivot in the same coordinate space as bounds/points. */
  center: Point
  /** Rotation angle in degrees. */
  rotationDegrees: number
}

export interface EngineGeometryRotationResult {
  /** Matrix that applies the requested rotate-around-point transform. */
  matrix: AffineMatrix
  /** Rotated geometry points, or rotated bounds corners when source points are absent. */
  points: Point[]
  /** Axis-aligned bounds around the rotated points. */
  bounds: NormalizedBounds
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
  * @param tx tx parameter.
 * @param ty ty parameter.
*/
export function createTranslationAffineMatrix(tx: number, ty: number): AffineMatrix {
  return createTranslationAffineMatrixFromLib(tx, ty)
}

/**
 * Returns a scale affine matrix for compatibility with legacy engine callers.
  * @param scaleX scaleX parameter.
 * @param scaleY scaleY parameter.
*/
export function createScaleAffineMatrix(scaleX: number, scaleY: number): AffineMatrix {
  return createScaleAffineMatrixFromLib(scaleX, scaleY)
}

/**
 * Returns a rotation affine matrix for compatibility with legacy engine callers.
  * @param rotationDegrees rotationDegrees parameter.
*/
export function createRotationAffineMatrix(rotationDegrees: number): AffineMatrix {
  return createRotationAffineMatrixFromLib(rotationDegrees)
}

/**
 * Multiplies affine matrices while preserving existing engine call signatures.
  * @param left left parameter.
 * @param right right parameter.
*/
export function multiplyAffineMatrices(left: AffineMatrix, right: AffineMatrix): AffineMatrix {
  return multiplyAffineMatricesFromLib(left, right)
}

/**
 * Inverts an affine matrix while preserving existing engine fallback behavior.
  * @param matrix Transform matrix.
*/
export function invertAffineMatrix(matrix: AffineMatrix): AffineMatrix {
  return invertAffineMatrixFromLib(matrix)
}

/**
 * Applies an affine matrix to a point while preserving existing engine call signatures.
  * @param matrix Transform matrix.
 * @param point point parameter.
*/
export function applyAffineMatrixToPoint(matrix: AffineMatrix, point: Point): Point {
  return applyAffineMatrixToPointFromLib(matrix, point)
}

/**
 * Composes a matrix around a center point while preserving existing engine call signatures.
  * @param center center parameter.
 * @param options Options object for this operation.
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
 * Creates an affine matrix for rotating around an arbitrary point.
 * @param center Pivot point.
 * @param rotationDegrees Rotation angle in degrees.
 */
export function createEngineRotateAroundPointMatrix(
  center: Point,
  rotationDegrees: number,
): AffineMatrix {
  return createAffineMatrixAroundPoint(center, {rotationDegrees})
}

/**
 * Rotates one point around an arbitrary pivot point.
 * @param point Source point.
 * @param center Pivot point.
 * @param rotationDegrees Rotation angle in degrees.
 */
export function rotateEnginePointAroundPoint(
  point: Point,
  center: Point,
  rotationDegrees: number,
): Point {
  return applyAffineMatrixToPoint(
    createEngineRotateAroundPointMatrix(center, rotationDegrees),
    point,
  )
}

/**
 * Rotates generic geometry around a pivot and returns transformed points and bounds.
 * Works for rect/ellipse bounds, line endpoints, polygon/star vertices, and path samples.
 * @param source Generic geometry rotation input.
 */
export function resolveEngineGeometryRotationAroundPoint(
  source: EngineGeometryRotationSource,
): EngineGeometryRotationResult {
  const matrix = createEngineRotateAroundPointMatrix(source.center, source.rotationDegrees)
  const sourcePoints = source.points && source.points.length > 0
    ? source.points
    : boundsToCornerPoints(source.bounds)
  const points = sourcePoints.map((point) => applyAffineMatrixToPoint(matrix, point))
  const bounds = getNormalizedBoundsFromPoints(points)

  return {
    matrix,
    points,
    bounds,
  }
}

/**
 * Normalizes possibly negative-size boxes while preserving existing engine call signatures.
  * @param x x parameter.
 * @param y y parameter.
 * @param width Width value.
 * @param height Height value.
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
 * Converts normalized bounds into corner points for generic box transforms.
 * @param bounds Bounds to convert.
 */
function boundsToCornerPoints(bounds: NormalizedBoundsLike): Point[] {
  return [
    {x: bounds.minX, y: bounds.minY},
    {x: bounds.maxX, y: bounds.minY},
    {x: bounds.maxX, y: bounds.maxY},
    {x: bounds.minX, y: bounds.maxY},
  ]
}

/**
 * Resolves normalized bounds from a transformed point list.
 * @param points Points to bound.
 */
function getNormalizedBoundsFromPoints(points: readonly Point[]): NormalizedBounds {
  const xs = points.map((point) => point.x)
  const ys = points.map((point) => point.y)
  const minX = Math.min(...xs)
  const minY = Math.min(...ys)
  const maxX = Math.max(...xs)
  const maxY = Math.max(...ys)

  return {
    minX,
    minY,
    maxX,
    maxY,
    width: maxX - minX,
    height: maxY - minY,
  }
}

/**
 * Resolves the world-aligned bounds occupied by one transformed box.
  * @param source Box transform source.
*/
export function resolveEngineTransformedBoundsFromBox(source: BoxTransformSource): NormalizedBounds {
  const bounds = getNormalizedBoundsFromBox(source.x, source.y, source.width, source.height)
  const rotation = source.rotation ?? 0
  const scaleX = source.flipX ? -1 : 1
  const scaleY = source.flipY ? -1 : 1

  if (
    Math.abs(rotation) <= RESOLVED_TRANSFORM_EFFECT_EPSILON &&
    scaleX === 1 &&
    scaleY === 1
  ) {
    return bounds
  }

  const center = {
    x: (bounds.minX + bounds.maxX) / BOUNDS_CENTER_DIVISOR,
    y: (bounds.minY + bounds.maxY) / BOUNDS_CENTER_DIVISOR,
  }
  const matrix = createAffineMatrixAroundPoint(center, {
    rotationDegrees: rotation,
    scaleX,
    scaleY,
  })
  const corners = [
    {x: bounds.minX, y: bounds.minY},
    {x: bounds.maxX, y: bounds.minY},
    {x: bounds.maxX, y: bounds.maxY},
    {x: bounds.minX, y: bounds.maxY},
  ].map((point) => applyAffineMatrixToPoint(matrix, point))
  const minX = Math.min(...corners.map((point) => point.x))
  const minY = Math.min(...corners.map((point) => point.y))
  const maxX = Math.max(...corners.map((point) => point.x))
  const maxY = Math.max(...corners.map((point) => point.y))

  return {
    minX,
    minY,
    maxX,
    maxY,
    width: maxX - minX,
    height: maxY - minY,
  }
}

/**
 * Checks overlap of normalized bounds while preserving existing engine call signatures.
  * @param left left parameter.
 * @param right right parameter.
*/
export function doNormalizedBoundsOverlap(
  left: NormalizedBoundsLike,
  right: NormalizedBoundsLike,
): boolean {
  return doNormalizedBoundsOverlapFromLib(left, right)
}

/**
 * Intersects normalized bounds while preserving existing engine call signatures.
  * @param left left parameter.
 * @param right right parameter.
*/
export function intersectNormalizedBounds(
  left: NormalizedBoundsLike,
  right: NormalizedBoundsLike,
): NormalizedBoundsLike | null {
  return intersectNormalizedBoundsFromLib(left, right)
}

/**
 * Normalizes raw box transform input into a fully-populated record.
  * @param source source parameter.
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
  * @param source source parameter.
*/
export function resolveNodeTransform(source: BoxTransformSource): ResolvedNodeTransform {
  const transform = createShapeTransformRecord(source)
  const bounds = getNormalizedBoundsFromBox(transform.x, transform.y, transform.width, transform.height)
  const center = {
    x: (bounds.minX + bounds.maxX) / BOUNDS_CENTER_DIVISOR,
    y: (bounds.minY + bounds.maxY) / BOUNDS_CENTER_DIVISOR,
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
  * @param source source parameter.
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
  * @param source source parameter.
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
  * @param transform transform parameter.
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
  * @param point point parameter.
 * @param bounds Bounds data.
 * @param rotationDegrees rotationDegrees parameter.
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
  * @param transform transform parameter.
*/
export function hasResolvedNodeTransformEffect(transform: ResolvedNodeTransform): boolean {
  // Apply a small epsilon to avoid insignificant float drift toggling transform strings.
  return (
    Math.abs(transform.rotation) > RESOLVED_TRANSFORM_EFFECT_EPSILON ||
    transform.flipX ||
    transform.flipY
  )
}

/**
 * Serializes resolved transform state into SVG transform attribute syntax.
  * @param transform transform parameter.
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
  * @param transform transform parameter.
*/
export function toResolvedNodeCssTransform(transform: ResolvedNodeTransform): string | undefined {
  // Skip transform serialization when matrix effect is effectively identity.
  if (!hasResolvedNodeTransformEffect(transform)) {
    return undefined
  }

  return `translate(${transform.center.x}px, ${transform.center.y}px) rotate(${transform.rotation}deg) scale(${transform.flipX ? -1 : 1}, ${transform.flipY ? -1 : 1}) translate(${-transform.center.x}px, ${-transform.center.y}px)`
}
