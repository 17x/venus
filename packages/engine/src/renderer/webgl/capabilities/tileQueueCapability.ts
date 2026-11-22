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
  type TileCoord,
  type TileRenderRequest,
  type TileViewportCamera,
  type TileZoomLevel,
} from '../../tileManager/index.ts'
import type { EngineViewportOverscanCssPx } from '../../../core/camera/index.ts'
import {
  TileScheduler,
  type TileSchedulerCancelOptions,
} from '../../tileScheduler/index.ts'
import type { InteractionCompositeSnapshot } from '../preview/composite/webglComposite.ts'

const PAN_PREDICTION_WINDOW_MS = 100
const PAN_OVERSCAN_BACKWARD_TILES = 1
const PAN_OVERSCAN_FORWARD_TILES = 2
const PAN_PREDICTION_LOW_LOD_OFFSET = 1
const PAN_PREDICTION_FRAME_INTERVAL_MS = 16
const TILE_KEY_THEME_VERSION = 0

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
  const zoomLevel = getZoomLevelForScale(options.frame.viewport.scale)
  // Prediction region can use one coarser bucket so future area appears quickly, then sharpens later.
  const predictionZoomLevel = Math.max(0, zoomLevel - PAN_PREDICTION_LOW_LOD_OFFSET) as TileZoomLevel
  const tileSizeCssPx = options.tileCache.getTileSizePx(zoomLevel)
  const predictionTileSizeCssPx = options.tileCache.getTileSizePx(predictionZoomLevel)
  const dpr = options.frame.context.pixelRatio ?? 1
  const renderVersion = typeof options.frame.scene.revision === 'number'
    ? options.frame.scene.revision
    : 0

  // Estimate pan velocity from snapshot->current camera delta in CSS px.
  const deltaX = options.frame.viewport.offsetX - options.snapshot.offsetX
  const deltaY = options.frame.viewport.offsetY - options.snapshot.offsetY
  const predictedOffsetX = options.frame.viewport.offsetX + ((deltaX / PAN_PREDICTION_FRAME_INTERVAL_MS) * PAN_PREDICTION_WINDOW_MS)
  const predictedOffsetY = options.frame.viewport.offsetY + ((deltaY / PAN_PREDICTION_FRAME_INTERVAL_MS) * PAN_PREDICTION_WINDOW_MS)
  const forwardOverscanCssPx = tileSizeCssPx * PAN_OVERSCAN_FORWARD_TILES
  const backwardOverscanCssPx = tileSizeCssPx * PAN_OVERSCAN_BACKWARD_TILES
  const directionalOverscanCssPx = resolvePanDirectionalOverscanCssPx({
    deltaX,
    deltaY,
    predictionOffsetDeltaX: predictedOffsetX - options.frame.viewport.offsetX,
    predictionOffsetDeltaY: predictedOffsetY - options.frame.viewport.offsetY,
    forwardOverscanCssPx,
    backwardOverscanCssPx,
  })
  const currentCamera = resolveTileViewportCamera(options.frame)
  const predictedCamera = {
    ...currentCamera,
    offsetX: predictedOffsetX,
    offsetY: predictedOffsetY,
  }

  const viewportTiles = getVisibleTilesForCamera({
    camera: currentCamera,
    zoomBucket: zoomLevel,
    tileSizeCssPx,
    overscanCssPx: 0,
  })
  const overscanTiles = getVisibleTilesForCamera({
    camera: currentCamera,
    zoomBucket: zoomLevel,
    tileSizeCssPx,
    overscanCssPx: directionalOverscanCssPx,
  })
  const sharpPredictionTiles = getVisibleTilesForCamera({
    camera: predictedCamera,
    zoomBucket: zoomLevel,
    tileSizeCssPx,
    overscanCssPx: backwardOverscanCssPx,
  })
  const lowLodPredictionTiles = getVisibleTilesForCamera({
    camera: predictedCamera,
    zoomBucket: predictionZoomLevel,
    tileSizeCssPx: predictionTileSizeCssPx,
    overscanCssPx: forwardOverscanCssPx,
  })

  const visibleKeys = new Set<string>()
  const overscanKeys = new Set<string>()
  const predictionKeys = new Set<string>()
  const requests: TileRenderRequest[] = []

  for (const tile of viewportTiles) {
    const viewportKey = createTileCoordIdentity(tile.coord)
    visibleKeys.add(viewportKey)
    requests.push(createTileRenderRequest({
      tile,
      zoomBucket: zoomLevel,
      dpr,
      renderVersion,
      priority: 'visible',
      reason: 'missing',
    }))
  }

  for (const tile of sharpPredictionTiles) {
    const viewportKey = createTileCoordIdentity(tile.coord)
    if (visibleKeys.has(viewportKey)) {
      continue
    }

    predictionKeys.add(viewportKey)
    requests.push(createTileRenderRequest({
      tile,
      zoomBucket: zoomLevel,
      dpr,
      renderVersion,
      priority: 'nearby',
      reason: 'preload',
    }))
  }

  for (const tile of overscanTiles) {
    const viewportKey = createTileCoordIdentity(tile.coord)
    if (visibleKeys.has(viewportKey) || predictionKeys.has(viewportKey)) {
      continue
    }

    overscanKeys.add(viewportKey)
    requests.push(createTileRenderRequest({
      tile,
      zoomBucket: zoomLevel,
      dpr,
      renderVersion,
      priority: 'nearby',
      reason: 'preload',
    }))
  }

  for (const tile of lowLodPredictionTiles) {
    const viewportKey = createTileCoordIdentity(tile.coord)
    if (visibleKeys.has(viewportKey) || overscanKeys.has(viewportKey)) {
      continue
    }

    requests.push(createTileRenderRequest({
      tile,
      zoomBucket: predictionZoomLevel,
      dpr,
      renderVersion,
      priority: 'background',
      reason: 'preload',
    }))
  }

  options.scheduler.requestMany(requests)
  // Keep only the current pan neighborhood queued; processing happens later.
  const predictionDistanceCssPx = Math.max(
    Math.abs(predictedOffsetX - options.frame.viewport.offsetX),
    Math.abs(predictedOffsetY - options.frame.viewport.offsetY),
  )
  options.scheduler.cancelOutdatedRequests({
    camera: currentCamera,
    zoomBuckets: [zoomLevel, predictionZoomLevel],
    activeBucketRadius: PAN_PREDICTION_LOW_LOD_OFFSET,
    tileSizeCssPx,
    overscanCssPx: resolvePanDirectionalOverscanCssPx({
      deltaX,
      deltaY,
      predictionOffsetDeltaX: predictedOffsetX - options.frame.viewport.offsetX,
      predictionOffsetDeltaY: predictedOffsetY - options.frame.viewport.offsetY,
      forwardOverscanCssPx: forwardOverscanCssPx + predictionDistanceCssPx,
      backwardOverscanCssPx,
    }),
    nearbyRing: PAN_OVERSCAN_FORWARD_TILES + Math.ceil(predictionDistanceCssPx / Math.max(1, tileSizeCssPx)),
  })

  return requests.length
}

