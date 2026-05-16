/**
 * Renderer/WebGL capability module.
 * Owns predictive tile queue scheduling state and scheduler lifecycle.
 * Does not perform tile compositing or backend frame orchestration.
 */
import type { EngineRenderFrame } from '../../types/index.ts'
import {
  createTileKey,
  EngineTileCache,
  getVisibleTilesForCamera,
  getZoomLevelForScale,
} from '../../tileManager/index.ts'
import {
  TileScheduler,
  type TileSchedulerCancelOptions,
} from '../../tileScheduler/index.ts'
import { resolvePredictivePanQueuePolicy } from '../../interactionPredictiveTiles/index.ts'
import type { InteractionCompositeSnapshot } from '../preview/composite/webglComposite.ts'

const PAN_PREDICTION_LOW_LOD_OFFSET = 1
const PAN_PREDICTION_FRAME_INTERVAL_MS = 16

/**
 * Stores capability construction options for tile scheduling state.
 */
export interface CreateWebGLTileQueueCapabilityOptions {
  /** Stores tile cache used to resolve tile sizes and zoom buckets. */
  tileCache: EngineTileCache
}

/**
 * Stores pan-time predictive scheduling input payload.
 */
export interface WebGLPanPredictiveQueueInput {
  /** Stores render frame used to derive viewport, zoom, and render revision. */
  frame: EngineRenderFrame
  /** Stores snapshot camera state used to estimate pan velocity vector. */
  snapshot: InteractionCompositeSnapshot
}

/**
 * Stores update payload for queue maintenance operations.
 */
export interface WebGLTileQueueUpdateInput {
  /** Stores scheduler cancel options for pruning stale requests. */
  cancel?: TileSchedulerCancelOptions
}

/**
 * Stores queue diagnostics exposed by tile capability snapshot/read methods.
 */
export interface WebGLTileQueueDiagnostics {
  /** Stores count of pending requests currently queued. */
  pendingCount: number
}

/**
 * Defines fixed CRUD-style methods for tile queue scheduling capability.
 */
export interface WebGLTileQueueCapability {
  /** Creates queue work via pan predictive scheduling or direct request batch. */
  create(input: {
    /** Stores optional pan predictive scheduling payload. */
    panPredictive?: WebGLPanPredictiveQueueInput
  }): number
  /** Reads queue diagnostics without mutating scheduler state. */
  read(): WebGLTileQueueDiagnostics
  /** Updates queue by pruning stale work using cancel options. */
  update(input: WebGLTileQueueUpdateInput): number
  /** Deletes queued work by resetting internal scheduler state. */
  delete(): void
  /** Returns immutable diagnostics snapshot for cross-module orchestration. */
  snapshot(): WebGLTileQueueDiagnostics
  /** Returns internal scheduler instance for tile compositor compatibility. */
  getScheduler(): TileScheduler
}

/**
 * Creates tile queue capability that self-manages scheduler lifecycle and policy.
 * @param options Capability construction options.
 */
export function createWebGLTileQueueCapability(
  options: CreateWebGLTileQueueCapabilityOptions,
): WebGLTileQueueCapability {
  let scheduler = new TileScheduler()

  /**
   * Enqueues pan predictive tile requests and returns enqueue count.
    * @param input Queue create input containing optional predictive request.
   */
  const create: WebGLTileQueueCapability['create'] = (input) => {
    if (!input.panPredictive) {
      return 0
    }

    return schedulePanPredictiveTileRequests({
      frame: input.panPredictive.frame,
      snapshot: input.panPredictive.snapshot,
      tileCache: options.tileCache,
      scheduler,
    })
  }

  /**
   * Returns queue diagnostics for observability surfaces.
   */
  const read = () => ({
    pendingCount: scheduler.getPendingCount(),
  })

  /**
   * Applies queue pruning updates and returns removed count.
    * @param input Queue update input containing cancellation policy.
   */
  const update = (input: WebGLTileQueueUpdateInput) => {
    if (!input.cancel) {
      return 0
    }

    return scheduler.cancelOutdatedRequests(input.cancel)
  }

  /**
   * Clears all queue state by rotating scheduler instance.
   */
  const deleteQueue = () => {
    scheduler = new TileScheduler()
  }

  /**
   * Returns stable diagnostics snapshot for orchestrator bookkeeping.
   */
  const snapshot = () => ({
    pendingCount: scheduler.getPendingCount(),
  })

  /**
   * Exposes scheduler handle for existing tile compositor integration points.
   */
  const getScheduler = () => scheduler

  return {
    create,
    read,
    update,
    delete: deleteQueue,
    snapshot,
    getScheduler,
  }
}

