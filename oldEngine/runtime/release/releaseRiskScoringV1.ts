// Module responsibility: compute deterministic release risk score.
// Non-responsibility: risk signal ingestion.

/**
 * Describes release risk scoring input.
 */
export interface EngineReleaseRiskScoringInput {
  /** Number of blocker findings. */
  blockerCount: number
  /** Number of drift findings. */
  driftCount: number
  /** Number of rollback readiness gaps. */
  rollbackGapCount: number
}

/**
 * Intent: compute release risk score from weighted signal counts.
 * @param input Release risk scoring input.
 * @returns Deterministic risk score where higher means riskier.
 */
export function computeEngineReleaseRiskScoringV1(input: EngineReleaseRiskScoringInput): number {
  return input.blockerCount * 10 + input.driftCount * 3 + input.rollbackGapCount * 5
}
