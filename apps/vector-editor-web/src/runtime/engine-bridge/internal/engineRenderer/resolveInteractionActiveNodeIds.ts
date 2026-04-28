import {type RuntimeRenderPhase} from '../engineTypes.ts'

/**
 * Resolves editing-scope active ids so active layer can isolate live edits.
 * @param input Editing state payload used to resolve active ids.
 */
export function resolveInteractionActiveNodeIds(input: {
  interactionPhase: RuntimeRenderPhase
  allShapeIds: readonly string[]
  protectedNodeIds: readonly string[]
  changedNodeIds?: readonly string[]
}): string[] {
  if (input.interactionPhase !== 'drag' && input.interactionPhase !== 'precision') {
    return []
  }

  // Route drag/precision frames entirely through active layer so transform
  // feedback stays immediate without waiting on incremental scene diff quality.
  if (input.allShapeIds.length > 0) {
    return [...input.allShapeIds]
  }

  const ids = new Set<string>(input.protectedNodeIds)
  if (input.changedNodeIds && input.changedNodeIds.length > 0) {
    for (const changedNodeId of input.changedNodeIds) {
      ids.add(changedNodeId)
    }
  }

  return [...ids].sort()
}
