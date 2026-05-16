// Module responsibility: evaluate final program SLO closeout gate.
// Non-responsibility: SLO telemetry collection.

/**
 * Describes program SLO closeout input.
 */
export interface EngineProgramSloCloseoutInput {
  /** Input-to-photon p95 metric value. */
  inputToPhotonP95Ms: number | null
  /** Interactive fps p95 metric value. */
  interactiveFpsP95: number | null
  /** Critical-layer missing ratio metric value. */
  criticalLayerMissingRatio: number | null
  /** Maximum allowed input-to-photon p95 in ms. */
  inputToPhotonP95ThresholdMs: number
  /** Minimum required interactive fps p95. */
  interactiveFpsP95Threshold: number
  /** Maximum allowed critical-layer missing ratio. */
  criticalLayerMissingRatioThreshold: number
}

/**
 * Intent: compute final program SLO closeout gate verdict.
 * @param input Program SLO closeout input.
 * @returns True when mandatory SLO fields are present and within thresholds.
 */
export function computeEngineProgramSloCloseoutGate(input: EngineProgramSloCloseoutInput): boolean {
  if (
    input.inputToPhotonP95Ms === null
    || input.interactiveFpsP95 === null
    || input.criticalLayerMissingRatio === null
  ) {
    return false
  }

  return input.inputToPhotonP95Ms <= input.inputToPhotonP95ThresholdMs
    && input.interactiveFpsP95 >= input.interactiveFpsP95Threshold
    && input.criticalLayerMissingRatio <= input.criticalLayerMissingRatioThreshold
}
