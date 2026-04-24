import type {
  EngineInteractionPreviewConfig,
  EngineRenderFrame,
  EngineRenderer,
} from './types.ts'
import { createCanvas2DEngineRenderer } from './canvas2d.ts'
import { prepareEngineRenderPlan } from './plan.ts'
import { prepareEngineRenderInstanceView } from './instances.ts'
import { compileEngineWebGLPacketPlan } from './webglPackets.ts'
import { createEngineWebGLResourceBudgetTracker } from './webglResources.ts'
import type { EngineTileConfig, EngineLodConfig, EngineInitialRenderConfig } from '../index.ts'
import {
  EngineTileCache,
  getZoomLevelForScale,
  type TileZoomLevel,
} from './tileManager.ts'
import { EngineInitialRenderController } from './initialRender.ts'

interface WebGLEngineRendererOptions {
  id?: string
  canvas: HTMLCanvasElement | OffscreenCanvas
  enableCulling?: boolean
  clearColor?: readonly [number, number, number, number]
  antialias?: boolean
  modelCompleteComposite?: boolean
  // New: LOD configuration
  lod?: EngineLodConfig
  // New: Tile caching configuration
  tileConfig?: EngineTileConfig
  // New: Initial render optimization
  initialRender?: EngineInitialRenderConfig
  // Optional: interactive affine preview from last composite frame.
  interactionPreview?: EngineInteractionPreviewConfig
}

const DEFAULT_INTERACTION_PREVIEW: Required<EngineInteractionPreviewConfig> = {
  enabled: true,
  mode: 'interaction',
  maxScaleStep: 1.2,
  maxTranslatePx: 220,
}

const MAX_IMAGE_TEXTURE_UPLOADS_PER_FRAME = 2
const MAX_IMAGE_TEXTURE_UPLOAD_BYTES_PER_FRAME = 16 * 1024 * 1024
const TEXT_PLACEHOLDER_MAX_SCALE = 0.3

/**
 * Built-in WebGL renderer entry for engine standalone/runtime integrations.
 *
 * Current implementation is the primary engine backend and intentionally
 * reuses shared planning/packet prep while keeping Canvas2D limited to
 * auxiliary model-complete and offscreen helper work.
 */
