/**
 * Tile-based rendering cache system for WebGL.
 *
 * Organizes scene into spatial tiles at different zoom levels,
 * caches rendered tiles as textures, and invalidates them when scene changes.
 */

import type { EngineRect } from '../../scene/types/types.ts'
import {
  createZoomBuckets,
  resolveEngineZoomPerformanceConfig,
  type EngineZoomPerformanceConfig,
} from '../zoomPerformance/index.ts'
import {
  getTileBounds,
  getTileSizeForZoom,
  getTilesIntersectingBounds,
  unionEngineRectBounds,
} from './tileMath.ts'
import {
  evictTileCacheEntries,
  resolveTileCacheStats,
} from './tileCacheEviction.ts'

const DEFAULT_TILE_SIZE_PX = 512
const DEFAULT_MAX_CACHE_SIZE = 64
const BYTES_PER_KIBIBYTE = 1024
const DEFAULT_SOFT_LIMIT_MIB = 256
const DEFAULT_HARD_LIMIT_MIB = 512
const DEFAULT_OVERSCAN_BORDER_PX = 240

/**
 * Zoom level index: determines tile size and viewport coverage.
 */
export type TileZoomLevel = 0 | 1 | 2 | 3 | 4 | 5

/**
 * Canonical tile coordinate for the progressive tile pipeline.
 */
export interface TileCoord {
  x: number
  y: number
  zoomBucket: number
}

/**
 * Stable cache key for tile texture entries.
 */
export type TileKey = string

/**
 * Key input keeps render-affecting dimensions explicit to avoid cache aliasing.
 */
export interface CreateTileKeyInput {
  tileX: number
  tileY: number
  zoomBucket: number
  dpr: number
  themeVersion: number
  renderVersion: number
}

/**
 * Key input for dimension-aware streaming cache addressing.
 */
export interface CreateTileStreamingKeyInput extends CreateTileKeyInput {
  /** Runtime dimension mode for this tile address. */
  dimensionMode?: '2d' | '3d' | 'hybrid'
  /** Stable camera pose hash used by 3D streaming variants. */
  cameraPoseHash?: string
  /** Optional depth-slice index used by layered 3D caches. */
  depthSlice?: number
}

/**
 * Progressive tile texture entry shape reused by compositor/scheduler services.
 */
export interface TileTextureEntry {
  key: TileKey
  coord: TileCoord
  texture: WebGLTexture
  width: number
  height: number
  byteSize: number
  worldBounds: EngineRect
  createdAt: number
  lastUsedAt: number
  dirty: boolean
  pending: boolean
  sourceZoomBucket: number
  renderVersion: number
}

export type TilePriority = 'urgent' | 'visible' | 'nearby' | 'background'

export type TileRenderReason =
  | 'missing'
  | 'dirty'
  | 'zoom-bucket-change'
  | 'preload'
  | 'overview-fallback'

/**
 * Scheduler-facing tile render work item used by upcoming FBO tile production.
 */
export interface TileRenderRequest {
  key: TileKey
  coord: TileCoord
  worldBounds: EngineRect
  priority: TilePriority
  reason: TileRenderReason
}

/**
 * Tile renderer contract kept async so implementations can defer GPU work.
 */
export interface TileRenderer {
  renderTile(request: TileRenderRequest): Promise<TileTextureEntry>
}

export type TileTextureResolveLevel = 'exact' | 'nearest' | 'overview' | 'blank'

export interface TileTextureResolveResult {
  entry: TileTextureEntry | null
  level: TileTextureResolveLevel
}

/**
 * Minimal lookup contract so fallback resolution can be reused across renderers.
 */
export interface TileTextureResolver {
  getExact(coord: TileCoord): TileTextureEntry | null
  getNearest?(coord: TileCoord, cameraZoom: number): TileTextureEntry | null
  getOverview?(coord: TileCoord): TileTextureEntry | null
}

