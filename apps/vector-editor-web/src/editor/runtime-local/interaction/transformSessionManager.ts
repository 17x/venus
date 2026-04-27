import {
  applyAffineMatrixToPoint,
  type AffineMatrix,
  createAffineMatrixAroundPoint,
  createMatrixFirstNodeTransform,
  type NormalizedBounds,
  resolveShapeTransformRecord,
  type ShapeTransformBatchCommand,
  type ShapeTransformBatchItem,
} from '@venus/engine'

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
export type {ShapeTransformBatchCommand}

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
      const delta = nextAngle - startAngle
      const deltaDegrees = (delta * 180) / Math.PI

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
          rotation: reflectedAcrossSingleAxis
            ? normalizeDegrees(-shape.rotation)
            : shape.rotation,
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
    rotation: shape.rotation,
    flipX: crossedX ? !shape.flipX : !!shape.flipX,
    flipY: crossedY ? !shape.flipY : !!shape.flipY,
  }
}

function normalizeDegrees(value: number) {
  const normalized = value % 360
  return normalized < 0 ? normalized + 360 : normalized
}
