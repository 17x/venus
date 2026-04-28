import type {ResizeDirection} from './CursorIntent.ts'

const RESIZE_ORDER: readonly ResizeDirection[] = ['n', 'ne', 'e', 'se', 's', 'sw', 'w', 'nw'] as const
const RESIZE_CURSOR_BY_DIRECTION: Record<ResizeDirection, string> = {
  n: 'ns-resize',
  ne: 'nesw-resize',
  e: 'ew-resize',
  se: 'nwse-resize',
  s: 'ns-resize',
  sw: 'nesw-resize',
  w: 'ew-resize',
  nw: 'nwse-resize',
}

/**
 * Normalizes angles into [0, 360) interval for deterministic cursor rotation mapping.
 */
export function normalizeAngle(angle: number): number {
  const normalized = angle % 360
  return normalized < 0 ? normalized + 360 : normalized
}

/**
 * Resolves CSS cursor token for resize direction at a given rotation.
 */
export function resizeDirectionToCssCursor(
  direction: ResizeDirection,
  rotation: number = 0,
): string {
  const directionIndex = RESIZE_ORDER.indexOf(direction)
  const rotationSteps = Math.round(normalizeAngle(rotation) / 45) % RESIZE_ORDER.length
  const rotatedDirection = RESIZE_ORDER[(directionIndex + rotationSteps) % RESIZE_ORDER.length]
  return RESIZE_CURSOR_BY_DIRECTION[rotatedDirection]
}

