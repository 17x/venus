import type {
  BaseSceneRenderMode,
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
  createTileKey,
  type TileZoomLevel,
} from './tileManager.ts'
import { EngineInitialRenderController } from './initialRender.ts'
import { TileScheduler } from './tileScheduler.ts'
import { resolveEngineVisibilityProfile } from '../interaction/visibilityLod.ts'

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

interface ScreenRectPx {
  x: number
  y: number
  width: number
  height: number
}

const DEFAULT_INTERACTION_PREVIEW: Required<EngineInteractionPreviewConfig> = {
  enabled: true,
  mode: 'interaction',
  cacheOnly: false,
  maxScaleStep: 1.2,
  maxTranslatePx: 220,
}

const INTERACTION_PREVIEW_LOW_SCALE_MAX_SCALE = 0.12
const INTERACTION_PREVIEW_LOW_SCALE_MAX_SCALE_STEP = 1.3
const INTERACTION_PREVIEW_LOW_SCALE_MAX_TRANSLATE_PX = 320
const INTERACTION_PREVIEW_LOW_SCALE_VIEWPORT_TRANSLATE_RATIO = 0.24
const INTERACTION_PREVIEW_OVERVIEW_MAX_SCALE = 0.05
const INTERACTION_PREVIEW_OVERVIEW_MAX_SCALE_STEP = 1.75
const INTERACTION_PREVIEW_OVERVIEW_MAX_TRANSLATE_PX = 560
const INTERACTION_PREVIEW_OVERVIEW_VIEWPORT_TRANSLATE_RATIO = 0.35

