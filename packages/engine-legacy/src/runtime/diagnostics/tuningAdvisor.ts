// Module responsibility: generate rule-based tuning recommendations from bottleneck patterns.
// Non-responsibility: applying settings.

/**
 * Describes one bottleneck sample.
 */
export interface EngineBottleneckSample {
  /** Bottleneck tag. */
  tag: 'cpu' | 'gpu' | 'memory' | 'streaming'
  /** Severity score in [0, 1]. */
  severity: number
}

/**
 * Describes one tuning recommendation.
 */
export interface EngineTuningRecommendation {
  /** Recommendation id. */
  id: string
  /** Recommendation message. */
  message: string
}

/**
 * Intent: resolve tuning recommendations from bottleneck samples.
 * @param samples Bottleneck samples.
 * @returns Recommendation list.
 */
export function resolveEngineTuningAdvisorRecommendations(
  samples: readonly EngineBottleneckSample[],
): EngineTuningRecommendation[] {
  const recommendations: EngineTuningRecommendation[] = []
  for (const sample of samples) {
    if (sample.severity < 0.6) {
      continue
    }

    if (sample.tag === 'cpu') {
      recommendations.push({ id: 'reduce-draw-budget', message: 'Lower draw submit budget and simplify packet lanes.' })
    } else if (sample.tag === 'gpu') {
      recommendations.push({ id: 'reduce-upload-budget', message: 'Contract texture upload budget and increase progressive passes.' })
    } else if (sample.tag === 'memory') {
      recommendations.push({ id: 'tighten-cache-eviction', message: 'Tighten cache eviction thresholds and lower cache caps.' })
    } else {
      recommendations.push({ id: 'streaming-backoff', message: 'Apply streaming backoff and prioritize critical assets.' })
    }
  }

  return recommendations
}
