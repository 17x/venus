// Module responsibility: compare visual and metric snapshots using tolerance thresholds.
// Non-responsibility: snapshot capture.

/**
 * Describes one render regression snapshot pair.
 */
export interface EngineRenderRegressionSample {
  /** Baseline metric value. */
  baselineValue: number
  /** Candidate metric value. */
  candidateValue: number
  /** Allowed absolute delta threshold. */
  tolerance: number
}

/**
 * Describes one regression comparison result.
 */
export interface EngineRenderRegressionResult {
  /** Absolute delta value. */
  delta: number
  /** Whether sample passes tolerance rule. */
  pass: boolean
}

/**
 * Intent: compare one regression sample under absolute tolerance rule.
 * @param sample Render regression sample.
 * @returns Regression comparison result.
 */
export function resolveEngineRenderRegressionResult(
  sample: EngineRenderRegressionSample,
): EngineRenderRegressionResult {
  const delta = Math.abs(sample.candidateValue - sample.baselineValue)
  return {
    delta,
    pass: delta <= Math.max(0, sample.tolerance),
  }
}
