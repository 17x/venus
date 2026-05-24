/**
 * Declares streamable 3D resource categories.
 */
export type EngineStreamingAssetKind = 'mesh' | 'texture'

/**
 * Declares one asset request emitted by visibility, LOD, or material preparation.
 */
export interface EngineStreamingAssetRequest {
  /** Stable asset identifier shared with loaders and cache records. */
  assetId: string
  /** Asset category used by downstream loader routing. */
  kind: EngineStreamingAssetKind
  /** Higher value means the asset should be loaded earlier. */
  priority: number
  /** Estimated GPU/system memory footprint in bytes. */
  estimatedBytes: number
  /** True when the asset is needed by currently visible scene content. */
  visible: boolean
  /** Distance from active camera; lower values win within equal priority bands. */
  distanceToCamera: number
  /** Request timestamp used as a deterministic tie-breaker. */
  requestedAtMs: number
}

/**
 * Declares one cached asset entry participating in VRAM budget decisions.
 */
export interface EngineStreamingCacheEntry {
  /** Stable asset identifier shared with request records. */
  assetId: string
  /** Asset category stored in the cache. */
  kind: EngineStreamingAssetKind
  /** Actual memory footprint in bytes. */
  byteSize: number
  /** Last usage timestamp for least-recently-used eviction. */
  lastUsedAtMs: number
  /** True when active rendering must retain this entry. */
  locked?: boolean
}

/**
 * Declares streaming budget limits for one planning pass.
 */
export interface EngineStreamingBudget {
  /** Hard cache byte ceiling. */
  maxBytes: number
  /** Soft byte target used to recover headroom after pressure. */
  targetBytes: number
  /** Maximum number of simultaneous asset loads. */
  maxConcurrentLoads: number
}

/**
 * Declares streaming planner input.
 */
export interface EngineStreamingPlanInput {
  /** Asset requests for the current frame/window. */
  requests: readonly EngineStreamingAssetRequest[]
  /** Asset ids currently loading. */
  inFlightAssetIds: readonly string[]
  /** Cached asset entries available for reuse or eviction. */
  cache: readonly EngineStreamingCacheEntry[]
  /** Streaming and cache budget limits. */
  budget: EngineStreamingBudget
}

/**
 * Declares one streaming planner decision snapshot.
 */
export interface EngineStreamingPlan {
  /** Asset requests selected for new load starts. */
  loadRequests: readonly EngineStreamingAssetRequest[]
  /** In-flight asset ids that should be cancelled because demand disappeared. */
  cancelAssetIds: readonly string[]
  /** Cached asset ids selected for eviction to recover byte budget. */
  evictAssetIds: readonly string[]
  /** Cache bytes retained after planned evictions. */
  retainedBytes: number
  /** Cache bytes removed by planned evictions. */
  evictedBytes: number
}

/**
 * Resolves one deterministic mesh/texture streaming plan from current demand and cache state.
 * @param input Streaming planner input.
 */
export function resolveEngineStreamingPlan(input: EngineStreamingPlanInput): EngineStreamingPlan {
  const requestedAssetIds = new Set(input.requests.map((request) => request.assetId))
  const cachedAssetIds = new Set(input.cache.map((entry) => entry.assetId))
  const inFlightAssetIds = new Set(input.inFlightAssetIds)
  const loadSlots = Math.max(0, input.budget.maxConcurrentLoads - input.inFlightAssetIds.length)
  const loadRequests = resolveLoadRequests(input.requests, cachedAssetIds, inFlightAssetIds, loadSlots)
  const cancelAssetIds = input.inFlightAssetIds
    .filter((assetId) => !requestedAssetIds.has(assetId))
    .sort()
  const evictionPlan = resolveEvictionPlan(input.cache, input.budget, requestedAssetIds)

  return {
    loadRequests,
    cancelAssetIds,
    evictAssetIds: evictionPlan.evictAssetIds,
    retainedBytes: evictionPlan.retainedBytes,
    evictedBytes: evictionPlan.evictedBytes,
  }
}

/**
 * Resolves load starts from uncached and not-yet-loading requests.
 * @param requests Asset requests for the current frame/window.
 * @param cachedAssetIds Cached asset id set.
 * @param inFlightAssetIds In-flight asset id set.
 * @param loadSlots Available load slots.
 */
function resolveLoadRequests(
  requests: readonly EngineStreamingAssetRequest[],
  cachedAssetIds: ReadonlySet<string>,
  inFlightAssetIds: ReadonlySet<string>,
  loadSlots: number,
): readonly EngineStreamingAssetRequest[] {
  if (loadSlots === 0) {
    return []
  }

  return requests
    .filter((request) => !cachedAssetIds.has(request.assetId) && !inFlightAssetIds.has(request.assetId))
    .sort(compareStreamingRequests)
    .slice(0, loadSlots)
}

/**
 * Resolves cache evictions until retained bytes fit the soft target or only protected entries remain.
 * @param cache Cached asset entries available for eviction.
 * @param budget Streaming budget limits.
 * @param requestedAssetIds Asset ids requested by the current frame/window.
 */
function resolveEvictionPlan(
  cache: readonly EngineStreamingCacheEntry[],
  budget: EngineStreamingBudget,
  requestedAssetIds: ReadonlySet<string>,
): Pick<EngineStreamingPlan, 'evictAssetIds' | 'retainedBytes' | 'evictedBytes'> {
  const effectiveTargetBytes = Math.min(budget.maxBytes, budget.targetBytes)
  let retainedBytes = cache.reduce((total, entry) => total + entry.byteSize, 0)
  let evictedBytes = 0
  const evictAssetIds: string[] = []

  if (retainedBytes <= budget.maxBytes) {
    return {
      evictAssetIds,
      retainedBytes,
      evictedBytes,
    }
  }

  const evictionCandidates = cache
    .filter((entry) => !entry.locked && !requestedAssetIds.has(entry.assetId))
    .sort(compareEvictionCandidates)

  for (const entry of evictionCandidates) {
    if (retainedBytes <= effectiveTargetBytes) {
      // Stop at the soft target so planner recovers headroom without over-evicting.
      break
    }

    retainedBytes -= entry.byteSize
    evictedBytes += entry.byteSize
    evictAssetIds.push(entry.assetId)
  }

  return {
    evictAssetIds,
    retainedBytes,
    evictedBytes,
  }
}

/**
 * Compares streaming requests by visibility, priority, distance, time, and id.
 * @param left Left request.
 * @param right Right request.
 */
function compareStreamingRequests(
  left: EngineStreamingAssetRequest,
  right: EngineStreamingAssetRequest,
): number {
  const visibleRank = Number(right.visible) - Number(left.visible)
  if (visibleRank !== 0) {
    return visibleRank
  }

  const priorityRank = right.priority - left.priority
  if (priorityRank !== 0) {
    return priorityRank
  }

  const distanceRank = left.distanceToCamera - right.distanceToCamera
  if (distanceRank !== 0) {
    return distanceRank
  }

  const timeRank = left.requestedAtMs - right.requestedAtMs
  if (timeRank !== 0) {
    return timeRank
  }

  return left.assetId.localeCompare(right.assetId)
}

/**
 * Compares cache entries by lock-free LRU order and id.
 * @param left Left cache entry.
 * @param right Right cache entry.
 */
function compareEvictionCandidates(
  left: EngineStreamingCacheEntry,
  right: EngineStreamingCacheEntry,
): number {
  const usageRank = left.lastUsedAtMs - right.lastUsedAtMs
  if (usageRank !== 0) {
    return usageRank
  }

  return left.assetId.localeCompare(right.assetId)
}
