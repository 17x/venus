// Module responsibility: evaluate memory-pressure circuit-breaker transitions.
// Non-responsibility: memory sampling.

/**
 * Describes memory-pressure circuit-breaker input.
 */
export interface EngineMemoryPressureCircuitBreakerInput {
  /** Pressure score in [0, 1]. */
  pressureScore: number
  /** Trigger threshold in [0, 1]. */
  triggerThreshold: number
  /** Recover threshold in [0, 1]. */
  recoverThreshold: number
  /** Whether breaker was active in previous state. */
  previousActive: boolean
}

/**
 * Intent: compute memory-pressure circuit-breaker active state.
 * @param input Memory-pressure circuit-breaker input.
 * @returns Next circuit-breaker active state.
 */
export function computeEngineMemoryPressureCircuitBreaker(input: EngineMemoryPressureCircuitBreakerInput): boolean {
  if (input.previousActive) {
    // Keep breaker active until pressure drops below the recovery line.
    return input.pressureScore > input.recoverThreshold
  }

  return input.pressureScore >= input.triggerThreshold
}
