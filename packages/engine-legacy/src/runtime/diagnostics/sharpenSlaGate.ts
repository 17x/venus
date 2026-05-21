// Module responsibility: evaluate settle-to-sharp SLA gate.
// Non-responsibility: latency sampling.

/**
 * Describes sharpen SLA sample.
 */
export interface EngineSharpenSlaSample {
  /** Measured settle-to-sharp p95 latency. */
  p95Ms: number
  /** Measured settle-to-sharp p99 latency. */
  p99Ms: number
}

/**
 * Intent: evaluate sharpen SLA thresholds.
 * @param sample SLA sample.
 * @param p95ThresholdMs Allowed p95 threshold.
 * @param p99ThresholdMs Allowed p99 threshold.
 * @returns True when sample satisfies SLA.
 */
export function passEngineSharpenSlaGate(
  sample: EngineSharpenSlaSample,
  p95ThresholdMs: number,
  p99ThresholdMs: number,
): boolean {
  return sample.p95Ms <= p95ThresholdMs && sample.p99Ms <= p99ThresholdMs
}
