import {
  applyAffineMatrixToPoint,
  createAffineMatrixAroundPoint,
} from '@venus/document-core'

export type SelectionHandleKind =
  | 'nw'
  | 'n'
  | 'ne'
  | 'e'
  | 'se'
  | 's'
  | 'sw'
  | 'w'
  | 'rotate'

export interface SelectionHandleBounds {
  minX: number
  minY: number
  maxX: number
  maxY: number
}

export interface SelectionHandlePoint {
  x: number
  y: number
}

export interface SelectionHandle extends SelectionHandlePoint {
  id: string
  kind: SelectionHandleKind
}

const DEFAULT_ROTATE_OFFSET = 28

/**
 * Build resize + rotate handles around selection bounds and project them
 * through optional single-selection rotation.
 */
export function buildSelectionHandlesFromBounds(
  bounds: SelectionHandleBounds,
  options?: {
    rotateDegrees?: number
    rotateOffset?: number
  },
): SelectionHandle[] {
  const centerX = (bounds.minX + bounds.maxX) / 2
  const centerY = (bounds.minY + bounds.maxY) / 2
  const rotateOffset = options?.rotateOffset ?? DEFAULT_ROTATE_OFFSET
  const handles: SelectionHandle[] = [
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

  const matrix = createAffineMatrixAroundPoint(
    {x: centerX, y: centerY},
    {rotationDegrees: rotateDegrees},
  )

  return handles.map((handle) => ({
    ...handle,
    ...applyAffineMatrixToPoint(matrix, handle),
  }))
}

/**
 * Pick the nearest selection handle by Euclidean distance threshold.
 */
export function pickSelectionHandleAtPoint<T extends SelectionHandlePoint>(
  point: SelectionHandlePoint,
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
  kind: SelectionHandleKind,
  x: number,
  y: number,
): SelectionHandle {
  return {
    id: `handle:${kind}`,
    kind,
    x,
    y,
  }
}
