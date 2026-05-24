// Module responsibility: evaluate hotpath latency guard threshold.
// Non-responsibility: latency measurement.

/**
 * Describes hotpath latency guard input.
 */
export interface EngineHotpathLatencyGuardInput {
  /** Observed hotpath p95 latency in milliseconds. */
  observedP95Ms: number
  /** Maximum allowed p95 latency in milliseconds. */
  thresholdP95Ms: number
}

/**
 * Intent: compute hotpath latency guard verdict.
 * @param input Hotpath latency guard input.
 * @returns True when observed p95 latency is within threshold.
 */
export function computeEngineHotpathLatencyGuardV1(input: EngineHotpathLatencyGuardInput): boolean {
  return input.observedP95Ms <= input.thresholdP95Ms
}
