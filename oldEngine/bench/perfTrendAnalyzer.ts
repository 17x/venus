// Module responsibility: detect sustained performance regression trends.
// Non-responsibility: alert dispatch.

/**
 * Describes trend sample value.
 */
export interface EnginePerfTrendSample {
  /** Monotonic index of sample. */
  index: number
  /** Metric value. */
  value: number
}

/**
 * Intent: detect monotonic increasing regression trend over a window.
 * @param samples Trend samples.
 * @returns True when trend shows sustained increase.
 */
export function detectEnginePerfRegressionTrend(samples: readonly EnginePerfTrendSample[]): boolean {
  if (samples.length < 3) {
    return false
  }

  for (let index = 1; index < samples.length; index += 1) {
    if (samples[index].value < samples[index - 1].value) {
      return false
    }
  }

  return true
}
