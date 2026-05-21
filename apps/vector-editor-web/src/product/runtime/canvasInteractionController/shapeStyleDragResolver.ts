import type {ControlDragBehavior} from '@venus/editor-primitive'
import type {ShapeStyleHandleDrag} from '../shapeStyleHandles.ts'

/**
 * Declares payload contract for rect-radius drag behavior emitted by overlay controls.
 */
interface RectRadiusDragPayload {
  /** Stores owning shape id. */
  shapeId: string
  /** Stores rect corner token. */
  corner: 'topLeft' | 'topRight' | 'bottomRight' | 'bottomLeft'
}

/**
 * Declares payload contract for ellipse arc-angle drag behavior emitted by overlay controls.
 */
interface ArcAngleDragPayload {
  /** Stores owning shape id. */
  shapeId: string
  /** Stores edited arc boundary token. */
  boundary: 'start' | 'end'
}

/**
 * Resolves shape-style drag payload from editor-primitive drag behavior.
 * @param dragBehavior Drag behavior emitted by overlay-control hit resolution.
 * @param point Current pointer world point to persist into style-drag session state.
 */
export function resolveShapeStyleDragFromBehavior(
  dragBehavior: ControlDragBehavior<unknown> | undefined,
  point: {x: number; y: number},
): ShapeStyleHandleDrag | null {
  if (!dragBehavior) {
    return null
  }

  const payload = dragBehavior.payload
  if (!payload || typeof payload !== 'object') {
    return null
  }

  if (dragBehavior.kind === 'rect-radius') {
    const rectPayload = payload as Partial<RectRadiusDragPayload>
    if (
      typeof rectPayload.shapeId !== 'string' ||
      !isRectCorner(rectPayload.corner)
    ) {
      return null
    }
    return {
      kind: 'rect-radius',
      payload: {
        shapeId: rectPayload.shapeId,
        corner: rectPayload.corner,
        point,
      },
    }
  }

  if (dragBehavior.kind === 'arc-angle') {
    const arcPayload = payload as Partial<ArcAngleDragPayload>
    if (
      typeof arcPayload.shapeId !== 'string' ||
      !isArcBoundary(arcPayload.boundary)
    ) {
      return null
    }
    return {
      kind: 'ellipse-arc',
      payload: {
        shapeId: arcPayload.shapeId,
        boundary: arcPayload.boundary,
        point,
      },
    }
  }

  return null
}

/**
 * Resolves whether value is one supported rectangle corner token.
 * @param value Raw payload corner value.
 */
function isRectCorner(value: unknown): value is RectRadiusDragPayload['corner'] {
  return value === 'topLeft' || value === 'topRight' || value === 'bottomRight' || value === 'bottomLeft'
}

/**
 * Resolves whether value is one supported ellipse arc-boundary token.
 * @param value Raw payload boundary value.
 */
function isArcBoundary(value: unknown): value is ArcAngleDragPayload['boundary'] {
  return value === 'start' || value === 'end'
}