export {
  createTileKey,
  createTileStreamingKey,
  getActiveZoomBuckets,
  getTileBounds,
  getTileSizeForZoom,
  getTilesIntersectingBounds,
  getViewportWorldBounds,
  getVisibleTilesForCamera,
  getWorldTileSize,
  getZoomBucket,
  getZoomLevelForScale,
  resolveTileTextureWithFallback,
  unionEngineRectBounds,
  ZOOM_BUCKETS,
} from './tileMath.ts'
export type {
  TileViewportCamera,
  VisibleTileProjection,
} from './tileMath.ts'


/**
 * Tile cache entry: represents a single rendered tile at a specific zoom level.
 */
export interface EngineTileCacheEntry {
  /** Zoom level (0-5) */
  zoomLevel: TileZoomLevel
  /** Tile grid coordinate X */
  gridX: number
  /** Tile grid coordinate Y */
  gridY: number
  /** World-space bounds of this tile */
  bounds: EngineRect
  /** Cached texture ID (WebGL texture handle, 0 = not yet rendered) */
  textureId: number
  /** Tile is dirty (needs re-render) */
  isDirty: boolean
  /** Last access timestamp (for LRU eviction) */
  lastAccessAt: number
  /** Byte size of texture data */
  textureBytes: number
}

export interface EngineTileConfig {
  /** Enable tile-based caching. Default: false. */
  enabled: boolean

  /** Tile size in pixels. Default: 512. Must be power of 2. */
  tileSizePx?: number

  /** Maximum tiles to cache in memory. Default: 64. */
  maxCacheSize?: number

  /** Soft texture memory limit in bytes. Default: 256MB. */
  softLimitBytes?: number

  /** Hard texture memory limit in bytes. Default: 512MB. */
  hardLimitBytes?: number

  /** Cache only static layers (shapes, backgrounds). Overlay always redraws. Default: true. */
  cacheStaticOnly?: boolean

  /** Overscan border in pixels (loads tiles beyond viewport). Default: 240. */
  overscanBorderPx?: number

  /** Enable overscan. Default: true. */
  overscanEnabled?: boolean

  /** Dynamic zoom bucket + strategy config for cache behavior. */
  zoomPerformance?: EngineZoomPerformanceConfig
}


/**
 * Tile cache manager: tracks rendered tiles, manages memory, and tracks invalidations.
 */
export class EngineTileCache {
  private config: Required<EngineTileConfig>
  private cacheMap: Map<string, EngineTileCacheEntry> = new Map()
  private dirtyTiles: Set<string> = new Set()
  private baseTileSize: number
  private zoomBuckets: number[]
  private activeBucketRadius: number

    /**
   * Handles function.
   * @param config Configuration values.
   */
constructor(config: EngineTileConfig) {
    this.config = {
      enabled: config.enabled,
      tileSizePx: config.tileSizePx ?? DEFAULT_TILE_SIZE_PX,
      maxCacheSize: config.maxCacheSize ?? DEFAULT_MAX_CACHE_SIZE,
      softLimitBytes: config.softLimitBytes ?? DEFAULT_SOFT_LIMIT_MIB * BYTES_PER_KIBIBYTE * BYTES_PER_KIBIBYTE,
      hardLimitBytes: config.hardLimitBytes ?? DEFAULT_HARD_LIMIT_MIB * BYTES_PER_KIBIBYTE * BYTES_PER_KIBIBYTE,
      cacheStaticOnly: config.cacheStaticOnly ?? true,
      overscanBorderPx: config.overscanBorderPx ?? DEFAULT_OVERSCAN_BORDER_PX,
      overscanEnabled: config.overscanEnabled ?? true,
      zoomPerformance: config.zoomPerformance ?? {},
    }
    this.baseTileSize = this.config.tileSizePx
    const resolvedZoomPerformance = resolveEngineZoomPerformanceConfig(this.config.zoomPerformance)
    this.zoomBuckets = createZoomBuckets(resolvedZoomPerformance)
    this.activeBucketRadius = resolvedZoomPerformance.activeBucketRadius
  }

  /** Return runtime-resolved zoom buckets for scheduler/runtime alignment. */
  getZoomBuckets() {
    return [...this.zoomBuckets]
  }

  /** Return active-bucket radius used by this cache instance. */
  getActiveBucketRadius() {
    return this.activeBucketRadius
  }

