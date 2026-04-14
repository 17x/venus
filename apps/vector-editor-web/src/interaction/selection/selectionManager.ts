import {getNormalizedBoundsFromBox} from '@venus/runtime/engine'
import type {EditorDocument} from '@venus/document-core'
import type {SceneShapeSnapshot} from '@venus/runtime/shared-memory'
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
    .map((id) => resolveShapeBounds(id, _document, snapshots))
    .filter((shapeBounds): shapeBounds is InteractionBounds => Boolean(shapeBounds))
    .reduce<InteractionBounds | null>(
      (acc, shapeBounds) => (acc ? mergeBounds(acc, shapeBounds) : {
        minX: shapeBounds.minX,
        minY: shapeBounds.minY,
        maxX: shapeBounds.maxX,
        maxY: shapeBounds.maxY,
      }),
      null,
    )

  return {
    selectedIds,
    hoverId,
    selectedBounds,
  }
}

function resolveShapeBounds(
  id: string,
  document: EditorDocument,
  snapshots: SceneShapeSnapshot[],
): InteractionBounds | null {
  const node = document.shapes.find((shape) => shape.id === id)
  if (node) {
    if (node.type === 'image' && node.clipPathId) {
      const clipNode = document.shapes.find((shape) => shape.id === node.clipPathId)
      if (clipNode) {
        if ((clipNode.type === 'polygon' || clipNode.type === 'star' || clipNode.type === 'lineSegment' || clipNode.type === 'path') && clipNode.points && clipNode.points.length > 0) {
          return boundsFromPoints(clipNode.points)
        }
        return getNormalizedBoundsFromBox(clipNode.x, clipNode.y, clipNode.width, clipNode.height)
      }
    }

    if ((node.type === 'polygon' || node.type === 'star' || node.type === 'lineSegment' || node.type === 'path') && node.points && node.points.length > 0) {
      return boundsFromPoints(node.points)
    }

    if (node.type === 'path' && node.bezierPoints && node.bezierPoints.length > 0) {
      const bezierPoints = node.bezierPoints.flatMap((point) => [
        point.anchor,
        point.cp1,
        point.cp2,
      ]).filter((point): point is {x: number; y: number} => Boolean(point))

      if (bezierPoints.length > 0) {
        return boundsFromPoints(bezierPoints)
      }
    }

    return getNormalizedBoundsFromBox(node.x, node.y, node.width, node.height)
  }

  const snapshot = snapshots.find((shape) => shape.id === id)
  if (!snapshot) {
    return null
  }

  return getNormalizedBoundsFromBox(snapshot.x, snapshot.y, snapshot.width, snapshot.height)
}

function boundsFromPoints(points: Array<{x: number; y: number}>): InteractionBounds {
  const first = points[0]

  return points.slice(1).reduce<InteractionBounds>(
    (acc, point) => ({
      minX: Math.min(acc.minX, point.x),
      minY: Math.min(acc.minY, point.y),
      maxX: Math.max(acc.maxX, point.x),
      maxY: Math.max(acc.maxY, point.y),
    }),
    {
      minX: first.x,
      minY: first.y,
      maxX: first.x,
      maxY: first.y,
    },
  )
}

function mergeBounds(left: InteractionBounds, right: InteractionBounds): InteractionBounds {
  return {
    minX: Math.min(left.minX, right.minX),
    minY: Math.min(left.minY, right.minY),
    maxX: Math.max(left.maxX, right.maxX),
    maxY: Math.max(left.maxY, right.maxY),
  }
}
