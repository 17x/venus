import type {InteractionHandle, SelectionState} from '../types.ts'

const DEFAULT_ROTATE_OFFSET = 28

export function buildSelectionHandles(
  selection: SelectionState,
  options?: {
    rotateOffset?: number
    rotateDegrees?: number
  },
): InteractionHandle[] {
  if (!selection.selectedBounds) {
    return []
  }

  const {minX, minY, maxX, maxY} = selection.selectedBounds
  const centerX = (minX + maxX) / 2
  const centerY = (minY + maxY) / 2
  const rotateOffset = options?.rotateOffset ?? DEFAULT_ROTATE_OFFSET

  const handles: InteractionHandle[] = [
    createHandle('nw', minX, minY),
    createHandle('n', centerX, minY),
    createHandle('ne', maxX, minY),
    createHandle('e', maxX, centerY),
    createHandle('se', maxX, maxY),
    createHandle('s', centerX, maxY),
    createHandle('sw', minX, maxY),
    createHandle('w', minX, centerY),
    createHandle('rotate', centerX, minY - rotateOffset),
  ]

  const rotateDegrees = options?.rotateDegrees ?? 0
  if (Math.abs(rotateDegrees) <= 0.0001) {
    return handles
  }

  return handles.map((handle) => ({
    ...handle,
    ...rotatePointAround(handle.x, handle.y, centerX, centerY, rotateDegrees),
  }))
}

function createHandle(
  kind: InteractionHandle['kind'],
  x: number,
  y: number,
): InteractionHandle {
  return {
    id: `handle:${kind}`,
    kind,
    x,
    y,
  }
}

function rotatePointAround(
  x: number,
  y: number,
  centerX: number,
  centerY: number,
  rotateDegrees: number,
) {
  const angle = (rotateDegrees * Math.PI) / 180
  const cos = Math.cos(angle)
  const sin = Math.sin(angle)
  const dx = x - centerX
  const dy = y - centerY

  return {
    x: centerX + dx * cos - dy * sin,
    y: centerY + dx * sin + dy * cos,
  }
}
