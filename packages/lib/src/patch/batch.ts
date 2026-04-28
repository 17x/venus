/**
 * Defines the scene invalidation mode produced by patch classification.
 */
export type PatchBatchUpdateKind = 'flags' | 'full'

/**
 * Defines a callback that decides whether one patch is flags-only.
 */
export type IsFlagsOnlyPatch<TPatch> = (patch: TPatch) => boolean

/**
 * Resolves update kind for a patch list based on caller-provided classification.
 */
export function resolvePatchBatchUpdateKind<TPatch>(
  patches: readonly TPatch[],
  isFlagsOnlyPatch: IsFlagsOnlyPatch<TPatch>,
): PatchBatchUpdateKind | null {
  if (patches.length === 0) {
    return null
  }

  // Emit a cheap flags update when all patches target render flags only.
  const selectionOnly = patches.every((patch) => isFlagsOnlyPatch(patch))
  return selectionOnly ? 'flags' : 'full'
}

/**
 * Applies a patch batch and returns the resolved update kind for renderer invalidation.
 */
export function applyPatchBatch<TPatch>(
  patches: readonly TPatch[],
  isFlagsOnlyPatch: IsFlagsOnlyPatch<TPatch>,
  apply: (patches: readonly TPatch[]) => void,
): PatchBatchUpdateKind | null {
  const updateKind = resolvePatchBatchUpdateKind(patches, isFlagsOnlyPatch)
  if (!updateKind) {
    return null
  }

  apply(patches)
  return updateKind
}

