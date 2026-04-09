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
  centerX: number
  centerY: number
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

export interface TransformSession {
  shapeIds: string[]
  shapes: TransformSessionShape[]
  handle: TransformHandleKind
  start: TransformPoint
  current: TransformPoint
  startBounds: TransformBounds
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
          const rotated = rotatePointAround(shape.centerX, shape.centerY, center.x, center.y, delta)
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
        const shapeMinX = shape.x
        const shapeMinY = shape.y
        const shapeMaxX = shape.x + shape.width
        const shapeMaxY = shape.y + shape.height

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
  const localPointer = rotatePointAround(
    pointer.x,
    pointer.y,
    shape.centerX,
    shape.centerY,
    (-shape.rotation * Math.PI) / 180,
  )
  const localPointerOffset = {
    x: localPointer.x - shape.centerX,
    y: localPointer.y - shape.centerY,
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
  const worldCenter = rotatePointAround(
    shape.centerX + localCenter.x,
    shape.centerY + localCenter.y,
    shape.centerX,
    shape.centerY,
    (shape.rotation * Math.PI) / 180,
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

function rotatePointAround(
  x: number,
  y: number,
  centerX: number,
  centerY: number,
  angleRad: number,
) {
  const dx = x - centerX
  const dy = y - centerY
  const cos = Math.cos(angleRad)
  const sin = Math.sin(angleRad)

  return {
    x: centerX + dx * cos - dy * sin,
    y: centerY + dx * sin + dy * cos,
  }
}
