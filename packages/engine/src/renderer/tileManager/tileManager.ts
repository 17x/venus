/**
 * Tile-based rendering cache system for WebGL.
 *
 * Organizes scene into spatial tiles at different zoom levels,
 * caches rendered tiles as textures, and invalidates them when scene changes.
 */

import type { EngineRect } from '../../scene/types/types.ts'
import {
  createZoomBuckets,
  DEFAULT_ENGINE_ZOOM_PERFORMANCE_CONFIG,
  resolveActiveZoomBuckets,
  resolveEngineZoomPerformanceConfig,
  resolveNearestZoomBucket,
  type EngineZoomPerformanceConfig,
} from '../zoomPerformance/index.ts'

const TILE_ZOOM_LEVEL_ONE = 1
const TILE_ZOOM_LEVEL_TWO = 2
const TILE_ZOOM_LEVEL_THREE = 3
const TILE_ZOOM_LEVEL_FOUR = 4
const TILE_ZOOM_LEVEL_FIVE = 5
const VIEWPORT_OVERSCAN_DOUBLE = 2
const DEFAULT_VISIBLE_TILE_SIZE_CSS_PX = 512
const ZOOM_BUCKET_EDGE_SCALE_L0 = 0.125
const ZOOM_BUCKET_EDGE_SCALE_L1 = 0.25
const ZOOM_BUCKET_EDGE_SCALE_L2 = 0.5
const ZOOM_BUCKET_EDGE_SCALE_L3 = 1
const ZOOM_BUCKET_EDGE_SCALE_L4 = 2
const MIN_TILE_SIZE_PX = 128
const DEFAULT_TILE_SIZE_PX = 512
const DEFAULT_MAX_CACHE_SIZE = 64
const BYTES_PER_KIBIBYTE = 1024
const DEFAULT_SOFT_LIMIT_MIB = 256
const DEFAULT_HARD_LIMIT_MIB = 512
const DEFAULT_OVERSCAN_BORDER_PX = 240

/**
 * Zoom level index: determines tile size and viewport coverage.
 */
export type TileZoomLevel =
  | 0
  | typeof TILE_ZOOM_LEVEL_ONE
  | typeof TILE_ZOOM_LEVEL_TWO
  | typeof TILE_ZOOM_LEVEL_THREE
  | typeof TILE_ZOOM_LEVEL_FOUR
  | typeof TILE_ZOOM_LEVEL_FIVE

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

/**
 * Resolve tiles by strict priority: exact -> nearest -> overview -> blank.
  * @param input Input payload for this operation.
*/
export function resolveTileTextureWithFallback(input: {
  resolver: TileTextureResolver
  coord: TileCoord
  cameraZoom: number
}): TileTextureResolveResult {
  const exact = input.resolver.getExact(input.coord)
  if (exact && !exact.dirty) {
    return {
      entry: exact,
      level: 'exact',
    }
  }

  const nearest = input.resolver.getNearest?.(input.coord, input.cameraZoom) ?? null
  if (nearest && !nearest.dirty) {
    return {
      entry: nearest,
      level: 'nearest',
    }
  }

  const overview = input.resolver.getOverview?.(input.coord) ?? null
  if (overview) {
    return {
      entry: overview,
      level: 'overview',
    }
  }

  return {
    entry: null,
    level: 'blank',
  }
}

/**
 * Compose a stable tile key that is safe across zoom/theme/render variants.
  * @param input Input payload for this operation.
*/
export function createTileKey(input: CreateTileKeyInput): TileKey {
  return [
    input.zoomBucket,
    input.tileX,
    input.tileY,
    input.dpr,
    input.themeVersion,
    input.renderVersion,
  ].join(':')
}

/**
 * Canonical zoom buckets for the progressive tile pipeline (2% to 3000%).
 */
export const ZOOM_BUCKETS = createZoomBuckets({
  minZoom: DEFAULT_ENGINE_ZOOM_PERFORMANCE_CONFIG.minZoom,
  maxZoom: DEFAULT_ENGINE_ZOOM_PERFORMANCE_CONFIG.maxZoom,
  bucketStep: DEFAULT_ENGINE_ZOOM_PERFORMANCE_CONFIG.bucketStep,
})

