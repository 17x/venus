// Module responsibility: evaluate phase-G acceptance from mandatory gate checklist.
// Non-responsibility: collecting gate evidence.

/**
 * Describes phase-G acceptance checklist.
 */
export interface EnginePhaseGAcceptanceChecklist {
  /** Whether reliability hardening gates passed. */
  reliabilityPassed: boolean
  /** Whether 2D/3D readiness gates passed. */
  hybridReadinessPassed: boolean
  /** Whether governance and operations gates passed. */
  governancePassed: boolean
}

/**
 * Intent: compute phase-G acceptance verdict.
 * @param checklist Phase-G acceptance checklist.
 * @returns True when phase-G can be accepted.
 */
export function computeEnginePhaseGAcceptance(checklist: EnginePhaseGAcceptanceChecklist): boolean {
  return checklist.reliabilityPassed && checklist.hybridReadinessPassed && checklist.governancePassed
}
