// Module responsibility: evaluate long-run soak report completeness and stability.
// Non-responsibility: soak execution.

/**
 * Describes one long-run soak report sample.
 */
export interface EngineLongRunSoakReportSample {
  /** Soak duration in minutes. */
  durationMinutes: number
  /** Whether memory drift is within limit. */
  memoryDriftStable: boolean
  /** Whether crash count is zero. */
  crashFree: boolean
}

/**
 * Intent: compute long-run soak report v1 pass verdict.
 * @param sample Long-run soak report sample.
 * @returns True when report satisfies minimal stability requirements.
 */
export function computeEngineLongRunSoakReportV1(sample: EngineLongRunSoakReportSample): boolean {
  return sample.durationMinutes >= 60 && sample.memoryDriftStable && sample.crashFree
}
