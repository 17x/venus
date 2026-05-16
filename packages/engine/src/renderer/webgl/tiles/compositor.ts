/**
 * Renderer/WebGL tile subsystem module.
 * Owns tile compositing draw flow and tile upload scheduling integration.
 * Does not own global renderer lifecycle or capability state persistence.
 */
import type { EngineCanvasSurfaceFactory, EngineRenderFrame } from '../../types/index.ts'
import { createViewportMatrixForRender, drawWebGLPacket, type WebGLQuadPipeline } from '../core/index.ts'
import { EngineTileCache, createTileStreamingKey, getZoomLevelForScale, type TileZoomLevel } from '../../tileManager/index.ts'
import { TileScheduler } from '../../tileScheduler/index.ts'
import {
  ENGINE_RENDER_FALLBACK_REASON,
  type EngineRenderFallbackReason,
} from '../../fallbackTaxonomy/index.ts'
import {
  resolvePredictiveTileRingWindow,
} from '../../interactionPredictiveTiles/index.ts'
import { resolveRoiPrioritizedPreloadTiles } from './tileRoiPreloadPolicy/tileRoiPreloadPolicy.ts'
import {
  buildTileTextureSourceFromModelSurface,
  clampTileZoomLevel,
  resolveTileFramebufferRegion,
  uploadSurfaceTexture,
  uploadTileTexture,
} from './textureIO.ts'

// Keep tile composition and tile upload plumbing outside the main WebGL file
// so the primary backend can focus on frame orchestration.
interface TileCompositorDrawEntry {
  bounds: {x: number; y: number; width: number; height: number}
  texture: WebGLTexture
}

interface TileCompositorResult {
  zoomLevel: TileZoomLevel
  drawCount: number
  tileHitCount: number
  tileMissCount: number
  tileUploadCount: number
  visibleTileCount: number
  tileRenderCount: number
  preloadedTileCount: number
  predictivePreloadEnqueueCount: number
  predictivePreloadProcessedCount: number
  predictivePreloadPrunedCount: number
  fallbackReason: EngineRenderFallbackReason
}

