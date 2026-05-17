/**
 * Renderer/WebGL capability module.
 * Owns tile cache state transitions and tile-cache metadata memory.
 * Does not orchestrate tile draw submission or snapshot preview flow.
 */
import type { EngineRenderFrame } from '../../types/index.ts'
import {
  EngineTileCache,
  getZoomLevelForScale,
  type EngineTileConfig,
  type TileZoomLevel,
} from '../../tileManager/index.ts'

const PIXEL_RATIO_SYNC_EPSILON = 1e-6
const TILE_ZOOM_LEVEL_MIN = 0
const TILE_ZOOM_LEVEL_MAX = 5

/**
 * Stores constructor options for tile cache capability.
 */
export interface CreateWebGLTileCacheCapabilityOptions {
  /** Stores optional tile cache config used to initialize cache state. */
  tileConfig?: EngineTileConfig
}

/**
 * Stores read query variants for tile cache capability.
 */
export type WebGLTileCacheReadInput =
  | {
    /** Selects raw cache accessor query. */
    kind: 'cache'
  }
  | {
    /** Selects cache enabled-state query. */
    kind: 'enabled'
  }
  | {
    /** Selects previous zoom-level query. */
    kind: 'previous-zoom-level'
  }
  | {
    /** Selects current stats query. */
    kind: 'stats'
  }
  | {
    /** Selects active zoom-level query resolved with hysteresis memory. */
    kind: 'active-zoom-level'
    /** Stores current viewport scale used by zoom-level resolver. */
    scale: number
  }

/**
 * Stores update action variants for tile cache capability.
 */
export type WebGLTileCacheUpdateInput =
  | {
    /** Updates previous zoom-level memory after tile render pass. */
    kind: 'set-previous-zoom-level'
    /** Stores next previous zoom-level value. */
    zoomLevel: TileZoomLevel | null
  }
  | {
    /** Synchronizes DPR lane and invalidates cache when lane changes. */
    kind: 'sync-pixel-ratio'
    /** Stores current pixel ratio in frame context. */
    pixelRatio: number
  }
  | {
    /** Applies dirty-region invalidation for current frame. */
    kind: 'mark-dirty-regions'
    /** Stores frame providing dirty region payload and viewport scale. */
    frame: EngineRenderFrame
  }

/**
 * Stores snapshot diagnostics exposed by tile cache capability.
 */
export interface WebGLTileCacheCapabilitySnapshot {
  /** Stores whether tile cache is enabled for this renderer instance. */
  enabled: boolean
  /** Stores previous zoom-level memory used by hysteresis logic. */
  previousZoomLevel: TileZoomLevel | null
  /** Stores previous pixel ratio memory for DPR invalidation checks. */
  previousPixelRatio: number | null
  /** Stores latest cache stats, if cache exists. */
  stats: ReturnType<EngineTileCache['getStats']> | null
}

/**
 * Defines fixed CRUD-style methods for tile cache capability.
 */
export interface WebGLTileCacheCapability {
  /** Creates cache state and returns whether cache is enabled. */
  create(): boolean
  /** Reads capability data via structured query object. */
  read(input: {kind: 'cache'}): EngineTileCache | null
  read(input: {kind: 'enabled'}): boolean
  read(input: {kind: 'previous-zoom-level'}): TileZoomLevel | null
  read(input: {kind: 'stats'}): ReturnType<EngineTileCache['getStats']> | null
  read(input: {kind: 'active-zoom-level'; scale: number}): TileZoomLevel
  /** Updates cache state via structured action object. */
  update(input: WebGLTileCacheUpdateInput): number
  /** Deletes capability-owned memory and resets local state. */
  delete(): void
  /** Returns immutable diagnostics snapshot for orchestration/reporting. */
  snapshot(): WebGLTileCacheCapabilitySnapshot
}

/**
 * Creates tile cache capability that self-manages cache metadata and transition memory.
 * @param options Capability construction options.
 */
