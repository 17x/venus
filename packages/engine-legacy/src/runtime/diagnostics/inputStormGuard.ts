// Module responsibility: evaluate input-storm stability thresholds.
// Non-responsibility: input event capture.

/**
 * Describes input-storm sample.
 */
export interface EngineInputStormSample {
  /** Coalesced request count. */
  coalescedRequests: number
  /** Dropped frame count. */
  droppedFrames: number
}

/**
 * Intent: resolve whether input-storm sample remains within stability threshold.
 * @param sample Input-storm sample.
 * @returns True when stable.
 */
export function passEngineInputStormGuard(sample: EngineInputStormSample): boolean {
  return sample.coalescedRequests <= 10_000 && sample.droppedFrames <= 120
}
