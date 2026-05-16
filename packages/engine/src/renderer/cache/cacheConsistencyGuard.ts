// Module responsibility: prevent cross-phase and cross-DPR cache reuse mismatches.
// Non-responsibility: cache storage and eviction.

/**
 * Describes cache consistency key factors.
 */
export interface EngineCacheConsistencyFactors {
  /** Strategy phase key used by cache lane isolation. */
  phase: string
  /** Quantized DPR class key. */
  dprClass: 'low' | 'mid' | 'high'
  /** Optional scale class key used by high-zoom protection. */
  scaleClass?: 'overview' | 'normal' | 'detail'
}

/**
 * Intent: resolve deterministic consistency key for cache reuse validation.
 * @param factors Cache consistency factors.
 * @returns Deterministic cache consistency key.
 */
export function resolveEngineCacheConsistencyKey(
  factors: EngineCacheConsistencyFactors,
): string {
  return `${factors.phase}|${factors.dprClass}|${factors.scaleClass ?? 'normal'}`
}

/**
 * Intent: resolve whether cache entry remains reusable under next factors.
 * @param previousFactors Previous frame factors.
 * @param nextFactors Next frame factors.
 * @returns True when reuse is safe.
 */
export function canReuseEngineCacheEntry(
  previousFactors: EngineCacheConsistencyFactors,
  nextFactors: EngineCacheConsistencyFactors,
): boolean {
  return resolveEngineCacheConsistencyKey(previousFactors) === resolveEngineCacheConsistencyKey(nextFactors)
}
