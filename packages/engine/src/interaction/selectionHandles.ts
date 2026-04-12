export type EngineSelectionHandleKind =
  | 'nw'
  | 'n'
  | 'ne'
  | 'e'
  | 'se'
  | 's'
  | 'sw'
  | 'w'
  | 'rotate'

export interface EngineSelectionHandleBounds {
  minX: number
  minY: number
  maxX: number
  maxY: number
}

export interface EngineSelectionHandlePoint {
  x: number
  y: number
}

export interface EngineSelectionHandle extends EngineSelectionHandlePoint {
  id: string
  kind: EngineSelectionHandleKind
}

const DEFAULT_ROTATE_OFFSET = 28

export function buildEngineSelectionHandlesFromBounds(
  bounds: EngineSelectionHandleBounds,
  options?: {
    rotateDegrees?: number
    rotateOffset?: number
  },
): EngineSelectionHandle[] {
  const centerX = (bounds.minX + bounds.maxX) / 2
  const centerY = (bounds.minY + bounds.maxY) / 2
  const rotateOffset = options?.rotateOffset ?? DEFAULT_ROTATE_OFFSET
  const handles: EngineSelectionHandle[] = [
    createHandle('nw', bounds.minX, bounds.minY),
    createHandle('n', centerX, bounds.minY),
    createHandle('ne', bounds.maxX, bounds.minY),
    createHandle('e', bounds.maxX, centerY),
    createHandle('se', bounds.maxX, bounds.maxY),
    createHandle('s', centerX, bounds.maxY),
    createHandle('sw', bounds.minX, bounds.maxY),
    createHandle('w', bounds.minX, centerY),
    createHandle('rotate', centerX, bounds.minY - rotateOffset),
  ]
  const rotateDegrees = options?.rotateDegrees ?? 0
  if (Math.abs(rotateDegrees) <= 0.0001) {
    return handles
  }

  return handles.map((handle) => rotatePointAroundCenter(
    handle,
    {x: centerX, y: centerY},
    rotateDegrees,
  ))
}

export function pickEngineSelectionHandleAtPoint<T extends EngineSelectionHandlePoint>(
  point: EngineSelectionHandlePoint,
  handles: T[],
  tolerance: number,
): T | null {
  for (const handle of handles) {
    if (Math.hypot(handle.x - point.x, handle.y - point.y) <= tolerance) {
      return handle
    }
  }

  return null
}

function createHandle(
  kind: EngineSelectionHandleKind,
  x: number,
  y: number,
): EngineSelectionHandle {
  return {
    id: `handle:${kind}`,
    kind,
    x,
    y,
  }
}

function rotatePointAroundCenter<TPoint extends EngineSelectionHandlePoint>(
  point: TPoint,
  center: {x: number; y: number},
  degrees: number,
): TPoint {
  const radians = (degrees * Math.PI) / 180
  const cos = Math.cos(radians)
  const sin = Math.sin(radians)
  const localX = point.x - center.x
  const localY = point.y - center.y
  return {
    ...point,
    x: center.x + localX * cos - localY * sin,
    y: center.y + localX * sin + localY * cos,
  }
}