export function createWebGLEngineRenderer(
  options: WebGLEngineRendererOptions,
): EngineRenderer {
  const context = resolveWebGLContext(options.canvas, {
    antialias: options.antialias ?? true,
    alpha: true,
    premultipliedAlpha: true,
    powerPreference: 'high-performance',
  })
  if (!context) {
    throw new Error('webgl context is required for createWebGLEngineRenderer')
  }

  const clearColor = options.clearColor ?? [0, 0, 0, 0]
  const enableCulling = options.enableCulling ?? true
  // Prefer packet path by default for runtime responsiveness. Model-complete
  // composite remains opt-in for fidelity-focused scenarios.
  const modelCompleteComposite = options.modelCompleteComposite ?? false
  const resourceBudget = createEngineWebGLResourceBudgetTracker()
  const pipeline = createWebGLQuadPipeline(context)
  const imageCache = new Map<string, CachedTextureEntry>()
  const textCache = new Map<string, CachedTextureEntry>()
  const interactionPreview = {
    ...DEFAULT_INTERACTION_PREVIEW,
    ...options.interactionPreview,
  }
  let compositeSnapshot: {
    revision: string | number
    scale: number
    offsetX: number
    offsetY: number
    viewportWidth: number
    viewportHeight: number
    pixelRatio: number
    visibleCount: number
    culledCount: number
  } | null = null
  
  // Initialize tile cache (optional)
  const tileCache = options.tileConfig ? new EngineTileCache(options.tileConfig) : null
  const tileTextures = new Map<number, WebGLTexture>()
  let nextTileTextureId = 1
  let previousTileZoomLevel: TileZoomLevel | null = null
  
  // Initialize initial render controller (optional)
  const initialRenderController = options.initialRender
    ? new EngineInitialRenderController(options.initialRender)
    : null
  // Track whether the initial render sequence has been kicked off
  let initialRenderStarted = false
  
  const modelSurface = createModelSurface(1, 1)
  if (!modelSurface) {
    throw new Error('webgl model-complete surface allocation failed')
  }
  const textCropSurface = createModelSurface(1, 1)
  if (!textCropSurface) {
    throw new Error('webgl text crop surface allocation failed')
  }
  const modelRenderer = createCanvas2DEngineRenderer({
    id: `${options.id ?? 'engine.renderer.webgl'}.model-canvas2d`,
    canvas: modelSurface.canvas,
    enableCulling,
    clearColor: 'transparent',
    imageSmoothing: true,
    imageSmoothingQuality: 'high',
  })
  const compositeTexture = context.createTexture()
  if (!compositeTexture) {
    throw new Error('webgl composite texture allocation failed')
  }
  context.bindTexture(context.TEXTURE_2D, compositeTexture)
  context.texParameteri(context.TEXTURE_2D, context.TEXTURE_MIN_FILTER, context.LINEAR)
  context.texParameteri(context.TEXTURE_2D, context.TEXTURE_MAG_FILTER, context.LINEAR)
  context.texParameteri(context.TEXTURE_2D, context.TEXTURE_WRAP_S, context.CLAMP_TO_EDGE)
  context.texParameteri(context.TEXTURE_2D, context.TEXTURE_WRAP_T, context.CLAMP_TO_EDGE)

  return {
    id: options.id ?? 'engine.renderer.webgl',
    capabilities: {
      backend: 'webgl',
      textRuns: modelCompleteComposite,
      imageClip: modelCompleteComposite,
      culling: enableCulling,
      lod: options.lod?.enabled ?? false,
    },
    resize: (width, height) => {
      if ('width' in options.canvas) {
        options.canvas.width = width
      }
      if ('height' in options.canvas) {
        options.canvas.height = height
      }
      modelRenderer.resize?.(width, height)
      context.viewport(0, 0, width, height)
    },
    render: async (frame: EngineRenderFrame) => {
      const startAt = performance.now()
      const interactiveQuality = frame.context.quality === 'interactive'
      let l0PreviewHitCount = 0
      let l0PreviewMissCount = 0
      let l1CompositeHitCount = 0
      let l1CompositeMissCount = 0
      let l2TileHitCount = 0
      let l2TileMissCount = 0
      let cacheFallbackReason = 'none'

      // Apply initial render DPR optimization if configured
      let effectiveFrame = frame
      if (initialRenderController) {
        // Kick off the progressive render sequence on the very first render
        if (!initialRenderStarted) {
          initialRenderStarted = true
          initialRenderController.beginInitialRender()
        }
        const dprForPhase = initialRenderController.getDprForPhase()
        if (dprForPhase !== 1.0) {
          // Apply low-DPR for preview phase
          effectiveFrame = {
            ...frame,
            context: {
              ...frame.context,
              pixelRatio: (frame.context.pixelRatio ?? 1) * dprForPhase,
            },
          }
        }
      }

      // Process dirty regions for incremental tile updates
      const dirtyRegionCount = effectiveFrame.context.dirtyRegions?.length ?? 0
      let dirtyTileCount = 0
      if (tileCache && effectiveFrame.context.dirtyRegions && effectiveFrame.context.dirtyRegions.length > 0) {
        for (const dirtyRegion of effectiveFrame.context.dirtyRegions) {
          const zoomLevel = clampTileZoomLevel(dirtyRegion.zoomLevel)
          tileCache.invalidateTile(zoomLevel, dirtyRegion.gridX, dirtyRegion.gridY)
          dirtyTileCount += 1
        }
      }

      // Keep full-fidelity composite for settled frames, but fall back to the
      // packet pipeline during interaction so pan/zoom can keep frame pace.
      if (modelCompleteComposite && !interactiveQuality) {
        l1CompositeHitCount += 1
        const modelStats = await modelRenderer.render(effectiveFrame)
        context.viewport(
          0,
          0,
          ('width' in options.canvas ? options.canvas.width : frame.viewport.viewportWidth),
          ('height' in options.canvas ? options.canvas.height : frame.viewport.viewportHeight),
        )
        context.enable(context.BLEND)
        context.blendFunc(context.ONE, context.ONE_MINUS_SRC_ALPHA)
        context.clearColor(clearColor[0], clearColor[1], clearColor[2], clearColor[3])
        context.clear(context.COLOR_BUFFER_BIT)

        const tileDrawResult = tileCache
          ? drawModelSurfaceAsTiles({
            context,
            frame: effectiveFrame,
            tileCache,
            tileTextures,
            nextTileTextureId: () => nextTileTextureId++,
            modelSurface: modelSurface.canvas,
            pipeline,
            previousZoomLevel: previousTileZoomLevel,
          })
          : null

        if (tileDrawResult) {
          previousTileZoomLevel = tileDrawResult.zoomLevel
          l2TileHitCount += tileDrawResult.tileHitCount
          l2TileMissCount += tileDrawResult.tileMissCount
          if (tileDrawResult.fallbackReason !== 'none') {
            cacheFallbackReason = tileDrawResult.fallbackReason
          }

          compositeSnapshot = {
            revision: effectiveFrame.scene.revision,
            scale: effectiveFrame.viewport.scale,
            offsetX: effectiveFrame.viewport.offsetX,
            offsetY: effectiveFrame.viewport.offsetY,
            viewportWidth: effectiveFrame.viewport.viewportWidth,
            viewportHeight: effectiveFrame.viewport.viewportHeight,
            pixelRatio: effectiveFrame.context.pixelRatio ?? 1,
            visibleCount: modelStats.visibleCount,
            culledCount: modelStats.culledCount,
          }

          const tileStats = tileCache?.getStats()
          const initialRenderPhase = initialRenderController?.getPhase()
          const initialRenderProgress = initialRenderController?.getDetailPassProgress()

          return {
            ...modelStats,
            drawCount: Math.max(1, tileDrawResult.drawCount),
            cacheHits: tileDrawResult.tileHitCount,
            cacheMisses: tileDrawResult.tileMissCount,
            webglRenderPath: 'model-complete',
            webglCompositeUploadBytes: 0,
            webglInteractiveTextFallbackCount: 0,
            webglTextTextureUploadCount: 0,
            webglTextTextureUploadBytes: 0,
            webglTextCacheHitCount: 0,
            l0PreviewHitCount,
            l0PreviewMissCount,
            l1CompositeHitCount,
            l1CompositeMissCount,
            l2TileHitCount,
            l2TileMissCount,
            cacheFallbackReason,
            tileCacheSize: tileStats?.tileCount,
            tileDirtyCount: tileStats?.dirtyCount,
            tileCacheTotalBytes: tileStats?.totalTextureBytes,
            initialRenderPhase: initialRenderPhase?.toString(),
            initialRenderProgress: initialRenderProgress,
            dirtyRegionCount,
            dirtyTileCount,
            incrementalUpdateCount: dirtyTileCount > 0 ? 1 : 0,
            frameMs: performance.now() - startAt,
          }
        }

        cacheFallbackReason = tileCache ? 'l2-tile-fallback-to-composite' : cacheFallbackReason

        const compositeFrame: EngineRenderFrame = {
          ...effectiveFrame,
          viewport: {
            ...effectiveFrame.viewport,
            scale: 1,
            offsetX: 0,
            offsetY: 0,
          },
        }

        context.bindTexture(context.TEXTURE_2D, compositeTexture)
        context.pixelStorei(context.UNPACK_PREMULTIPLY_ALPHA_WEBGL, 1)
        try {
          context.texImage2D(
            context.TEXTURE_2D,
            0,
            context.RGBA,
            context.RGBA,
            context.UNSIGNED_BYTE,
            modelSurface.canvas as unknown as TexImageSource,
          )
        } catch {
          return {
            ...modelStats,
            frameMs: performance.now() - startAt,
          }
        }

        drawWebGLPacket(
          context,
          pipeline,
          compositeFrame,
          {
            x: 0,
            y: 0,
            width: frame.viewport.viewportWidth,
            height: frame.viewport.viewportHeight,
          },
          [1, 1, 1, 1],
          1,
          compositeTexture,
        )

        compositeSnapshot = {
          revision: effectiveFrame.scene.revision,
          scale: effectiveFrame.viewport.scale,
          offsetX: effectiveFrame.viewport.offsetX,
          offsetY: effectiveFrame.viewport.offsetY,
          viewportWidth: effectiveFrame.viewport.viewportWidth,
          viewportHeight: effectiveFrame.viewport.viewportHeight,
          pixelRatio: effectiveFrame.context.pixelRatio ?? 1,
          visibleCount: modelStats.visibleCount,
          culledCount: modelStats.culledCount,
        }

        return {
          ...modelStats,
          drawCount: Math.max(1, modelStats.drawCount),
          cacheHits: 0,
          cacheMisses: 0,
          webglRenderPath: 'model-complete',
          webglCompositeUploadBytes:
            Math.max(1, effectiveFrame.viewport.viewportWidth) *
            Math.max(1, effectiveFrame.viewport.viewportHeight) *
            Math.max(1, effectiveFrame.context.pixelRatio ?? 1) *
            Math.max(1, effectiveFrame.context.pixelRatio ?? 1) *
            4,
          webglInteractiveTextFallbackCount: 0,
          webglTextTextureUploadCount: 0,
          webglTextTextureUploadBytes: 0,
          webglTextCacheHitCount: 0,
          l0PreviewHitCount,
          l0PreviewMissCount,
          l1CompositeHitCount,
          l1CompositeMissCount,
          l2TileHitCount,
          l2TileMissCount,
          cacheFallbackReason,
          frameMs: performance.now() - startAt,
        }
      }

      const previewReuse = tryReuseInteractiveCompositeFrame({
        context,
        pipeline,
        frame: effectiveFrame,
        texture: compositeTexture,
        snapshot: compositeSnapshot,
        interactionPreview,
      })
      if (previewReuse.reused) {
        l0PreviewHitCount += 1
        return {
          drawCount: 1,
          visibleCount: previewReuse.visibleCount,
          culledCount: previewReuse.culledCount,
          cacheHits: 1,
          cacheMisses: 0,
          frameReuseHits: 1,
          frameReuseMisses: 0,
          webglRenderPath: 'packet',
          webglCompositeUploadBytes: 0,
          webglInteractiveTextFallbackCount: 0,
          webglTextTextureUploadCount: 0,
          webglTextTextureUploadBytes: 0,
          webglTextCacheHitCount: 0,
          l0PreviewHitCount,
          l0PreviewMissCount,
          l1CompositeHitCount,
          l1CompositeMissCount,
          l2TileHitCount,
          l2TileMissCount,
          cacheFallbackReason,
          frameMs: performance.now() - startAt,
        }
      }
      l0PreviewMissCount += 1
      if (interactiveQuality) {
        cacheFallbackReason = 'l0-preview-miss'
      }

      const plan = prepareEngineRenderPlan(effectiveFrame)
      if (interactiveQuality || !modelCompleteComposite) {
        l1CompositeMissCount += 1
        if (cacheFallbackReason === 'none') {
          cacheFallbackReason = interactiveQuality
            ? 'l1-bypass-interactive'
            : 'l1-disabled'
        }
      }
      // Prepare typed-array instance payload once per frame so upcoming WebGL
      // draw pipelines can focus on upload/commit without repeating traversal.
      const instanceView = prepareEngineRenderInstanceView(effectiveFrame, plan)
      const packetPlan = compileEngineWebGLPacketPlan(plan, instanceView)
      pruneTextCache(context, textCache, packetPlan.packets, resourceBudget)

      // Estimate only not-yet-resident image textures so budget pressure does
      // not keep charging cached images as if every frame were a fresh upload.
      const frameTextureEstimate =
        resourceBudget.getTextureBytes() +
        countPendingImageTextureEstimate(packetPlan.packets, imageCache)

      const budgetState = resourceBudget.recordFrameUsage({
        bufferBytes: packetPlan.uploadBytesEstimate,
        textureBytes: frameTextureEstimate,
      })

      if (budgetState.overTextureBudget) {
        if (budgetState.textureOverflowBytes > 0) {
          const evictedTextureIds = resourceBudget.evictLeastRecentlyUsedTextures(
            budgetState.textureOverflowBytes,
          )
          disposeEvictedTextures(context, imageCache, textCache, evictedTextureIds)
        }
      }

      context.viewport(
        0,
        0,
        ('width' in options.canvas ? options.canvas.width : frame.viewport.viewportWidth),
        ('height' in options.canvas ? options.canvas.height : frame.viewport.viewportHeight),
      )
      context.enable(context.BLEND)
      context.blendFunc(context.ONE, context.ONE_MINUS_SRC_ALPHA)

      context.clearColor(clearColor[0], clearColor[1], clearColor[2], clearColor[3])
      context.clear(context.COLOR_BUFFER_BIT)

      // If there are text packets that require run-level fidelity, use the
      // canvas2d model renderer as a fallback compositor to produce accurate
      // text run output which we then upload to textures per-node.
      const needsModelTextComposite =
        !interactiveQuality && packetPlan.richTextPacketCount > 0

      if (needsModelTextComposite) {
        // Render the full model into the modelSurface canvas so we can crop
        // per-node text rects. Ignore returned stats.
        try {
          await modelRenderer.render(effectiveFrame)
        } catch {
          // If modelRenderer fails, continue without text composite fallback.
        }
      }

      let drawCount = 0
      let interactiveTextFallbackCount = 0
      let textTextureUploadCount = 0
      let textTextureUploadBytes = 0
      let textCacheHitCount = 0
      let imageTextureUploadCount = 0
      let imageTextureUploadBytes = 0
      let deferredImageTextureCount = 0
      const imageUploadBudget: ImageUploadBudgetState = {
        remainingUploads: MAX_IMAGE_TEXTURE_UPLOADS_PER_FRAME,
        remainingBytes: MAX_IMAGE_TEXTURE_UPLOAD_BYTES_PER_FRAME,
      }
      const useTextPlaceholderMode =
        effectiveFrame.viewport.scale <= TEXT_PLACEHOLDER_MAX_SCALE
      for (const packet of packetPlan.packets) {
        if (packet.kind === 'image' && packet.assetId) {
          const imageTexture = resolveImageTexture(
            context,
            effectiveFrame,
            packet.assetId,
            imageCache,
            resourceBudget,
            imageUploadBudget,
          )
          if (imageTexture.deferred) {
            deferredImageTextureCount += 1
          }
          imageTextureUploadCount += imageTexture.uploadCount
          imageTextureUploadBytes += imageTexture.uploadBytes
          drawCount += drawWebGLPacket(
            context,
            pipeline,
            effectiveFrame,
            packet.worldBounds,
            packet.color,
            packet.opacity,
            imageTexture.texture,
          )
          continue
        }

        if (packet.kind === 'text') {
          const cached = textCache.get(packet.nodeId)
          const textCacheKey = resolveTextCacheKey(packet)
          const textRasterScale = resolveTextRasterScale(effectiveFrame)

          if (useTextPlaceholderMode) {
            // Low-zoom text is not legible at glyph fidelity. Render an
            // inexpensive placeholder and skip text raster uploads.
            interactiveTextFallbackCount += 1
            drawCount += drawInteractiveTextFallback(
              context,
              pipeline,
              effectiveFrame,
              packet.worldBounds,
              packet.color,
              packet.opacity,
            )
            continue
          }

          if (interactiveQuality) {
            // Interactive mode prefers cached text textures when content is
            // unchanged so pan/zoom previews avoid collapsing to solid blocks.
            if (cached && canReuseInteractiveTextTexture(cached, textCacheKey)) {
              textCacheHitCount += 1
              resourceBudget.markTextureUsed(packet.nodeId)
              drawCount += drawWebGLPacket(
                context,
                pipeline,
                effectiveFrame,
                packet.worldBounds,
                packet.color,
                packet.opacity,
                cached.texture,
              )
              continue
            }

            // Avoid texture uploads during interaction and fall back only when
            // there is no existing text texture to preview with.
            interactiveTextFallbackCount += 1
            drawCount += drawInteractiveTextFallback(
              context,
              pipeline,
              effectiveFrame,
              packet.worldBounds,
              packet.color,
              packet.opacity,
            )
            continue
          }

          // Try cached text texture first
          if (cached && canReuseTextTexture(cached, textCacheKey, textRasterScale)) {
            textCacheHitCount += 1
            resourceBudget.markTextureUsed(packet.nodeId)
            drawCount += drawWebGLPacket(
              context,
              pipeline,
              effectiveFrame,
              packet.worldBounds,
              packet.color,
              packet.opacity,
              cached.texture,
            )
            continue
          }

          // If we have a modelSurface canvas from the canvas2d renderer,
          // crop the node rect and upload as texture.
          if (modelSurface && modelSurface.canvas) {
            const textureSourceRect = resolvePacketTextureSourceRect(
              packet.worldBounds,
              effectiveFrame,
            )

            const cropped = copyCanvasRegion(
              modelSurface.canvas,
              textCropSurface.canvas,
              textureSourceRect.x,
              textureSourceRect.y,
              textureSourceRect.width,
              textureSourceRect.height,
            )
            const texture = cached?.texture ?? context.createTexture()
            if (texture) {
              const reusesCachedTexture = cached?.texture === texture
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
                  cropped as unknown as TexImageSource,
                )
                textCache.set(packet.nodeId, {
                  texture,
                  width: textureSourceRect.width,
                  height: textureSourceRect.height,
                  cacheKey: textCacheKey,
                  rasterScale: textRasterScale,
                })
                resourceBudget.markTextureResident(
                  packet.nodeId,
                  textureSourceRect.width * textureSourceRect.height * 4,
                )
                resourceBudget.markTextureUsed(packet.nodeId)
                textTextureUploadCount += 1
                textTextureUploadBytes += textureSourceRect.width * textureSourceRect.height * 4
                drawCount += drawWebGLPacket(
                  context,
                  pipeline,
                  effectiveFrame,
                  packet.worldBounds,
                  packet.color,
                  packet.opacity,
                  texture,
                )
                continue
              } catch {
                if (reusesCachedTexture) {
                  textCache.delete(packet.nodeId)
                  resourceBudget.releaseTexture(packet.nodeId)
                }
                context.deleteTexture(texture)
              }
            }
          }
        }

        // Fallback: draw a solid quad when no texture is available.
        drawCount += drawWebGLPacket(
          context,
          pipeline,
          effectiveFrame,
          packet.worldBounds,
          packet.color,
          packet.opacity,
          null,
        )
      }

      // Collect tile and initial render diagnostics
      const tileStats = tileCache?.getStats()
      const initialRenderPhase = initialRenderController?.getPhase()
      const initialRenderProgress = initialRenderController?.getDetailPassProgress()

      return {
        drawCount,
        visibleCount: plan.stats.visibleCount,
        culledCount: plan.stats.culledCount,
        groupCollapseCount: plan.stats.collapsedGroupCount,
        groupCollapseCulledCount: plan.stats.collapsedDescendantCulledCount,
        cacheHits: 0,
        cacheMisses: 0,
        frameReuseHits: 0,
        frameReuseMisses: 0,
        webglRenderPath: 'packet',
        webglCompositeUploadBytes: 0,
        webglInteractiveTextFallbackCount: interactiveTextFallbackCount,
        webglImageTextureUploadCount: imageTextureUploadCount,
        webglImageTextureUploadBytes: imageTextureUploadBytes,
        webglDeferredImageTextureCount: deferredImageTextureCount,
        webglTextTextureUploadCount: textTextureUploadCount,
        webglTextTextureUploadBytes: textTextureUploadBytes,
        webglTextCacheHitCount: textCacheHitCount,
        l0PreviewHitCount,
        l0PreviewMissCount,
        l1CompositeHitCount,
        l1CompositeMissCount,
        l2TileHitCount,
        l2TileMissCount,
        cacheFallbackReason,
        tileCacheSize: tileStats?.tileCount,
        tileDirtyCount: tileStats?.dirtyCount,
        tileCacheTotalBytes: tileStats?.totalTextureBytes,
        initialRenderPhase: initialRenderPhase?.toString(),
        initialRenderProgress: initialRenderProgress,
        dirtyRegionCount: dirtyRegionCount,
        dirtyTileCount: dirtyTileCount,
        incrementalUpdateCount: dirtyTileCount > 0 ? 1 : 0,
        frameMs: performance.now() - startAt,
      }
    },
    dispose: () => {
      modelRenderer.dispose?.()
      context.deleteTexture(compositeTexture)
      for (const texture of tileTextures.values()) {
        context.deleteTexture(texture)
      }
      tileTextures.clear()
      disposeCachedTextures(context, imageCache, resourceBudget)
      disposeCachedTextures(context, textCache, resourceBudget)
      disposeWebGLQuadPipeline(context, pipeline)
      // WebGL context lifecycle is owned by the host canvas environment.
    },
  }
}

