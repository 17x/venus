// Module responsibility: enforce critical-layer integrity gate.
// Non-responsibility: critical-layer tagging.

/**
 * Describes critical-layer integrity sample.
 */
export interface EngineCriticalLayerIntegritySample {
  /** Missing ratio in [0, 1]. */
  missingRatio: number
  /** Blur ratio in [0, 1]. */
  blurRatio: number
}

/**
 * Intent: evaluate critical-layer integrity gate.
 * @param sample Integrity sample.
 * @returns True when critical-layer integrity remains intact.
 */
export function passEngineCriticalLayerIntegrityGate(
  sample: EngineCriticalLayerIntegritySample,
): boolean {
  return sample.missingRatio <= 0 && sample.blurRatio <= 0.01
}
