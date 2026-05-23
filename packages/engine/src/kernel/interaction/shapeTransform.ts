import {
  applyAffineMatrixToPoint,
  createAffineMatrixAroundPoint,
  doNormalizedBoundsOverlap,
  getNormalizedBoundsFromBox,
  intersectNormalizedBounds,
  invertAffineMatrix,
  isPointInsideRotatedBounds,
} from "@venus/lib";

/**
 * Declares a 2D point used by transform helpers.
 */
export interface Point {
  /** Horizontal coordinate in world units. */
  x: number;
  /** Vertical coordinate in world units. */
  y: number;
}

/**
 * Declares one affine matrix represented by six coefficients.
 */
export type AffineMatrix = [number, number, number, number, number, number];

/**
 * Declares source box properties used to resolve node transforms.
 */
export interface BoxTransformSource {
  /** Top-left x coordinate. */
  x: number;
  /** Top-left y coordinate. */
  y: number;
  /** Box width, may be negative for anchor semantics. */
  width: number;
  /** Box height, may be negative for anchor semantics. */
  height: number;
  /** Optional clockwise rotation in degrees. */
  rotation?: number;
  /** Optional horizontal flip flag. */
  flipX?: boolean;
  /** Optional vertical flip flag. */
  flipY?: boolean;
}

/**
 * Declares normalized bounds values used by overlap and matrix computations.
 */
export interface NormalizedBounds {
  /** Minimum x. */
  minX: number;
  /** Minimum y. */
  minY: number;
  /** Maximum x. */
  maxX: number;
  /** Maximum y. */
  maxY: number;
  /** Width computed from normalized extents. */
  width: number;
  /** Height computed from normalized extents. */
  height: number;
}

/**
 * Declares lightweight normalized bounds shape for overlap/intersection calls.
 */
export interface NormalizedBoundsLike {
  /** Minimum x. */
  minX: number;
  /** Minimum y. */
  minY: number;
  /** Maximum x. */
  maxX: number;
  /** Maximum y. */
  maxY: number;
}

/**
 * Declares resolved node transform metadata including matrix and inverse matrix.
 */
export interface ResolvedNodeTransform {
  /** Normalized bounds snapshot. */
  bounds: NormalizedBounds;
  /** Bounds center in world space. */
  center: Point;
  /** Rotation in degrees. */
  rotation: number;
  /** Horizontal flip flag. */
  flipX: boolean;
  /** Vertical flip flag. */
  flipY: boolean;
  /** Forward affine matrix. */
  matrix: AffineMatrix;
  /** Inverse affine matrix. */
  inverseMatrix: AffineMatrix;
}

/**
 * Declares matrix-first transform snapshot expected by batch transforms.
 */
export interface MatrixFirstNodeTransform {
  /** Forward affine matrix. */
  matrix: AffineMatrix;
  /** Normalized bounds snapshot. */
  bounds: NormalizedBounds;
  /** Bounds center in world space. */
  center: Point;
  /** Width used by resize/anchor operations. */
  width: number;
  /** Height used by resize/anchor operations. */
  height: number;
  /** Rotation in degrees. */
  rotation: number;
  /** Horizontal flip flag. */
  flipX: boolean;
  /** Vertical flip flag. */
  flipY: boolean;
}

/**
 * Declares normalized mutable transform record shared across transform workflows.
 */
export interface ShapeTransformRecord {
  /** Top-left x coordinate. */
  x: number;
  /** Top-left y coordinate. */
  y: number;
  /** Width value (may be negative). */
  width: number;
  /** Height value (may be negative). */
  height: number;
  /** Rotation in degrees. */
  rotation: number;
  /** Optional horizontal flip flag. */
  flipX?: boolean;
  /** Optional vertical flip flag. */
  flipY?: boolean;
}

/**
 * Declares one transform-batch item carrying matrix-first before/after snapshots.
 */
export interface ShapeTransformBatchItem {
  /** Target shape id. */
  id: string;
  /** Matrix-first transform snapshot before mutation. */
  fromMatrix: MatrixFirstNodeTransform;
  /** Matrix-first transform snapshot after mutation. */
  toMatrix: MatrixFirstNodeTransform;
}

/**
 * Declares shape-transform batch command consumed by worker/runtime protocols.
 */
export interface ShapeTransformBatchCommand {
  /** Command discriminant. */
  type: 'shape.transform.batch';
  /** Ordered transform batch payload. */
  transforms: ShapeTransformBatchItem[];
}

/**
 * Declares resolved transform record carrying matrix metadata.
 */
export interface ResolvedShapeTransformRecord extends ShapeTransformRecord {
  /** Normalized bounds snapshot. */
  bounds: NormalizedBounds;
  /** Bounds center in world space. */
  center: Point;
  /** Forward affine matrix. */
  matrix: AffineMatrix;
  /** Inverse affine matrix. */
  inverseMatrix: AffineMatrix;
}

