// Module responsibility: normalize geometry cache key and invalidation policy.
// Non-responsibility: geometry cache storage implementation.

/**
 * Describes geometry cache key input payload.
 */
export interface EngineGeometryCacheKeyInput {
  /** Node id associated with geometry payload. */
  nodeId: string
  /** Geometry revision for invalidation boundaries. */
  revision: number
  /** Optional phase hint that affects cache lane selection. */
  phaseHint?: string
}

/**
 * Intent: resolve deterministic geometry cache key.
 * @param input Geometry cache key input payload.
 * @returns Stable cache key string.
 */
export function resolveEngineGeometryCacheKey(input: EngineGeometryCacheKeyInput): string {
  return `${input.nodeId}|${Math.max(0, input.revision)}|${input.phaseHint ?? 'none'}`
}

/**
 * Intent: resolve whether geometry cache should invalidate on revision update.
 * @param previousRevision Previous geometry revision.
 * @param nextRevision Next geometry revision.
 * @returns True when cache entry should be invalidated.
 */
export function shouldInvalidateEngineGeometryCache(
  previousRevision: number,
  nextRevision: number,
): boolean {
  return Math.max(0, nextRevision) !== Math.max(0, previousRevision)
}
