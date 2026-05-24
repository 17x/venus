// Module responsibility: compare profile outputs and summarize explainable deltas.
// Non-responsibility: rendering frames.

/**
 * Describes one profile metric sample.
 */
export interface EngineProfileMetricSample {
  /** Profile name. */
  profile: string
  /** Key metric map for this profile. */
  metrics: Record<string, number>
}

/**
 * Describes one consistency delta item.
 */
export interface EngineProfileConsistencyDelta {
  /** Metric name. */
  metric: string
  /** Minimum value across profiles. */
  min: number
  /** Maximum value across profiles. */
  max: number
  /** Absolute spread. */
  spread: number
}

/**
 * Intent: compute per-metric spread across profile samples.
 * @param samples Profile metric samples.
 * @returns Consistency delta list.
 */
export function resolveEngineProfileConsistencyDeltas(
  samples: readonly EngineProfileMetricSample[],
): EngineProfileConsistencyDelta[] {
  const keys = new Set<string>()
  for (const sample of samples) {
    for (const key of Object.keys(sample.metrics)) {
      keys.add(key)
    }
  }

  const deltas: EngineProfileConsistencyDelta[] = []
  for (const key of keys) {
    const values = samples.map((sample) => sample.metrics[key]).filter((value) => typeof value === 'number')
    if (values.length === 0) {
      continue
    }

    const min = Math.min(...values)
    const max = Math.max(...values)
    deltas.push({
      metric: key,
      min,
      max,
      spread: max - min,
    })
  }

  return deltas.sort((left, right) => right.spread - left.spread)
}
