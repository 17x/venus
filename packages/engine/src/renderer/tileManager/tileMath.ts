import type {
  CreateTileKeyInput,
  CreateTileStreamingKeyInput,
  TileCoord,
  TileKey,
  TileTextureResolveResult,
  TileTextureResolver,
  TileZoomLevel,
} from './tileManager.ts'
import type { EngineRect } from '../../scene/types/types.ts'
import {
  createZoomBuckets,
  DEFAULT_ENGINE_ZOOM_PERFORMANCE_CONFIG,
  resolveActiveZoomBuckets,
  resolveNearestZoomBucket,
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

const ZOOM_BUCKET_EDGE_SCALES: readonly number[] = [
  ZOOM_BUCKET_EDGE_SCALE_L0,
  ZOOM_BUCKET_EDGE_SCALE_L1,
  ZOOM_BUCKET_EDGE_SCALE_L2,
  ZOOM_BUCKET_EDGE_SCALE_L3,
  ZOOM_BUCKET_EDGE_SCALE_L4,
]
const ZOOM_BUCKET_HYSTERESIS_RATIO = 0.08

/**
 * Minimal camera contract needed to project viewport coverage into world space.
 */
export interface TileViewportCamera {
  /** Viewport width in CSS pixels. */
  viewportWidth: number
  /** Viewport height in CSS pixels. */
  viewportHeight: number
  /** Viewport X offset in world-to-screen transform. */
  offsetX: number
  /** Viewport Y offset in world-to-screen transform. */
  offsetY: number
  /** Current viewport scale factor. */
  scale: number
}

/**
 * Visible tile projection output used by compositor scheduling.
 */
export interface VisibleTileProjection {
  /** Tile coordinate in grid space. */
  coord: TileCoord
  /** Tile world bounds for draw scheduling. */
  worldBounds: EngineRect
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
 * Intent: compose a dimension-aware tile streaming key for mixed 2D/3D caches.
 * @param input Key input with optional 3D camera/depth discriminators.
 * @returns Stable tile key for streaming caches.
 */
export function createTileStreamingKey(input: CreateTileStreamingKeyInput): TileKey {
  const baseKey = createTileKey(input)
  const dimensionMode = input.dimensionMode ?? '2d'
  if (dimensionMode === '2d') {
    return `${dimensionMode}:${baseKey}`
  }

  const cameraPoseHash = input.cameraPoseHash ?? 'camera:default'
  const depthSlice = Number.isFinite(input.depthSlice) ? String(input.depthSlice) : 'depth:default'
  return `${dimensionMode}:${baseKey}:${cameraPoseHash}:${depthSlice}`
}

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

/**
 * Computes the tile size for a given zoom level.
 * @param zoomLevel zoomLevel parameter.
 * @param baseTileSize baseTileSize parameter.
 */
export function getTileSizeForZoom(zoomLevel: TileZoomLevel, baseTileSize: number): number {
  const divisor = TILE_ZOOM_LEVEL_TWO ** (TILE_ZOOM_LEVEL_FIVE - zoomLevel)
  return Math.max(MIN_TILE_SIZE_PX, baseTileSize / divisor)
}

/**
 * Determines which zoom level to use based on viewport scale.
 * @param scale Scale value.
 * @param previousZoomLevel previousZoomLevel parameter.
 */
export function getZoomLevelForScale(
  scale: number,
  previousZoomLevel?: TileZoomLevel | null,
): TileZoomLevel {
  const absScale = Math.max(0, Math.abs(scale))

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
