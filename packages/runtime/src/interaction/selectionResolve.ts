import type {DocumentNode} from '@venus/document-core'

export function resolveSelectedNodesByIds(
  shapeById: Map<string, DocumentNode>,
  selectedIds: string[],
) {
  return selectedIds
    .map((id) => shapeById.get(id))
    .filter((shape): shape is DocumentNode => Boolean(shape))
}

export function resolveSingleSelectedRotation(selectedNodes: DocumentNode[]) {
  return selectedNodes.length === 1 ? (selectedNodes[0].rotation ?? 0) : 0
}
