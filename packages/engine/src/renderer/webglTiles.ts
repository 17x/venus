import type { EngineCanvasSurfaceFactory, EngineRenderFrame } from './types.ts'
import { createViewportMatrixForRender, drawWebGLPacket, type WebGLQuadPipeline } from './webglPipeline.ts'
import { createModelSurface } from './webglSurfaceHelpers.ts'
import { EngineTileCache, createTileKey, getZoomLevelForScale, type TileZoomLevel } from './tileManager.ts'
import { TileScheduler } from './tileScheduler.ts'

// Keep tile composition and tile upload plumbing outside the main WebGL file
// so the primary backend can focus on frame orchestration.
interface TileCompositorDrawEntry {
  bounds: {x: number; y: number; width: number; height: number}
  texture: WebGLTexture
}

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
  preloadBudgetMs?: number
  maxPreloadUploads?: number
}) {
  // Resolve the cache bucket from the current scale with hysteresis so zoom
  // transitions reuse adjacent layers without pinning all tiles to 100%.
  const zoomLevel = resolveTileCacheZoomLevel(options.frame.viewport.scale, options.previousZoomLevel)
  const viewportBounds = resolveViewportWorldBounds(options.frame)
  const visibleTiles = options.tileCache.getVisibleTiles(viewportBounds, zoomLevel)
  const preloadTiles = resolveNearbyPreloadTiles(
    visibleTiles,
    zoomLevel,
    Math.max(0, options.preloadRing ?? 0),
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
  let fallbackReason = 'none'
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
        fallbackReason = 'l2-tile-seed-upload-failed'
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
      fallbackReason = 'l2-tile-partial-region-canvas-crop'
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
        ? 'l2-tile-framebuffer-copy-fallback-canvas'
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
        ? 'l2-tile-framebuffer-copy-failed'
        : 'l2-tile-source-build-failed'
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
  if (options.tileScheduler && preloadTiles.length > 0) {
    const dpr = options.frame.context.pixelRatio ?? 1
    const renderVersion = typeof options.frame.scene.revision === 'number'
      ? options.frame.scene.revision
      : 0
    options.tileScheduler.requestMany(
      preloadTiles.map((tile) => ({
        key: createTileKey({
          tileX: tile.gridX,
          tileY: tile.gridY,
          zoomBucket: tile.zoomLevel,
          dpr,
          themeVersion: 0,
          renderVersion,
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

    options.tileScheduler.cancelOutdatedRequests({
      camera: {
        viewportWidth: options.frame.viewport.viewportWidth,
        viewportHeight: options.frame.viewport.viewportHeight,
        offsetX: options.frame.viewport.offsetX,
        offsetY: options.frame.viewport.offsetY,
        scale: options.frame.viewport.scale,
      },
      tileSizeCssPx: options.tileCache.getTileSizePx(zoomLevel),
      nearbyRing: Math.max(0, options.preloadRing ?? 0),
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
    fallbackReason,
  }
}

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

function resolveViewportWorldBounds(frame: EngineRenderFrame) {
  return {
    x: -frame.viewport.offsetX / frame.viewport.scale,
    y: -frame.viewport.offsetY / frame.viewport.scale,
    width: frame.viewport.viewportWidth / frame.viewport.scale,
    height: frame.viewport.viewportHeight / frame.viewport.scale,
  }
}

function resolveTileCacheZoomLevel(
  scale: number,
  previousZoomLevel: TileZoomLevel | null | undefined,
): TileZoomLevel {
  // Keep one resolver entrypoint so tile bucket hysteresis stays shared across
  // compositor, preload, and invalidation call paths.
  return getZoomLevelForScale(scale, previousZoomLevel)
}

function resolveNearbyPreloadTiles(
  visibleTiles: Array<{ zoomLevel: TileZoomLevel; gridX: number; gridY: number; bounds: {x: number; y: number; width: number; height: number} }>,
  zoomLevel: TileZoomLevel,
  ring: number,
) {
  if (ring <= 0 || visibleTiles.length === 0) {
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
  for (let gridX = minX - ring; gridX <= maxX + ring; gridX++) {
    for (let gridY = minY - ring; gridY <= maxY + ring; gridY++) {
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

function resolveTileFramebufferRegion(options: {
  frame: EngineRenderFrame
  tileBounds: {x: number; y: number; width: number; height: number}
  viewportWidthPx: number
  viewportHeightPx: number
}) {
  const pixelRatio = options.frame.context.pixelRatio ?? 1
  const scale = options.frame.viewport.scale
  const offsetX = options.frame.viewport.offsetX
  const offsetY = options.frame.viewport.offsetY
  // Keep tile capture math consistent with drawWebGLPacket world->screen transform.
  const tileScreenX = options.tileBounds.x * scale + offsetX
  const tileScreenY = options.tileBounds.y * scale + offsetY
  const tileScreenWidth = options.tileBounds.width * scale
  const tileScreenHeight = options.tileBounds.height * scale
  const tilePixelX = tileScreenX * pixelRatio
  const tilePixelY = tileScreenY * pixelRatio
  const tilePixelWidth = Math.max(1, Math.ceil(tileScreenWidth * pixelRatio))
  const tilePixelHeight = Math.max(1, Math.ceil(tileScreenHeight * pixelRatio))
  const sourceMinX = Math.max(0, Math.floor(tilePixelX))
  const sourceMinY = Math.max(0, Math.floor(tilePixelY))
  const sourceMaxX = Math.min(options.viewportWidthPx, Math.ceil(tilePixelX + tilePixelWidth))
  const sourceMaxY = Math.min(options.viewportHeightPx, Math.ceil(tilePixelY + tilePixelHeight))
  // If capture bounds are clamped by viewport edges, the extracted texture is only partial.
  const isClipped =
    sourceMinX > Math.floor(tilePixelX) ||
    sourceMinY > Math.floor(tilePixelY) ||
    sourceMaxX < Math.ceil(tilePixelX + tilePixelWidth) ||
    sourceMaxY < Math.ceil(tilePixelY + tilePixelHeight)

  return {
    sourceX: sourceMinX,
    sourceY: sourceMinY,
    sourceWidth: Math.max(1, sourceMaxX - sourceMinX),
    sourceHeight: Math.max(1, sourceMaxY - sourceMinY),
    framebufferHeight: options.viewportHeightPx,
    isClipped,
  }
}

function uploadSurfaceTexture(
  context: WebGLRenderingContext | WebGL2RenderingContext,
  source: HTMLCanvasElement | OffscreenCanvas,
) {
  const texture = context.createTexture()
  if (!texture) {
    return null
  }

  context.bindTexture(context.TEXTURE_2D, texture)
  context.pixelStorei(context.UNPACK_PREMULTIPLY_ALPHA_WEBGL, 1)
  context.texParameteri(context.TEXTURE_2D, context.TEXTURE_MIN_FILTER, context.LINEAR)
  context.texParameteri(context.TEXTURE_2D, context.TEXTURE_MAG_FILTER, context.LINEAR)
  context.texParameteri(context.TEXTURE_2D, context.TEXTURE_WRAP_S, context.CLAMP_TO_EDGE)
  context.texParameteri(context.TEXTURE_2D, context.TEXTURE_WRAP_T, context.CLAMP_TO_EDGE)

  try {
    context.texImage2D(
      context.TEXTURE_2D,
      0,
      context.RGBA,
      context.RGBA,
      context.UNSIGNED_BYTE,
      source as unknown as TexImageSource,
    )
  } catch {
    context.deleteTexture(texture)
    return null
  }

  return texture
}

function uploadTileTexture(
  context: WebGLRenderingContext | WebGL2RenderingContext,
  existingTexture: WebGLTexture | null,
  tileSurface: HTMLCanvasElement | OffscreenCanvas,
) {
  const texture = existingTexture ?? context.createTexture()
  if (!texture) {
    return {
      texture: null,
      textureBytes: 0,
    }
  }

  context.bindTexture(context.TEXTURE_2D, texture)
  context.pixelStorei(context.UNPACK_PREMULTIPLY_ALPHA_WEBGL, 1)
  context.texParameteri(context.TEXTURE_2D, context.TEXTURE_MIN_FILTER, context.LINEAR)
  context.texParameteri(context.TEXTURE_2D, context.TEXTURE_MAG_FILTER, context.LINEAR)
  context.texParameteri(context.TEXTURE_2D, context.TEXTURE_WRAP_S, context.CLAMP_TO_EDGE)
  context.texParameteri(context.TEXTURE_2D, context.TEXTURE_WRAP_T, context.CLAMP_TO_EDGE)

  try {
    context.texImage2D(
      context.TEXTURE_2D,
      0,
      context.RGBA,
      context.RGBA,
      context.UNSIGNED_BYTE,
      tileSurface as unknown as TexImageSource,
    )
  } catch {
    if (!existingTexture) {
      context.deleteTexture(texture)
    }
    return {
      texture: null,
      textureBytes: 0,
    }
  }

  const width = tileSurface.width
  const height = tileSurface.height
  return {
    texture,
    textureBytes: Math.max(1, width * height * 4),
  }
}

function buildTileTextureSourceFromModelSurface(options: {
  modelSurface: HTMLCanvasElement | OffscreenCanvas
  createCanvasSurface?: EngineCanvasSurfaceFactory['createSurface']
  frame: EngineRenderFrame
  tileBounds: {x: number; y: number; width: number; height: number}
  viewportWidthPx: number
  viewportHeightPx: number
}) {
  const pixelRatio = options.frame.context.pixelRatio ?? 1
  const scale = options.frame.viewport.scale
  const offsetX = options.frame.viewport.offsetX
  const offsetY = options.frame.viewport.offsetY
  // Use the same transform basis as runtime draw submission to avoid tile/overlay drift.
  const tileScreenX = options.tileBounds.x * scale + offsetX
  const tileScreenY = options.tileBounds.y * scale + offsetY
  const tileScreenWidth = options.tileBounds.width * scale
  const tileScreenHeight = options.tileBounds.height * scale

  const tilePixelX = tileScreenX * pixelRatio
  const tilePixelY = tileScreenY * pixelRatio
  const tilePixelWidth = Math.max(1, Math.ceil(tileScreenWidth * pixelRatio))
  const tilePixelHeight = Math.max(1, Math.ceil(tileScreenHeight * pixelRatio))

  const sourceMinX = Math.max(0, Math.floor(tilePixelX))
  const sourceMinY = Math.max(0, Math.floor(tilePixelY))
  const sourceMaxX = Math.min(options.viewportWidthPx, Math.ceil(tilePixelX + tilePixelWidth))
  const sourceMaxY = Math.min(options.viewportHeightPx, Math.ceil(tilePixelY + tilePixelHeight))
  const sourceWidth = sourceMaxX - sourceMinX
  const sourceHeight = sourceMaxY - sourceMinY

  const tileSurface = createModelSurface(
    tilePixelWidth,
    tilePixelHeight,
    options.createCanvasSurface,
  )
  if (!tileSurface) {
    return null
  }

  const tileContext = tileSurface.canvas.getContext('2d') as CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null
  if (!tileContext) {
    return null
  }

  tileContext.clearRect(0, 0, tilePixelWidth, tilePixelHeight)

  if (sourceWidth <= 0 || sourceHeight <= 0) {
    return tileSurface.canvas
  }

  const destinationX = sourceMinX - tilePixelX
  const destinationY = sourceMinY - tilePixelY
  tileContext.drawImage(
    options.modelSurface,
    sourceMinX,
    sourceMinY,
    sourceWidth,
    sourceHeight,
    destinationX,
    destinationY,
    sourceWidth,
    sourceHeight,
  )

  return tileSurface.canvas
}

function clampTileZoomLevel(value: number): TileZoomLevel {
  const rounded = Math.round(value)
  if (rounded <= 0) return 0
  if (rounded >= 5) return 5
  return rounded as TileZoomLevel
}