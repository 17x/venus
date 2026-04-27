import type {
  EngineCanvasSurfaceFactory,
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
import { TileScheduler } from './tileScheduler.ts'
import { resolveEngineVisibilityProfile } from '../interaction/visibilityLod.ts'
import {
  createViewportMatrixForRender,
  createWebGLQuadPipeline,
  disposeWebGLQuadPipeline,
  drawWebGLPacket,
  resolveWebGLContext,
  type WebGLQuadPipeline,
} from './webglPipeline.ts'
import {
  shouldAdvanceInteractionPreviewSnapshot,
  tryReuseInteractiveCompositeFrame,
  type ScreenRectPx,
} from './webglInteractionPreview.ts'
import {
  MAX_IMAGE_TEXTURE_UPLOADS_PER_FRAME,
  MAX_IMAGE_TEXTURE_UPLOAD_BYTES_PER_FRAME,
  canReuseInteractiveTextTexture,
  canReuseTextTexture,
  countPendingImageTextureEstimate,
  resolveImageTexture,
  resolvePacketTextureSourceRect,
  resolveTextCacheKey,
  resolveTextRasterScale,
  type CachedTextureEntry,
  type ImageUploadBudgetState,
} from './webglTextures.ts'
import {
  copyCanvasRegion,
  createModelSurface,
  drawInteractiveTextFallback,
  resolveBaseSceneRenderMode,
  resolveCachedTextureBytes,
  TEXT_PLACEHOLDER_MAX_SCALE,
  shouldSkipTextPlaceholderPacket,
} from './webglSurfaceHelpers.ts'
import {
  captureCompositeSnapshotFromCurrentFramebuffer,
  drawCompositeTextureFrame,
  resolveCompositeSnapshotPixelRatio,
  type InteractionCompositeSnapshot,
} from './webglComposite.ts'
import { drawModelSurfaceAsTiles } from './webglTiles.ts'

interface WebGLEngineRendererOptions {
  id?: string
  canvas: HTMLCanvasElement | OffscreenCanvas
  createCanvasSurface?: EngineCanvasSurfaceFactory['createSurface']
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
  // TODO(engine-zoom): set this default back to false after transform-drift
  // regression checklist is green for tile compositor + interaction preview.
  disableReuse: false,
  cacheOnly: false,
  maxScaleStep: 1.2,
  maxTranslatePx: 220,
}

const OVERVIEW_IMAGE_SKIP_MAX_SCALE = 0.02
const OVERVIEW_IMAGE_SKIP_MAX_SCREEN_EDGE_PX = 2.8
// Visibility-tier thresholds replace scale-bucket packet skipping for interaction frames.
const INTERACTION_PACKET_SKIP_TIER_D_MIN_EDGE_PX = 3.2
const INTERACTION_PACKET_SKIP_TIER_C_MIN_EDGE_PX = 2.2
const INTERACTION_PACKET_SKIP_TIER_B_MIN_EDGE_PX = 1.2
const INTERACTION_PACKET_SKIP_SHAPE_MIN_AREA_PX2 = 6
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
  let compositeSnapshot: InteractionCompositeSnapshot | null = null

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

  const modelSurface = createModelSurface(1, 1, options.createCanvasSurface)
  if (!modelSurface) {
    throw new Error('webgl model-complete surface allocation failed')
  }
  const textCropSurface = createModelSurface(1, 1, options.createCanvasSurface)
  if (!textCropSurface) {
    throw new Error('webgl text crop surface allocation failed')
  }
  const modelRenderer = createCanvas2DEngineRenderer({
    id: `${options.id ?? 'engine.renderer.webgl'}.model-canvas2d`,
    canvas: modelSurface.canvas,
    createCanvasSurface: options.createCanvasSurface,
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
    resize: (size) => {
      // Keep main canvas ownership in the app; renderer only consumes the
      // provided output size and updates GPU state from that contract.
      modelRenderer.resize?.(size)
      context.viewport(0, 0, size.outputWidth, size.outputHeight)
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
        // Invalidate tiles on the active zoom bucket so overview and deep-zoom
        // frames stop aliasing everything onto the 100% cache layer.
        const dirtyZoomLevel = getZoomLevelForScale(
          effectiveFrame.viewport.scale,
          previousTileZoomLevel,
        )
        for (const dirtyRegion of effectiveFrame.context.dirtyRegions) {
          const dirtyTilesBefore = tileCache.getDirtyTiles().length
          // Keep invalidation aligned with the bucket that this frame will render.
          if (dirtyRegion.previousBounds) {
            tileCache.invalidateTilesForBoundsDelta(
              dirtyRegion.previousBounds,
              dirtyRegion.bounds,
              dirtyZoomLevel,
            )
          } else {
            tileCache.invalidateTilesInBounds(dirtyRegion.bounds, dirtyZoomLevel)
          }
          dirtyTileCount += Math.max(0, tileCache.getDirtyTiles().length - dirtyTilesBefore)
        }
      }

      // Keep full-fidelity composite for settled frames, but fall back to the
      // packet pipeline during interaction so pan/zoom can keep frame pace.
      if (modelCompleteComposite && !interactiveQuality) {
        l1CompositeHitCount += 1
        const modelSurfacePixelRatio = effectiveFrame.context.pixelRatio ?? effectiveFrame.context.outputPixelRatio ?? 1
        // Size the model-complete offscreen surface from its own DPR lane so
        // side-target degradation never rewrites the app-owned main canvas.
        modelRenderer.resize?.({
          viewportWidth: effectiveFrame.viewport.viewportWidth,
          viewportHeight: effectiveFrame.viewport.viewportHeight,
          outputWidth: Math.max(1, Math.round(effectiveFrame.viewport.viewportWidth * modelSurfacePixelRatio)),
          outputHeight: Math.max(1, Math.round(effectiveFrame.viewport.viewportHeight * modelSurfacePixelRatio)),
        })
        const modelFrame: EngineRenderFrame = {
          ...effectiveFrame,
          context: {
            ...effectiveFrame.context,
            outputPixelRatio: modelSurfacePixelRatio,
          },
        }
        const modelRenderStart = performance.now()
        const modelStats = await modelRenderer.render(modelFrame)
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
        // Resolve the active tile bucket from viewport scale so overview and
        // deep-zoom frames use their own cache layer instead of the 100% layer.
        const currentTileZoomLevel = getZoomLevelForScale(
          effectiveFrame.viewport.scale,
          previousTileZoomLevel,
        )
        const shouldBypassTileCompositor = tileCache
          ? shouldBypassTileCompositorForFrame(
            effectiveFrame,
            tileCache,
            Math.max(
              64,
              options.tileConfig?.maxCacheSize ?? 64,
            ),
            currentTileZoomLevel,
          )
          : false
        // Keep tile compositor availability driven by runtime tile config only.
        const tileDrawResult = tileCache && !shouldBypassTileCompositor
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

          const tileSnapshotCaptureStart = performance.now()
          const tileSnapshot = captureCompositeSnapshotFromCurrentFramebuffer({
            context,
            texture: compositeTexture,
            frame: effectiveFrame,
            visibleCount: modelStats.visibleCount,
            culledCount: modelStats.culledCount,
          })
          webglSnapshotCaptureMs += performance.now() - tileSnapshotCaptureStart
          if (tileSnapshot) {
            compositeSnapshot = tileSnapshot
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

        cacheFallbackReason = tileCache
          ? (shouldBypassTileCompositor
            ? 'l2-bypass-visible-tile-pressure'
            : 'l2-tile-fallback-to-composite')
          : cacheFallbackReason

        const compositeFrame: EngineRenderFrame = {
          ...effectiveFrame,
          viewport: {
            ...effectiveFrame.viewport,
            // Keep matrix aligned with override so fullscreen composite draw has no transform drift.
            matrix: createViewportMatrixForRender(1, 0, 0),
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
        drawCompositeTextureFrame({
          context,
          pipeline,
          frame: compositeFrame,
          texture: compositeTexture,
          viewportWidth: frame.viewport.viewportWidth,
          viewportHeight: frame.viewport.viewportHeight,
          textureSource: 'canvas-upload',
        })
        webglDrawSubmitMs += performance.now() - compositeDrawStart

        compositeSnapshot = {
          revision: effectiveFrame.scene.revision,
          scale: effectiveFrame.viewport.scale,
          offsetX: effectiveFrame.viewport.offsetX,
          offsetY: effectiveFrame.viewport.offsetY,
          viewportWidth: effectiveFrame.viewport.viewportWidth,
          viewportHeight: effectiveFrame.viewport.viewportHeight,
          pixelRatio: resolveCompositeSnapshotPixelRatio(effectiveFrame),
          visibleCount: modelStats.visibleCount,
          culledCount: modelStats.culledCount,
          textureSource: 'canvas-upload',
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
            Math.max(1, effectiveFrame.context.outputPixelRatio ?? effectiveFrame.context.pixelRatio ?? 1) *
            Math.max(1, effectiveFrame.context.outputPixelRatio ?? effectiveFrame.context.pixelRatio ?? 1) *
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
      const previewReuse = interactionPreview.disableReuse
        ? {
          reused: false,
          // Use no-snapshot miss reason so cache-only hold path is also bypassed.
          missReason: 'l0-no-snapshot',
          visibleCount: 0,
          culledCount: 0,
          edgeRedrawRegions: [] as ScreenRectPx[],
        }
        : tryReuseInteractiveCompositeFrame({
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
            // Cache-hold path must also use identity matrix for the identity viewport override.
            matrix: createViewportMatrixForRender(1, 0, 0),
            scale: 1,
            offsetX: 0,
            offsetY: 0,
          },
        }

        const cacheHoldDrawStart = performance.now()
        drawCompositeTextureFrame({
          context,
          pipeline,
          frame: cachedHoldFrame,
          texture: compositeTexture,
          viewportWidth: compositeSnapshot.viewportWidth,
          viewportHeight: compositeSnapshot.viewportHeight,
          textureSource: compositeSnapshot.textureSource,
        })
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

function shouldBypassTileCompositorForFrame(
  frame: EngineRenderFrame,
  tileCache: EngineTileCache,
  visibleTileLimit: number,
  zoomLevel: TileZoomLevel,
) {
  // Skip tile composition when the current zoom level would require more
  // visible tiles than the cache can hold with any stability.
  const safeScale = Math.max(Number.EPSILON, Math.abs(frame.viewport.scale))
  const visibleTiles = tileCache.getVisibleTiles({
    x: -frame.viewport.offsetX / safeScale,
    y: -frame.viewport.offsetY / safeScale,
    width: frame.viewport.viewportWidth / safeScale,
    height: frame.viewport.viewportHeight / safeScale,
  }, zoomLevel)

  return visibleTiles.length > visibleTileLimit
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

  // Tier B keeps conservative culling and applies a packet budget cap.
  if (visibility.tier === 'tier-b') {
    return minEdge <= INTERACTION_PACKET_SKIP_TIER_B_MIN_EDGE_PX
  }

  // Tier C keeps medium objects but drops tiny packets that are visually imperceptible.
  if (visibility.tier === 'tier-c') {
    return minEdge <= INTERACTION_PACKET_SKIP_TIER_C_MIN_EDGE_PX
  }

  // Tier D receives the strongest culling because visibility contribution is negligible.
  if (visibility.tier === 'tier-d') {
    return minEdge <= INTERACTION_PACKET_SKIP_TIER_D_MIN_EDGE_PX
  }

  // Tier A stays full-fidelity to preserve perceived foreground quality.
  return false
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
  const outputPixelRatio = options.frame.context.outputPixelRatio ?? options.frame.context.pixelRatio ?? 1
  const viewportWidthPx = Math.max(1, Math.round(options.frame.viewport.viewportWidth * outputPixelRatio))
  const viewportHeightPx = Math.max(1, Math.round(options.frame.viewport.viewportHeight * outputPixelRatio))
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
