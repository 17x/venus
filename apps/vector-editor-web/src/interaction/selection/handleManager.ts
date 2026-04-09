import {buildSelectionHandlesFromBounds} from '@venus/canvas-base'
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

  return buildSelectionHandlesFromBounds(selection.selectedBounds, {
    rotateOffset: options?.rotateOffset ?? DEFAULT_ROTATE_OFFSET,
    rotateDegrees: options?.rotateDegrees ?? 0,
  })
}
