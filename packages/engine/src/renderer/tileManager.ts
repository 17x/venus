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
    this.evictIfNeeded()
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
  evictIfNeeded(): void {
    if (this.cacheMap.size <= this.config.maxCacheSize) return

    // Sort by least-recently-used
    const entries = Array.from(this.cacheMap.entries())
      .sort((a, b) => a[1].lastAccessAt - b[1].lastAccessAt)

    // Remove oldest until at target size
    const toRemove = entries.length - this.config.maxCacheSize
    for (let i = 0; i < toRemove; i++) {
      const [key] = entries[i]
      this.cacheMap.delete(key)
      this.dirtyTiles.delete(key)
    }
  }

  /**
   * Get cache statistics for diagnostics.
   */
  getStats() {
    return {
      tileCount: this.cacheMap.size,
      dirtyCount: this.dirtyTiles.size,
      maxCacheSize: this.config.maxCacheSize,
      totalTextureBytes: Array.from(this.cacheMap.values()).reduce((sum, e) => sum + e.textureBytes, 0),
    }
  }

  private getTileSizeForZoomInternal(zoomLevel: TileZoomLevel) {
    return getTileSizeForZoom(zoomLevel, this.baseTileSize)
  }
}
