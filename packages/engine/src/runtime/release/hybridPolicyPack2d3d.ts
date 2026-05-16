// Module responsibility: evaluate 2D/3D hybrid policy transition readiness.
// Non-responsibility: transition scheduling.

/**
 * Describes one 2D/3D hybrid transition sample.
 */
export interface EngineHybrid2d3dTransitionSample {
  /** Transition id. */
  id: string
  /** Whether critical layers remain protected across transition. */
  criticalLayerProtected: boolean
  /** Whether rollback anchor is available for this transition. */
  rollbackAnchorReady: boolean
}

/**
 * Intent: compute whether hybrid policy pack is transition-safe.
 * @param transitions Transition samples.
 * @returns True when every transition preserves critical protections.
 */
export function computeEngineHybridPolicyPack2d3d(transitions: readonly EngineHybrid2d3dTransitionSample[]): boolean {
  return transitions.length > 0
    && transitions.every((sample) => sample.id.length > 0 && sample.criticalLayerProtected && sample.rollbackAnchorReady)
}