/**
 * Draw base scene from tile cache and rebuild/upload missing tiles on demand.
  * @param options Options object for this operation.
*/
export function drawModelSurfaceAsTiles(options: {
  context: WebGLRenderingContext | WebGL2RenderingContext
  frame: EngineRenderFrame
  tileCache: EngineTileCache
  tileTextures: Map<number, WebGLTexture>
  nextTileTextureId: () => number
  modelSurface: HTMLCanvasElement | OffscreenCanvas
  createCanvasSurface?: EngineCanvasSurfaceFactory['createSurface']
  pipeline: WebGLQuadPipeline
  tileScheduler?: TileScheduler | null
  previousZoomLevel?: TileZoomLevel | null
  preloadRing?: number
  preloadOverscanCssPx?: number
  preloadBudgetMs?: number
  maxPreloadUploads?: number
}): TileCompositorResult | null {
  // Resolve the cache bucket from the current scale with hysteresis so zoom
  // transitions reuse adjacent layers without pinning all tiles to 100%.
  const zoomLevel = resolveTileCacheZoomLevel(options.frame.viewport.scale, options.previousZoomLevel)
  const viewportBounds = resolveViewportWorldBounds(options.frame)
  const visibleTiles = options.tileCache.getVisibleTiles(viewportBounds, zoomLevel)
  const preloadRingWindow = resolvePredictiveTileRingWindow(
    Math.max(0, options.preloadRing ?? 0),
    options.frame.context.interactionPredictor,
  )
  const preloadTiles = resolveNearbyPreloadTiles(
    visibleTiles,
    zoomLevel,
    preloadRingWindow,
  )
  const prioritizedPreloadTiles = resolveRoiPrioritizedPreloadTiles(
    preloadTiles,
    options.frame.viewport,
  )
  const pixelRatio = options.frame.context.pixelRatio ?? 1
  const viewportWidthPx = Math.max(1, Math.round(options.frame.viewport.viewportWidth * pixelRatio))
  const viewportHeightPx = Math.max(1, Math.round(options.frame.viewport.viewportHeight * pixelRatio))

  // Build one transient source texture so exact tiles can be copied from framebuffer.
  let seededFramebufferForTiles = false
  let sourceTexture: WebGLTexture | null = null
  const drawEntries: TileCompositorDrawEntry[] = []
  let drawCount = 0
  let tileHitCount = 0
  let tileMissCount = 0
  let tileUploadCount = 0
  let preloadedTileCount = 0
  let predictivePreloadEnqueueCount = 0
  let predictivePreloadProcessedCount = 0
  let predictivePreloadPrunedCount = 0
  let fallbackReason: EngineRenderFallbackReason = ENGINE_RENDER_FALLBACK_REASON.NONE
  const preloadStartAt = performance.now()
  const maxPreloadUploads = Math.max(0, options.maxPreloadUploads ?? Number.POSITIVE_INFINITY)
  const preloadBudgetMs = Math.max(0, options.preloadBudgetMs ?? 0)

  const upsertTileTexture = (tile: { zoomLevel: TileZoomLevel; gridX: number; gridY: number; bounds: {x: number; y: number; width: number; height: number} }) => {
    const cachedEntry = options.tileCache.getEntry(tile.zoomLevel, tile.gridX, tile.gridY)
    const cachedTexture = cachedEntry ? options.tileTextures.get(cachedEntry.textureId) : null
    const existingTexture = cachedTexture ?? null

    // Seed default framebuffer once from modelSurface so missing tiles can use GPU copy path.
    if (!seededFramebufferForTiles) {
      sourceTexture = uploadSurfaceTexture(options.context, options.modelSurface)
      if (!sourceTexture) {
        fallbackReason = ENGINE_RENDER_FALLBACK_REASON.L2_TILE_SEED_UPLOAD_FAILED
      } else {
        const compositeFrame: EngineRenderFrame = {
          ...options.frame,
          viewport: {
            ...options.frame.viewport,
            // Tile seed draw is identity in screen space, so matrix must be identity as well.
            matrix: createViewportMatrixForRender(1, 0, 0),
            scale: 1,
            offsetX: 0,
            offsetY: 0,
          },
        }
        drawWebGLPacket(
          options.context,
          options.pipeline,
          compositeFrame,
          {
            x: 0,
            y: 0,
            width: options.frame.viewport.viewportWidth,
            height: options.frame.viewport.viewportHeight,
          },
          [1, 1, 1, 1],
          1,
          sourceTexture,
        )
        seededFramebufferForTiles = true
      }
    }

    const tileRegion = resolveTileFramebufferRegion({
      frame: options.frame,
      tileBounds: tile.bounds,
      viewportWidthPx,
      viewportHeightPx,
    })

    // Edge tiles are often only partially visible inside the current viewport.
    // Keep them on the canvas-crop upload path instead of aborting the entire
    // tile pass, otherwise ordinary settled views never build any tile cache.
    if (tileRegion.isClipped) {
      fallbackReason = ENGINE_RENDER_FALLBACK_REASON.L2_TILE_PARTIAL_REGION_CANVAS_CROP
    }

    // Keep tile uploads on canvas-crop path for correctness: framebuffer-copy
    // extraction can introduce stable-position drift under viewport transforms.
    const uploaded = { texture: null, textureBytes: 0 }

    // Keep old canvas-crop path as fallback for unsupported/failed framebuffer copy.
    const uploadedWithFallback = uploaded.texture
      ? uploaded
      : (() => {
        const tileTextureSource = buildTileTextureSourceFromModelSurface({
          modelSurface: options.modelSurface,
          frame: options.frame,
          tileBounds: tile.bounds,
          viewportWidthPx,
          viewportHeightPx,
        })
        if (!tileTextureSource) {
          return {
            texture: null,
            textureBytes: 0,
          }
        }
        return uploadTileTexture(
          options.context,
          existingTexture,
          tileTextureSource,
        )
      })()

    if (!uploadedWithFallback.texture) {
      return {
        texture: null,
      }
    }

    if (!uploaded.texture) {
      fallbackReason = seededFramebufferForTiles
        ? ENGINE_RENDER_FALLBACK_REASON.L2_TILE_FRAMEBUFFER_COPY_FALLBACK_CANVAS
        : fallbackReason
    }

    const textureId = cachedEntry?.textureId ?? options.nextTileTextureId()
    options.tileTextures.set(textureId, uploadedWithFallback.texture)
    options.tileCache.upsertEntry({
      zoomLevel: tile.zoomLevel,
      gridX: tile.gridX,
      gridY: tile.gridY,
      textureId,
      textureBytes: uploadedWithFallback.textureBytes,
    })

    return {
      texture: uploadedWithFallback.texture,
    }
  }

  for (const tile of visibleTiles) {
    const cachedEntry = options.tileCache.getEntry(tile.zoomLevel, tile.gridX, tile.gridY)
    const cachedTexture = cachedEntry ? options.tileTextures.get(cachedEntry.textureId) : null
    if (cachedEntry && !cachedEntry.isDirty && cachedTexture) {
      tileHitCount += 1
      drawEntries.push({
        bounds: cachedEntry.bounds,
        texture: cachedTexture,
      })
      continue
    }

    tileMissCount += 1
    // Keep visible tile upload synchronous so this frame's tile positions stay deterministic.
    const uploadedEntry = upsertTileTexture(tile)
    if (!uploadedEntry.texture) {
      fallbackReason = seededFramebufferForTiles
        ? ENGINE_RENDER_FALLBACK_REASON.L2_TILE_FRAMEBUFFER_COPY_FAILED
        : ENGINE_RENDER_FALLBACK_REASON.L2_TILE_SOURCE_BUILD_FAILED
      if (sourceTexture) {
        options.context.deleteTexture(sourceTexture)
      }
      return null
    }
    tileUploadCount += 1
    drawEntries.push({
      bounds: tile.bounds,
      texture: uploadedEntry.texture,
    })
  }

  // In progressive-refresh mode, queue nearby preload work through scheduler.
  if (options.tileScheduler && prioritizedPreloadTiles.length > 0) {
    const dpr = options.frame.context.pixelRatio ?? 1
    const renderVersion = typeof options.frame.scene.revision === 'number'
      ? options.frame.scene.revision
      : 0
    options.tileScheduler.requestMany(
      prioritizedPreloadTiles.map((tile) => ({
        key: createTileStreamingKey({
          tileX: tile.gridX,
          tileY: tile.gridY,
          zoomBucket: tile.zoomLevel,
          dpr,
          themeVersion: 0,
          renderVersion,
          dimensionMode: options.frame.viewport.dimensionMode ?? '2d',
          cameraPoseHash: options.frame.viewport.pose
            ? JSON.stringify(options.frame.viewport.pose)
            : undefined,
        }),
        coord: {
          x: tile.gridX,
          y: tile.gridY,
          zoomBucket: tile.zoomLevel,
        },
        worldBounds: tile.bounds,
        priority: 'nearby',
        reason: 'preload',
      })),
    )
    predictivePreloadEnqueueCount = prioritizedPreloadTiles.length

    predictivePreloadPrunedCount = options.tileScheduler.cancelOutdatedRequests({
      camera: {
        viewportWidth: options.frame.viewport.viewportWidth,
        viewportHeight: options.frame.viewport.viewportHeight,
        offsetX: options.frame.viewport.offsetX,
        offsetY: options.frame.viewport.offsetY,
        scale: options.frame.viewport.scale,
      },
      zoomBuckets: options.tileCache.getZoomBuckets(),
      activeBucketRadius: options.tileCache.getActiveBucketRadius(),
      tileSizeCssPx: options.tileCache.getTileSizePx(zoomLevel),
      overscanCssPx: Math.max(0, options.preloadOverscanCssPx ?? 0),
      nearbyRing: Math.max(
        preloadRingWindow.left,
        preloadRingWindow.right,
        preloadRingWindow.up,
        preloadRingWindow.down,
      ),
    })

    // Process only a bounded preload slice each frame to avoid input starvation.
    options.tileScheduler.tick({
      frameBudgetMs: preloadBudgetMs,
      maxRequests: maxPreloadUploads,
      process: (request) => {
        const tile = {
          zoomLevel: clampTileZoomLevel(request.coord.zoomBucket),
          gridX: request.coord.x,
          gridY: request.coord.y,
          bounds: request.worldBounds,
        }
        const cachedEntry = options.tileCache.getEntry(tile.zoomLevel, tile.gridX, tile.gridY)
        const cachedTexture = cachedEntry ? options.tileTextures.get(cachedEntry.textureId) : null
        if (cachedEntry && !cachedEntry.isDirty && cachedTexture) {
          return
        }

        const uploadedEntry = upsertTileTexture(tile)
        if (uploadedEntry.texture) {
          tileUploadCount += 1
          preloadedTileCount += 1
          predictivePreloadProcessedCount += 1
        }
      },
      nowMs: () => {
        const elapsed = performance.now() - preloadStartAt
        return preloadStartAt + elapsed
      },
    })
  }

  if (sourceTexture) {
    options.context.deleteTexture(sourceTexture)
  }

  // If no tiles are drawable, delegate to caller fallback path to avoid blank/partial output.
  if (drawEntries.length === 0) {
    return null
  }

  // After seeding/copying we clear once and composite tiles as the final base-scene output.
  if (seededFramebufferForTiles) {
    options.context.clear(options.context.COLOR_BUFFER_BIT)
  }

  drawCount += drawTileCompositorPass({
    context: options.context,
    pipeline: options.pipeline,
    frame: options.frame,
    entries: drawEntries,
  })

  return {
    zoomLevel,
    drawCount,
    tileHitCount,
    tileMissCount,
    tileUploadCount,
    visibleTileCount: visibleTiles.length,
    tileRenderCount: visibleTiles.length + preloadedTileCount,
    preloadedTileCount,
    predictivePreloadEnqueueCount,
    predictivePreloadProcessedCount,
    predictivePreloadPrunedCount,
    fallbackReason,
  }
}

