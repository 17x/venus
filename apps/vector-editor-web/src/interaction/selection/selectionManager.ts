import {getNormalizedBoundsFromBox} from '@venus/runtime/engine'
import type {EditorDocument} from '@venus/document-core'
import type {SceneShapeSnapshot} from '@venus/shared-memory'
import type {InteractionBounds, SelectionState} from '../types.ts'

export function buildSelectionState(
  _document: EditorDocument,
  snapshots: SceneShapeSnapshot[],
): SelectionState {
  const selectedIds = snapshots.filter((shape) => shape.isSelected).map((shape) => shape.id)
  const hoverId = snapshots.find((shape) => shape.isHovered)?.id ?? null

  if (selectedIds.length === 0) {
    return {
      selectedIds,
      hoverId,
      selectedBounds: null,
    }
  }

  const selectedBounds = selectedIds
    .map((id) => snapshots.find((shape) => shape.id === id))
    .filter((shape): shape is NonNullable<typeof shape> => Boolean(shape))
    .map((shape) => getNormalizedBoundsFromBox(shape.x, shape.y, shape.width, shape.height))
    .reduce<InteractionBounds | null>(
      (acc, bounds) => (acc ? mergeBounds(acc, bounds) : {
        minX: bounds.minX,
        minY: bounds.minY,
        maxX: bounds.maxX,
        maxY: bounds.maxY,
      }),
      null,
    )

  return {
    selectedIds,
    hoverId,
    selectedBounds,
  }
}

function mergeBounds(left: InteractionBounds, right: InteractionBounds): InteractionBounds {
  return {
    minX: Math.min(left.minX, right.minX),
    minY: Math.min(left.minY, right.minY),
    maxX: Math.max(left.maxX, right.maxX),
    maxY: Math.max(left.maxY, right.maxY),
  }
}