  /** Return whether viewport overscan is enabled for this cache instance. */
  getOverscanEnabled() {
    return this.config.overscanEnabled
  }

  /** Return configured CSS-pixel overscan border for tile coverage expansion. */
  getOverscanBorderPx() {
    return this.config.overscanBorderPx
  }

  /**
   * Get or create a tile cache key.
    * @param zoomLevel zoomLevel parameter.
 * @param gridX gridX parameter.
 * @param gridY gridY parameter.
*/
  private getTileKey(zoomLevel: TileZoomLevel, gridX: number, gridY: number): string {
    return `z${zoomLevel}:${gridX},${gridY}`
  }

    /**
   * Handles getTileSizePx.
   * @param zoomLevel zoomLevel parameter.
   */
getTileSizePx(zoomLevel: TileZoomLevel): number {
    return getTileSizeForZoom(zoomLevel, this.baseTileSize)
  }

  /**
   * Get cached tile entry, or null if not cached.
    * @param zoomLevel zoomLevel parameter.
 * @param gridX gridX parameter.
 * @param gridY gridY parameter.
*/
  getEntry(zoomLevel: TileZoomLevel, gridX: number, gridY: number): EngineTileCacheEntry | null {
    const key = this.getTileKey(zoomLevel, gridX, gridY)
    const entry = this.cacheMap.get(key)
    if (entry) {
      entry.lastAccessAt = performance.now()
    }
    return entry ?? null
  }

    /**
   * Handles upsertEntry.
   * @param input Input payload for this operation.
   */
upsertEntry(input: {
    zoomLevel: TileZoomLevel
    gridX: number
    gridY: number
    textureId: number
    textureBytes: number
  }): EngineTileCacheEntry {
    const key = this.getTileKey(input.zoomLevel, input.gridX, input.gridY)
    const tileSizePx = this.getTileSizeForZoomInternal(input.zoomLevel)
    const nextEntry: EngineTileCacheEntry = {
      zoomLevel: input.zoomLevel,
      gridX: input.gridX,
      gridY: input.gridY,
      bounds: getTileBounds(input.gridX, input.gridY, tileSizePx),
      textureId: input.textureId,
      textureBytes: Math.max(0, input.textureBytes),
      isDirty: false,
      lastAccessAt: performance.now(),
    }

    this.cacheMap.set(key, nextEntry)
    this.dirtyTiles.delete(key)
    this.evictIfNeeded(input.zoomLevel)
    return nextEntry
  }

  /**
   * Mark tiles intersecting bounds as dirty (need re-render).
   * Called when scene changes (element added/moved/deleted).
    * @param bounds Bounds data.
 * @param zoomLevel zoomLevel parameter.
*/
  invalidateTilesInBounds(bounds: EngineRect, zoomLevel: TileZoomLevel): void {
    if (!this.config.enabled) return

    const tileSizePx = this.getTileSizeForZoomInternal(zoomLevel)
    const tiles = getTilesIntersectingBounds(bounds, tileSizePx)

    for (const { gridX, gridY } of tiles) {
      const key = this.getTileKey(zoomLevel, gridX, gridY)
      const entry = this.cacheMap.get(key)
      if (entry) {
        entry.isDirty = true
        this.dirtyTiles.add(key)
      }
    }
  }

  /**
   * Use old/new bounds union to keep transform edits localized without full cache flush.
    * @param previousBounds previousBounds parameter.
 * @param nextBounds nextBounds parameter.
 * @param zoomLevel zoomLevel parameter.
*/
  invalidateTilesForBoundsDelta(
    previousBounds: EngineRect,
    nextBounds: EngineRect,
    zoomLevel: TileZoomLevel,
  ): void {
    if (!this.config.enabled) return
    const dirtyBounds = unionEngineRectBounds(previousBounds, nextBounds)
    this.invalidateTilesInBounds(dirtyBounds, zoomLevel)
  }

