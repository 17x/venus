import type {CursorIntent} from './CursorIntent.ts'
import {resizeDirectionToCssCursor} from './resizeCursor.ts'

/**
 * Resolves CSS cursor string from high-level cursor intent payload.
 */
export function cursorIntentToCss(intent: CursorIntent): string {
  if (intent.type === 'custom') {
    return intent.css
  }

  if (intent.type === 'resize') {
    return resizeDirectionToCssCursor(intent.direction, intent.rotation ?? 0)
  }

  if (intent.type === 'rotate') {
    // Keep rotate cursors neutral so products can override with custom assets later.
    return 'crosshair'
  }

  return intent.type
}

