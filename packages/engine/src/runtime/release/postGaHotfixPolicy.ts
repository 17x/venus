// Module responsibility: evaluate post-GA hotfix policy eligibility.
// Non-responsibility: hotfix deployment.

/**
 * Describes one post-GA hotfix candidate.
 */
export interface EnginePostGaHotfixCandidate {
  /** Hotfix id. */
  id: string
  /** Risk level. */
  riskLevel: 'low' | 'medium' | 'high'
  /** Whether rollback path is documented. */
  rollbackReady: boolean
  /** Whether owner signoff is complete. */
  ownerApproved: boolean
}

/**
 * Intent: compute post-GA hotfix policy pass verdict.
 * @param candidate Hotfix candidate.
 * @returns True when candidate can enter fast-track lane.
 */
export function computeEnginePostGaHotfixPolicy(candidate: EnginePostGaHotfixCandidate): boolean {
  return candidate.riskLevel !== 'high' && candidate.rollbackReady && candidate.ownerApproved
}