const BOUNDS_CENTER_DIVISOR = 2;
const RESOLVED_TRANSFORM_EFFECT_EPSILON = 0.0001;

/**
 * Normalizes raw transform source fields into a stable transform record.
 * @param source Raw source box transform fields.
 */
export function createShapeTransformRecord(
  source: BoxTransformSource,
): ShapeTransformRecord {
  return {
    x: source.x,
    y: source.y,
    width: source.width,
    height: source.height,
    rotation: source.rotation ?? 0,
    flipX: source.flipX ?? false,
    flipY: source.flipY ?? false,
  };
}

/**
 * Resolves matrix-based node transform metadata from box transform source fields.
 * @param source Raw source box transform fields.
 */
export function resolveNodeTransform(
  source: BoxTransformSource,
): ResolvedNodeTransform {
  const transform = createShapeTransformRecord(source);
  const bounds = getNormalizedBoundsFromBox(
    transform.x,
    transform.y,
    transform.width,
    transform.height,
  );
  const center = {
    x: (bounds.minX + bounds.maxX) / BOUNDS_CENTER_DIVISOR,
    y: (bounds.minY + bounds.maxY) / BOUNDS_CENTER_DIVISOR,
  };
  const rotation = transform.rotation;
  const flipX = transform.flipX ?? false;
  const flipY = transform.flipY ?? false;
  const matrix = createAffineMatrixAroundPoint(center, {
    rotationDegrees: rotation,
    scaleX: flipX ? -1 : 1,
    scaleY: flipY ? -1 : 1,
  });

  return {
    bounds,
    center,
    rotation,
    flipX,
    flipY,
    matrix,
    inverseMatrix: invertAffineMatrix(matrix),
  };
}

/**
 * Resolves one normalized transform record carrying matrix metadata.
 * @param source Raw source box transform fields.
 */
export function resolveShapeTransformRecord(
  source: BoxTransformSource,
): ResolvedShapeTransformRecord {
  const transform = createShapeTransformRecord(source);
  const resolved = resolveNodeTransform(transform);

  return {
    ...transform,
    bounds: resolved.bounds,
    center: resolved.center,
    matrix: resolved.matrix,
    inverseMatrix: resolved.inverseMatrix,
  };
}

/**
 * Creates matrix-first transform snapshot expected by batch transform workflows.
 * @param source Raw source box transform fields.
 */
export function createMatrixFirstNodeTransform(
  source: BoxTransformSource,
): MatrixFirstNodeTransform {
  const resolved = resolveNodeTransform(source);

  return {
    matrix: resolved.matrix,
    bounds: resolved.bounds,
    center: resolved.center,
    width: resolved.bounds.width,
    height: resolved.bounds.height,
    rotation: resolved.rotation,
    flipX: resolved.flipX,
    flipY: resolved.flipY,
  };
}

/**
 * Converts matrix-first transform snapshots into canonical shape transform records.
 * @param transform Matrix-first transform snapshot.
 */
export function toShapeTransformRecordFromMatrix(
  transform: Pick<
    MatrixFirstNodeTransform,
    "bounds" | "rotation" | "flipX" | "flipY" | "width" | "height"
  >,
): ShapeTransformRecord {
  const width =
    typeof transform.width === "number"
      ? transform.width
      : transform.bounds.maxX - transform.bounds.minX;
  const height =
    typeof transform.height === "number"
      ? transform.height
      : transform.bounds.maxY - transform.bounds.minY;
  const x = width >= 0 ? transform.bounds.minX : transform.bounds.maxX;
  const y = height >= 0 ? transform.bounds.minY : transform.bounds.maxY;

  return {
    x,
    y,
    width,
    height,
    rotation: transform.rotation,
    flipX: transform.flipX,
    flipY: transform.flipY,
  };
}

/**
 * Returns whether resolved transform metadata has visible transform effect.
 * @param transform Resolved transform metadata.
 */
export function hasResolvedNodeTransformEffect(
  transform: ResolvedNodeTransform,
): boolean {
  return (
    Math.abs(transform.rotation) > RESOLVED_TRANSFORM_EFFECT_EPSILON ||
    transform.flipX ||
    transform.flipY
  );
}

/**
 * Serializes resolved transform metadata into SVG transform syntax.
 * @param transform Resolved transform metadata.
 */
export function toResolvedNodeSvgTransform(
  transform: ResolvedNodeTransform,
): string | undefined {
  if (!hasResolvedNodeTransformEffect(transform)) {
    return undefined;
  }

  return `translate(${transform.center.x} ${transform.center.y}) rotate(${transform.rotation}) scale(${transform.flipX ? -1 : 1} ${transform.flipY ? -1 : 1}) translate(${-transform.center.x} ${-transform.center.y})`;
}

export {
  applyAffineMatrixToPoint,
  createAffineMatrixAroundPoint,
  doNormalizedBoundsOverlap,
  getNormalizedBoundsFromBox,
  intersectNormalizedBounds,
  isPointInsideRotatedBounds,
};