const MAX_IMAGE_TEXTURE_UPLOADS_PER_FRAME = 2
const MAX_IMAGE_TEXTURE_UPLOAD_BYTES_PER_FRAME = 16 * 1024 * 1024
const TEXT_PLACEHOLDER_MAX_SCALE = 0.16
const TEXT_PLACEHOLDER_SKIP_MAX_SCREEN_EDGE_PX = 2.2
const OVERVIEW_IMAGE_SKIP_MAX_SCALE = 0.02
const OVERVIEW_IMAGE_SKIP_MAX_SCREEN_EDGE_PX = 2.8
// Visibility-tier thresholds replace scale-bucket packet skipping for interaction frames.
const INTERACTION_PACKET_SKIP_TIER_D_MIN_EDGE_PX = 3.2
const INTERACTION_PACKET_SKIP_TIER_C_MIN_EDGE_PX = 2.2
const INTERACTION_PACKET_SKIP_TIER_B_MIN_EDGE_PX = 1.2
const INTERACTION_PACKET_SKIP_SHAPE_MIN_AREA_PX2 = 6
// Keep tile cache on one persistent zoom domain to reduce multi-layer drift complexity.
const TILE_CACHE_SINGLE_LAYER_ZOOM_LEVEL: TileZoomLevel = 5

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
  const lodEnabled = options.lod?.enabled ?? false
  // Prefer packet path by default for runtime responsiveness. Model-complete
  // composite remains opt-in for fidelity-focused scenarios.
  const modelCompleteComposite = options.modelCompleteComposite ?? false
  const resourceBudget = createEngineWebGLResourceBudgetTracker()
  const pipeline = createWebGLQuadPipeline(context)
  const imageCache = new Map<string, CachedTextureEntry>()
  const textCache = new Map<string, CachedTextureEntry>()
  let interactionPreview = {
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
  
  // Only create the tile cache when the feature is explicitly enabled.
  const tileCache = options.tileConfig?.enabled ? new EngineTileCache(options.tileConfig) : null
  // Tile scheduler keeps preload requests bounded and deduplicated across frames.
  const tileScheduler = tileCache ? new TileScheduler() : null
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
      lod: lodEnabled,
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
    setInteractionPreview: (config) => {
      interactionPreview = {
        ...DEFAULT_INTERACTION_PREVIEW,
        ...config,
      }
    },
    render: async (frame: EngineRenderFrame) => {
      const startAt = performance.now()
      const interactiveQuality = frame.context.quality === 'interactive'
      // Resolve one base-scene mode value per frame so all return paths report consistent state.
      const baseSceneRenderMode = resolveBaseSceneRenderMode({
        interactiveQuality,
        tileCacheEnabled: Boolean(tileCache),
      })
      // Engine WebGL renderer composes base scene only; overlays remain app/runtime-owned.
      const tileCacheBaseSceneOnly = true
      let l0PreviewHitCount = 0
      let l0PreviewMissCount = 0
      let l1CompositeHitCount = 0
      let l1CompositeMissCount = 0
      let l2TileHitCount = 0
      let l2TileMissCount = 0
      let cacheFallbackReason = 'none'
      // Keep WebGL pipeline timing slices explicit for frame-time attribution.
      let webglPreviewReuseMs = 0
      let webglPlanBuildMs = 0
      let webglTextureUploadMs = 0
      let webglDrawSubmitMs = 0
      let webglSnapshotCaptureMs = 0
      let webglModelRenderMs = 0

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
          const zoomLevel = TILE_CACHE_SINGLE_LAYER_ZOOM_LEVEL
          const dirtyTilesBefore = tileCache.getDirtyTiles().length
          // Single-layer invalidation keeps dirty propagation deterministic during interaction.
          if (dirtyRegion.previousBounds) {
            tileCache.invalidateTilesForBoundsDelta(
              dirtyRegion.previousBounds,
              dirtyRegion.bounds,
              zoomLevel,
            )
          } else {
            tileCache.invalidateTilesInBounds(dirtyRegion.bounds, zoomLevel)
          }
          dirtyTileCount += Math.max(0, tileCache.getDirtyTiles().length - dirtyTilesBefore)
        }
      }

      // Keep full-fidelity composite for settled frames, but fall back to the
      // packet pipeline during interaction so pan/zoom can keep frame pace.
      if (modelCompleteComposite && !interactiveQuality) {
        l1CompositeHitCount += 1
        const modelRenderStart = performance.now()
        const modelStats = await modelRenderer.render(effectiveFrame)
        webglModelRenderMs += performance.now() - modelRenderStart
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

        const tileDrawStart = performance.now()
        const tileDrawResult = tileCache
          ? drawModelSurfaceAsTiles({
            context,
            frame: effectiveFrame,
            tileCache,
            tileTextures,
            nextTileTextureId: () => nextTileTextureId++,
            modelSurface: modelSurface.canvas,
            pipeline,
            tileScheduler,
            previousZoomLevel: previousTileZoomLevel,
            preloadRing: baseSceneRenderMode === 'progressive-refresh' ? 1 : 0,
            preloadBudgetMs: baseSceneRenderMode === 'progressive-refresh' ? 10 : 0,
            maxPreloadUploads: baseSceneRenderMode === 'progressive-refresh' ? 8 : 0,
          })
          : null
        webglDrawSubmitMs += performance.now() - tileDrawStart

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
          const imageTextureBytes = resolveCachedTextureBytes(imageCache)
          const gpuTextureBytes = (tileStats?.totalTextureBytes ?? 0) + resourceBudget.getTextureBytes()

          return {
            ...modelStats,
            drawCount: Math.max(1, tileDrawResult.drawCount),
            engineFrameQuality: effectiveFrame.context.quality,
            baseSceneRenderMode,
            tileCacheBaseSceneOnly,
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
            tileUploadCount: tileDrawResult.tileUploadCount,
            tileRenderCount: tileDrawResult.tileRenderCount,
            visibleTileCount: tileDrawResult.visibleTileCount,
            // Report queue depth after visible/preload processing for frame-level tuning.
            tileSchedulerPendingCount: tileScheduler?.getPendingCount() ?? 0,
            gpuTextureBytes,
            imageTextureBytes,
            initialRenderPhase: initialRenderPhase?.toString(),
            initialRenderProgress: initialRenderProgress,
            dirtyRegionCount,
            dirtyTileCount,
            incrementalUpdateCount: dirtyTileCount > 0 ? 1 : 0,
            webglPreviewReuseMs,
            webglPlanBuildMs,
            webglTextureUploadMs,
            webglDrawSubmitMs,
            webglSnapshotCaptureMs,
            webglModelRenderMs,
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
            baseSceneRenderMode,
            tileCacheBaseSceneOnly,
            frameMs: performance.now() - startAt,
          }
        }

        const compositeDrawStart = performance.now()
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
        webglDrawSubmitMs += performance.now() - compositeDrawStart

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
          baseSceneRenderMode,
          tileCacheBaseSceneOnly,
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
          webglPreviewReuseMs,
          webglPlanBuildMs,
          webglTextureUploadMs,
          webglDrawSubmitMs,
          webglSnapshotCaptureMs,
          webglModelRenderMs,
          tileSchedulerPendingCount: tileScheduler?.getPendingCount() ?? 0,
          gpuTextureBytes: resourceBudget.getTextureBytes(),
          imageTextureBytes: resolveCachedTextureBytes(imageCache),
          frameMs: performance.now() - startAt,
        }
      }

      const previewReuseStart = performance.now()
      const previewReuse = tryReuseInteractiveCompositeFrame({
        context,
        pipeline,
        frame: effectiveFrame,
        texture: compositeTexture,
        snapshot: compositeSnapshot,
        interactionPreview,
      })
      webglPreviewReuseMs += performance.now() - previewReuseStart
      if (previewReuse.reused) {
        l0PreviewHitCount += 1
        let edgeRedrawCount = 0
        // Cache-only mode intentionally skips edge redraw to keep interaction frames cheap.
        if (!interactionPreview.cacheOnly && previewReuse.edgeRedrawRegions && previewReuse.edgeRedrawRegions.length > 0) {
          const edgePlanBuildStart = performance.now()
          const plan = prepareEngineRenderPlan(effectiveFrame)
          const instanceView = prepareEngineRenderInstanceView(effectiveFrame, plan)
          const packetPlan = compileEngineWebGLPacketPlan(plan, instanceView)
          webglPlanBuildMs += performance.now() - edgePlanBuildStart
          const edgeDrawStart = performance.now()
          edgeRedrawCount = drawInteractivePreviewEdgeRegions({
            context,
            pipeline,
            frame: effectiveFrame,
            packetPlan,
            regions: previewReuse.edgeRedrawRegions,
            imageCache,
            textCache,
            resourceBudget,
          })
          webglDrawSubmitMs += performance.now() - edgeDrawStart
        }

        if (
          !interactionPreview.cacheOnly &&
          shouldAdvanceInteractionPreviewSnapshot(effectiveFrame.viewport.scale)
        ) {
          const snapshotCaptureStart = performance.now()
          const refreshedSnapshot = captureCompositeSnapshotFromCurrentFramebuffer({
            context,
            texture: compositeTexture,
            frame: effectiveFrame,
            visibleCount: previewReuse.visibleCount,
            culledCount: previewReuse.culledCount,
          })
          webglSnapshotCaptureMs += performance.now() - snapshotCaptureStart
          if (refreshedSnapshot) {
            compositeSnapshot = refreshedSnapshot
          }
        }

        return {
          drawCount: 1 + edgeRedrawCount,
          engineFrameQuality: effectiveFrame.context.quality,
          baseSceneRenderMode,
          tileCacheBaseSceneOnly,
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
          webglFrameReuseEdgeRedrawCount: edgeRedrawCount,
          l0PreviewHitCount,
          l0PreviewMissCount,
          l1CompositeHitCount,
          l1CompositeMissCount,
          l2TileHitCount,
          l2TileMissCount,
          cacheFallbackReason,
          webglPreviewReuseMs,
          webglPlanBuildMs,
          webglTextureUploadMs,
          webglDrawSubmitMs,
          webglSnapshotCaptureMs,
          webglModelRenderMs,
          tileSchedulerPendingCount: tileScheduler?.getPendingCount() ?? 0,
          gpuTextureBytes: resourceBudget.getTextureBytes(),
          imageTextureBytes: resolveCachedTextureBytes(imageCache),
          frameMs: performance.now() - startAt,
        }
      }
      l0PreviewMissCount += 1
      if (interactiveQuality) {
        cacheFallbackReason = previewReuse.missReason ?? 'l0-preview-miss'
      }

      if (
        interactiveQuality &&
        interactionPreview.cacheOnly &&
        compositeSnapshot &&
        previewReuse.missReason !== 'l0-no-snapshot'
      ) {
        // Repaint the last cached composite explicitly because WebGL buffers
        // are not guaranteed to persist across frames on all browsers.
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

        const cachedHoldFrame: EngineRenderFrame = {
          ...effectiveFrame,
          viewport: {
            ...effectiveFrame.viewport,
            scale: 1,
            offsetX: 0,
            offsetY: 0,
          },
        }

        const cacheHoldDrawStart = performance.now()
        drawWebGLPacket(
          context,
          pipeline,
          cachedHoldFrame,
          {
            x: 0,
            y: 0,
            width: compositeSnapshot.viewportWidth,
            height: compositeSnapshot.viewportHeight,
          },
          [1, 1, 1, 1],
          1,
          compositeTexture,
        )
        webglDrawSubmitMs += performance.now() - cacheHoldDrawStart

        return {
          drawCount: 1,
          engineFrameQuality: effectiveFrame.context.quality,
          baseSceneRenderMode,
          tileCacheBaseSceneOnly,
          visibleCount: compositeSnapshot.visibleCount,
          culledCount: compositeSnapshot.culledCount,
          cacheHits: 0,
          cacheMisses: 1,
          frameReuseHits: 0,
          frameReuseMisses: 1,
          webglRenderPath: 'packet',
          webglCompositeUploadBytes: 0,
          webglInteractiveTextFallbackCount: 0,
          webglTextTextureUploadCount: 0,
          webglTextTextureUploadBytes: 0,
          webglTextCacheHitCount: 0,
          webglFrameReuseEdgeRedrawCount: 0,
          l0PreviewHitCount,
          l0PreviewMissCount,
          l1CompositeHitCount,
          l1CompositeMissCount,
          l2TileHitCount,
          l2TileMissCount,
          cacheFallbackReason: previewReuse.missReason ?? 'l0-cache-only-hold',
          webglPreviewReuseMs,
          webglPlanBuildMs,
          webglTextureUploadMs,
          webglDrawSubmitMs,
          webglSnapshotCaptureMs,
          webglModelRenderMs,
          tileSchedulerPendingCount: tileScheduler?.getPendingCount() ?? 0,
          gpuTextureBytes: resourceBudget.getTextureBytes(),
          imageTextureBytes: resolveCachedTextureBytes(imageCache),
          frameMs: performance.now() - startAt,
        }
      }

      const planBuildStart = performance.now()
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
      webglPlanBuildMs += performance.now() - planBuildStart

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
          const modelTextRenderStart = performance.now()
          await modelRenderer.render(effectiveFrame)
          webglModelRenderMs += performance.now() - modelTextRenderStart
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
      let imageDownsampledUploadCount = 0
      let imageDownsampledUploadBytesSaved = 0
      let deferredImageTextureCount = 0
      const imageUploadBudget: ImageUploadBudgetState = {
        remainingUploads: MAX_IMAGE_TEXTURE_UPLOADS_PER_FRAME,
        remainingBytes: MAX_IMAGE_TEXTURE_UPLOAD_BYTES_PER_FRAME,
      }
      // Frame context can override renderer defaults, so honor per-frame LOD
      // enablement when deciding whether to apply detail degradation.
      const frameLodEnabled = effectiveFrame.context.lodEnabled ?? lodEnabled
      const useTextPlaceholderMode =
        frameLodEnabled && effectiveFrame.viewport.scale <= TEXT_PLACEHOLDER_MAX_SCALE
      const textureUploadBeforeLoop = webglTextureUploadMs
      const packetLoopStart = performance.now()
      for (const packet of packetPlan.packets) {
        if (
          interactiveQuality &&
          shouldSkipInteractiveTinyPacket(effectiveFrame, packet.kind, packet.worldBounds)
        ) {
          // Skip imperceptible packets in interaction fallback to preserve frame budget.
          continue
        }

        if (packet.kind === 'image' && packet.assetId) {
          if (shouldSkipOverviewImagePacket(effectiveFrame, packet.worldBounds, frameLodEnabled)) {
            continue
          }

          const imageTexture = resolveImageTexture(
            context,
            effectiveFrame,
            packet.worldBounds,
            packet.assetId,
            imageCache,
            resourceBudget,
            imageUploadBudget,
          )
          webglTextureUploadMs += imageTexture.uploadMs
          if (imageTexture.deferred) {
            deferredImageTextureCount += 1
          }
          imageTextureUploadCount += imageTexture.uploadCount
          imageTextureUploadBytes += imageTexture.uploadBytes
          imageDownsampledUploadCount += imageTexture.downsampledUploadCount
          imageDownsampledUploadBytesSaved += imageTexture.downsampledBytesSaved
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
            if (shouldSkipTextPlaceholderPacket(effectiveFrame, packet.worldBounds, frameLodEnabled)) {
              continue
            }

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
                const textUploadStart = performance.now()
                context.texImage2D(
                  context.TEXTURE_2D,
                  0,
                  context.RGBA,
                  context.RGBA,
                  context.UNSIGNED_BYTE,
                  cropped as unknown as TexImageSource,
                )
                webglTextureUploadMs += performance.now() - textUploadStart
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
      const packetLoopMs = performance.now() - packetLoopStart
      const textureUploadDeltaMs = webglTextureUploadMs - textureUploadBeforeLoop
      webglDrawSubmitMs += Math.max(0, packetLoopMs - textureUploadDeltaMs)

      // Collect tile and initial render diagnostics
      const tileStats = tileCache?.getStats()
      const initialRenderPhase = initialRenderController?.getPhase()
      const initialRenderProgress = initialRenderController?.getDetailPassProgress()

      const snapshotCaptureStart = performance.now()
      const snapshot = captureCompositeSnapshotFromCurrentFramebuffer({
        context,
        texture: compositeTexture,
        frame: effectiveFrame,
        visibleCount: plan.stats.visibleCount,
        culledCount: plan.stats.culledCount,
      })
      webglSnapshotCaptureMs += performance.now() - snapshotCaptureStart
      if (snapshot) {
        compositeSnapshot = snapshot
      }

      return {
        drawCount,
        engineFrameQuality: effectiveFrame.context.quality,
        baseSceneRenderMode,
        tileCacheBaseSceneOnly,
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
        webglImageDownsampledUploadCount: imageDownsampledUploadCount,
        webglImageDownsampledUploadBytesSaved: imageDownsampledUploadBytesSaved,
        webglDeferredImageTextureCount: deferredImageTextureCount,
        webglTextTextureUploadCount: textTextureUploadCount,
        webglTextTextureUploadBytes: textTextureUploadBytes,
        webglTextCacheHitCount: textCacheHitCount,
        webglFrameReuseEdgeRedrawCount: 0,
        webglPrecomputedTextCacheKeyCount: packetPlan.precomputedTextCacheKeyCount,
        webglFallbackTextCacheKeyCount: packetPlan.fallbackTextCacheKeyCount,
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
        tileUploadCount: 0,
        tileRenderCount: 0,
        visibleTileCount: 0,
        tileSchedulerPendingCount: tileScheduler?.getPendingCount() ?? 0,
        gpuTextureBytes: (tileStats?.totalTextureBytes ?? 0) + resourceBudget.getTextureBytes(),
        imageTextureBytes: resolveCachedTextureBytes(imageCache),
        initialRenderPhase: initialRenderPhase?.toString(),
        initialRenderProgress: initialRenderProgress,
        dirtyRegionCount: dirtyRegionCount,
        dirtyTileCount: dirtyTileCount,
        incrementalUpdateCount: dirtyTileCount > 0 ? 1 : 0,
        webglPreviewReuseMs,
        webglPlanBuildMs,
        webglTextureUploadMs,
        webglDrawSubmitMs,
        webglSnapshotCaptureMs,
        webglModelRenderMs,
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

function resolveBaseSceneRenderMode(options: {
  interactiveQuality: boolean
  tileCacheEnabled: boolean
}): BaseSceneRenderMode {
  // During interaction we prefer cached tile composition; settled frames refresh progressively.
  if (options.tileCacheEnabled) {
    return options.interactiveQuality ? 'tile-cache' : 'progressive-refresh'
  }

  // Without tile cache, base scene stays on direct vector/live rendering.
  return 'vector-live'
}

function resolveViewportWorldBounds(frame: EngineRenderFrame) {
  return {
    x: -frame.viewport.offsetX / frame.viewport.scale,
    y: -frame.viewport.offsetY / frame.viewport.scale,
    width: frame.viewport.viewportWidth / frame.viewport.scale,
    height: frame.viewport.viewportHeight / frame.viewport.scale,
  }
}

function captureCompositeSnapshotFromCurrentFramebuffer(options: {
  context: WebGLRenderingContext | WebGL2RenderingContext
  texture: WebGLTexture
  frame: EngineRenderFrame
  visibleCount: number
  culledCount: number
}) {
  const pixelRatio = options.frame.context.pixelRatio ?? 1
  const width = Math.max(1, Math.round(options.frame.viewport.viewportWidth * pixelRatio))
  const height = Math.max(1, Math.round(options.frame.viewport.viewportHeight * pixelRatio))

  options.context.bindTexture(options.context.TEXTURE_2D, options.texture)
  try {
    options.context.copyTexImage2D(
      options.context.TEXTURE_2D,
      0,
      options.context.RGBA,
      0,
      0,
      width,
      height,
      0,
    )
  } catch {
    return null
  }

  return {
    revision: options.frame.scene.revision,
    scale: options.frame.viewport.scale,
    offsetX: options.frame.viewport.offsetX,
    offsetY: options.frame.viewport.offsetY,
    viewportWidth: options.frame.viewport.viewportWidth,
    viewportHeight: options.frame.viewport.viewportHeight,
    pixelRatio,
    visibleCount: options.visibleCount,
    culledCount: options.culledCount,
  }
}

function shouldSkipTextPlaceholderPacket(
  frame: EngineRenderFrame,
  worldBounds: { width: number; height: number },
  lodEnabled: boolean,
) {
  if (!lodEnabled) {
    return false
  }

  const scale = Math.max(0, Math.abs(frame.viewport.scale))
  const screenWidth = Math.abs(worldBounds.width) * scale
  const screenHeight = Math.abs(worldBounds.height) * scale
  return (
    screenWidth <= TEXT_PLACEHOLDER_SKIP_MAX_SCREEN_EDGE_PX &&
    screenHeight <= TEXT_PLACEHOLDER_SKIP_MAX_SCREEN_EDGE_PX
  )
}

function shouldSkipOverviewImagePacket(
  frame: EngineRenderFrame,
  worldBounds: { width: number; height: number },
  lodEnabled: boolean,
) {
  if (!lodEnabled) {
    return false
  }

  const scale = Math.max(0, Math.abs(frame.viewport.scale))
  if (scale > OVERVIEW_IMAGE_SKIP_MAX_SCALE) {
    return false
  }

  const screenWidth = Math.abs(worldBounds.width) * scale
  const screenHeight = Math.abs(worldBounds.height) * scale
  return (
    screenWidth <= OVERVIEW_IMAGE_SKIP_MAX_SCREEN_EDGE_PX &&
    screenHeight <= OVERVIEW_IMAGE_SKIP_MAX_SCREEN_EDGE_PX
  )
}

function shouldSkipInteractiveTinyPacket(
  frame: EngineRenderFrame,
  packetKind: 'shape' | 'text' | 'image',
  worldBounds: { width: number; height: number },
) {
  const scale = Math.max(0, Math.abs(frame.viewport.scale))
  const screenWidth = Math.abs(worldBounds.width) * scale
  const screenHeight = Math.abs(worldBounds.height) * scale
  const minEdge = Math.min(screenWidth, screenHeight)
  const screenArea = screenWidth * screenHeight
  // Visibility score is computed from current screen contribution plus semantic weight.
  const visibility = resolveEngineVisibilityProfile({
    screenAreaPx2: screenArea,
    screenMinEdgePx: minEdge,
    viewportAreaPx2: Math.max(1, frame.viewport.viewportWidth * frame.viewport.viewportHeight),
    interactionBoost: 0.1,
    semanticBoost: packetKind === 'text' ? 0.08 : packetKind === 'image' ? 0.04 : 0,
  })

  // Keep a tiny-shape hard floor so ultra-dense shape packets cannot starve interaction frames.
  if (packetKind === 'shape' && visibility.tier !== 'tier-a' && screenArea <= INTERACTION_PACKET_SKIP_SHAPE_MIN_AREA_PX2) {
    return true
  }

  // Tier D receives the strongest culling because visibility contribution is negligible.
  if (visibility.tier === 'tier-d') {
    return minEdge <= INTERACTION_PACKET_SKIP_TIER_D_MIN_EDGE_PX
  }
  // Tier C keeps medium objects but drops tiny packets that are visually imperceptible.
  if (visibility.tier === 'tier-c') {
    return minEdge <= INTERACTION_PACKET_SKIP_TIER_C_MIN_EDGE_PX
  }
  // Tier B culling is conservative and limited to sub-pixel-ish packets.
  if (visibility.tier === 'tier-b') {
    return minEdge <= INTERACTION_PACKET_SKIP_TIER_B_MIN_EDGE_PX
  }

  // Tier A stays full-fidelity to preserve perceived foreground quality.
  return false
}

// Compositor entries carry only geometry bounds plus texture payload.
interface TileCompositorDrawEntry {
  bounds: {x: number; y: number; width: number; height: number}
  texture: WebGLTexture
}

// Tile compositor pass keeps tile composition isolated from cache/update concerns.
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

function drawModelSurfaceAsTiles(options: {
  context: WebGLRenderingContext | WebGL2RenderingContext
  frame: EngineRenderFrame
  tileCache: EngineTileCache
  tileTextures: Map<number, WebGLTexture>
  nextTileTextureId: () => number
  modelSurface: HTMLCanvasElement | OffscreenCanvas
  pipeline: WebGLQuadPipeline
  tileScheduler?: TileScheduler | null
  previousZoomLevel?: TileZoomLevel | null
  preloadRing?: number
  preloadBudgetMs?: number
  maxPreloadUploads?: number
}) {
  // Keep one cache zoom domain to avoid multi-level residency and positional drift.
  const zoomLevel = resolveTileCacheZoomLevel(options.previousZoomLevel)
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
    const uploaded = seededFramebufferForTiles
      ? copyTileTextureFromFramebuffer(
        options.context,
        existingTexture,
        tileRegion,
      )
      : { texture: null, textureBytes: 0 }

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

function resolveTileCacheZoomLevel(previousZoomLevel?: TileZoomLevel | null): TileZoomLevel {
  // Preserve single-layer policy explicitly so future tuning has one entrypoint.
  if (typeof previousZoomLevel === 'number' && previousZoomLevel === TILE_CACHE_SINGLE_LAYER_ZOOM_LEVEL) {
    return previousZoomLevel
  }
  return TILE_CACHE_SINGLE_LAYER_ZOOM_LEVEL
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

function resolveCachedTextureBytes(cache: Map<string, CachedTextureEntry>) {
  let total = 0
  for (const entry of cache.values()) {
    total += Math.max(1, entry.width * entry.height * 4)
  }
  return total
}

function resolveTileFramebufferRegion(options: {
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

  return {
    sourceX: sourceMinX,
    sourceY: sourceMinY,
    sourceWidth: Math.max(1, sourceMaxX - sourceMinX),
    sourceHeight: Math.max(1, sourceMaxY - sourceMinY),
    framebufferHeight: options.viewportHeightPx,
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

function copyTileTextureFromFramebuffer(
  context: WebGLRenderingContext | WebGL2RenderingContext,
  existingTexture: WebGLTexture | null,
  source: {
    sourceX: number
    sourceY: number
    sourceWidth: number
    sourceHeight: number
    framebufferHeight: number
  },
) {
  const texture = existingTexture ?? context.createTexture()
  if (!texture) {
    return {
      texture: null,
      textureBytes: 0,
    }
  }

  context.bindTexture(context.TEXTURE_2D, texture)
  context.texParameteri(context.TEXTURE_2D, context.TEXTURE_MIN_FILTER, context.LINEAR)
  context.texParameteri(context.TEXTURE_2D, context.TEXTURE_MAG_FILTER, context.LINEAR)
  context.texParameteri(context.TEXTURE_2D, context.TEXTURE_WRAP_S, context.CLAMP_TO_EDGE)
  context.texParameteri(context.TEXTURE_2D, context.TEXTURE_WRAP_T, context.CLAMP_TO_EDGE)

  const framebufferSourceY = Math.max(
    0,
    source.framebufferHeight - source.sourceY - source.sourceHeight,
  )

  try {
    context.texImage2D(
      context.TEXTURE_2D,
      0,
      context.RGBA,
      source.sourceWidth,
      source.sourceHeight,
      0,
      context.RGBA,
      context.UNSIGNED_BYTE,
      null,
    )
    context.copyTexSubImage2D(
      context.TEXTURE_2D,
      0,
      0,
      0,
      source.sourceX,
      framebufferSourceY,
      source.sourceWidth,
      source.sourceHeight,
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

  return {
    texture,
    textureBytes: Math.max(1, source.sourceWidth * source.sourceHeight * 4),
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

function resolveImageCacheKey(assetId: string) {
  return `image:${assetId}`
}

function resolveImageRasterScale(
  size: {width: number; height: number},
  worldBounds: {width: number; height: number},
  frame: EngineRenderFrame,
) {
  const pixelRatio = frame.context.pixelRatio ?? 1
  const displayWidth = Math.max(1, Math.abs(worldBounds.width) * frame.viewport.scale * pixelRatio)
  const displayHeight = Math.max(1, Math.abs(worldBounds.height) * frame.viewport.scale * pixelRatio)
  const widthRatio = displayWidth / Math.max(1, size.width)
  const heightRatio = displayHeight / Math.max(1, size.height)

  // Bias slightly above the current display size so small zoom-ins can reuse
  // the uploaded texture before a higher-resolution upload is needed.
  return Math.min(1, Math.max(widthRatio, heightRatio) * 1.25)
}

function canReuseImageTexture(
  cached: CachedTextureEntry | undefined,
  imageCacheKey: string,
  imageRasterScale: number,
) {
  if (!cached || cached.cacheKey !== imageCacheKey) {
    return false
  }

  const cachedRasterScale = cached.rasterScale ?? 0
  return cachedRasterScale >= imageRasterScale
}

function createImageUploadSource(
  source: CanvasImageSource,
  size: {width: number; height: number},
  rasterScale: number,
) {
  const targetWidth = Math.max(1, Math.min(size.width, Math.ceil(size.width * rasterScale)))
  const targetHeight = Math.max(1, Math.min(size.height, Math.ceil(size.height * rasterScale)))
  const shouldDownsample =
    rasterScale < 0.99 &&
    (targetWidth <= size.width * 0.85 || targetHeight <= size.height * 0.85)

  if (!shouldDownsample) {
    return {
      source,
      width: size.width,
      height: size.height,
      downsampled: false,
    }
  }

  const rasterSurface = createImageUploadSurface(targetWidth, targetHeight)
  if (!rasterSurface) {
    return {
      source,
      width: size.width,
      height: size.height,
      downsampled: false,
    }
  }

  const rasterContext = rasterSurface.getContext('2d')
  if (!rasterContext) {
    return {
      source,
      width: size.width,
      height: size.height,
      downsampled: false,
    }
  }

  rasterContext.clearRect(0, 0, targetWidth, targetHeight)
  rasterContext.drawImage(source, 0, 0, targetWidth, targetHeight)

  return {
    source: rasterSurface,
    width: targetWidth,
    height: targetHeight,
    downsampled: true,
  }
}

function createImageUploadSurface(width: number, height: number) {
  if (typeof OffscreenCanvas !== 'undefined') {
    return new OffscreenCanvas(width, height)
  }

  if (typeof document !== 'undefined') {
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    return canvas
  }

  return null
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
  uniformFlipTextureY: WebGLUniformLocation
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
  uploadMs: number
  downsampledUploadCount: number
  downsampledBytesSaved: number
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
    return {
      reused: false,
      missReason: options.snapshot ? 'l0-non-interactive' : 'l0-no-snapshot',
      visibleCount: 0,
      culledCount: 0,
      edgeRedrawRegions: [] as ScreenRectPx[],
    }
  }

  const snapshot = options.snapshot
  const frame = options.frame
  const currentPixelRatio = frame.context.pixelRatio ?? 1
  if (snapshot.revision !== frame.scene.revision) {
    return {
      reused: false,
      missReason: 'l0-revision-mismatch',
      visibleCount: 0,
      culledCount: 0,
      edgeRedrawRegions: [] as ScreenRectPx[],
    }
  }

  if (snapshot.viewportWidth !== frame.viewport.viewportWidth) {
    return {
      reused: false,
      missReason: 'l0-viewport-width-mismatch',
      visibleCount: 0,
      culledCount: 0,
      edgeRedrawRegions: [] as ScreenRectPx[],
    }
  }

  if (snapshot.viewportHeight !== frame.viewport.viewportHeight) {
    return {
      reused: false,
      missReason: 'l0-viewport-height-mismatch',
      visibleCount: 0,
      culledCount: 0,
      edgeRedrawRegions: [] as ScreenRectPx[],
    }
  }

  if (snapshot.pixelRatio !== currentPixelRatio) {
    return {
      reused: false,
      missReason: 'l0-pixel-ratio-mismatch',
      visibleCount: 0,
      culledCount: 0,
      edgeRedrawRegions: [] as ScreenRectPx[],
    }
  }

  const scaleRatio = frame.viewport.scale / snapshot.scale
  if (!Number.isFinite(scaleRatio) || scaleRatio <= 0) {
    return {
      reused: false,
      missReason: 'l0-invalid-scale-ratio',
      visibleCount: 0,
      culledCount: 0,
      edgeRedrawRegions: [] as ScreenRectPx[],
    }
  }

  if (options.interactionPreview.mode === 'zoom-only' && Math.abs(scaleRatio - 1) < 1e-3) {
    return {
      reused: false,
      missReason: 'l0-zoom-only-pan-blocked',
      visibleCount: 0,
      culledCount: 0,
      edgeRedrawRegions: [] as ScreenRectPx[],
    }
  }

  const maxScaleStep = resolveInteractionPreviewMaxScaleStep(
    options.interactionPreview.maxScaleStep,
    Math.min(snapshot.scale, frame.viewport.scale),
  )

  if (
    scaleRatio > maxScaleStep ||
    scaleRatio < 1 / maxScaleStep
  ) {
    return {
      reused: false,
      missReason: 'l0-scale-step-exceeded',
      visibleCount: 0,
      culledCount: 0,
      edgeRedrawRegions: [] as ScreenRectPx[],
    }
  }

  const maxTranslatePx = resolveInteractionPreviewMaxTranslatePx(
    options.interactionPreview.maxTranslatePx,
    Math.min(snapshot.scale, frame.viewport.scale),
    snapshot.viewportWidth * currentPixelRatio,
    snapshot.viewportHeight * currentPixelRatio,
  )

  const deltaX = frame.viewport.offsetX - scaleRatio * snapshot.offsetX
  const deltaY = frame.viewport.offsetY - scaleRatio * snapshot.offsetY
  if (
    Math.abs(deltaX * currentPixelRatio) > maxTranslatePx.x ||
    Math.abs(deltaY * currentPixelRatio) > maxTranslatePx.y
  ) {
    return {
      reused: false,
      missReason: 'l0-translate-exceeded',
      visibleCount: 0,
      culledCount: 0,
      edgeRedrawRegions: [] as ScreenRectPx[],
    }
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
    true,
  )

  const edgeRedrawRegions = resolveInteractivePreviewEdgeRedrawRegions(
    frame.viewport.viewportWidth * currentPixelRatio,
    frame.viewport.viewportHeight * currentPixelRatio,
    scaleRatio,
    deltaX * currentPixelRatio,
    deltaY * currentPixelRatio,
  )

  return {
    reused: true,
    missReason: null,
    visibleCount: snapshot.visibleCount,
    culledCount: snapshot.culledCount,
    edgeRedrawRegions,
  }
}

function resolveInteractionPreviewMaxTranslatePx(
  baseTranslatePx: number,
  scale: number,
  viewportWidthPx: number,
  viewportHeightPx: number,
) {
  if (scale <= INTERACTION_PREVIEW_OVERVIEW_MAX_SCALE) {
    return {
      x: Math.max(
        baseTranslatePx,
        INTERACTION_PREVIEW_OVERVIEW_MAX_TRANSLATE_PX,
        Math.round(viewportWidthPx * INTERACTION_PREVIEW_OVERVIEW_VIEWPORT_TRANSLATE_RATIO),
      ),
      y: Math.max(
        baseTranslatePx,
        INTERACTION_PREVIEW_OVERVIEW_MAX_TRANSLATE_PX,
        Math.round(viewportHeightPx * INTERACTION_PREVIEW_OVERVIEW_VIEWPORT_TRANSLATE_RATIO),
      ),
    }
  }

  if (scale <= INTERACTION_PREVIEW_LOW_SCALE_MAX_SCALE) {
    return {
      x: Math.max(
        baseTranslatePx,
        INTERACTION_PREVIEW_LOW_SCALE_MAX_TRANSLATE_PX,
        Math.round(viewportWidthPx * INTERACTION_PREVIEW_LOW_SCALE_VIEWPORT_TRANSLATE_RATIO),
      ),
      y: Math.max(
        baseTranslatePx,
        INTERACTION_PREVIEW_LOW_SCALE_MAX_TRANSLATE_PX,
        Math.round(viewportHeightPx * INTERACTION_PREVIEW_LOW_SCALE_VIEWPORT_TRANSLATE_RATIO),
      ),
    }
  }

  return {x: baseTranslatePx, y: baseTranslatePx}
}

function resolveInteractionPreviewMaxScaleStep(
  baseScaleStep: number,
  scale: number,
) {
  if (scale <= INTERACTION_PREVIEW_OVERVIEW_MAX_SCALE) {
    return Math.max(baseScaleStep, INTERACTION_PREVIEW_OVERVIEW_MAX_SCALE_STEP)
  }

  if (scale <= INTERACTION_PREVIEW_LOW_SCALE_MAX_SCALE) {
    return Math.max(baseScaleStep, INTERACTION_PREVIEW_LOW_SCALE_MAX_SCALE_STEP)
  }

  return baseScaleStep
}

function shouldAdvanceInteractionPreviewSnapshot(scale: number) {
  return scale <= INTERACTION_PREVIEW_LOW_SCALE_MAX_SCALE
}

function resolveInteractivePreviewEdgeRedrawRegions(
  viewportWidthPx: number,
  viewportHeightPx: number,
  scaleRatio: number,
  deltaXPx: number,
  deltaYPx: number,
): ScreenRectPx[] {
  if (Math.abs(scaleRatio - 1) > 1e-3) {
    return []
  }

  const regions: ScreenRectPx[] = []
  const horizontalShiftPx = Math.trunc(deltaXPx)
  const verticalShiftPx = Math.trunc(deltaYPx)

  if (horizontalShiftPx > 0) {
    regions.push({
      x: 0,
      y: 0,
      width: Math.min(viewportWidthPx, horizontalShiftPx),
      height: viewportHeightPx,
    })
  } else if (horizontalShiftPx < 0) {
    const width = Math.min(viewportWidthPx, Math.abs(horizontalShiftPx))
    regions.push({
      x: Math.max(0, viewportWidthPx - width),
      y: 0,
      width,
      height: viewportHeightPx,
    })
  }

  if (verticalShiftPx > 0) {
    regions.push({
      x: 0,
      y: 0,
      width: viewportWidthPx,
      height: Math.min(viewportHeightPx, verticalShiftPx),
    })
  } else if (verticalShiftPx < 0) {
    const height = Math.min(viewportHeightPx, Math.abs(verticalShiftPx))
    regions.push({
      x: 0,
      y: Math.max(0, viewportHeightPx - height),
      width: viewportWidthPx,
      height,
    })
  }

  return regions.filter((region) => region.width > 0 && region.height > 0)
}

function drawInteractivePreviewEdgeRegions(options: {
  context: WebGLRenderingContext | WebGL2RenderingContext
  pipeline: WebGLQuadPipeline
  frame: EngineRenderFrame
  packetPlan: ReturnType<typeof compileEngineWebGLPacketPlan>
  regions: readonly ScreenRectPx[]
  imageCache: Map<string, CachedTextureEntry>
  textCache: Map<string, CachedTextureEntry>
  resourceBudget: ReturnType<typeof createEngineWebGLResourceBudgetTracker>
}) {
  const viewportWidthPx = Math.max(1, Math.round(options.frame.viewport.viewportWidth * (options.frame.context.pixelRatio ?? 1)))
  const viewportHeightPx = Math.max(1, Math.round(options.frame.viewport.viewportHeight * (options.frame.context.pixelRatio ?? 1)))
  const imageUploadBudget: ImageUploadBudgetState = {
    remainingUploads: 0,
    remainingBytes: 0,
  }
  // Edge redraw path also needs the same per-frame LOD gating as the main
  // packet loop to avoid unexpected detail loss when LOD is disabled.
  const lodEnabled = options.frame.context.lodEnabled ?? true
  const useTextPlaceholderMode =
    lodEnabled && options.frame.viewport.scale <= TEXT_PLACEHOLDER_MAX_SCALE
  let drawCount = 0

  options.context.enable(options.context.SCISSOR_TEST)
  for (const region of options.regions) {
    if (region.width <= 0 || region.height <= 0) {
      continue
    }

    applyWebGLScissorRegion(options.context, region, viewportHeightPx)
    options.context.clearColor(0, 0, 0, 0)
    options.context.clear(options.context.COLOR_BUFFER_BIT)

    for (const packet of options.packetPlan.packets) {
      if (!packetIntersectsScreenRegion(packet.worldBounds, options.frame, region)) {
        continue
      }

      if (packet.kind === 'image' && packet.assetId) {
        if (shouldSkipOverviewImagePacket(options.frame, packet.worldBounds, lodEnabled)) {
          continue
        }

        const imageTexture = resolveImageTexture(
          options.context,
          options.frame,
          packet.worldBounds,
          packet.assetId,
          options.imageCache,
          options.resourceBudget,
          imageUploadBudget,
        )
        drawCount += drawWebGLPacket(
          options.context,
          options.pipeline,
          options.frame,
          packet.worldBounds,
          packet.color,
          packet.opacity,
          imageTexture.texture,
        )
        continue
      }

      if (packet.kind === 'text') {
        const cached = options.textCache.get(packet.nodeId)
        const textCacheKey = resolveTextCacheKey(packet)

        if (useTextPlaceholderMode) {
          if (shouldSkipTextPlaceholderPacket(options.frame, packet.worldBounds, lodEnabled)) {
            continue
          }

          drawCount += drawInteractiveTextFallback(
            options.context,
            options.pipeline,
            options.frame,
            packet.worldBounds,
            packet.color,
            packet.opacity,
          )
          continue
        }

        if (cached && canReuseInteractiveTextTexture(cached, textCacheKey)) {
          options.resourceBudget.markTextureUsed(packet.nodeId)
          drawCount += drawWebGLPacket(
            options.context,
            options.pipeline,
            options.frame,
            packet.worldBounds,
            packet.color,
            packet.opacity,
            cached.texture,
          )
          continue
        }

        drawCount += drawInteractiveTextFallback(
          options.context,
          options.pipeline,
          options.frame,
          packet.worldBounds,
          packet.color,
          packet.opacity,
        )
        continue
      }

      drawCount += drawWebGLPacket(
        options.context,
        options.pipeline,
        options.frame,
        packet.worldBounds,
        packet.color,
        packet.opacity,
        null,
      )
    }
  }
  options.context.disable(options.context.SCISSOR_TEST)

  // Re-apply the full viewport after scissored redraws so the next render path
  // starts from a predictable GL state.
  options.context.viewport(0, 0, viewportWidthPx, viewportHeightPx)

  return drawCount
}

function applyWebGLScissorRegion(
  context: WebGLRenderingContext | WebGL2RenderingContext,
  region: ScreenRectPx,
  viewportHeightPx: number,
) {
  const x = Math.max(0, Math.floor(region.x))
  const y = Math.max(0, Math.floor(viewportHeightPx - region.y - region.height))
  const width = Math.max(1, Math.ceil(region.width))
  const height = Math.max(1, Math.ceil(region.height))
  context.scissor(x, y, width, height)
}

function packetIntersectsScreenRegion(
  worldBounds: {x: number; y: number; width: number; height: number},
  frame: EngineRenderFrame,
  region: ScreenRectPx,
) {
  const screenRect = resolvePacketTextureSourceRect(worldBounds, frame)
  return !(
    screenRect.x + screenRect.width <= region.x ||
    region.x + region.width <= screenRect.x ||
    screenRect.y + screenRect.height <= region.y ||
    region.y + region.height <= screenRect.y
  )
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
uniform float uFlipTextureY;
varying vec2 vUv;

void main() {
  vec2 world = uRect.xy + aPosition * uRect.zw;
  vec2 screen = vec2(world.x * uScale.x + uOffset.x, world.y * uScale.y + uOffset.y);
  vec2 clip = vec2(
    (screen.x / uViewport.x) * 2.0 - 1.0,
    1.0 - (screen.y / uViewport.y) * 2.0
  );
  gl_Position = vec4(clip, 0.0, 1.0);
  vUv = vec2(aPosition.x, mix(aPosition.y, 1.0 - aPosition.y, uFlipTextureY));
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
  const uniformFlipTextureY = context.getUniformLocation(program, 'uFlipTextureY')
  const uniformSampler = context.getUniformLocation(program, 'uSampler')

  if (
    attributePosition < 0 ||
    !uniformRect ||
    !uniformScale ||
    !uniformOffset ||
    !uniformViewport ||
    !uniformColor ||
    !uniformUseTexture ||
    !uniformFlipTextureY ||
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
    uniformFlipTextureY,
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
  flipTextureY = false,
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
  context.uniform1f(pipeline.uniformFlipTextureY, flipTextureY ? 1 : 0)

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
  worldBounds: {x: number; y: number; width: number; height: number},
  assetId: string,
  imageCache: Map<string, CachedTextureEntry>,
  budget: ReturnType<typeof createEngineWebGLResourceBudgetTracker>,
  uploadBudget: ImageUploadBudgetState,
): ResolvedImageTextureResult {
  const imageCacheKey = resolveImageCacheKey(assetId)
  const existing = imageCache.get(assetId)
  if (frame.context.quality === 'interactive' && existing?.cacheKey === imageCacheKey) {
    budget.markTextureUsed(assetId)
    return {
      texture: existing.texture,
      uploadCount: 0,
      uploadBytes: 0,
      uploadMs: 0,
      downsampledUploadCount: 0,
      downsampledBytesSaved: 0,
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
      uploadMs: 0,
      downsampledUploadCount: 0,
      downsampledBytesSaved: 0,
      deferred: true,
    }
  }

  const source = frame.context.loader?.resolveImage(assetId)
  if (!source) {
    return {
      texture: null,
      uploadCount: 0,
      uploadBytes: 0,
      uploadMs: 0,
      downsampledUploadCount: 0,
      downsampledBytesSaved: 0,
      deferred: false,
    }
  }

  const size = resolveCanvasImageSourceSize(source)
  const width = Math.max(1, size.width)
  const height = Math.max(1, size.height)
  const imageRasterScale = resolveImageRasterScale(size, worldBounds, frame)
  if (canReuseImageTexture(existing, imageCacheKey, imageRasterScale)) {
    budget.markTextureUsed(assetId)
    return {
      texture: existing?.texture ?? null,
      uploadCount: 0,
      uploadBytes: 0,
      uploadMs: 0,
      downsampledUploadCount: 0,
      downsampledBytesSaved: 0,
      deferred: false,
    }
  }

  const uploadSource = createImageUploadSource(source, size, imageRasterScale)
  const uploadWidth = Math.max(1, uploadSource.width)
  const uploadHeight = Math.max(1, uploadSource.height)
  const uploadBytes = uploadWidth * uploadHeight * 4
  const downsampledBytesSaved = Math.max(0, width * height * 4 - uploadBytes)
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
      uploadMs: 0,
      downsampledUploadCount: 0,
      downsampledBytesSaved: 0,
      deferred: true,
    }
  }

  const texture = existing?.texture ?? context.createTexture()
  if (!texture) {
    return {
      texture: null,
      uploadCount: 0,
      uploadBytes: 0,
      uploadMs: 0,
      downsampledUploadCount: 0,
      downsampledBytesSaved: 0,
      deferred: false,
    }
  }

  context.bindTexture(context.TEXTURE_2D, texture)
  context.pixelStorei(context.UNPACK_PREMULTIPLY_ALPHA_WEBGL, 1)
  context.texParameteri(context.TEXTURE_2D, context.TEXTURE_MIN_FILTER, context.LINEAR)
  context.texParameteri(context.TEXTURE_2D, context.TEXTURE_MAG_FILTER, context.LINEAR)
  context.texParameteri(context.TEXTURE_2D, context.TEXTURE_WRAP_S, context.CLAMP_TO_EDGE)
  context.texParameteri(context.TEXTURE_2D, context.TEXTURE_WRAP_T, context.CLAMP_TO_EDGE)

  const imageUploadStart = performance.now()
  try {
    const textureSource = uploadSource.source as unknown as TexImageSource
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
      uploadMs: 0,
      downsampledUploadCount: 0,
      downsampledBytesSaved: 0,
      deferred: false,
    }
  }
  const imageUploadMs = performance.now() - imageUploadStart

  uploadBudget.remainingUploads -= 1
  // Clamp to zero so one oversized upload can consume the whole frame budget
  // without causing negative accounting or an infinite deferred loop.
  uploadBudget.remainingBytes = Math.max(0, uploadBudget.remainingBytes - uploadBytes)
  imageCache.set(assetId, {
    texture,
    width: uploadWidth,
    height: uploadHeight,
    cacheKey: imageCacheKey,
    rasterScale: imageRasterScale,
  })
  budget.markTextureResident(assetId, uploadBytes)
  budget.markTextureUsed(assetId)

  return {
    texture,
    uploadCount: 1,
    uploadBytes,
    uploadMs: imageUploadMs,
    downsampledUploadCount: uploadSource.downsampled ? 1 : 0,
    downsampledBytesSaved,
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
