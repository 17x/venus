import {
  applyAffineMatrixToPoint,
  createAffineMatrixAroundPoint,
  getNormalizedBoundsFromBox,
  invertAffineMatrix,
  type AffineMatrix,
  type NormalizedBounds,
} from '@venus/lib'

/**
 * Declares matrix-first node transform payload used by transform batch serialization.
 */
export interface MatrixFirstNodeTransform {
  /** Stores affine matrix payload in 2x3 form. */
  matrix: AffineMatrix
  /** Stores normalized bounds derived from the matrix transform. */
  bounds: NormalizedBounds
  /** Stores center point used by rotate/scale interactions. */
  center: {x: number; y: number}
  /** Stores width derived from bounds. */
  width: number
  /** Stores height derived from bounds. */
  height: number
  /** Stores rotation degrees. */
  rotation: number
  /** Stores horizontal flip flag. */
  flipX: boolean
  /** Stores vertical flip flag. */
  flipY: boolean
}

/**
 * Declares one shape transform item inside a batched transform command.
 */
export interface ShapeTransformBatchItem {
  /** Stores target shape id. */
  id: string
  /** Stores source matrix-first transform. */
  fromMatrix: MatrixFirstNodeTransform
  /** Stores destination matrix-first transform. */
  toMatrix: MatrixFirstNodeTransform
}

/**
 * Declares runtime transform command payload consumed by worker protocol.
 */
export interface ShapeTransformBatchCommand {
  /** Stores command discriminator. */
  type: 'shape.transform.batch'
  /** Stores shape transform item list. */
  transforms: ShapeTransformBatchItem[]
}

export type TransformHandleKind =
  | 'move'
  | 'nw'
  | 'n'
  | 'ne'
  | 'e'
  | 'se'
  | 's'
  | 'sw'
  | 'w'
  | 'rotate'

export interface TransformBounds {
  minX: number
  minY: number
  maxX: number
  maxY: number
}

export interface TransformPoint {
  x: number
  y: number
}

export interface TransformSessionShape {
  shapeId: string
  x: number
  y: number
  width: number
  height: number
  rotation: number
  flipX?: boolean
  flipY?: boolean
  bounds: NormalizedBounds
  center: TransformPoint
  matrix: AffineMatrix
  inverseMatrix: AffineMatrix
}

export interface TransformPreviewShape {
  shapeId: string
  x: number
  y: number
  width: number
  height: number
  rotation: number
  flipX?: boolean
  flipY?: boolean
}

export interface TransformPreview {
  shapes: TransformPreviewShape[]
}

export type TransformBatchItem = ShapeTransformBatchItem

export interface TransformShapeSource {
  id: string
  x: number
  y: number
  width: number
  height: number
  rotation?: number
  flipX?: boolean
  flipY?: boolean
}

export interface TransformSession {
  shapeIds: string[]
  shapes: TransformSessionShape[]
  handle: TransformHandleKind
  start: TransformPoint
  current: TransformPoint
  startBounds: TransformBounds
}

/**
 * Normalizes a document/runtime shape into the transform-session contract used
 * by shared resize/rotate/move interactions.
 */
export function createTransformSessionShape(shape: TransformShapeSource): TransformSessionShape {
  const resolved = resolveShapeTransformRecord({
    ...shape,
    width: Math.max(1, shape.width),
    height: Math.max(1, shape.height),
  })

  return {
    shapeId: shape.id,
    ...resolved,
  }
}

/**
 * Normalizes a document/runtime shape into the preview payload used by shared
 * transform preview state and commit synchronization.
 */
export function createTransformPreviewShape(shape: TransformShapeSource): TransformPreviewShape {
  const resolved = resolveShapeTransformRecord({
    ...shape,
    width: Math.max(1, shape.width),
    height: Math.max(1, shape.height),
  })

  return {
    shapeId: shape.id,
    x: resolved.x,
    y: resolved.y,
    width: resolved.width,
    height: resolved.height,
    rotation: resolved.rotation,
    flipX: resolved.flipX,
    flipY: resolved.flipY,
  }
}

/**
 * Resolves preview payloads back into batch command patches so app shells can
 * dispatch one shared transform commit contract to worker/runtime layers.
 */
