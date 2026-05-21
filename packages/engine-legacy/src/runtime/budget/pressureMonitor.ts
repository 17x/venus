// Module responsibility: pressure monitoring contract with smoothing and hysteresis.
// Non-responsibility: direct runtime policy or renderer mutation.

/**
 * Describes normalized load signals used by pressure monitor.
 */
export interface EnginePressureSignals {
  /** CPU load in range [0, 1]. */
  cpuLoad: number
  /** GPU load in range [0, 1]. */
  gpuLoad: number
  /** Memory load in range [0, 1]. */
  memoryLoad: number
  /** Visibility traversal load in range [0, 1]. */
  visibilityLoad: number
  /** Streaming load in range [0, 1]. */
  streamingLoad: number
}

/**
 * Defines pressure tier classification.
 */
export type EnginePressureTier = 'low' | 'medium' | 'high'

/**
 * Describes one pressure monitor output sample.
 */
export interface EnginePressureSample {
  /** Smoothed weighted pressure score in range [0, 1]. */
  score: number
  /** Pressure tier after hysteresis transition check. */
  tier: EnginePressureTier
}

/**
 * Describes pressure monitor thresholds and hysteresis margins.
 */
export interface EnginePressureThresholds {
  /** Score threshold for entering medium pressure. */
  mediumEnter: number
  /** Score threshold for leaving medium pressure. */
  mediumLeave: number
  /** Score threshold for entering high pressure. */
  highEnter: number
  /** Score threshold for leaving high pressure. */
  highLeave: number
}

/**
 * Defines canonical thresholds tuned for anti-flap behavior.
 */
export const DEFAULT_ENGINE_PRESSURE_THRESHOLDS: EnginePressureThresholds = {
  mediumEnter: 0.48,
  mediumLeave: 0.38,
  highEnter: 0.76,
  highLeave: 0.62,
}

/**
 * Intent: clamp numeric load signal into normalized [0,1] range.
 * @param value Load signal value.
 * @returns Clamped normalized signal.
 */
function clampNormalized(value: number): number {
  if (!Number.isFinite(value)) {
    return 0
  }

  return Math.max(0, Math.min(1, value))
}

/**
 * Intent: resolve weighted pressure score from normalized pressure signals.
 * @param signals Normalized load signals.
 * @returns Weighted score in range [0,1].
 */
function resolvePressureScore(signals: EnginePressureSignals): number {
  const cpu = clampNormalized(signals.cpuLoad)
  const gpu = clampNormalized(signals.gpuLoad)
  const memory = clampNormalized(signals.memoryLoad)
  const visibility = clampNormalized(signals.visibilityLoad)
  const streaming = clampNormalized(signals.streamingLoad)

  return (cpu * 0.24) + (gpu * 0.32) + (memory * 0.2) + (visibility * 0.14) + (streaming * 0.1)
}

/**
 * Intent: classify pressure tier using hysteresis against previous tier.
 * @param score Current weighted pressure score.
 * @param previousTier Previous pressure tier.
 * @param thresholds Classification thresholds.
 * @returns Next pressure tier.
 */
function resolvePressureTierWithHysteresis(
  score: number,
  previousTier: EnginePressureTier,
  thresholds: EnginePressureThresholds,
): EnginePressureTier {
  if (previousTier === 'high') {
    return score < thresholds.highLeave
      ? (score < thresholds.mediumLeave ? 'low' : 'medium')
      : 'high'
  }

  if (previousTier === 'medium') {
    if (score >= thresholds.highEnter) {
      return 'high'
    }

    return score < thresholds.mediumLeave ? 'low' : 'medium'
  }

  if (score >= thresholds.highEnter) {
    return 'high'
  }

  return score >= thresholds.mediumEnter ? 'medium' : 'low'
}

/**
 * Intent: resolve one pressure sample from incoming signals and previous tier.
 * @param signals Pressure signal payload.
 * @param previousTier Previous tier used for hysteresis.
 * @param thresholds Optional threshold override.
 * @returns Pressure sample with score and tier.
 */
export function resolveEnginePressureSample(
  signals: EnginePressureSignals,
  previousTier: EnginePressureTier,
  thresholds: EnginePressureThresholds = DEFAULT_ENGINE_PRESSURE_THRESHOLDS,
): EnginePressureSample {
  const score = resolvePressureScore(signals)
  return {
    score,
    tier: resolvePressureTierWithHysteresis(score, previousTier, thresholds),
  }
}
