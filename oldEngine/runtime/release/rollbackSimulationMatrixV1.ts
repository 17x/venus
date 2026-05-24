// Module responsibility: evaluate rollback simulation matrix coverage.
// Non-responsibility: rollback execution.

/**
 * Describes one rollback simulation matrix case.
 */
export interface EngineRollbackSimulationCase {
  /** Profile id. */
  profile: string
  /** Backend id. */
  backend: string
  /** Whether rollback path is verified. */
  rollbackVerified: boolean
}

/**
 * Intent: compute rollback simulation matrix verdict.
 * @param cases Rollback simulation cases.
 * @returns True when every profile/backend case has verified rollback.
 */
export function computeEngineRollbackSimulationMatrixV1(cases: readonly EngineRollbackSimulationCase[]): boolean {
  return cases.length > 0 && cases.every((entry) => entry.rollbackVerified)
}
