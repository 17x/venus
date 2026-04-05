import type {
  HandleKind,
  InteractionBounds,
  InteractionPoint,
  TransformPreview,
  TransformSession,
  TransformSessionShape,
} from '../types.ts'

export function createTransformSessionManager() {
  let session: TransformSession | null = null

  const start = (params: {
    shapeIds: string[]
    shapes: TransformSessionShape[]
    handle: HandleKind
    pointer: InteractionPoint
    startBounds: InteractionBounds
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

  const update = (pointer: InteractionPoint): TransformPreview | null => {
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
          }
        }),
      }
    }

    const minX = Math.min(next.minX, next.maxX)
    const maxX = Math.max(next.minX, next.maxX)
    const minY = Math.min(next.minY, next.maxY)
    const maxY = Math.max(next.minY, next.maxY)
    const sourceWidth = Math.max(1, base.maxX - base.minX)
    const sourceHeight = Math.max(1, base.maxY - base.minY)
    const targetWidth = Math.max(1, maxX - minX)
    const targetHeight = Math.max(1, maxY - minY)
    const scaleX = targetWidth / sourceWidth
    const scaleY = targetHeight / sourceHeight

    return {
      shapes: session.shapes.map((shape) => {
        const shapeMinX = shape.x
        const shapeMinY = shape.y
        const shapeMaxX = shape.x + shape.width
        const shapeMaxY = shape.y + shape.height

        const nextShapeMinX = minX + (shapeMinX - base.minX) * scaleX
        const nextShapeMaxX = minX + (shapeMaxX - base.minX) * scaleX
        const nextShapeMinY = minY + (shapeMinY - base.minY) * scaleY
        const nextShapeMaxY = minY + (shapeMaxY - base.minY) * scaleY

        return {
          shapeId: shape.shapeId,
          x: Math.min(nextShapeMinX, nextShapeMaxX),
          y: Math.min(nextShapeMinY, nextShapeMaxY),
          width: Math.max(1, Math.abs(nextShapeMaxX - nextShapeMinX)),
          height: Math.max(1, Math.abs(nextShapeMaxY - nextShapeMinY)),
          rotation: shape.rotation,
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
