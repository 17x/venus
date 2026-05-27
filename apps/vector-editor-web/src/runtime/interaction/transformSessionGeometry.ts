import {
  applyAffineMatrixToPoint,
  createAffineMatrixAroundPoint,
  getNormalizedBoundsFromBox,
  invertAffineMatrix,
} from '@venus/lib'

import type {
  MatrixFirstNodeTransform,
  TransformHandleKind,
  TransformPoint,
  TransformPreviewShape,
  TransformSessionShape,
  TransformShapeSource,
} from './transformSessionManager.ts'

/**
 * Resolves rotated single-shape resize in local shape space so edge/corner drags stay stable.
 * @param shape Active transform-session shape snapshot.
 * @param handle Active resize handle kind.
 * @param pointer Current world-space pointer.
 */
export function resizeRotatedSingleShape(
  shape: TransformSessionShape,
  handle: Exclude<TransformHandleKind, 'move' | 'rotate'>,
  pointer: TransformPoint,
): TransformPreviewShape | null {
  const halfWidth = Math.max(1, shape.width) / 2
  const halfHeight = Math.max(1, shape.height) / 2
  // Session shapes carry inverse/matrix from the shared transform record,
  // so resize math can use one canonical transform projection path.
  const localPointer = applyAffineMatrixToPoint(shape.inverseMatrix, pointer)
  const localPointerOffset = {
    x: localPointer.x - shape.center.x,
    y: localPointer.y - shape.center.y,
  }
  const bounds = {
    minX: -halfWidth,
    minY: -halfHeight,
    maxX: halfWidth,
    maxY: halfHeight,
  }

  if (handle.includes('w')) {
    bounds.minX = localPointerOffset.x
  }
  if (handle.includes('e')) {
    bounds.maxX = localPointerOffset.x
  }
  if (handle.includes('n')) {
    bounds.minY = localPointerOffset.y
  }
  if (handle.includes('s')) {
    bounds.maxY = localPointerOffset.y
  }

  const crossedX = bounds.minX > bounds.maxX
  const crossedY = bounds.minY > bounds.maxY
  const minX = Math.min(bounds.minX, bounds.maxX)
  const maxX = Math.max(bounds.minX, bounds.maxX)
  const minY = Math.min(bounds.minY, bounds.maxY)
  const maxY = Math.max(bounds.minY, bounds.maxY)
  const width = Math.max(1, maxX - minX)
  const height = Math.max(1, maxY - minY)
  const localCenter = {
    x: (minX + maxX) / 2,
    y: (minY + maxY) / 2,
  }
  const worldCenter = applyAffineMatrixToPoint(
    shape.matrix,
    {x: shape.center.x + localCenter.x, y: shape.center.y + localCenter.y},
  )

  return {
    shapeId: shape.shapeId,
    x: worldCenter.x - width / 2,
    y: worldCenter.y - height / 2,
    width,
    height,
    rotation: resolveRotationAfterReflection(shape.rotation, crossedX !== crossedY),
    flipX: crossedX ? !shape.flipX : !!shape.flipX,
    flipY: crossedY ? !shape.flipY : !!shape.flipY,
  }
}

/**
 * Resolves the shortest signed rotation delta between two angles.
 * @param startAngle Starting angle in radians.
 * @param nextAngle Current angle in radians.
 */
export function resolveShortestRotationDeltaDegrees(startAngle: number, nextAngle: number) {
  const fullTurn = Math.PI * 2
  const rawDelta = nextAngle - startAngle
  const wrappedDelta = ((rawDelta + Math.PI) % fullTurn + fullTurn) % fullTurn - Math.PI
  return (wrappedDelta * 180) / Math.PI
}

/**
 * Resolves output rotation for mirrored resize states.
 * @param rotation Source rotation in degrees.
 * @param reflectedAcrossSingleAxis Whether resize reflection crossed exactly one axis.
 */
export function resolveRotationAfterReflection(
  rotation: number,
  reflectedAcrossSingleAxis: boolean,
) {
  if (!reflectedAcrossSingleAxis) {
    return rotation
  }

  return normalizeDegrees(-rotation)
}

/**
 * Normalizes degrees into the [0, 360) range for stable downstream rotation serialization.
 * @param value Degree value to normalize.
 */
export function normalizeDegrees(value: number) {
  const normalized = value % 360
  return normalized < 0 ? normalized + 360 : normalized
}

/**
 * Resolves normalized shape transform record used by transform session math.
 * @param shape Shape-like input with optional rotation/flip metadata.
 */
export function resolveShapeTransformRecord(shape: TransformShapeSource) {
  const width = Math.max(1, shape.width)
  const height = Math.max(1, shape.height)
  const x = shape.x
  const y = shape.y
  const rotation = shape.rotation ?? 0
  const flipX = !!shape.flipX
  const flipY = !!shape.flipY
  const bounds = getNormalizedBoundsFromBox(x, y, width, height)
  const center = {
    x: (bounds.minX + bounds.maxX) / 2,
    y: (bounds.minY + bounds.maxY) / 2,
  }
  const matrix = createAffineMatrixAroundPoint(center, {
    rotationDegrees: rotation,
    scaleX: flipX ? -1 : 1,
    scaleY: flipY ? -1 : 1,
  })

  return {
    x,
    y,
    width,
    height,
    rotation,
    flipX,
    flipY,
    bounds,
    center,
    matrix,
    inverseMatrix: invertAffineMatrix(matrix),
  }
}

/**
 * Resolves matrix-first payload used by worker transform-batch command path.
 * @param shape Shape transform preview payload.
 */
export function createMatrixFirstNodeTransform(
  shape: TransformPreviewShape,
): MatrixFirstNodeTransform {
  const resolved = resolveShapeTransformRecord({
    id: shape.shapeId,
    x: shape.x,
    y: shape.y,
    width: shape.width,
    height: shape.height,
    rotation: shape.rotation,
    flipX: shape.flipX,
    flipY: shape.flipY,
  })

  return {
    matrix: resolved.matrix,
    bounds: resolved.bounds,
    center: resolved.center,
    width: resolved.width,
    height: resolved.height,
    rotation: resolved.rotation,
    flipX: resolved.flipX,
    flipY: resolved.flipY,
  }
}
