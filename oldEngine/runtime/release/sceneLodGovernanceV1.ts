// Module responsibility: evaluate scene LOD governance safety constraints.
// Non-responsibility: LOD mesh generation.

/**
 * Describes one scene LOD candidate.
 */
export interface EngineSceneLodCandidate {
  /** Candidate id. */
  id: string
  /** Whether this candidate belongs to protected critical set. */
  critical: boolean
  /** Proposed LOD level where larger value indicates lower detail. */
  lodLevel: number
}

/**
 * Intent: compute scene LOD governance pass verdict.
 * @param candidates LOD candidates.
 * @param maxNonCriticalLod Maximum allowed LOD level for non-critical candidates.
 * @returns True when critical candidates are not degraded and non-critical candidates stay bounded.
 */
export function computeEngineSceneLodGovernanceV1(
  candidates: readonly EngineSceneLodCandidate[],
  maxNonCriticalLod: number,
): boolean {
  return candidates.every((candidate) => {
    if (candidate.critical) {
      // Critical nodes must preserve top-quality detail level.
      return candidate.lodLevel <= 0
    }

    return candidate.lodLevel <= maxNonCriticalLod
  })
}