/**
 * Schedules pan-time tile prefetch without executing tile rebuild in-frame.
  * @param options Options object for this operation.
*/
function schedulePanPredictiveTileRequests(options: {
  frame: EngineRenderFrame
  snapshot: InteractionCompositeSnapshot
  tileCache: EngineTileCache
  scheduler: TileScheduler
}) {
  const panQueuePolicy = resolvePredictivePanQueuePolicy(
    options.frame.context.interactionPredictor,
  )
  const zoomLevel = getZoomLevelForScale(options.frame.viewport.scale)
  // Prediction region can use one coarser bucket so future area appears quickly, then sharpens later.
  const predictionZoomLevel = Math.max(0, zoomLevel - PAN_PREDICTION_LOW_LOD_OFFSET)
  const tileSizeCssPx = options.tileCache.getTileSizePx(zoomLevel)
  const dpr = options.frame.context.pixelRatio ?? 1
  const renderVersion = typeof options.frame.scene.revision === 'number'
    ? options.frame.scene.revision
    : 0

  // Estimate pan velocity from snapshot->current camera delta in CSS px.
  const deltaX = options.frame.viewport.offsetX - options.snapshot.offsetX
  const deltaY = options.frame.viewport.offsetY - options.snapshot.offsetY
  const predictedOffsetX = options.frame.viewport.offsetX + ((deltaX / PAN_PREDICTION_FRAME_INTERVAL_MS) * panQueuePolicy.predictionWindowMs)
  const predictedOffsetY = options.frame.viewport.offsetY + ((deltaY / PAN_PREDICTION_FRAME_INTERVAL_MS) * panQueuePolicy.predictionWindowMs)
  const forwardOverscanCssPx = tileSizeCssPx * panQueuePolicy.forwardOverscanTiles
  const backwardOverscanCssPx = tileSizeCssPx * panQueuePolicy.backwardOverscanTiles

  const viewportTiles = getVisibleTilesForCamera({
    camera: {
      viewportWidth: options.frame.viewport.viewportWidth,
      viewportHeight: options.frame.viewport.viewportHeight,
      offsetX: options.frame.viewport.offsetX,
      offsetY: options.frame.viewport.offsetY,
      scale: options.frame.viewport.scale,
    },
    zoomBucket: zoomLevel,
    tileSizeCssPx,
    overscanCssPx: 0,
  })
  const overscanTiles = getVisibleTilesForCamera({
    camera: {
      viewportWidth: options.frame.viewport.viewportWidth,
      viewportHeight: options.frame.viewport.viewportHeight,
      offsetX: options.frame.viewport.offsetX,
      offsetY: options.frame.viewport.offsetY,
      scale: options.frame.viewport.scale,
    },
    zoomBucket: zoomLevel,
    tileSizeCssPx,
    overscanCssPx: Math.max(forwardOverscanCssPx, backwardOverscanCssPx),
  })
  const predictionTiles = getVisibleTilesForCamera({
    camera: {
      viewportWidth: options.frame.viewport.viewportWidth,
      viewportHeight: options.frame.viewport.viewportHeight,
      offsetX: predictedOffsetX,
      offsetY: predictedOffsetY,
      scale: options.frame.viewport.scale,
    },
    zoomBucket: predictionZoomLevel,
    tileSizeCssPx,
    overscanCssPx: forwardOverscanCssPx,
  })

  const visibleKeys = new Set<string>()
  const overscanKeys = new Set<string>()
  const requests: Array<{
    key: string
    coord: {x: number; y: number; zoomBucket: number}
    worldBounds: {x: number; y: number; width: number; height: number}
    priority: 'visible' | 'nearby' | 'background'
    reason: 'missing' | 'preload'
  }> = []

  for (const tile of viewportTiles) {
    const viewportKey = `${tile.coord.x}:${tile.coord.y}`
    visibleKeys.add(viewportKey)
    requests.push({
      key: createTileKey({
        tileX: tile.coord.x,
        tileY: tile.coord.y,
        zoomBucket: zoomLevel,
        dpr,
        themeVersion: 0,
        renderVersion,
      }),
      coord: {
        x: tile.coord.x,
        y: tile.coord.y,
        zoomBucket: zoomLevel,
      },
      worldBounds: tile.worldBounds,
      priority: 'visible',
      reason: 'missing',
    })
  }

  for (const tile of overscanTiles) {
    const viewportKey = `${tile.coord.x}:${tile.coord.y}`
    if (visibleKeys.has(viewportKey)) {
      continue
    }

    overscanKeys.add(viewportKey)
    requests.push({
      key: createTileKey({
        tileX: tile.coord.x,
        tileY: tile.coord.y,
        zoomBucket: zoomLevel,
        dpr,
        themeVersion: 0,
        renderVersion,
      }),
      coord: {
        x: tile.coord.x,
        y: tile.coord.y,
        zoomBucket: zoomLevel,
      },
      worldBounds: tile.worldBounds,
      priority: 'nearby',
      reason: 'preload',
    })
  }

  for (const tile of predictionTiles) {
    const viewportKey = `${tile.coord.x}:${tile.coord.y}`
    if (visibleKeys.has(viewportKey) || overscanKeys.has(viewportKey)) {
      continue
    }

    requests.push({
      key: createTileKey({
        tileX: tile.coord.x,
        tileY: tile.coord.y,
        zoomBucket: predictionZoomLevel,
        dpr,
        themeVersion: 0,
        renderVersion,
      }),
      coord: {
        x: tile.coord.x,
        y: tile.coord.y,
        zoomBucket: predictionZoomLevel,
      },
      worldBounds: tile.worldBounds,
      priority: 'background',
      reason: 'preload',
    })
  }

  options.scheduler.requestMany(requests)
  // Keep only the current pan neighborhood queued; processing happens later.
  options.scheduler.cancelOutdatedRequests({
    camera: {
      viewportWidth: options.frame.viewport.viewportWidth,
      viewportHeight: options.frame.viewport.viewportHeight,
      offsetX: options.frame.viewport.offsetX,
      offsetY: options.frame.viewport.offsetY,
      scale: options.frame.viewport.scale,
    },
    zoomBuckets: [zoomLevel, predictionZoomLevel],
    activeBucketRadius: 0,
    tileSizeCssPx,
    overscanCssPx: forwardOverscanCssPx,
    nearbyRing: panQueuePolicy.forwardOverscanTiles,
  })

  return requests.length
}