export function buildTransformBatch(
  documentShapes: TransformShapeSource[],
  preview: TransformPreview | null | undefined,
): TransformBatchItem[] {
  if (!preview) {
    return []
  }

  const shapeById = new Map(documentShapes.map((shape) => [shape.id, shape]))
  const transforms: TransformBatchItem[] = []

  preview.shapes.forEach((item) => {
    const shape = shapeById.get(item.shapeId)
    if (!shape) {
      return
    }

    const from = createTransformPreviewShape(shape)
    const to = {
      shapeId: item.shapeId,
      x: item.x,
      y: item.y,
      width: item.width,
      height: item.height,
      rotation: typeof item.rotation === 'number' ? item.rotation : from.rotation,
      flipX: typeof item.flipX === 'boolean' ? item.flipX : from.flipX,
      flipY: typeof item.flipY === 'boolean' ? item.flipY : from.flipY,
    }

    const changed =
      from.x !== to.x ||
      from.y !== to.y ||
      from.width !== to.width ||
      from.height !== to.height ||
      from.rotation !== to.rotation ||
      !!from.flipX !== !!to.flipX ||
      !!from.flipY !== !!to.flipY

    if (!changed) {
      return
    }

    transforms.push({
      id: shape.id,
      fromMatrix: createMatrixFirstNodeTransform(from),
      toMatrix: createMatrixFirstNodeTransform(to),
    })
  })

  return transforms
}

export function createTransformBatchCommand(
  documentShapes: TransformShapeSource[],
  preview: TransformPreview | null | undefined,
): ShapeTransformBatchCommand | null {
  const transforms = buildTransformBatch(documentShapes, preview)
  if (transforms.length === 0) {
    return null
  }

  return {
    type: 'shape.transform.batch',
    transforms,
  }
}

/**
 * Creates mutable transform-session orchestration used by pointer-driven preview updates.
 */
