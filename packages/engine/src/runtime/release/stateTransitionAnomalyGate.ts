// Module responsibility: validate runtime state transition legality.
// Non-responsibility: runtime state orchestration.

/**
 * Describes one runtime state transition sample.
 */
export interface EngineStateTransitionSample {
  /** Previous state id. */
  from: 'interactive' | 'settling' | 'static' | 'camera'
  /** Next state id. */
  to: 'interactive' | 'settling' | 'static' | 'camera'
}

/**
 * Intent: compute state-transition anomaly gate verdict.
 * @param sample Transition sample.
 * @returns True when transition is considered legal.
 */
export function computeEngineStateTransitionAnomalyGate(sample: EngineStateTransitionSample): boolean {
  if (sample.from === 'static' && sample.to === 'settling') {
    // Settling must originate from active interaction/camera flows.
    return false
  }

  return true
}