export function createWebGLTileCacheCapability(
  options: CreateWebGLTileCacheCapabilityOptions,
): WebGLTileCacheCapability {
  const tileCache = options.tileConfig?.enabled ? new EngineTileCache(options.tileConfig) : null
  let previousZoomLevel: TileZoomLevel | null = null
  let previousPixelRatio: number | null = null

  /**
   * Creates capability state and returns enablement for orchestration checks.
   */
  const create = () => Boolean(tileCache)

  /**
   * Reads structured data from capability without mutating internal state.
    * @param input Structured read selector.
   */
  function read(input: {kind: 'cache'}): EngineTileCache | null
  function read(input: {kind: 'enabled'}): boolean
  function read(input: {kind: 'previous-zoom-level'}): TileZoomLevel | null
  function read(input: {kind: 'stats'}): ReturnType<EngineTileCache['getStats']> | null
  function read(input: {kind: 'active-zoom-level'; scale: number}): TileZoomLevel
  /**
   * Reads structured data from capability without mutating internal state.
   * @param input Structured read selector.
   */
  function read(input: WebGLTileCacheReadInput) {
    if (input.kind === 'cache') {
      return tileCache
    }

    if (input.kind === 'enabled') {
      return Boolean(tileCache)
    }

    if (input.kind === 'previous-zoom-level') {
      return previousZoomLevel
    }

    if (input.kind === 'stats') {
      return tileCache?.getStats() ?? null
    }

    // Resolve active zoom level with hysteresis memory when cache is present.
    return getZoomLevelForScale(input.scale, previousZoomLevel)
  }

  /**
   * Applies structured state updates and returns resulting change count.
    * @param input Mutation input describing tile-cache state updates.
   */
  const update: WebGLTileCacheCapability['update'] = (input) => {
    if (!tileCache) {
      return 0
    }

    if (input.kind === 'set-previous-zoom-level') {
      previousZoomLevel = input.zoomLevel
      return 0
    }

    if (input.kind === 'sync-pixel-ratio') {
      if (previousPixelRatio !== null && Math.abs(input.pixelRatio - previousPixelRatio) > PIXEL_RATIO_SYNC_EPSILON) {
        // DPR lane transitions invalidate all cached tile sharpness assumptions.
        tileCache.markAllTilesDirty()
      }
      previousPixelRatio = input.pixelRatio
      return 0
    }

    let dirtyTileCount = 0
    const dirtyZoomLevel = getZoomLevelForScale(
      input.frame.viewport.scale,
      previousZoomLevel,
    )
    for (const dirtyRegion of input.frame.context.dirtyRegions ?? []) {
      const dirtyTilesBefore = tileCache.getDirtyTiles().length
      const zoomLevels = resolveDirtyRegionInvalidationZoomLevels(dirtyRegion.zoomLevel, dirtyZoomLevel)
      for (const zoomLevel of zoomLevels) {
        // Keep invalidation aligned with the frame bucket and nearby zoom buckets
        // so post-edit zoom transitions never reuse stale tile textures.
        if (dirtyRegion.previousBounds) {
          tileCache.invalidateTilesForBoundsDelta(
            dirtyRegion.previousBounds,
            dirtyRegion.bounds,
            zoomLevel,
          )
        } else {
          tileCache.invalidateTilesInBounds(dirtyRegion.bounds, zoomLevel)
        }
      }
      dirtyTileCount += Math.max(0, tileCache.getDirtyTiles().length - dirtyTilesBefore)
    }

    return dirtyTileCount
  }

  /**
   * Resets capability-local transition memory for teardown and lifecycle restart.
   */
  const deleteCache = () => {
    previousZoomLevel = null
    previousPixelRatio = null
  }

  /**
   * Returns immutable capability diagnostics for renderer stats/inspection.
   */
  const snapshot = () => ({
    enabled: Boolean(tileCache),
    previousZoomLevel,
    previousPixelRatio,
    stats: tileCache?.getStats() ?? null,
  })

  return {
    create,
    read,
    update,
    delete: deleteCache,
    snapshot,
  }
}

/**
 * Resolves dirty-region invalidation zoom buckets for tile-cache coherence.
 * @param explicitZoomLevel Optional dirty region zoom-level hint from caller.
 * @param activeZoomLevel Current frame active zoom level.
 * @returns Deterministic list of zoom buckets that must be invalidated.
 */
function resolveDirtyRegionInvalidationZoomLevels(
  explicitZoomLevel: number | undefined,
  activeZoomLevel: TileZoomLevel,
): TileZoomLevel[] {
  if (typeof explicitZoomLevel === 'number' && Number.isFinite(explicitZoomLevel)) {
    return [clampTileZoomLevel(explicitZoomLevel)]
  }

  const levels = new Set<TileZoomLevel>()
  for (let level = TILE_ZOOM_LEVEL_MIN; level <= TILE_ZOOM_LEVEL_MAX; level += 1) {
    levels.add(clampTileZoomLevel(level))
  }
  levels.add(activeZoomLevel)
  levels.add(clampTileZoomLevel(activeZoomLevel - 1))
  levels.add(clampTileZoomLevel(activeZoomLevel + 1))

  return Array.from(levels)
}

/**
 * Clamps numeric zoom level into tile zoom-level union range.
 * @param level Raw numeric zoom level.
 * @returns Clamped tile zoom level.
 */
function clampTileZoomLevel(level: number): TileZoomLevel {
  const clamped = Math.max(TILE_ZOOM_LEVEL_MIN, Math.min(TILE_ZOOM_LEVEL_MAX, Math.round(level)))
  return clamped as TileZoomLevel
}
