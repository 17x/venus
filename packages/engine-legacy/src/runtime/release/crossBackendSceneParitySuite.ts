// Module responsibility: evaluate cross-backend scene parity suite results.
// Non-responsibility: backend rendering.

/**
 * Describes one cross-backend scene parity sample.
 */
export interface EngineCrossBackendSceneParitySample {
  /** Scene id. */
  sceneId: string
  /** Backend pair id. */
  backendPair: string
  /** Whether scene parity is preserved. */
  parityPreserved: boolean
}

/**
 * Intent: compute cross-backend scene parity suite verdict.
 * @param samples Scene parity samples.
 * @returns True when all scene/backend pairs preserve parity.
 */
export function computeEngineCrossBackendSceneParitySuite(samples: readonly EngineCrossBackendSceneParitySample[]): boolean {
  return samples.length > 0 && samples.every((sample) => sample.parityPreserved)
}