/**
 * Handles drawTileCompositorPass.
 * @param options Options object for this operation.
 */
function drawTileCompositorPass(options: {
  context: WebGLRenderingContext | WebGL2RenderingContext
  pipeline: WebGLQuadPipeline
  frame: EngineRenderFrame
  entries: readonly TileCompositorDrawEntry[]
}) {
  // Keep compositor pass intentionally simple: one textured quad per tile.
  let drawCount = 0
  for (const entry of options.entries) {
    drawCount += drawWebGLPacket(
      options.context,
      options.pipeline,
      options.frame,
      entry.bounds,
      [1, 1, 1, 1],
      1,
      entry.texture,
    )
  }

  return drawCount
}

/**
 * Handles resolveViewportWorldBounds.
 * @param frame Current render frame.
 */
function resolveViewportWorldBounds(frame: EngineRenderFrame) {
  // Clamp to a valid scale so transient invalid viewport states cannot break tile coverage.
  const safeScale = Number.isFinite(frame.viewport.scale) && Math.abs(frame.viewport.scale) > Number.EPSILON
    ? frame.viewport.scale
    : 1
  return {
    x: -frame.viewport.offsetX / safeScale,
    y: -frame.viewport.offsetY / safeScale,
    width: frame.viewport.viewportWidth / safeScale,
    height: frame.viewport.viewportHeight / safeScale,
  }
}

