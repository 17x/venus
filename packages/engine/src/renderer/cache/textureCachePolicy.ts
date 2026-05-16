// Module responsibility: prioritize and evict texture cache entries by semantic tier.
// Non-responsibility: texture upload execution.

/**
 * Describes texture priority tier.
 */
export type EngineTexturePriorityTier = 'critical' | 'high' | 'normal' | 'background'

/**
 * Describes one texture cache entry metadata payload.
 */
export interface EngineTextureCacheEntry {
  /** Texture id. */
  id: string
  /** Texture priority tier. */
  tier: EngineTexturePriorityTier
  /** Texture byte size. */
  byteSize: number
  /** Last frame index when texture was used. */
  lastUsedFrame: number
}

const TIER_WEIGHT: Record<EngineTexturePriorityTier, number> = {
  critical: 0,
  high: 1,
  normal: 2,
  background: 3,
}

/**
 * Intent: sort texture upload queue by semantic priority and recency.
 * @param entries Texture cache entries.
 * @returns Entries sorted for upload scheduling.
 */
export function sortEngineTextureUploadQueue(entries: readonly EngineTextureCacheEntry[]): EngineTextureCacheEntry[] {
  return [...entries].sort((left, right) => {
    const tierDelta = TIER_WEIGHT[left.tier] - TIER_WEIGHT[right.tier]
    if (tierDelta !== 0) {
      return tierDelta
    }

    return right.lastUsedFrame - left.lastUsedFrame
  })
}

/**
 * Intent: select eviction candidates under overload without touching critical tier first.
 * @param entries Texture cache entries.
 * @param requiredBytes Bytes to free.
 * @returns Eviction candidate id list in eviction order.
 */
export function resolveEngineTextureEvictionCandidates(
  entries: readonly EngineTextureCacheEntry[],
  requiredBytes: number,
): string[] {
  const sortedForEviction = [...entries]
    .filter((entry) => entry.tier !== 'critical')
    .sort((left, right) => {
      const tierDelta = TIER_WEIGHT[right.tier] - TIER_WEIGHT[left.tier]
      if (tierDelta !== 0) {
        return tierDelta
      }

      return left.lastUsedFrame - right.lastUsedFrame
    })

  const candidates: string[] = []
  let freedBytes = 0

  for (const entry of sortedForEviction) {
    if (freedBytes >= Math.max(0, requiredBytes)) {
      break
    }

    candidates.push(entry.id)
    freedBytes += Math.max(0, entry.byteSize)
  }

  return candidates
}
