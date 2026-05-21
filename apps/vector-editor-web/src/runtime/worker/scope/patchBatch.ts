import type {HistoryPatch} from '../history.ts'
import type {SceneUpdateMessage} from '../protocol.ts'

/**
 * Declares patch update kinds used by worker scene invalidation scheduling.
 */
type PatchBatchUpdateKind = SceneUpdateMessage['updateKind']

/**
 * Classifies whether one patch only toggles lightweight render flags.
 * @param patch History patch candidate.
 */
function isFlagsOnlyPatch(patch: HistoryPatch): boolean {
  return patch.type === 'set-selected-index'
}

/**
 * Resolves vector update kind by classifying set-selected-index as flags-only.
 * @param patches Incoming patch list for one scene transition.
 */
export function resolvePatchBatchUpdateKind(
  patches: HistoryPatch[],
): PatchBatchUpdateKind | null {
  if (patches.length === 0) {
    return null
  }

  // Keep worker invalidation cheap when every patch only updates selection flags.
  return patches.every((patch) => isFlagsOnlyPatch(patch)) ? 'flags' : 'full'
}

/**
 * Apply a patch batch and return the scene update kind for render invalidation.
 * @param patches Incoming patch list for one scene transition.
 * @param apply Applies patch side effects to scene/document state.
 */
export function applyPatchBatch(
  patches: HistoryPatch[],
  apply: (patches: HistoryPatch[]) => void,
): PatchBatchUpdateKind | null {
  const updateKind = resolvePatchBatchUpdateKind(patches)
  if (!updateKind) {
    return null
  }

  apply(patches)
  return updateKind
}