/**
 * Handles resolveTileCacheZoomLevel.
 * @param scale Scale value.
 * @param previousZoomLevel previousZoomLevel parameter.
 */
function resolveTileCacheZoomLevel(
  scale: number,
  previousZoomLevel: TileZoomLevel | null | undefined,
): TileZoomLevel {
  // Keep one resolver entrypoint so tile bucket hysteresis stays shared across
  // compositor, preload, and invalidation call paths.
  return getZoomLevelForScale(scale, previousZoomLevel)
}

/**
 * Handles resolveNearbyPreloadTiles.
 * @param visibleTiles visibleTiles parameter.
 * @param zoomLevel zoomLevel parameter.
 * @param ringWindow ringWindow parameter.
 */
function resolveNearbyPreloadTiles(
  visibleTiles: Array<{ zoomLevel: TileZoomLevel; gridX: number; gridY: number; bounds: {x: number; y: number; width: number; height: number} }>,
  zoomLevel: TileZoomLevel,
  ringWindow: {
    left: number
    right: number
    up: number
    down: number
  },
) {
  if (
    visibleTiles.length === 0 ||
    (ringWindow.left <= 0 && ringWindow.right <= 0 && ringWindow.up <= 0 && ringWindow.down <= 0)
  ) {
    return []
  }

  let minX = Number.POSITIVE_INFINITY
  let minY = Number.POSITIVE_INFINITY
  let maxX = Number.NEGATIVE_INFINITY
  let maxY = Number.NEGATIVE_INFINITY
  const visibleKeys = new Set<string>()
  const tileWidth = visibleTiles[0].bounds.width
  const tileHeight = visibleTiles[0].bounds.height
  for (const tile of visibleTiles) {
    minX = Math.min(minX, tile.gridX)
    minY = Math.min(minY, tile.gridY)
    maxX = Math.max(maxX, tile.gridX)
    maxY = Math.max(maxY, tile.gridY)
    visibleKeys.add(`${tile.gridX}:${tile.gridY}`)
  }

  const preloadTiles: Array<{ zoomLevel: TileZoomLevel; gridX: number; gridY: number; bounds: {x: number; y: number; width: number; height: number} }> = []
  // Direction-biased ring keeps more prefetch coverage ahead of current movement.
  for (let gridX = minX - ringWindow.left; gridX <= maxX + ringWindow.right; gridX++) {
    for (let gridY = minY - ringWindow.up; gridY <= maxY + ringWindow.down; gridY++) {
      const key = `${gridX}:${gridY}`
      if (visibleKeys.has(key)) {
        continue
      }
      preloadTiles.push({
        zoomLevel,
        gridX,
        gridY,
        bounds: {
          x: gridX * tileWidth,
          y: gridY * tileHeight,
          width: tileWidth,
          height: tileHeight,
        },
      })
    }
  }

  return preloadTiles
}
