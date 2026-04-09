import {
  applyAffineMatrixToPoint,
  createAffineMatrixAroundPoint,
  invertAffineMatrix,
  type AffineMatrix,
  type Point,
} from './geometry.ts'

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

export interface ShapeTransformBatchItem {
  id: string
  from: ShapeTransformRecord
  to: ShapeTransformRecord
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

/**
 * Normalizes box-style shape geometry so transform-sensitive code can treat
 * bounds and center consistently even if authored width/height signs differ.
 */
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

/**
 * Strict overlap test for normalized bounds. Touching edges are not treated as
 * overlap (area must be positive on both axes).
 */
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

/**
 * Intersect two normalized bounds regions. Returns `null` when intersection
 * area is empty or edge-touching only.
 */
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

export interface ResolvedNodeTransform {
  bounds: NormalizedBounds
  center: Point
  rotation: number
  flipX: boolean
  flipY: boolean
  matrix: AffineMatrix
  inverseMatrix: AffineMatrix
}

/**
 * Phase-5 migration scaffold: matrix-first runtime transform contract.
 *
 * This keeps derived legacy-compatible geometry fields alongside `matrix` so
 * packages can migrate incrementally without immediate runtime-node storage
 * replacement.
 */
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

/**
 * Resolves the current runtime box transform into one reusable contract for
 * render, hit-test, and interaction code while the scene model stays
 * decomposed (`x/y/width/height/rotation/flipX/flipY`).
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

/**
 * Create a matrix-first transform payload from the current decomposed runtime
 * box shape contract (`x/y/width/height/rotation/flipX/flipY`).
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
 * Adapter from matrix-first transform payload back to legacy decomposed
 * transform fields. Uses normalized bounds for legacy box semantics.
 */
export function toLegacyShapeTransformRecord(
  transform: Pick<MatrixFirstNodeTransform, 'bounds' | 'rotation' | 'flipX' | 'flipY'>,
): ShapeTransformRecord {
  return {
    x: transform.bounds.minX,
    y: transform.bounds.minY,
    width: transform.bounds.maxX - transform.bounds.minX,
    height: transform.bounds.maxY - transform.bounds.minY,
    rotation: transform.rotation,
    flipX: transform.flipX,
    flipY: transform.flipY,
  }
}

/**
 * Test whether a world-space point is inside a potentially rotated bounds box
 * by projecting into the box's local axis-aligned space.
 */
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

/**
 * Whether a resolved transform has any non-identity visual transform effect.
 */
export function hasResolvedNodeTransformEffect(transform: ResolvedNodeTransform): boolean {
  return (
    Math.abs(transform.rotation) > 0.0001 ||
    transform.flipX ||
    transform.flipY
  )
}

/**
 * Build an SVG transform attribute string from resolved node transform state.
 */
export function toResolvedNodeSvgTransform(transform: ResolvedNodeTransform): string | undefined {
  if (!hasResolvedNodeTransformEffect(transform)) {
    return undefined
  }

  return `translate(${transform.center.x} ${transform.center.y}) rotate(${transform.rotation}) scale(${transform.flipX ? -1 : 1} ${transform.flipY ? -1 : 1}) translate(${-transform.center.x} ${-transform.center.y})`
}

/**
 * Build a CSS transform string from resolved node transform state.
 */
export function toResolvedNodeCssTransform(transform: ResolvedNodeTransform): string | undefined {
  if (!hasResolvedNodeTransformEffect(transform)) {
    return undefined
  }

  return `translate(${transform.center.x}px, ${transform.center.y}px) rotate(${transform.rotation}deg) scale(${transform.flipX ? -1 : 1}, ${transform.flipY ? -1 : 1}) translate(${-transform.center.x}px, ${-transform.center.y}px)`
}
