import type {EditorDocument} from '../model/index.ts'

export function hasSelectedAncestorInDocument(
  shapeById: Map<string, EditorDocument['shapes'][number]>,
  shapeId: string,
  selectedIds: Set<string>,
) {
  let current = shapeById.get(shapeId)
  while (current?.parentId) {
    if (selectedIds.has(current.parentId)) {
      return true
    }
    current = shapeById.get(current.parentId)
  }
  return false
}

/** Collapses selected descendants to their outermost selected/present group. */
export function resolveOuterSelectionPresentationIds(
  document: EditorDocument,
  selectedShapeIds: readonly string[],
): string[] {
  const shapeById = new Map(document.shapes.map((shape) => [shape.id, shape]))
  const resolved: string[] = []
  const emitted = new Set<string>()
  for (const selectedId of selectedShapeIds) {
    let presentationId = selectedId
    let parentId = shapeById.get(selectedId)?.parentId ?? null
    while (parentId) {
      const parent = shapeById.get(parentId)
      if (!parent) {
        break
      }
      if (parent.type === 'group') {
        presentationId = parent.id
      }
      parentId = parent.parentId ?? null
    }
    if (!emitted.has(presentationId)) {
      emitted.add(presentationId)
      resolved.push(presentationId)
    }
  }
  return resolved
}
