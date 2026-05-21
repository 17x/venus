// Module responsibility: evaluate fallback storm rate-limiter activation.
// Non-responsibility: fallback event transport.

/**
 * Describes fallback storm input window.
 */
export interface EngineFallbackStormWindow {
  /** Number of fallback events in window. */
  eventCount: number
  /** Allowed event threshold in window. */
  threshold: number
}

/**
 * Intent: compute whether fallback storm limiter should activate.
 * @param window Fallback storm input window.
 * @returns True when limiter should throttle fallback events.
 */
export function computeEngineFallbackStormRateLimiter(window: EngineFallbackStormWindow): boolean {
  return window.eventCount > window.threshold
}
