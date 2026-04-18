import type {EditorDocument} from '@venus/document-core'

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