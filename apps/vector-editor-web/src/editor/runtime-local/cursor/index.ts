import type {RuntimeEditingMode} from '../editing-modes/index.ts'

export type RuntimeCursorHandleKind =
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

export type RuntimeCursorIntent =
  | 'tool'
  | 'transform-handle'
  | 'path-anchor'
  | 'path-segment'
  | 'path-handle'
  | 'mode'

export interface RuntimeCursorState {
  readonly cursor: string
  readonly intent: RuntimeCursorIntent
}

export interface ResolveRuntimeCursorOptions {
  toolCursor?: string
  editingMode?: RuntimeEditingMode | null
  activeHandle?: RuntimeCursorHandleKind | null
  rotationDegrees?: number
  pathHitType?: 'anchorPoint' | 'segment' | 'inHandle' | 'outHandle' | null
}

const HANDLE_CURSOR_ORDER = ['n', 'ne', 'e', 'se', 's', 'sw', 'w', 'nw'] as const
const HANDLE_CURSOR_BY_KIND: Record<(typeof HANDLE_CURSOR_ORDER)[number], string> = {
  n: 'ns-resize',
  ne: 'nesw-resize',
  e: 'ew-resize',
  se: 'nwse-resize',
  s: 'ns-resize',
  sw: 'nesw-resize',
  w: 'ew-resize',
  nw: 'nwse-resize',
}

export function resolveRuntimeCursor(options: ResolveRuntimeCursorOptions): RuntimeCursorState {
  if (options.editingMode === 'panning') {
    return {cursor: 'grabbing', intent: 'mode'}
  }

  if (options.pathHitType === 'anchorPoint') {
    return {cursor: 'crosshair', intent: 'path-anchor'}
  }

  if (options.pathHitType === 'segment') {
    return {cursor: 'copy', intent: 'path-segment'}
  }

  if (options.pathHitType === 'inHandle' || options.pathHitType === 'outHandle') {
    return {cursor: 'alias', intent: 'path-handle'}
  }

  if (options.activeHandle === 'move') {
    return {cursor: 'move', intent: 'transform-handle'}
  }

  if (options.activeHandle === 'rotate') {
    return {cursor: 'crosshair', intent: 'transform-handle'}
  }

  if (options.activeHandle) {
    return {
      cursor: resolveRotatedHandleCursor(options.activeHandle, options.rotationDegrees ?? 0),
      intent: 'transform-handle',
    }
  }

  return {
    cursor: options.toolCursor ?? 'default',
    intent: options.toolCursor ? 'tool' : 'mode',
  }
}

function resolveRotatedHandleCursor(
  handle: Exclude<RuntimeCursorHandleKind, 'move' | 'rotate'>,
  rotationDegrees: number,
) {
  const baseIndex = HANDLE_CURSOR_ORDER.indexOf(handle)
  const rotationSteps = Math.round(normalizeDegrees(rotationDegrees) / 45) % HANDLE_CURSOR_ORDER.length
  const rotatedHandle = HANDLE_CURSOR_ORDER[(baseIndex + rotationSteps) % HANDLE_CURSOR_ORDER.length]
  return HANDLE_CURSOR_BY_KIND[rotatedHandle]
}

function normalizeDegrees(degrees: number) {
  const normalized = degrees % 360
  return normalized < 0 ? normalized + 360 : normalized
}