function createModelSurface(width: number, height: number) {
  if (typeof OffscreenCanvas !== 'undefined') {
    return {
      canvas: new OffscreenCanvas(width, height),
    }
  }

  if (typeof document !== 'undefined') {
    const element = document.createElement('canvas')
    element.width = width
    element.height = height
    return {
      canvas: element,
    }
  }

  return null
}

function copyCanvasRegion(
  source: HTMLCanvasElement | OffscreenCanvas,
  target: HTMLCanvasElement | OffscreenCanvas,
  sx: number,
  sy: number,
  sw: number,
  sh: number,
) {
  // Reuse one scratch surface so uncached text packets do not allocate a new
  // temporary canvas on every crop/upload pass.
  target.width = sw
  target.height = sh
  const context = target.getContext('2d')
  if (context) {
    context.clearRect(0, 0, sw, sh)
    context.drawImage(source, sx, sy, sw, sh, 0, 0, sw, sh)
  }

  return target
}

function clampTileZoomLevel(value: number): TileZoomLevel {
  const rounded = Math.round(value)
  if (rounded <= 0) return 0
  if (rounded >= 5) return 5
  return rounded as TileZoomLevel
}

function resolveViewportWorldBounds(frame: EngineRenderFrame) {
  return {
    x: -frame.viewport.offsetX / frame.viewport.scale,
    y: -frame.viewport.offsetY / frame.viewport.scale,
    width: frame.viewport.viewportWidth / frame.viewport.scale,
    height: frame.viewport.viewportHeight / frame.viewport.scale,
  }
}

