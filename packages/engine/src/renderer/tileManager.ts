/**
 * Tile-based rendering cache system for WebGL.
 *
 * Organizes scene into spatial tiles at different zoom levels,
 * caches rendered tiles as textures, and invalidates them when scene changes.
 */

import type { EngineRect } from '../scene/types.ts'

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
export const ZOOM_BUCKETS = [
  1 / 64,
  1 / 32,
  1 / 16,
  1 / 8,
  1 / 4,
  1 / 2,
  1,
  2,
  4,
  8,
  16,
  32,
] as const

/**
 * Resolve the nearest canonical zoom bucket using log-space distance.
 */
export function getZoomBucket(zoom: number): number {
  const safeZoom = Number.isFinite(zoom) && zoom > 0 ? zoom : ZOOM_BUCKETS[0]
  let bestBucket = ZOOM_BUCKETS[0]
  let bestDiff = Math.abs(Math.log2(safeZoom / bestBucket))

  for (const bucket of ZOOM_BUCKETS) {
    const diff = Math.abs(Math.log2(safeZoom / bucket))
    if (diff < bestDiff) {
      bestBucket = bucket
      bestDiff = diff
    }
  }

  return bestBucket
}

/**
 * Keep only the previous/current/next bucket active for near-zoom reuse.
 */
export function getActiveZoomBuckets(zoom: number): number[] {
  const current = getZoomBucket(zoom)
  const currentIndex = ZOOM_BUCKETS.indexOf(current as typeof ZOOM_BUCKETS[number])
  const previous = ZOOM_BUCKETS[currentIndex - 1]
  const next = ZOOM_BUCKETS[currentIndex + 1]

  return [previous, current, next].filter((bucket): bucket is number => typeof bucket === 'number')
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
 */
export function getViewportWorldBounds(camera: TileViewportCamera, overscanCssPx = 0): EngineRect {
  const safeScale = Number.isFinite(camera.scale) && camera.scale > 0 ? camera.scale : 1
  const overscanWorld = Math.max(0, overscanCssPx) / safeScale

  return {
    x: -camera.offsetX / safeScale - overscanWorld,
    y: -camera.offsetY / safeScale - overscanWorld,
    width: camera.viewportWidth / safeScale + overscanWorld * 2,
    height: camera.viewportHeight / safeScale + overscanWorld * 2,
  }
}

/**
 * Convert CSS tile size into world-space size for a given zoom bucket.
 */
export function getWorldTileSize(tileSizeCssPx: number, zoomBucket: number): number {
  const safeTileSize = Math.max(1, tileSizeCssPx)
  const safeZoomBucket = Number.isFinite(zoomBucket) && zoomBucket > 0 ? zoomBucket : ZOOM_BUCKETS[0]
  return safeTileSize / safeZoomBucket
}

/**
 * Enumerate visible world-space tiles for the current camera and zoom bucket.
 */
export function getVisibleTilesForCamera(input: {
  camera: TileViewportCamera
  zoomBucket: number
  tileSizeCssPx?: number
  overscanCssPx?: number
}): VisibleTileProjection[] {
  const tileSizeCssPx = input.tileSizeCssPx ?? 512
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

const ZOOM_BUCKET_EDGE_SCALES: readonly number[] = [0.125, 0.25, 0.5, 1, 2]
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
}

/**
 * Computes the tile size for a given zoom level.
 * Lower zoom = smaller tiles (zoomed out = coarse tiles).
 * Higher zoom = larger tiles (zoomed in = fine tiles).
 */
export function getTileSizeForZoom(zoomLevel: TileZoomLevel, baseTileSize: number): number {
  // Zoom 0 (most zoomed out): base / 4 = coarsest
  // Zoom 5 (most zoomed in): base = finest
  const divisor = 2 ** (5 - zoomLevel)
  return Math.max(128, baseTileSize / divisor)
}

/**
 * Determines which zoom level to use based on viewport scale.
 * Scale typically ranges [0.0625 (far out) to 4.0 (zoomed in)].
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
      : ZOOM_BUCKET_EDGE_SCALES[previousZoomLevel - 1]
    const upperEdge = previousZoomLevel >= 5
      ? Number.POSITIVE_INFINITY
      : ZOOM_BUCKET_EDGE_SCALES[previousZoomLevel]
    const lowerBound = previousZoomLevel === 0
      ? 0
      : lowerEdge * (1 - ZOOM_BUCKET_HYSTERESIS_RATIO)
    const upperBound = previousZoomLevel >= 5
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
  if (absScale < 0.125) return 0
  if (absScale < 0.25) return 1
  if (absScale < 0.5) return 2
  if (absScale < 1.0) return 3
  if (absScale < 2.0) return 4
  return 5
}

/**
 * Computes world-space tile bounds from grid coordinates.
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

  constructor(config: EngineTileConfig) {
    this.config = {
      enabled: config.enabled,
      tileSizePx: config.tileSizePx ?? 512,
      maxCacheSize: config.maxCacheSize ?? 64,
      softLimitBytes: config.softLimitBytes ?? 256 * 1024 * 1024,
      hardLimitBytes: config.hardLimitBytes ?? 512 * 1024 * 1024,
      cacheStaticOnly: config.cacheStaticOnly ?? true,
      overscanBorderPx: config.overscanBorderPx ?? 240,
      overscanEnabled: config.overscanEnabled ?? true,
    }
    this.baseTileSize = this.config.tileSizePx
  }

  /**
   * Get or create a tile cache key.
   */
  private getTileKey(zoomLevel: TileZoomLevel, gridX: number, gridY: number): string {
    return `z${zoomLevel}:${gridX},${gridY}`
  }

  getTileSizePx(zoomLevel: TileZoomLevel): number {
    return getTileSizeForZoom(zoomLevel, this.baseTileSize)
  }

  /**
   * Get cached tile entry, or null if not cached.
   */
  getEntry(zoomLevel: TileZoomLevel, gridX: number, gridY: number): EngineTileCacheEntry | null {
    const key = this.getTileKey(zoomLevel, gridX, gridY)
    const entry = this.cacheMap.get(key)
    if (entry) {
      entry.lastAccessAt = performance.now()
    }
    return entry ?? null
  }

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

  private getTileSizeForZoomInternal(zoomLevel: TileZoomLevel) {
    return getTileSizeForZoom(zoomLevel, this.baseTileSize)
  }
}
