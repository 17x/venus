import {type EditorDocument} from '@vector/model'

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
        includeBounds(shape)
      }
    }
  }

  if (changedIdSet && input.previousDocument) {
    for (const shape of input.previousDocument.shapes) {
      if (changedIdSet.has(shape.id)) {
        includeBounds(shape)
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

  return Array.from(expanded)
}