/**
 * Builds the tile-manager camera payload from a render frame.
 * @param frame Current render frame.
 */
function resolveTileViewportCamera(frame: EngineRenderFrame): TileViewportCamera {
  return {
    viewportWidth: frame.viewport.viewportWidth,
    viewportHeight: frame.viewport.viewportHeight,
    offsetX: frame.viewport.offsetX,
    offsetY: frame.viewport.offsetY,
    scale: frame.viewport.scale,
  }
}

/**
 * Builds direction-aware overscan so pan prediction retains the side being revealed.
 * @param input Pan motion and overscan settings.
 */
function resolvePanDirectionalOverscanCssPx(input: {
  deltaX: number
  deltaY: number
  predictionOffsetDeltaX: number
  predictionOffsetDeltaY: number
  forwardOverscanCssPx: number
  backwardOverscanCssPx: number
}): EngineViewportOverscanCssPx {
  const predictionX = Math.abs(input.predictionOffsetDeltaX)
  const predictionY = Math.abs(input.predictionOffsetDeltaY)
  return {
    left: input.deltaX > 0
      ? input.forwardOverscanCssPx + predictionX
      : input.backwardOverscanCssPx,
    right: input.deltaX < 0
      ? input.forwardOverscanCssPx + predictionX
      : input.backwardOverscanCssPx,
    top: input.deltaY > 0
      ? input.forwardOverscanCssPx + predictionY
      : input.backwardOverscanCssPx,
    bottom: input.deltaY < 0
      ? input.forwardOverscanCssPx + predictionY
      : input.backwardOverscanCssPx,
  }
}

/**
 * Builds one stable identity for tile set de-duplication.
 * @param coord Tile coordinate.
 */
function createTileCoordIdentity(coord: TileCoord) {
  return `${coord.zoomBucket}:${coord.x}:${coord.y}`
}

/**
 * Converts a visible tile projection into a scheduler request.
 * @param input Request construction input.
 */
function createTileRenderRequest(input: {
  tile: {
    coord: TileCoord
    worldBounds: TileRenderRequest['worldBounds']
  }
  zoomBucket: number
  dpr: number
  renderVersion: number
  priority: TileRenderRequest['priority']
  reason: TileRenderRequest['reason']
}): TileRenderRequest {
  return {
    key: createTileKey({
      tileX: input.tile.coord.x,
      tileY: input.tile.coord.y,
      zoomBucket: input.zoomBucket,
      dpr: input.dpr,
      themeVersion: TILE_KEY_THEME_VERSION,
      renderVersion: input.renderVersion,
    }),
    coord: {
      x: input.tile.coord.x,
      y: input.tile.coord.y,
      zoomBucket: input.zoomBucket,
    },
    worldBounds: input.tile.worldBounds,
    priority: input.priority,
    reason: input.reason,
  }
}
