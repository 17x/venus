// Module responsibility: resolve A/B significance for runtime policy comparisons.
// Non-responsibility: experiment assignment.

/**
 * Describes AB metric pair.
 */
export interface EngineAbMetricPair {
  /** Metric value for baseline variant. */
  baseline: number
  /** Metric value for candidate variant. */
  candidate: number
}

/**
 * Intent: evaluate AB delta against absolute threshold.
 * @param pair AB metric pair.
 * @param threshold Absolute significance threshold.
 * @returns True when candidate differs significantly from baseline.
 */
export function isEngineAbDeltaSignificant(pair: EngineAbMetricPair, threshold: number): boolean {
  return Math.abs(pair.candidate - pair.baseline) >= Math.max(0, threshold)
}
