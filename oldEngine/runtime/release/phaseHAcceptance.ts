// Module responsibility: evaluate phase-H acceptance from blocker and gate status.
// Non-responsibility: blocker triage.

/**
 * Describes phase-H acceptance input.
 */
export interface EnginePhaseHAcceptanceInput {
  /** Number of blocker findings. */
  blockerCount: number
  /** Whether all mandatory phase-H gates passed. */
  mandatoryGatesPassed: boolean
}

/**
 * Intent: compute phase-H acceptance verdict.
 * @param input Phase-H acceptance input.
 * @returns True when no blocker exists and gates passed.
 */
export function computeEnginePhaseHAcceptance(input: EnginePhaseHAcceptanceInput): boolean {
  return input.blockerCount <= 0 && input.mandatoryGatesPassed
}
