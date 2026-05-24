// Module responsibility: evaluate canary autopause trigger state.
// Non-responsibility: canary rollout orchestration.

/**
 * Describes canary autopause threshold input.
 */
export interface EngineCanaryAutopauseInput {
  /** Whether latency threshold was breached. */
  latencyBreached: boolean
  /** Whether critical-layer integrity threshold was breached. */
  criticalLayerBreached: boolean
  /** Whether crash-rate threshold was breached. */
  crashRateBreached: boolean
}

/**
 * Intent: compute canary autopause policy verdict.
 * @param input Canary autopause input.
 * @returns True when rollout must be autopause-protected.
 */
export function computeEngineCanaryAutopause(input: EngineCanaryAutopauseInput): boolean {
  return input.latencyBreached || input.criticalLayerBreached || input.crashRateBreached
}
