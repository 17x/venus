import type {EditorDocument} from '@venus/document-core'
import type {SceneShapeSnapshot} from '@venus/shared-memory'
import type {InteractionBounds, SelectionState} from '../types.ts'

export function buildSelectionState(
  document: EditorDocument,
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
    .map((id) => document.shapes.find((shape) => shape.id === id))
    .filter((shape): shape is NonNullable<typeof shape> => Boolean(shape))
    .map((shape) => getNormalizedBounds(shape.x, shape.y, shape.width, shape.height))
    .reduce<InteractionBounds | null>(
      (acc, bounds) => (acc ? mergeBounds(acc, bounds) : bounds),
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

function getNormalizedBounds(x: number, y: number, width: number, height: number): InteractionBounds {
  return {
    minX: Math.min(x, x + width),
    minY: Math.min(y, y + height),
    maxX: Math.max(x, x + width),
    maxY: Math.max(y, y + height),
  }
}
