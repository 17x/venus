// Module responsibility: evaluate long-tail device readiness coverage.
// Non-responsibility: device sampling.

/**
 * Describes one long-tail device readiness sample.
 */
export interface EngineLongTailDeviceReadinessSample {
  /** Device tier id. */
  tier: string
  /** Whether this tier is verified. */
  verified: boolean
}

/**
 * Intent: compute long-tail device readiness gate verdict.
 * @param samples Device readiness samples.
 * @returns True when all long-tail tiers are verified.
 */
export function computeEngineLongTailDeviceReadinessGate(samples: readonly EngineLongTailDeviceReadinessSample[]): boolean {
  return samples.length > 0 && samples.every((sample) => sample.tier.length > 0 && sample.verified)
}
