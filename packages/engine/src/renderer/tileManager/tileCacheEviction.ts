import type { TileZoomLevel, EngineTileCacheEntry } from './tileManager.ts'

/**
 * Computes total resident texture bytes from cache entries.
 * @param cacheMap Tile cache map.
 * @returns Total texture bytes.
 */
export function resolveTileCacheTotalTextureBytes(cacheMap: Map<string, EngineTileCacheEntry>) {
  return Array.from(cacheMap.values()).reduce((sum, entry) => sum + entry.textureBytes, 0)
}

/**
 * Selects one eviction candidate by zoom affinity, dirty-first, then LRU.
 * @param cacheMap Tile cache map.
 * @param currentZoomLevel Current zoom level used for affinity preservation.
 * @returns Candidate cache key and entry, or null when empty.
 */
export function resolveTileCacheEvictionCandidate(
  cacheMap: Map<string, EngineTileCacheEntry>,
  currentZoomLevel?: TileZoomLevel,
): { key: string; entry: EngineTileCacheEntry } | null {
  const entries = Array.from(cacheMap.entries())
  if (entries.length === 0) {
    return null
  }

  entries.sort((left, right) => {
    const leftCurrentZoom = typeof currentZoomLevel === 'number' && left[1].zoomLevel === currentZoomLevel
    const rightCurrentZoom = typeof currentZoomLevel === 'number' && right[1].zoomLevel === currentZoomLevel
    if (leftCurrentZoom !== rightCurrentZoom) {
      return leftCurrentZoom ? 1 : -1
    }

    if (left[1].isDirty !== right[1].isDirty) {
      return left[1].isDirty ? -1 : 1
    }

    return left[1].lastAccessAt - right[1].lastAccessAt
  })

  const [key, entry] = entries[0]
  return { key, entry }
}

/**
 * Evicts cache entries until count/byte thresholds are satisfied.
 * @param options Eviction options and cache state.
 */
export function evictTileCacheEntries(options: {
  cacheMap: Map<string, EngineTileCacheEntry>
  dirtyTiles: Set<string>
  maxCacheSize: number
  softLimitBytes: number
  hardLimitBytes: number
  currentZoomLevel?: TileZoomLevel
}) {
  const softLimitBytes = Math.max(1, options.softLimitBytes)
  const hardLimitBytes = Math.max(softLimitBytes, options.hardLimitBytes)

  while (
    options.cacheMap.size > options.maxCacheSize ||
    resolveTileCacheTotalTextureBytes(options.cacheMap) > softLimitBytes
  ) {
    const evictionCandidate = resolveTileCacheEvictionCandidate(options.cacheMap, options.currentZoomLevel)
    if (!evictionCandidate) {
      break
    }

    options.cacheMap.delete(evictionCandidate.key)
    options.dirtyTiles.delete(evictionCandidate.key)

    if (
      resolveTileCacheTotalTextureBytes(options.cacheMap) <= hardLimitBytes &&
      options.cacheMap.size <= options.maxCacheSize
    ) {
      break
    }
  }
}

/**
 * Builds cache diagnostics stats payload from cache state and configured limits.
 * @param options Cache state and byte limits.
 * @returns Cache diagnostics snapshot.
 */
export function resolveTileCacheStats(options: {
  cacheMap: Map<string, EngineTileCacheEntry>
  dirtyTiles: Set<string>
  maxCacheSize: number
  softLimitBytes: number
  hardLimitBytes: number
}) {
  const totalTextureBytes = resolveTileCacheTotalTextureBytes(options.cacheMap)
  return {
    tileCount: options.cacheMap.size,
    dirtyCount: options.dirtyTiles.size,
    maxCacheSize: options.maxCacheSize,
    totalTextureBytes,
    softLimitBytes: options.softLimitBytes,
    hardLimitBytes: options.hardLimitBytes,
    overSoftLimit: totalTextureBytes > options.softLimitBytes,
    overHardLimit: totalTextureBytes > options.hardLimitBytes,
  }
}