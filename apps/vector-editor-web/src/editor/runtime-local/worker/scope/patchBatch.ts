import type {HistoryPatch} from '../history.ts'
import type {SceneUpdateMessage} from '../protocol.ts'

export function resolvePatchBatchUpdateKind(
  patches: HistoryPatch[],
): SceneUpdateMessage['updateKind'] | null {
  if (patches.length === 0) {
    return null
  }

  const selectionOnly = patches.every((patch) => patch.type === 'set-selected-index')
  return selectionOnly ? 'flags' : 'full'
}

/**
 * Apply a patch batch and return the scene update kind for render invalidation.
 */
export function applyPatchBatch(
  patches: HistoryPatch[],
  apply: (patches: HistoryPatch[]) => void,
): SceneUpdateMessage['updateKind'] | null {
  const updateKind = resolvePatchBatchUpdateKind(patches)
  if (!updateKind) {
    return null
  }

  apply(patches)
  return updateKind
}
