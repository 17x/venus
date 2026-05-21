// Module responsibility: evaluate hard redline blocking conditions.
// Non-responsibility: CI orchestration.

/**
 * Describes redline input metrics.
 */
export interface EngineRegressionRedlineInput {
  /** Input-to-photon p95 in ms. */
  inputToPhotonP95Ms: number
  /** Interactive FPS p95. */
  interactiveFpsP95: number
  /** Critical-layer missing ratio in [0, 1]. */
  criticalLayerMissingRatio: number
}

/**
 * Describes redline evaluation output.
 */
export interface EngineRegressionRedlineResult {
  /** Whether metrics pass hard redline. */
  pass: boolean
  /** Reasons for blocking when pass is false. */
  reasons: string[]
}

/**
 * Intent: evaluate unacceptable regression redlines.
 * @param input Redline metrics input.
 * @returns Redline evaluation result.
 */
export function resolveEngineRegressionRedlineResult(
  input: EngineRegressionRedlineInput,
): EngineRegressionRedlineResult {
  const reasons: string[] = []
  if (input.inputToPhotonP95Ms > 50) {
    reasons.push('input-to-photon-p95')
  }
  if (input.interactiveFpsP95 < 50) {
    reasons.push('interactive-fps-p95')
  }
  if (input.criticalLayerMissingRatio > 0) {
    reasons.push('critical-layer-missing-ratio')
  }

  return {
    pass: reasons.length === 0,
    reasons,
  }
}
