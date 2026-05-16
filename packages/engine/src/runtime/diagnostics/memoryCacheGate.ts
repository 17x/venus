// Module responsibility: enforce memory and cache pressure gate.
// Non-responsibility: memory reclamation.

/**
 * Describes memory-cache gate sample.
 */
export interface EngineMemoryCacheGateSample {
  /** Current cache bytes. */
  cacheBytes: number
  /** Current memory pressure score in [0, 1]. */
  memoryPressure: number
  /** Whether recovery path executed successfully. */
  recovered: boolean
}

/**
 * Intent: evaluate memory-cache gate thresholds.
 * @param sample Memory-cache sample.
 * @param maxCacheBytes Allowed cache bytes upper bound.
 * @param maxPressure Allowed memory pressure upper bound.
 * @returns True when gate passes.
 */
export function passEngineMemoryCacheGate(
  sample: EngineMemoryCacheGateSample,
  maxCacheBytes: number,
  maxPressure: number,
): boolean {
  const withinCaps = sample.cacheBytes <= maxCacheBytes && sample.memoryPressure <= maxPressure
  return withinCaps || sample.recovered
}