/**
 * Resolve the nearest canonical zoom bucket using log-space distance.
  * @param zoom zoom parameter.
 * @param buckets buckets parameter.
*/
export function getZoomBucket(
  zoom: number,
  buckets: readonly number[] = ZOOM_BUCKETS,
): number {
  return resolveNearestZoomBucket(zoom, buckets)
}

/**
 * Keep only the previous/current/next bucket active for near-zoom reuse.
  * @param zoom zoom parameter.
 * @param buckets buckets parameter.
 * @param activeBucketRadius activeBucketRadius parameter.
*/
export function getActiveZoomBuckets(
  zoom: number,
  buckets: readonly number[] = ZOOM_BUCKETS,
  activeBucketRadius = DEFAULT_ENGINE_ZOOM_PERFORMANCE_CONFIG.activeBucketRadius,
): number[] {
  return resolveActiveZoomBuckets({
    zoom,
    buckets,
    activeBucketRadius,
  })
}

/**
 * Minimal camera contract needed to project viewport coverage into world space.
 */
export interface TileViewportCamera {
  viewportWidth: number
  viewportHeight: number
  offsetX: number
  offsetY: number
  scale: number
}

/**
 * Visible tile projection output used by compositor scheduling.
 */
export interface VisibleTileProjection {
  coord: TileCoord
  worldBounds: EngineRect
}

/**
 * Resolve a world-space viewport rect from camera offsets/scale.
  * @param camera Camera state snapshot.
 * @param overscanCssPx overscanCssPx parameter.
*/
export function getViewportWorldBounds(camera: TileViewportCamera, overscanCssPx = 0): EngineRect {
  const safeScale = Number.isFinite(camera.scale) && camera.scale > 0 ? camera.scale : 1
  const overscanWorld = Math.max(0, overscanCssPx) / safeScale

  return {
    x: -camera.offsetX / safeScale - overscanWorld,
    y: -camera.offsetY / safeScale - overscanWorld,
    width: camera.viewportWidth / safeScale + overscanWorld * VIEWPORT_OVERSCAN_DOUBLE,
    height: camera.viewportHeight / safeScale + overscanWorld * VIEWPORT_OVERSCAN_DOUBLE,
  }
}

/**
 * Convert CSS tile size into world-space size for a given zoom bucket.
  * @param tileSizeCssPx tileSizeCssPx parameter.
 * @param zoomBucket zoomBucket parameter.
*/
export function getWorldTileSize(tileSizeCssPx: number, zoomBucket: number): number {
  const safeTileSize = Math.max(1, tileSizeCssPx)
  const safeZoomBucket = Number.isFinite(zoomBucket) && zoomBucket > 0 ? zoomBucket : ZOOM_BUCKETS[0]
  return safeTileSize / safeZoomBucket
}

/**
 * Enumerate visible world-space tiles for the current camera and zoom bucket.
  * @param input Input payload for this operation.
*/
export function getVisibleTilesForCamera(input: {
  camera: TileViewportCamera
  zoomBucket: number
  tileSizeCssPx?: number
  overscanCssPx?: number
}): VisibleTileProjection[] {
  const tileSizeCssPx = input.tileSizeCssPx ?? DEFAULT_VISIBLE_TILE_SIZE_CSS_PX
  const worldTileSize = getWorldTileSize(tileSizeCssPx, input.zoomBucket)
  const viewportWorldBounds = getViewportWorldBounds(input.camera, input.overscanCssPx ?? 0)
  const minTileX = Math.floor(viewportWorldBounds.x / worldTileSize)
  const minTileY = Math.floor(viewportWorldBounds.y / worldTileSize)
  const maxTileX = Math.floor((viewportWorldBounds.x + viewportWorldBounds.width) / worldTileSize)
  const maxTileY = Math.floor((viewportWorldBounds.y + viewportWorldBounds.height) / worldTileSize)
  const visibleTiles: VisibleTileProjection[] = []

  for (let tileX = minTileX; tileX <= maxTileX; tileX++) {
    for (let tileY = minTileY; tileY <= maxTileY; tileY++) {
      visibleTiles.push({
        coord: {
          x: tileX,
          y: tileY,
          zoomBucket: input.zoomBucket,
        },
        worldBounds: {
          x: tileX * worldTileSize,
          y: tileY * worldTileSize,
          width: worldTileSize,
          height: worldTileSize,
        },
      })
    }
  }

  return visibleTiles
}