    /**
   * Handles invalidateTile.
   * @param zoomLevel zoomLevel parameter.
   * @param gridX gridX parameter.
   * @param gridY gridY parameter.
   */
invalidateTile(zoomLevel: TileZoomLevel, gridX: number, gridY: number): void {
    if (!this.config.enabled) return

    const key = this.getTileKey(zoomLevel, gridX, gridY)
    const entry = this.cacheMap.get(key)
    if (!entry) {
      return
    }

    entry.isDirty = true
    this.dirtyTiles.add(key)
  }

  /**
   * Mark every cached tile dirty so the next visible pass rebuilds textures.
   * Use this for global quality lane switches (for example DPR changes)
   * where stale tiles should not be reused across frames.
   */
  markAllTilesDirty(): void {
    if (!this.config.enabled) return

    for (const [key, entry] of this.cacheMap.entries()) {
      entry.isDirty = true
      this.dirtyTiles.add(key)
    }
  }

    /**
   * Handles getVisibleTiles.
   * @param viewportBounds viewportBounds parameter.
   * @param zoomLevel zoomLevel parameter.
   */
getVisibleTiles(
    viewportBounds: EngineRect,
    zoomLevel: TileZoomLevel,
  ): Array<{ zoomLevel: TileZoomLevel; gridX: number; gridY: number; bounds: EngineRect }> {
    const tileSizePx = this.getTileSizeForZoomInternal(zoomLevel)
    const tiles = getTilesIntersectingBounds(viewportBounds, tileSizePx)
    return tiles.map(({gridX, gridY}) => ({
      zoomLevel,
      gridX,
      gridY,
      bounds: getTileBounds(gridX, gridY, tileSizePx),
    }))
  }

  /**
   * Clear all tiles when zoom level changes.
    * @param zoomLevel zoomLevel parameter.
*/
  clearZoomLevel(zoomLevel: TileZoomLevel): void {
    if (!this.config.enabled) return

    const keysToDelete: string[] = []
    for (const [key, entry] of this.cacheMap.entries()) {
      if (entry.zoomLevel === zoomLevel) {
        keysToDelete.push(key)
      }
    }

    for (const key of keysToDelete) {
      this.cacheMap.delete(key)
      this.dirtyTiles.delete(key)
    }
  }

  /**
   * Get all dirty tiles that need re-rendering.
   */
  getDirtyTiles(): Array<{ zoomLevel: TileZoomLevel; gridX: number; gridY: number }> {
    const tiles: Array<{ zoomLevel: TileZoomLevel; gridX: number; gridY: number }> = []
    for (const key of this.dirtyTiles) {
      const entry = this.cacheMap.get(key)
      if (entry) {
        tiles.push({
          zoomLevel: entry.zoomLevel,
          gridX: entry.gridX,
          gridY: entry.gridY,
        })
      }
    }
    return tiles
  }

  /**
   * Mark dirty tiles as clean after re-rendering.
   */
  clearDirtyFlags(): void {
    for (const key of this.dirtyTiles) {
      const entry = this.cacheMap.get(key)
      if (entry) {
        entry.isDirty = false
      }
    }
    this.dirtyTiles.clear()
  }

  /**
   * Evict oldest tiles if cache exceeds max size (LRU).
    * @param currentZoomLevel currentZoomLevel parameter.
*/
  evictIfNeeded(currentZoomLevel?: TileZoomLevel): void {
    evictTileCacheEntries({
      cacheMap: this.cacheMap,
      dirtyTiles: this.dirtyTiles,
      maxCacheSize: this.config.maxCacheSize,
      softLimitBytes: this.config.softLimitBytes,
      hardLimitBytes: this.config.hardLimitBytes,
      currentZoomLevel,
    })
  }

  /**
   * Get cache statistics for diagnostics.
   */
  getStats() {
    return resolveTileCacheStats({
      cacheMap: this.cacheMap,
      dirtyTiles: this.dirtyTiles,
      maxCacheSize: this.config.maxCacheSize,
      softLimitBytes: this.config.softLimitBytes,
      hardLimitBytes: this.config.hardLimitBytes,
    })
  }

  private getTileSizeForZoomInternal(zoomLevel: TileZoomLevel) {
    return getTileSizeForZoom(zoomLevel, this.baseTileSize)
  }
}