function drawModelSurfaceAsTiles(options: {
  context: WebGLRenderingContext | WebGL2RenderingContext
  frame: EngineRenderFrame
  tileCache: EngineTileCache
  tileTextures: Map<number, WebGLTexture>
  nextTileTextureId: () => number
  modelSurface: HTMLCanvasElement | OffscreenCanvas
  pipeline: WebGLQuadPipeline
  previousZoomLevel?: TileZoomLevel | null
}) {
  const zoomLevel = getZoomLevelForScale(
    options.frame.viewport.scale,
    options.previousZoomLevel,
  )
  const viewportBounds = resolveViewportWorldBounds(options.frame)
  const visibleTiles = options.tileCache.getVisibleTiles(viewportBounds, zoomLevel)
  const pixelRatio = options.frame.context.pixelRatio ?? 1
  const viewportWidthPx = Math.max(1, Math.round(options.frame.viewport.viewportWidth * pixelRatio))
  const viewportHeightPx = Math.max(1, Math.round(options.frame.viewport.viewportHeight * pixelRatio))

  let drawCount = 0
  let tileHitCount = 0
  let tileMissCount = 0
  let fallbackReason = 'none'

  for (const tile of visibleTiles) {
    const cachedEntry = options.tileCache.getEntry(tile.zoomLevel, tile.gridX, tile.gridY)
    const cachedTexture = cachedEntry ? options.tileTextures.get(cachedEntry.textureId) : null
    if (cachedEntry && !cachedEntry.isDirty && cachedTexture) {
      tileHitCount += 1
      drawCount += drawWebGLPacket(
        options.context,
        options.pipeline,
        options.frame,
        cachedEntry.bounds,
        [1, 1, 1, 1],
        1,
        cachedTexture,
      )
      continue
    }

    tileMissCount += 1
    const tileTextureSource = buildTileTextureSourceFromModelSurface({
      modelSurface: options.modelSurface,
      frame: options.frame,
      tileBounds: tile.bounds,
      viewportWidthPx,
      viewportHeightPx,
    })
    if (!tileTextureSource) {
      fallbackReason = 'l2-tile-source-build-failed'
      return null
    }

    const existingTexture = cachedTexture ?? null
    const uploaded = uploadTileTexture(
      options.context,
      existingTexture,
      tileTextureSource,
    )
    if (!uploaded.texture) {
      fallbackReason = 'l2-tile-upload-failed'
      return null
    }

    const textureId = cachedEntry?.textureId ?? options.nextTileTextureId()
    options.tileTextures.set(textureId, uploaded.texture)
    options.tileCache.upsertEntry({
      zoomLevel: tile.zoomLevel,
      gridX: tile.gridX,
      gridY: tile.gridY,
      textureId,
      textureBytes: uploaded.textureBytes,
    })

    drawCount += drawWebGLPacket(
      options.context,
      options.pipeline,
      options.frame,
      tile.bounds,
      [1, 1, 1, 1],
      1,
      uploaded.texture,
    )
  }

  return {
    zoomLevel,
    drawCount,
    tileHitCount,
    tileMissCount,
    fallbackReason,
  }
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
  frame: EngineRenderFrame
  tileBounds: {x: number; y: number; width: number; height: number}
  viewportWidthPx: number
  viewportHeightPx: number
}) {
  const pixelRatio = options.frame.context.pixelRatio ?? 1
  const matrix = options.frame.viewport.matrix
  const tileScreenX = matrix[0] * options.tileBounds.x + matrix[1] * options.tileBounds.y + matrix[2]
  const tileScreenY = matrix[3] * options.tileBounds.x + matrix[4] * options.tileBounds.y + matrix[5]
  const tileScreenWidth = options.tileBounds.width * options.frame.viewport.scale
  const tileScreenHeight = options.tileBounds.height * options.frame.viewport.scale

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

  const tileSurface = createModelSurface(tilePixelWidth, tilePixelHeight)
  if (!tileSurface) {
    return null
  }

  const tileContext = tileSurface.canvas.getContext('2d')
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

function resolveTextCacheKey(packet: { textCacheKey?: string }) {
  // Keep cache reuse local to each text packet so unrelated scene revisions do
  // not invalidate every text texture at once.
  return packet.textCacheKey ?? 'text'
}

function resolveTextRasterScale(frame: EngineRenderFrame) {
  // Track the effective text raster scale so we can reuse equal-or-higher
  // fidelity textures across zoom-outs without forcing a new upload.
  return (frame.context.pixelRatio ?? 1) * frame.viewport.scale
}

function countPendingImageTextureEstimate(
  packets: ReadonlyArray<{ kind: string; assetId?: string }>,
  imageCache: Map<string, CachedTextureEntry>,
) {
  let estimatedBytes = 0

  for (const packet of packets) {
    if (packet.kind !== 'image' || !packet.assetId || imageCache.has(packet.assetId)) {
      continue
    }

    // Keep a coarse placeholder estimate for not-yet-uploaded images without
    // recharging textures that are already resident in the cache.
    estimatedBytes += 4 * 1024 * 1024
  }

  return estimatedBytes
}

function canReuseTextTexture(
  cached: CachedTextureEntry | undefined,
  textCacheKey: string,
  textRasterScale: number,
) {
  if (!cached || cached.cacheKey !== textCacheKey) {
    return false
  }

  const cachedRasterScale = cached.rasterScale ?? 0
  return cachedRasterScale >= textRasterScale
}

function canReuseInteractiveTextTexture(
  cached: CachedTextureEntry | undefined,
  textCacheKey: string,
) {
  // Allow interactive previews to reuse any matching cached text texture so
  // motion stays legible even when the cached raster is lower-resolution.
  return Boolean(cached && cached.cacheKey === textCacheKey)
}

function resolvePacketTextureSourceRect(
  worldBounds: {x: number; y: number; width: number; height: number},
  frame: EngineRenderFrame,
) {
  const pixelRatio = frame.context.pixelRatio ?? 1
  const scale = frame.viewport.scale
  const offsetX = frame.viewport.offsetX
  const offsetY = frame.viewport.offsetY
  // Convert world-space bounds into the same device-pixel crop rect used by
  // the Canvas2D model surface so texture uploads sample the correct pixels.
  const minX = Math.floor((worldBounds.x * scale + offsetX) * pixelRatio)
  const minY = Math.floor((worldBounds.y * scale + offsetY) * pixelRatio)
  const maxX = Math.ceil((
    (worldBounds.x + worldBounds.width) * scale + offsetX
  ) * pixelRatio)
  const maxY = Math.ceil((
    (worldBounds.y + worldBounds.height) * scale + offsetY
  ) * pixelRatio)

  return {
    x: minX,
    y: minY,
    width: Math.max(1, maxX - minX),
    height: Math.max(1, maxY - minY),
  }
}

function drawInteractiveTextFallback(
  context: WebGLRenderingContext | WebGL2RenderingContext,
  pipeline: WebGLQuadPipeline,
  frame: EngineRenderFrame,
  worldBounds: {x: number; y: number; width: number; height: number},
  color: readonly [number, number, number, number],
  opacity: number,
) {
  const stripeCount = resolveInteractiveTextStripeCount(worldBounds.height)
  const insetX = Math.min(worldBounds.width * 0.08, worldBounds.width * 0.32)
  const insetY = Math.min(worldBounds.height * 0.14, worldBounds.height * 0.28)
  const availableHeight = Math.max(1, worldBounds.height - insetY * 2)
  const stripeGap = Math.max(availableHeight * 0.12, worldBounds.height * 0.04)
  const stripeHeight = Math.max(
    1,
    (availableHeight - stripeGap * Math.max(0, stripeCount - 1)) / Math.max(1, stripeCount),
  )
  const widthFactors = [0.92, 0.78, 0.58]

  let drawCount = 0
  for (let index = 0; index < stripeCount; index += 1) {
    // Draw a few ragged text-line bars so interaction previews stay legible
    // without paying the upload cost of a fresh text texture mid-gesture.
    const stripeWidth = Math.max(
      1,
      (worldBounds.width - insetX * 2) * (widthFactors[index] ?? widthFactors[widthFactors.length - 1]),
    )
    const stripeY = worldBounds.y + insetY + index * (stripeHeight + stripeGap)
    drawCount += drawWebGLPacket(
      context,
      pipeline,
      frame,
      {
        x: worldBounds.x + insetX,
        y: stripeY,
        width: stripeWidth,
        height: stripeHeight,
      },
      [color[0], color[1], color[2], color[3] * 0.88],
      opacity,
      null,
    )
  }

  return drawCount
}

function resolveInteractiveTextStripeCount(worldHeight: number) {
  if (worldHeight >= 56) {
    return 3
  }

  if (worldHeight >= 24) {
    return 2
  }

  return 1
}

function disposeCachedTextures(
  context: WebGLRenderingContext | WebGL2RenderingContext,
  cache: Map<string, CachedTextureEntry>,
  budget: ReturnType<typeof createEngineWebGLResourceBudgetTracker>,
) {
  // Keep cache-reset and dispose semantics aligned so GPU texture ownership is
  // released consistently.
  for (const [cacheKey, entry] of cache.entries()) {
    context.deleteTexture(entry.texture)
    budget.releaseTexture(cacheKey)
  }

  cache.clear()
}

function disposeEvictedTextures(
  context: WebGLRenderingContext | WebGL2RenderingContext,
  imageCache: Map<string, CachedTextureEntry>,
  textCache: Map<string, CachedTextureEntry>,
  textureIds: readonly string[],
) {
  // Keep budget-driven eviction tied to actual GPU/cache disposal so resource
  // pressure decisions reflect real residency instead of bookkeeping only.
  for (const textureId of textureIds) {
    const cachedImage = imageCache.get(textureId)
    if (cachedImage) {
      context.deleteTexture(cachedImage.texture)
      imageCache.delete(textureId)
      continue
    }

    const cachedText = textCache.get(textureId)
    if (cachedText) {
      context.deleteTexture(cachedText.texture)
      textCache.delete(textureId)
    }
  }
}

function pruneTextCache(
  context: WebGLRenderingContext | WebGL2RenderingContext,
  cache: Map<string, CachedTextureEntry>,
  packets: ReadonlyArray<{ kind: string; nodeId: string }>,
  budget: ReturnType<typeof createEngineWebGLResourceBudgetTracker>,
) {
  // Drop GPU textures for text nodes that are no longer part of the current
  // packet plan so node-local caching does not retain removed text forever.
  const activeTextNodeIds = new Set(
    packets
      .filter((packet) => packet.kind === 'text')
      .map((packet) => packet.nodeId),
  )

  for (const [nodeId, entry] of cache.entries()) {
    if (activeTextNodeIds.has(nodeId)) {
      continue
    }

    context.deleteTexture(entry.texture)
    cache.delete(nodeId)
    budget.releaseTexture(nodeId)
  }
}

interface WebGLQuadPipeline {
  program: WebGLProgram
  positionBuffer: WebGLBuffer
  attributePosition: number
  uniformRect: WebGLUniformLocation
  uniformScale: WebGLUniformLocation
  uniformOffset: WebGLUniformLocation
  uniformViewport: WebGLUniformLocation
  uniformColor: WebGLUniformLocation
  uniformUseTexture: WebGLUniformLocation
  uniformSampler: WebGLUniformLocation
}

interface CachedTextureEntry {
  texture: WebGLTexture
  width: number
  height: number
  cacheKey?: string
  rasterScale?: number
}

interface ImageUploadBudgetState {
  remainingUploads: number
  remainingBytes: number
}

interface ResolvedImageTextureResult {
  texture: WebGLTexture | null
  uploadCount: number
  uploadBytes: number
  deferred: boolean
}

function tryReuseInteractiveCompositeFrame(options: {
  context: WebGLRenderingContext | WebGL2RenderingContext
  pipeline: WebGLQuadPipeline
  frame: EngineRenderFrame
  texture: WebGLTexture
  snapshot: {
    revision: string | number
    scale: number
    offsetX: number
    offsetY: number
    viewportWidth: number
    viewportHeight: number
    pixelRatio: number
    visibleCount: number
    culledCount: number
  } | null
  interactionPreview: Required<EngineInteractionPreviewConfig>
}) {
  if (!options.interactionPreview.enabled || options.frame.context.quality !== 'interactive' || !options.snapshot) {
    return {reused: false, visibleCount: 0, culledCount: 0}
  }

  const snapshot = options.snapshot
  const frame = options.frame
  const currentPixelRatio = frame.context.pixelRatio ?? 1
  if (
    snapshot.revision !== frame.scene.revision ||
    snapshot.viewportWidth !== frame.viewport.viewportWidth ||
    snapshot.viewportHeight !== frame.viewport.viewportHeight ||
    snapshot.pixelRatio !== currentPixelRatio
  ) {
    return {reused: false, visibleCount: 0, culledCount: 0}
  }

  const scaleRatio = frame.viewport.scale / snapshot.scale
  if (!Number.isFinite(scaleRatio) || scaleRatio <= 0) {
    return {reused: false, visibleCount: 0, culledCount: 0}
  }

  if (options.interactionPreview.mode === 'zoom-only' && Math.abs(scaleRatio - 1) < 1e-3) {
    return {reused: false, visibleCount: 0, culledCount: 0}
  }

  if (
    scaleRatio > options.interactionPreview.maxScaleStep ||
    scaleRatio < 1 / options.interactionPreview.maxScaleStep
  ) {
    return {reused: false, visibleCount: 0, culledCount: 0}
  }

  const deltaX = frame.viewport.offsetX - scaleRatio * snapshot.offsetX
  const deltaY = frame.viewport.offsetY - scaleRatio * snapshot.offsetY
  if (
    Math.abs(deltaX * currentPixelRatio) > options.interactionPreview.maxTranslatePx ||
    Math.abs(deltaY * currentPixelRatio) > options.interactionPreview.maxTranslatePx
  ) {
    return {reused: false, visibleCount: 0, culledCount: 0}
  }

  options.context.viewport(
    0,
    0,
    frame.viewport.viewportWidth * currentPixelRatio,
    frame.viewport.viewportHeight * currentPixelRatio,
  )
  options.context.enable(options.context.BLEND)
  options.context.blendFunc(options.context.ONE, options.context.ONE_MINUS_SRC_ALPHA)
  options.context.clearColor(0, 0, 0, 0)
  options.context.clear(options.context.COLOR_BUFFER_BIT)

  const previewFrame: EngineRenderFrame = {
    ...frame,
    viewport: {
      ...frame.viewport,
      scale: scaleRatio,
      offsetX: deltaX,
      offsetY: deltaY,
    },
  }

  drawWebGLPacket(
    options.context,
    options.pipeline,
    previewFrame,
    {
      x: 0,
      y: 0,
      width: snapshot.viewportWidth,
      height: snapshot.viewportHeight,
    },
    [1, 1, 1, 1],
    1,
    options.texture,
  )

  return {
    reused: true,
    visibleCount: snapshot.visibleCount,
    culledCount: snapshot.culledCount,
  }
}

function createWebGLQuadPipeline(
  context: WebGLRenderingContext | WebGL2RenderingContext,
): WebGLQuadPipeline {
  const vertexShader = createShader(context, context.VERTEX_SHADER, `
attribute vec2 aPosition;
uniform vec4 uRect;
uniform vec2 uScale;
uniform vec2 uOffset;
uniform vec2 uViewport;
varying vec2 vUv;

void main() {
  vec2 world = uRect.xy + aPosition * uRect.zw;
  vec2 screen = vec2(world.x * uScale.x + uOffset.x, world.y * uScale.y + uOffset.y);
  vec2 clip = vec2(
    (screen.x / uViewport.x) * 2.0 - 1.0,
    1.0 - (screen.y / uViewport.y) * 2.0
  );
  gl_Position = vec4(clip, 0.0, 1.0);
  vUv = aPosition;
}
`)
  const fragmentShader = createShader(context, context.FRAGMENT_SHADER, `
precision mediump float;
uniform vec4 uColor;
uniform float uUseTexture;
uniform sampler2D uSampler;
varying vec2 vUv;

void main() {
  vec4 color = uColor;
  if (uUseTexture > 0.5) {
    color = texture2D(uSampler, vUv);
  }
  gl_FragColor = color;
}
`)

  const program = createProgram(context, vertexShader, fragmentShader)
  const positionBuffer = context.createBuffer()
  if (!positionBuffer) {
    throw new Error('webgl position buffer allocation failed')
  }

  context.bindBuffer(context.ARRAY_BUFFER, positionBuffer)
  context.bufferData(
    context.ARRAY_BUFFER,
    new Float32Array([
      0, 0,
      1, 0,
      0, 1,
      1, 1,
    ]),
    context.STATIC_DRAW,
  )

  const attributePosition = context.getAttribLocation(program, 'aPosition')
  const uniformRect = context.getUniformLocation(program, 'uRect')
  const uniformScale = context.getUniformLocation(program, 'uScale')
  const uniformOffset = context.getUniformLocation(program, 'uOffset')
  const uniformViewport = context.getUniformLocation(program, 'uViewport')
  const uniformColor = context.getUniformLocation(program, 'uColor')
  const uniformUseTexture = context.getUniformLocation(program, 'uUseTexture')
  const uniformSampler = context.getUniformLocation(program, 'uSampler')

  if (
    attributePosition < 0 ||
    !uniformRect ||
    !uniformScale ||
    !uniformOffset ||
    !uniformViewport ||
    !uniformColor ||
    !uniformUseTexture ||
    !uniformSampler
  ) {
    context.deleteBuffer(positionBuffer)
    context.deleteProgram(program)
    throw new Error('webgl quad pipeline uniforms/attributes are incomplete')
  }

  return {
    program,
    positionBuffer,
    attributePosition,
    uniformRect,
    uniformScale,
    uniformOffset,
    uniformViewport,
    uniformColor,
    uniformUseTexture,
    uniformSampler,
  }
}

function drawWebGLPacket(
  context: WebGLRenderingContext | WebGL2RenderingContext,
  pipeline: WebGLQuadPipeline,
  frame: EngineRenderFrame,
  worldBounds: {x: number; y: number; width: number; height: number},
  color: readonly [number, number, number, number],
  opacity: number,
  texture: WebGLTexture | null,
) {
  const pixelRatio = frame.context.pixelRatio ?? 1

  context.useProgram(pipeline.program)
  context.bindBuffer(context.ARRAY_BUFFER, pipeline.positionBuffer)
  context.enableVertexAttribArray(pipeline.attributePosition)
  context.vertexAttribPointer(pipeline.attributePosition, 2, context.FLOAT, false, 0, 0)

  context.uniform4f(
    pipeline.uniformRect,
    worldBounds.x,
    worldBounds.y,
    Math.max(0, worldBounds.width),
    Math.max(0, worldBounds.height),
  )
  // Keep world->screen math in device-pixel space, matching Canvas2D path.
  context.uniform2f(
    pipeline.uniformScale,
    frame.viewport.scale * pixelRatio,
    frame.viewport.scale * pixelRatio,
  )
  context.uniform2f(
    pipeline.uniformOffset,
    frame.viewport.offsetX * pixelRatio,
    frame.viewport.offsetY * pixelRatio,
  )

  const viewportWidth = Math.max(1, frame.viewport.viewportWidth * pixelRatio)
  const viewportHeight = Math.max(1, frame.viewport.viewportHeight * pixelRatio)
  context.uniform2f(pipeline.uniformViewport, viewportWidth, viewportHeight)

  context.uniform4f(
    pipeline.uniformColor,
    color[0],
    color[1],
    color[2],
    color[3] * opacity,
  )

  if (texture) {
    context.activeTexture(context.TEXTURE0)
    context.bindTexture(context.TEXTURE_2D, texture)
    context.uniform1i(pipeline.uniformSampler, 0)
    context.uniform1f(pipeline.uniformUseTexture, 1)
  } else {
    context.uniform1f(pipeline.uniformUseTexture, 0)
  }

  context.drawArrays(context.TRIANGLE_STRIP, 0, 4)
  return 1
}

function resolveImageTexture(
  context: WebGLRenderingContext | WebGL2RenderingContext,
  frame: EngineRenderFrame,
  assetId: string,
  imageCache: Map<string, CachedTextureEntry>,
  budget: ReturnType<typeof createEngineWebGLResourceBudgetTracker>,
  uploadBudget: ImageUploadBudgetState,
): ResolvedImageTextureResult {
  const existing = imageCache.get(assetId)
  if (existing) {
    budget.markTextureUsed(assetId)
    return {
      texture: existing.texture,
      uploadCount: 0,
      uploadBytes: 0,
      deferred: false,
    }
  }

  if (frame.context.quality === 'interactive') {
    // Freeze expensive texture uploads during active interaction and rely on
    // settled frames to populate missing image textures.
    return {
      texture: null,
      uploadCount: 0,
      uploadBytes: 0,
      deferred: true,
    }
  }

  const source = frame.context.loader?.resolveImage(assetId)
  if (!source) {
    return {
      texture: null,
      uploadCount: 0,
      uploadBytes: 0,
      deferred: false,
    }
  }

  const size = resolveCanvasImageSourceSize(source)
  const width = Math.max(1, size.width)
  const height = Math.max(1, size.height)
  const uploadBytes = width * height * 4
  const canSpendOversizedSingleUpload =
    uploadBudget.remainingUploads > 0 &&
    uploadBudget.remainingBytes === MAX_IMAGE_TEXTURE_UPLOAD_BYTES_PER_FRAME
  if (
    uploadBudget.remainingUploads <= 0 ||
    (uploadBudget.remainingBytes < uploadBytes && !canSpendOversizedSingleUpload)
  ) {
    return {
      texture: null,
      uploadCount: 0,
      uploadBytes: 0,
      deferred: true,
    }
  }

  const texture = context.createTexture()
  if (!texture) {
    return {
      texture: null,
      uploadCount: 0,
      uploadBytes: 0,
      deferred: false,
    }
  }

  context.bindTexture(context.TEXTURE_2D, texture)
  context.pixelStorei(context.UNPACK_PREMULTIPLY_ALPHA_WEBGL, 1)
  context.texParameteri(context.TEXTURE_2D, context.TEXTURE_MIN_FILTER, context.LINEAR)
  context.texParameteri(context.TEXTURE_2D, context.TEXTURE_MAG_FILTER, context.LINEAR)
  context.texParameteri(context.TEXTURE_2D, context.TEXTURE_WRAP_S, context.CLAMP_TO_EDGE)
  context.texParameteri(context.TEXTURE_2D, context.TEXTURE_WRAP_T, context.CLAMP_TO_EDGE)

  try {
    const textureSource = source as unknown as TexImageSource
    context.texImage2D(
      context.TEXTURE_2D,
      0,
      context.RGBA,
      context.RGBA,
      context.UNSIGNED_BYTE,
      textureSource,
    )
  } catch {
    context.deleteTexture(texture)
    return {
      texture: null,
      uploadCount: 0,
      uploadBytes: 0,
      deferred: false,
    }
  }

  uploadBudget.remainingUploads -= 1
  // Clamp to zero so one oversized upload can consume the whole frame budget
  // without causing negative accounting or an infinite deferred loop.
  uploadBudget.remainingBytes = Math.max(0, uploadBudget.remainingBytes - uploadBytes)
  imageCache.set(assetId, {
    texture,
    width,
    height,
  })
  budget.markTextureResident(assetId, uploadBytes)
  budget.markTextureUsed(assetId)

  return {
    texture,
    uploadCount: 1,
    uploadBytes,
    deferred: false,
  }
}

function resolveCanvasImageSourceSize(source: CanvasImageSource) {
  const candidate = source as {
    width?: number
    height?: number
    naturalWidth?: number
    naturalHeight?: number
    videoWidth?: number
    videoHeight?: number
  }

  const width =
    candidate.naturalWidth ??
    candidate.videoWidth ??
    candidate.width ??
    1
  const height =
    candidate.naturalHeight ??
    candidate.videoHeight ??
    candidate.height ??
    1

  return {
    width,
    height,
  }
}

function createShader(
  context: WebGLRenderingContext | WebGL2RenderingContext,
  type: number,
  source: string,
) {
  const shader = context.createShader(type)
  if (!shader) {
    throw new Error('webgl shader allocation failed')
  }

  context.shaderSource(shader, source)
  context.compileShader(shader)
  if (!context.getShaderParameter(shader, context.COMPILE_STATUS)) {
    const log = context.getShaderInfoLog(shader) ?? 'unknown error'
    context.deleteShader(shader)
    throw new Error(`webgl shader compile failed: ${log}`)
  }

  return shader
}

function createProgram(
  context: WebGLRenderingContext | WebGL2RenderingContext,
  vertexShader: WebGLShader,
  fragmentShader: WebGLShader,
) {
  const program = context.createProgram()
  if (!program) {
    context.deleteShader(vertexShader)
    context.deleteShader(fragmentShader)
    throw new Error('webgl program allocation failed')
  }

  context.attachShader(program, vertexShader)
  context.attachShader(program, fragmentShader)
  context.linkProgram(program)
  context.deleteShader(vertexShader)
  context.deleteShader(fragmentShader)

  if (!context.getProgramParameter(program, context.LINK_STATUS)) {
    const log = context.getProgramInfoLog(program) ?? 'unknown error'
    context.deleteProgram(program)
    throw new Error(`webgl program link failed: ${log}`)
  }

  return program
}

function disposeWebGLQuadPipeline(
  context: WebGLRenderingContext | WebGL2RenderingContext,
  pipeline: WebGLQuadPipeline,
) {
  context.deleteBuffer(pipeline.positionBuffer)
  context.deleteProgram(pipeline.program)
}

function resolveWebGLContext(
  canvas: HTMLCanvasElement | OffscreenCanvas,
  attributes: WebGLContextAttributes,
) {
  const webgl2 = canvas.getContext('webgl2', attributes) as WebGLRenderingContext | WebGL2RenderingContext | null
  if (webgl2) {
    return webgl2
  }

  return canvas.getContext('webgl', attributes) as WebGLRenderingContext | null
}
