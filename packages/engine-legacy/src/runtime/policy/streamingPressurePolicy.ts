// Module responsibility: apply pressure-aware streaming load shedding while preserving critical resources.
// Non-responsibility: performing network IO.

/**
 * Describes streaming pressure input snapshot.
 */
export interface EngineStreamingPressureInput {
  /** Streaming pressure score in range [0, 1]. */
  pressureScore: number
  /** Whether resource is critical and should bypass heavy shedding. */
  critical: boolean
  /** Requested concurrent streaming tasks. */
  requestedConcurrency: number
}

/**
 * Describes streaming pressure decision output.
 */
export interface EngineStreamingPressureDecision {
  /** Allowed streaming concurrency under pressure policy. */
  allowedConcurrency: number
  /** Whether non-critical tasks should be deferred. */
  deferNonCritical: boolean
}

/**
 * Intent: resolve streaming load-shedding decision from pressure and criticality.
 * @param input Streaming pressure input snapshot.
 * @returns Streaming pressure decision.
 */
export function resolveEngineStreamingPressurePolicy(
  input: EngineStreamingPressureInput,
): EngineStreamingPressureDecision {
  const clampedPressure = Math.max(0, Math.min(1, input.pressureScore))
  const requested = Math.max(1, input.requestedConcurrency)

  if (input.critical) {
    return {
      allowedConcurrency: Math.max(1, Math.floor(requested * (1 - clampedPressure * 0.5))),
      deferNonCritical: false,
    }
  }

  return {
    allowedConcurrency: Math.max(1, Math.floor(requested * (1 - clampedPressure))),
    deferNonCritical: clampedPressure >= 0.7,
  }
}
