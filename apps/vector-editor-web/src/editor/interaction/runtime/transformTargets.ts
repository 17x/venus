import type {DocumentNode, EditorDocument} from '@vector/model'

/**
 * Resolve leaf shape targets for resize handles from a mixed single/multi/group
 * selection. Group selections expand to non-group descendants, while direct
 * child duplicates under selected parents are skipped.
 */
export function collectResizeTransformTargets(
  selectedNodes: DocumentNode[],
  document: EditorDocument,
) {
  const shapeById = new Map(document.shapes.map((shape) => [shape.id, shape]))
  const childrenByParent = new Map<string, DocumentNode[]>()

  document.shapes.forEach((shape) => {
    if (!shape.parentId) {
      return
    }
    const siblings = childrenByParent.get(shape.parentId) ?? []
    siblings.push(shape)
    childrenByParent.set(shape.parentId, siblings)
  })

  const targets = new Map<string, DocumentNode>()
  const selectedIds = new Set(selectedNodes.map((shape) => shape.id))

  const collectLeafDescendants = (shapeId: string) => {
    const queue = [...(childrenByParent.get(shapeId) ?? [])]
    while (queue.length > 0) {
      const current = queue.shift()
      if (!current) {
        continue
      }
      if (current.type === 'group') {
        queue.push(...(childrenByParent.get(current.id) ?? []))
        continue
      }
      targets.set(current.id, current)
    }
  }

  selectedNodes.forEach((shape) => {
    if (shape.type === 'group') {
      collectLeafDescendants(shape.id)
      return
    }
    if (hasSelectedAncestor(shape, selectedIds, shapeById)) {
      return
    }
    targets.set(shape.id, shapeById.get(shape.id) ?? shape)
  })

  return Array.from(targets.values())
}

function hasSelectedAncestor(
  shape: DocumentNode,
  selectedIds: Set<string>,
  shapeById: Map<string, DocumentNode>,
) {
  let currentParentId: string | null | undefined = shape.parentId
  while (currentParentId) {
    if (selectedIds.has(currentParentId)) {
      return true
    }
    const parent = shapeById.get(currentParentId)
    currentParentId = parent?.parentId
  }

  return false
}