const ZOOM_BUCKET_EDGE_SCALES: readonly number[] = [
  ZOOM_BUCKET_EDGE_SCALE_L0,
  ZOOM_BUCKET_EDGE_SCALE_L1,
  ZOOM_BUCKET_EDGE_SCALE_L2,
  ZOOM_BUCKET_EDGE_SCALE_L3,
  ZOOM_BUCKET_EDGE_SCALE_L4,
]
const ZOOM_BUCKET_HYSTERESIS_RATIO = 0.08

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
 * Computes the tile size for a given zoom level.
 * Lower zoom = smaller tiles (zoomed out = coarse tiles).
 * Higher zoom = larger tiles (zoomed in = fine tiles).
  * @param zoomLevel zoomLevel parameter.
 * @param baseTileSize baseTileSize parameter.
*/
export function getTileSizeForZoom(zoomLevel: TileZoomLevel, baseTileSize: number): number {
  // Zoom 0 (most zoomed out): base / 4 = coarsest
  // Zoom 5 (most zoomed in): base = finest
  const divisor = TILE_ZOOM_LEVEL_TWO ** (TILE_ZOOM_LEVEL_FIVE - zoomLevel)
  return Math.max(MIN_TILE_SIZE_PX, baseTileSize / divisor)
}

/**
 * Determines which zoom level to use based on viewport scale.
 * Scale typically ranges [0.0625 (far out) to 4.0 (zoomed in)].
  * @param scale Scale value.
 * @param previousZoomLevel previousZoomLevel parameter.
*/
export function getZoomLevelForScale(
  scale: number,
  previousZoomLevel?: TileZoomLevel | null,
): TileZoomLevel {
  const absScale = Math.max(0, Math.abs(scale))

  // Keep the previous zoom bucket while scale remains inside a small
  // hysteresis window so minor zoom oscillation does not thrash tile caches.
  if (typeof previousZoomLevel === 'number') {
    const lowerEdge = previousZoomLevel === 0
      ? 0
      : ZOOM_BUCKET_EDGE_SCALES[previousZoomLevel - TILE_ZOOM_LEVEL_ONE]
    const upperEdge = previousZoomLevel >= TILE_ZOOM_LEVEL_FIVE
      ? Number.POSITIVE_INFINITY
      : ZOOM_BUCKET_EDGE_SCALES[previousZoomLevel]
    const lowerBound = previousZoomLevel === 0
      ? 0
      : lowerEdge * (1 - ZOOM_BUCKET_HYSTERESIS_RATIO)
    const upperBound = previousZoomLevel >= TILE_ZOOM_LEVEL_FIVE
      ? Number.POSITIVE_INFINITY
      : upperEdge * (1 + ZOOM_BUCKET_HYSTERESIS_RATIO)
    if (absScale >= lowerBound && absScale < upperBound) {
      return previousZoomLevel
    }
  }

  // Map scale to zoom level 0-5
  // scale 0.0625 -> level 0
  // scale 0.125 -> level 0
  // scale 0.25 -> level 1
  // scale 0.5 -> level 2
  // scale 1.0 -> level 3
  // scale 2.0 -> level 4
  // scale 4.0 -> level 5
  if (absScale < ZOOM_BUCKET_EDGE_SCALE_L0) return 0
  if (absScale < ZOOM_BUCKET_EDGE_SCALE_L1) return TILE_ZOOM_LEVEL_ONE
  if (absScale < ZOOM_BUCKET_EDGE_SCALE_L2) return TILE_ZOOM_LEVEL_TWO
  if (absScale < ZOOM_BUCKET_EDGE_SCALE_L3) return TILE_ZOOM_LEVEL_THREE
  if (absScale < ZOOM_BUCKET_EDGE_SCALE_L4) return TILE_ZOOM_LEVEL_FOUR
  return TILE_ZOOM_LEVEL_FIVE
}

