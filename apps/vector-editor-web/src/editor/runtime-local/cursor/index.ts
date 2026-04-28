import type {RuntimeEditingMode} from '../editing-modes/index.ts'
import {resizeDirectionToCssCursor} from '@venus/editor-primitive'

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

/**
 * Resolves the effective runtime cursor for vector editor pointer interactions.
 */
export function resolveRuntimeCursor(options: ResolveRuntimeCursorOptions): RuntimeCursorState {
  // Panning mode always wins so drag affordance stays explicit.
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

/**
 * Resolves rotated resize-handle cursor token through shared primitive mapping.
 */
function resolveRotatedHandleCursor(
  handle: Exclude<RuntimeCursorHandleKind, 'move' | 'rotate'>,
  rotationDegrees: number,
) {
  // Delegate resize cursor rotation mapping to the shared primitive helper.
  return resizeDirectionToCssCursor(handle, rotationDegrees)
}