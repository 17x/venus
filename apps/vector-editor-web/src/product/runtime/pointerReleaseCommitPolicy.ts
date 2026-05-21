/** Declares pointer-up transform commit resolution used by preview cleanup policy. */
export interface PointerUpTransformCommitResolution {
  /** Stores whether transform-session resolve path produced one commit payload. */
  readonly hasResolvedTransformCommit: boolean
  /** Stores whether transform commit payload contains one worker command. */
  readonly hasTransformCommand: boolean
  /** Stores whether React preview state is currently visible. */
  readonly hasTransformPreview: boolean
}

/**
 * Resolves whether pointer-up must clear transform preview to keep preview/commit consistency.
 * @param input Pointer-up transform resolution snapshot.
 */
export function shouldClearTransformPreviewOnPointerUp(input: PointerUpTransformCommitResolution): boolean {
  if (input.hasResolvedTransformCommit) {
    return !input.hasTransformCommand
  }

  return input.hasTransformPreview
}
