import {getNormalizedBoundsFromBox} from '../../engine-bridge/engine.ts'
import {getBoundingRectFromBezierPoints} from '../../model/index.ts'
import type {EditorDocument} from '../../model/index.ts'
import type {SceneShapeSnapshot} from '../../shared-memory/index.ts'
import {resolveMaskSourceNode} from '../maskGroup.ts'
import {resolveMaskSelectionPresentationIds} from '../maskGroup.ts'
import type {InteractionBounds, SelectionState} from '../productInteractionTypes.ts'

export function buildSelectionState(
  _document: EditorDocument,
  snapshots: SceneShapeSnapshot[],
): SelectionState {
  const selectedIds = resolveMaskSelectionPresentationIds(
    _document,
    snapshots.filter((shape) => shape.isSelected).map((shape) => shape.id),
  )
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
    const clipNode = resolveMaskSourceNode(document, node)
    if (clipNode && (node.type === 'image' || node.schema?.maskRole === 'host')) {
      if (clipNode.type === 'path' && clipNode.bezierPoints && clipNode.bezierPoints.length > 0) {
        const bezierBounds = getBoundingRectFromBezierPoints(clipNode.bezierPoints)
        return getNormalizedBoundsFromBox(
          bezierBounds.x,
          bezierBounds.y,
          bezierBounds.width,
          bezierBounds.height,
        )
      }

      if ((clipNode.type === 'polygon' || clipNode.type === 'star' || clipNode.type === 'lineSegment' || clipNode.type === 'path') && clipNode.points && clipNode.points.length > 0) {
        return boundsFromPoints(clipNode.points)
      }

      return getNormalizedBoundsFromBox(clipNode.x, clipNode.y, clipNode.width, clipNode.height)
    }

    if (node.type === 'path' && node.bezierPoints && node.bezierPoints.length > 0) {
      const bezierBounds = getBoundingRectFromBezierPoints(node.bezierPoints)
      return getNormalizedBoundsFromBox(
        bezierBounds.x,
        bezierBounds.y,
        bezierBounds.width,
        bezierBounds.height,
      )
    }

    if ((node.type === 'polygon' || node.type === 'star' || node.type === 'lineSegment' || node.type === 'path') && node.points && node.points.length > 0) {
      return boundsFromPoints(node.points)
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
