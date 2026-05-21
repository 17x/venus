// Module responsibility: derive massive-data progressive loading policy.
// Non-responsibility: tile scheduler execution.

/**
 * Describes massive-data progressive policy input.
 */
export interface EngineMassiveProgressivePolicyInput {
  /** Whether request intersects viewport. */
  viewportVisible: boolean
  /** Whether request intersects predictive ring. */
  predicted: boolean
  /** Current pressure score in [0, 1]. */
  pressureScore: number
}

/**
 * Intent: resolve whether request should be loaded immediately.
 * @param input Progressive policy input.
 * @returns True when request should be loaded now.
 */
export function shouldLoadMassiveProgressiveChunkNow(
  input: EngineMassiveProgressivePolicyInput,
): boolean {
  if (input.viewportVisible) {
    return true
  }

  if (input.predicted && input.pressureScore < 0.8) {
    return true
  }

  return false
}