export function createTransformSessionManager() {
  let session: TransformSession | null = null

  const start = (params: {
    shapeIds: string[]
    shapes: TransformSessionShape[]
    handle: TransformHandleKind
    pointer: TransformPoint
    startBounds: TransformBounds
  }) => {
    session = {
      shapeIds: params.shapeIds,
      shapes: params.shapes,
      handle: params.handle,
      start: params.pointer,
      startBounds: params.startBounds,
      current: params.pointer,
    }
  }

  const update = (pointer: TransformPoint): TransformPreview | null => {
    if (!session) {
      return null
    }

    session.current = pointer
    const deltaX = pointer.x - session.start.x
    const deltaY = pointer.y - session.start.y
    const base = session.startBounds

    if (session.handle === 'move') {
      return {
        shapes: session.shapes.map((shape) => ({
          shapeId: shape.shapeId,
          x: shape.x + deltaX,
          y: shape.y + deltaY,
          width: Math.max(1, shape.width),
          height: Math.max(1, shape.height),
          rotation: shape.rotation,
          flipX: shape.flipX,
          flipY: shape.flipY,
        })),
      }
    }

    const next = {
      minX: base.minX,
      minY: base.minY,
      maxX: base.maxX,
      maxY: base.maxY,
    }

    if (session.handle.includes('w')) {
      next.minX = base.minX + deltaX
    }
    if (session.handle.includes('e')) {
      next.maxX = base.maxX + deltaX
    }
    if (session.handle.includes('n')) {
      next.minY = base.minY + deltaY
    }
    if (session.handle.includes('s')) {
      next.maxY = base.maxY + deltaY
    }

    if (session.handle === 'rotate') {
      const center = {
        x: (base.minX + base.maxX) / 2,
        y: (base.minY + base.maxY) / 2,
      }
      const startAngle = Math.atan2(session.start.y - center.y, session.start.x - center.x)
      const nextAngle = Math.atan2(pointer.y - center.y, pointer.x - center.x)
      // Keep rotation delta continuous across +/-PI seam to avoid one-frame 360deg jumps.
      const deltaDegrees = resolveShortestRotationDeltaDegrees(startAngle, nextAngle)

      return {
        shapes: session.shapes.map((shape) => {
          const rotated = applyAffineMatrixToPoint(
            createAffineMatrixAroundPoint(center, {
              rotationDegrees: deltaDegrees,
            }),
            shape.center,
          )
          return {
            shapeId: shape.shapeId,
            x: rotated.x - shape.width / 2,
            y: rotated.y - shape.height / 2,
            width: Math.max(1, shape.width),
            height: Math.max(1, shape.height),
            rotation: normalizeDegrees(shape.rotation + deltaDegrees),
            flipX: shape.flipX,
            flipY: shape.flipY,
          }
        }),
      }
    }

    if (session.shapes.length === 1) {
      const resizedShape = resizeRotatedSingleShape(session.shapes[0], session.handle, pointer)
      if (resizedShape) {
        return {
          shapes: [resizedShape],
        }
      }
    }

    const crossedX = next.minX > next.maxX
    const crossedY = next.minY > next.maxY
    const sourceWidth = Math.max(1, base.maxX - base.minX)
    const sourceHeight = Math.max(1, base.maxY - base.minY)
    const signedScaleX = (next.maxX - next.minX) / sourceWidth
    const signedScaleY = (next.maxY - next.minY) / sourceHeight

    return {
      shapes: session.shapes.map((shape) => {
        const shapeMinX = shape.bounds.minX
        const shapeMinY = shape.bounds.minY
        const shapeMaxX = shape.bounds.maxX
        const shapeMaxY = shape.bounds.maxY

        const nextShapeMinX = next.minX + (shapeMinX - base.minX) * signedScaleX
        const nextShapeMaxX = next.minX + (shapeMaxX - base.minX) * signedScaleX
        const nextShapeMinY = next.minY + (shapeMinY - base.minY) * signedScaleY
        const nextShapeMaxY = next.minY + (shapeMaxY - base.minY) * signedScaleY
        const reflectedAcrossSingleAxis = crossedX !== crossedY

        return {
          shapeId: shape.shapeId,
          x: Math.min(nextShapeMinX, nextShapeMaxX),
          y: Math.min(nextShapeMinY, nextShapeMaxY),
          width: Math.max(1, Math.abs(nextShapeMaxX - nextShapeMinX)),
          height: Math.max(1, Math.abs(nextShapeMaxY - nextShapeMinY)),
          rotation: resolveRotationAfterReflection(shape.rotation, reflectedAcrossSingleAxis),
          flipX: crossedX ? !shape.flipX : !!shape.flipX,
          flipY: crossedY ? !shape.flipY : !!shape.flipY,
        }
      }),
    }
  }

  const commit = () => {
    const current = session
    session = null
    return current
  }

  const cancel = () => {
    session = null
  }

  const getSession = () => session

  return {
    start,
    update,
    commit,
    cancel,
    getSession,
  }
}

/**
 * Resolves rotated single-shape resize in local shape space so edge/corner drags stay stable.
 * @param shape Active transform-session shape snapshot.
 * @param handle Active resize handle kind.
 * @param pointer Current world-space pointer.
 */
function resizeRotatedSingleShape(
  shape: TransformSessionShape,
  handle: Exclude<TransformHandleKind, 'move' | 'rotate'>,
  pointer: TransformPoint,
): TransformPreviewShape | null {
  const halfWidth = Math.max(1, shape.width) / 2
  const halfHeight = Math.max(1, shape.height) / 2
  // Session shapes now carry inverse/matrix from the shared transform record,
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
function resolveShortestRotationDeltaDegrees(startAngle: number, nextAngle: number) {
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
function resolveRotationAfterReflection(rotation: number, reflectedAcrossSingleAxis: boolean) {
  if (!reflectedAcrossSingleAxis) {
    return rotation
  }

  return normalizeDegrees(-rotation)
}

function normalizeDegrees(value: number) {
  const normalized = value % 360
  return normalized < 0 ? normalized + 360 : normalized
}

/**
 * Resolves normalized shape transform record used by transform session math.
 * @param shape Shape-like input with optional rotation/flip metadata.
 */
function resolveShapeTransformRecord(shape: TransformShapeSource) {
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
function createMatrixFirstNodeTransform(shape: TransformPreviewShape): MatrixFirstNodeTransform {
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