/**
 * Computes world-space tile bounds from grid coordinates.
  * @param gridX gridX parameter.
 * @param gridY gridY parameter.
 * @param tileSizePx tileSizePx parameter.
*/
export function getTileBounds(
  gridX: number,
  gridY: number,
  tileSizePx: number,
): EngineRect {
  return {
    x: gridX * tileSizePx,
    y: gridY * tileSizePx,
    width: tileSizePx,
    height: tileSizePx,
  }
}

/**
 * Finds tiles that intersect a world-space rectangle (AABB).
 * Used to invalidate tiles when scene changes.
  * @param bounds Bounds data.
 * @param tileSizePx tileSizePx parameter.
*/
export function getTilesIntersectingBounds(
  bounds: EngineRect,
  tileSizePx: number,
): Array<{ gridX: number; gridY: number }> {
  const minGridX = Math.floor(bounds.x / tileSizePx)
  const minGridY = Math.floor(bounds.y / tileSizePx)
  const maxGridX = Math.floor((bounds.x + bounds.width) / tileSizePx)
  const maxGridY = Math.floor((bounds.y + bounds.height) / tileSizePx)

  const tiles: Array<{ gridX: number; gridY: number }> = []
  for (let gx = minGridX; gx <= maxGridX; gx++) {
    for (let gy = minGridY; gy <= maxGridY; gy++) {
      tiles.push({ gridX: gx, gridY: gy })
    }
  }
  return tiles
}

/**
 * Union two world-space bounds so old/new geometry updates invalidate one area.
  * @param previous previous parameter.
 * @param next next parameter.
*/
export function unionEngineRectBounds(previous: EngineRect, next: EngineRect): EngineRect {
  const minX = Math.min(previous.x, next.x)
  const minY = Math.min(previous.y, next.y)
  const maxX = Math.max(previous.x + previous.width, next.x + next.width)
  const maxY = Math.max(previous.y + previous.height, next.y + next.height)
  return {
    x: minX,
    y: minY,
    width: Math.max(0, maxX - minX),
    height: Math.max(0, maxY - minY),
  }
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
    const softLimitBytes = Math.max(1, this.config.softLimitBytes)
    const hardLimitBytes = Math.max(softLimitBytes, this.config.hardLimitBytes)

    // Evict while either count or byte budgets are above thresholds.
    while (
      this.cacheMap.size > this.config.maxCacheSize ||
      this.getTotalTextureBytes() > softLimitBytes
    ) {
      const evictionCandidate = this.selectEvictionCandidate(currentZoomLevel)
      if (!evictionCandidate) {
        break
      }

      this.cacheMap.delete(evictionCandidate.key)
      this.dirtyTiles.delete(evictionCandidate.key)

      // If we are still above hard limit, continue aggressively in the same loop.
      if (this.getTotalTextureBytes() <= hardLimitBytes && this.cacheMap.size <= this.config.maxCacheSize) {
        break
      }
    }
  }

  /**
   * Get cache statistics for diagnostics.
   */
  getStats() {
    const totalTextureBytes = this.getTotalTextureBytes()
    return {
      tileCount: this.cacheMap.size,
      dirtyCount: this.dirtyTiles.size,
      maxCacheSize: this.config.maxCacheSize,
      totalTextureBytes,
      softLimitBytes: this.config.softLimitBytes,
      hardLimitBytes: this.config.hardLimitBytes,
      overSoftLimit: totalTextureBytes > this.config.softLimitBytes,
      overHardLimit: totalTextureBytes > this.config.hardLimitBytes,
    }
  }

  private getTotalTextureBytes() {
    return Array.from(this.cacheMap.values()).reduce((sum, entry) => sum + entry.textureBytes, 0)
  }

    /**
   * Handles selectEvictionCandidate.
   * @param currentZoomLevel currentZoomLevel parameter.
   */
private selectEvictionCandidate(currentZoomLevel?: TileZoomLevel): { key: string; entry: EngineTileCacheEntry } | null {
    const entries = Array.from(this.cacheMap.entries())
    if (entries.length === 0) {
      return null
    }

    // Eviction priority: non-current zoom -> dirty -> least recently used.
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
   * Handles getTileSizeForZoomInternal.
   * @param zoomLevel zoomLevel parameter.
   */
private getTileSizeForZoomInternal(zoomLevel: TileZoomLevel) {
    return getTileSizeForZoom(zoomLevel, this.baseTileSize)
  }
}
