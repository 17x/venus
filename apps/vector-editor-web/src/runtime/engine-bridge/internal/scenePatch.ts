import {type EditorDocument} from '../../model/index.ts'
import {
  getBoundingRectFromBezierPoints,
  resolveEngineTransformedBoundsFromBox,
} from '@venus/engine'

// Merge node bounds and document-shape bounds into one invalidation region.
export function resolveMergedNodeBounds(input: {
  nodes: ReadonlyArray<object>
  currentDocument?: EditorDocument | null
  previousDocument?: EditorDocument | null
  changedIds?: readonly string[]
}) {
  let minX = Number.POSITIVE_INFINITY
  let minY = Number.POSITIVE_INFINITY
  let maxX = Number.NEGATIVE_INFINITY
  let maxY = Number.NEGATIVE_INFINITY

  const includeBounds = (bounds: {
    x?: unknown
    y?: unknown
    width?: unknown
    height?: unknown
  }) => {
    const x = typeof bounds.x === 'number' ? bounds.x : null
    const y = typeof bounds.y === 'number' ? bounds.y : null
    const width = typeof bounds.width === 'number' ? bounds.width : null
    const height = typeof bounds.height === 'number' ? bounds.height : null
    if (x === null || y === null || width === null || height === null) {
      return
    }

    minX = Math.min(minX, x)
    minY = Math.min(minY, y)
    maxX = Math.max(maxX, x + width)
    maxY = Math.max(maxY, y + height)
  }
  const includeDocumentShapeBounds = (shape: EditorDocument['shapes'][number]) => {
    const bounds = resolveDocumentShapeWorldBounds(shape)
    includeBounds({
      x: bounds.minX,
      y: bounds.minY,
      width: bounds.maxX - bounds.minX,
      height: bounds.maxY - bounds.minY,
    })
  }

  for (const node of input.nodes) {
    const boundsNode = node as {
      x?: unknown
      y?: unknown
      width?: unknown
      height?: unknown
    }
    includeBounds(boundsNode)
  }

  const changedIdSet = input.changedIds ? new Set(input.changedIds) : null
  if (changedIdSet && input.currentDocument) {
    for (const shape of input.currentDocument.shapes) {
      if (changedIdSet.has(shape.id)) {
        includeDocumentShapeBounds(shape)
      }
    }
  }

  if (changedIdSet && input.previousDocument) {
    for (const shape of input.previousDocument.shapes) {
      if (changedIdSet.has(shape.id)) {
        includeDocumentShapeBounds(shape)
      }
    }
  }

  if (!Number.isFinite(minX) || !Number.isFinite(minY) || !Number.isFinite(maxX) || !Number.isFinite(maxY)) {
    return null
  }

  return {
    x: minX,
    y: minY,
    width: Math.max(1, maxX - minX),
    height: Math.max(1, maxY - minY),
  }
}

function resolveDocumentShapeWorldBounds(shape: EditorDocument['shapes'][number]) {
  const sourceBounds = resolveDocumentShapeSourceBounds(shape)
  const transformed = resolveEngineTransformedBoundsFromBox({
    x: sourceBounds.x,
    y: sourceBounds.y,
    width: sourceBounds.width,
    height: sourceBounds.height,
    rotation: shape.rotation ?? 0,
  })
  return {
    minX: transformed.minX,
    minY: transformed.minY,
    maxX: transformed.maxX,
    maxY: transformed.maxY,
  }
}

function resolveDocumentShapeSourceBounds(shape: EditorDocument['shapes'][number]) {
  if (shape.type === 'path' && shape.bezierPoints && shape.bezierPoints.length > 0) {
    return getBoundingRectFromBezierPoints(shape.bezierPoints)
  }

  if (
    (shape.type === 'polygon' || shape.type === 'star' || shape.type === 'lineSegment' || shape.type === 'path') &&
    shape.points &&
    shape.points.length > 0
  ) {
    const xs = shape.points.map((point) => point.x)
    const ys = shape.points.map((point) => point.y)
    const minX = Math.min(...xs)
    const minY = Math.min(...ys)
    const maxX = Math.max(...xs)
    const maxY = Math.max(...ys)
    return {
      x: minX,
      y: minY,
      width: Math.max(1, maxX - minX),
      height: Math.max(1, maxY - minY),
    }
  }

  return {
    x: shape.x,
    y: shape.y,
    width: shape.width,
    height: shape.height,
  }
}

// Expand changed ids to keep hierarchy and clip dependencies coherent.
export function resolveExpandedChangedIds(
  changedIds: readonly string[],
  document: EditorDocument,
) {
  if (changedIds.length === 0) {
    return []
  }

  const changedIdSet = new Set(changedIds)
  const expanded = new Set(changedIds)
  const shapeById = new Map(document.shapes.map((shape) => [shape.id, shape]))
  const childrenByParentId = new Map<string, string[]>()

  for (const shape of document.shapes) {
    if (!shape.parentId) {
      continue
    }

    const siblings = childrenByParentId.get(shape.parentId)
    if (siblings) {
      siblings.push(shape.id)
      continue
    }

    childrenByParentId.set(shape.parentId, [shape.id])
  }

  // Keep incremental patch ids closed over hierarchy so grouped edits do not
  // emit only container/group nodes and accidentally drop visible descendants.
  const includeDescendants = (parentId: string) => {
    const queue = [...(childrenByParentId.get(parentId) ?? [])]
    while (queue.length > 0) {
      const childId = queue.shift()
      if (!childId) {
        continue
      }

      if (!expanded.has(childId)) {
        expanded.add(childId)
      }

      const grandChildren = childrenByParentId.get(childId)
      if (grandChildren && grandChildren.length > 0) {
        queue.push(...grandChildren)
      }
    }
  }

  // Also keep ancestor groups in the patch set so parent bounds and hierarchy
  // metadata remain synchronized when only child geometry changes.
  const includeAncestors = (shapeId: string) => {
    let parentId = shapeById.get(shapeId)?.parentId ?? null
    while (parentId) {
      if (expanded.has(parentId)) {
        break
      }

      expanded.add(parentId)
      parentId = shapeById.get(parentId)?.parentId ?? null
    }
  }

  for (const shapeId of changedIds) {
    includeDescendants(shapeId)
    includeAncestors(shapeId)
  }

  // If a clip source changed, clipped images also need refresh.
  // If a clipped image changed, keep its clip source in the patch set too.
  for (const shape of document.shapes) {
    if (!shape.clipPathId) {
      continue
    }

    if (changedIdSet.has(shape.clipPathId)) {
      expanded.add(shape.id)
    }
    if (changedIdSet.has(shape.id)) {
      expanded.add(shape.clipPathId)
    }
  }

  for (const shapeId of Array.from(expanded)) {
    includeDescendants(shapeId)
    includeAncestors(shapeId)
  }

  return Array.from(expanded)
}
