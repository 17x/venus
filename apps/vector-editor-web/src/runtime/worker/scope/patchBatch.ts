import type {HistoryPatch} from '../history.ts'
import type {SceneUpdateMessage} from '../protocol.ts'
import {
  applyPatchBatch as applyGenericPatchBatch,
  resolvePatchBatchUpdateKind as resolveGenericPatchBatchUpdateKind,
} from '@venus/lib/patch'

/**
 * Resolves vector update kind by classifying set-selected-index as flags-only.
 */
export function resolvePatchBatchUpdateKind(
  patches: HistoryPatch[],
): SceneUpdateMessage['updateKind'] | null {
  return resolveGenericPatchBatchUpdateKind(
    patches,
    (patch) => patch.type === 'set-selected-index',
  )
}

/**
 * Apply a patch batch and return the scene update kind for render invalidation.
 */
export function applyPatchBatch(
  patches: HistoryPatch[],
  apply: (patches: HistoryPatch[]) => void,
): SceneUpdateMessage['updateKind'] | null {
  // Reuse shared patch orchestration while preserving local apply callback type.
  return applyGenericPatchBatch(
    patches,
    (patch) => patch.type === 'set-selected-index',
    (batch) => apply(batch as HistoryPatch[]),
  )
}
