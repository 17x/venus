import type {
  EngineCanvasSurfaceFactory,
  EngineInteractionPreviewConfig,
  EngineRenderFrame,
  EngineRenderer,
} from '../types/index.ts'
import { createCanvas2DEngineRenderer } from '../canvas2d/canvas2d.ts'
import {
  createWebGLQuadPipeline,
  disposeWebGLQuadPipeline,
  resolveWebGLContext,
} from './core/index.ts'
import type { EngineTileConfig } from '../tileManager/index.ts'
import type { EngineLodConfig } from '../../interaction/lodConfig.ts'
import type { EngineInitialRenderConfig } from '../initialRender/index.ts'
import { EngineInitialRenderController } from '../initialRender/index.ts'
import {
  createEngineWebGLResourceBudgetTracker,
  createModelSurface,
  resolveCachedTextureBytes,
  disposeCachedTextures,
  type CachedTextureEntry,
} from './runtime/index.ts'
import { resolveEngineZoomPerformanceConfig } from '../zoomPerformance/index.ts'
import {
  createWebGLLodCapability,
  createWebGLSnapshotCapability,
  createWebGLTileCacheCapability,
  createWebGLTileQueueCapability,
} from './capabilities/index.ts'
import {
  ENGINE_RENDER_FALLBACK_REASON,
  type EngineRenderFallbackReason,
} from '../fallbackTaxonomy/index.ts'
import {
  HIGH_ZOOM_TEXT_SLA_SCALE,
  resolveWebGLFrameBudget,
  resolveWebGLVisibleElementCountForLod,
} from './webglFramePolicy.ts'
import { resolveWebGLSharedDiagnosticsFromState } from './webglDiagnostics.ts'
import { tryRenderWebGLModelCompletePath } from './webglModelCompletePath.ts'
import { renderWebGLPacketPath } from './webglPacketPath.ts'
import { tryRenderWebGLPreviewReusePath } from './webglPreviewReusePath.ts'

interface WebGLEngineRendererOptions {
  id?: string
  canvas: HTMLCanvasElement | OffscreenCanvas
  createCanvasSurface?: EngineCanvasSurfaceFactory['createSurface']
  enableCulling?: boolean
  clearColor?: readonly [number, number, number, number]
  antialias?: boolean
  modelCompleteComposite?: boolean
  lod?: EngineLodConfig
  tileConfig?: EngineTileConfig
  initialRender?: EngineInitialRenderConfig
  interactionPreview?: EngineInteractionPreviewConfig
}

/**
 * Built-in WebGL renderer entry for engine standalone/runtime integrations.
 * @param options Options object for this operation.
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
  const modelCompleteComposite = options.modelCompleteComposite ?? false
  const resourceBudget = createEngineWebGLResourceBudgetTracker()
  const pipeline = createWebGLQuadPipeline(context)
  const imageCache = new Map<string, CachedTextureEntry>()
  const textCache = new Map<string, CachedTextureEntry>()

  const tileCacheCapability = createWebGLTileCacheCapability({
    tileConfig: options.tileConfig,
  })
  tileCacheCapability.create()
  const tileCache = tileCacheCapability.read({kind: 'cache'})
  const resolvedZoomPerformance = resolveEngineZoomPerformanceConfig(options.tileConfig?.zoomPerformance)
  const lodCapability = createWebGLLodCapability({
    lodEnabled,
    zoomStrategy: resolvedZoomPerformance.strategy,
  })
  lodCapability.create()
  const tileQueueCapability = tileCache
    ? createWebGLTileQueueCapability({tileCache})
    : null
  const tileTextures = new Map<number, WebGLTexture>()
  let nextTileTextureId = 1

  const initialRenderController = options.initialRender
    ? new EngineInitialRenderController(options.initialRender)
    : null
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
  const overlaySurface = createModelSurface(1, 1, options.createCanvasSurface)
  const overlayTexture = context.createTexture()
  if (overlayTexture) {
    context.bindTexture(context.TEXTURE_2D, overlayTexture)
    context.texParameteri(context.TEXTURE_2D, context.TEXTURE_MIN_FILTER, context.LINEAR)
    context.texParameteri(context.TEXTURE_2D, context.TEXTURE_MAG_FILTER, context.LINEAR)
    context.texParameteri(context.TEXTURE_2D, context.TEXTURE_WRAP_S, context.CLAMP_TO_EDGE)
    context.texParameteri(context.TEXTURE_2D, context.TEXTURE_WRAP_T, context.CLAMP_TO_EDGE)
  }
  const snapshotCapability = createWebGLSnapshotCapability({
    context,
    pipeline,
    texture: compositeTexture,
    initialConfig: options.interactionPreview,
  })

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
      modelRenderer.resize?.(size)
      context.viewport(0, 0, size.outputWidth, size.outputHeight)
    },
    setInteractionPreview: (config) => {
      snapshotCapability.update({config})
    },
    render: async (frame: EngineRenderFrame) => {
      const startAt = performance.now()
      const visibleElementCountForLod = resolveWebGLVisibleElementCountForLod(frame)
      const tileCacheEnabled = tileCacheCapability.read({kind: 'enabled'})
      const lodState = lodCapability.read({
        frame,
        tileCacheEnabled,
        visibleElementCount: visibleElementCountForLod,
      })
      const activeLayerNodeIdSet = new Set(frame.context.interactionActiveNodeIds ?? [])
      const activeLayerMaskEnabled = activeLayerNodeIdSet.size > 0
      const interactiveQuality = lodState.interactiveQuality
      const interactionActive = Boolean(frame.context.interactionActive)
      const interactionRenderLane = interactiveQuality || interactionActive
      const baseSceneRenderMode = lodState.baseSceneRenderMode
      // Engine WebGL renderer composes base scene first, then applies overlay pass.
      const tileCacheBaseSceneOnly = true
      let l0PreviewHitCount = 0
      let l0PreviewMissCount = 0
      let l1CompositeHitCount = 0
      let l1CompositeMissCount = 0
      let l2TileHitCount = 0
      let l2TileMissCount = 0
      let cacheFallbackReason: EngineRenderFallbackReason = ENGINE_RENDER_FALLBACK_REASON.NONE
      // Keep WebGL pipeline timing slices explicit for frame-time attribution.
      let webglPreviewReuseMs = 0
      let webglPreviewExecutionMode: 'affine-snapshot' | 'temporal-reprojection-required' = 'affine-snapshot'
      let webglPlanBuildMs = 0
      let webglTextureUploadMs = 0
      let webglDrawSubmitMs = 0
      let webglSnapshotCaptureMs = 0
      let webglModelRenderMs = 0
      let drawSubmitBudgetExceeded = false
      let textureUploadBudgetExceeded = false
      let overlayBudgetExceeded = false
      let highZoomTextSlaChecked = false
      let highZoomTextSlaViolationCount = 0
      let panScheduleRequestCount = 0
      let tileSynchronousRebuildCount = 0

      const resolveSharedDiagnostics = (params: {
        predictorPreloadRing: number
        predictorOverscanCssPx: number
        predictivePreloadEnqueueCount: number
        predictivePreloadProcessedCount: number
        predictivePreloadPrunedCount: number
        highZoomTextSlaChecked: boolean
        highZoomTextSlaViolationCount: number
        deferredTextTextureCount: number
        tileSchedulerPendingCount: number
        gpuTextureBytes: number
        imageTextureBytes: number
        frameMs: number
      }) => resolveWebGLSharedDiagnosticsFromState(
        {
          l0PreviewHitCount,
          l0PreviewMissCount,
          l1CompositeHitCount,
          l1CompositeMissCount,
          l2TileHitCount,
          l2TileMissCount,
          cacheFallbackReason,
          webglPreviewReuseMs,
          webglPreviewExecutionMode,
          webglPlanBuildMs,
          webglTextureUploadMs,
          webglDrawSubmitMs,
          webglSnapshotCaptureMs,
          webglModelRenderMs,
          frameBudgetPressure,
          frameBudget,
          drawSubmitBudgetExceeded,
          textureUploadBudgetExceeded,
          overlayBudgetExceeded,
          predictorState,
          highZoomTextSlaScale,
          panScheduleRequestCount,
          tileSynchronousRebuildCount,
        },
        params,
      )

      let effectiveFrame = frame
      if (initialRenderController) {
        if (!initialRenderStarted) {
          initialRenderStarted = true
          initialRenderController.beginInitialRender()
        }
        const dprForPhase = initialRenderController.getDprForPhase()
        if (dprForPhase !== 1.0) {
          effectiveFrame = {
            ...frame,
            context: {
              ...frame.context,
              pixelRatio: (frame.context.pixelRatio ?? 1) * dprForPhase,
            },
          }
        }
      }

      if (tileCache) {
        tileCacheCapability.update({
          kind: 'sync-pixel-ratio',
          pixelRatio: effectiveFrame.context.pixelRatio ?? 1,
        })
      }

      const dirtyRegionCount = effectiveFrame.context.dirtyRegions?.length ?? 0
      let dirtyTileCount = 0
      if (tileCache && effectiveFrame.context.dirtyRegions && effectiveFrame.context.dirtyRegions.length > 0) {
        dirtyTileCount = tileCacheCapability.update({
          kind: 'mark-dirty-regions',
          frame: effectiveFrame,
        })
      }
      const frameBudget = resolveWebGLFrameBudget(effectiveFrame)
      const frameBudgetPressure = effectiveFrame.context.frameBudgetPressure ?? 'low'
      const highZoomTextSlaScale = HIGH_ZOOM_TEXT_SLA_SCALE
      const predictorState = effectiveFrame.context.interactionPredictor
      const hasDirtyRegions = (effectiveFrame.context.dirtyRegions?.length ?? 0) > 0
      const highZoomInteractionActive =
        interactionActive && effectiveFrame.viewport.scale >= HIGH_ZOOM_TEXT_SLA_SCALE
      const shouldBypassSnapshotReuseForActiveLayer =
        activeLayerMaskEnabled && hasDirtyRegions
      const shouldBypassSnapshotReuseForHighZoomInteraction = highZoomInteractionActive
      const shouldBypassSnapshotReuse =
        shouldBypassSnapshotReuseForActiveLayer || shouldBypassSnapshotReuseForHighZoomInteraction

      const previewReuseState = {
        l0PreviewHitCount,
        l0PreviewMissCount,
        cacheFallbackReason,
        panScheduleRequestCount,
        webglPreviewExecutionMode,
        webglPreviewReuseMs,
        webglTextureUploadMs,
        overlayBudgetExceeded,
      }
      const previewReuseResult = tryRenderWebGLPreviewReusePath({
        effectiveFrame,
        context,
        pipeline,
        clearColor,
        baseSceneRenderMode,
        tileCacheBaseSceneOnly,
        snapshotCapability,
        tileQueueCapability,
        overlaySurface,
        overlayTexture,
        shouldBypassSnapshotReuse,
        imageCache,
        resourceBudget,
        resolveSharedDiagnostics,
        startAt,
        state: previewReuseState,
      })
      l0PreviewHitCount = previewReuseState.l0PreviewHitCount
      l0PreviewMissCount = previewReuseState.l0PreviewMissCount
      cacheFallbackReason = previewReuseState.cacheFallbackReason
      panScheduleRequestCount = previewReuseState.panScheduleRequestCount
      webglPreviewExecutionMode = previewReuseState.webglPreviewExecutionMode
      webglPreviewReuseMs = previewReuseState.webglPreviewReuseMs
      webglTextureUploadMs = previewReuseState.webglTextureUploadMs
      overlayBudgetExceeded = previewReuseState.overlayBudgetExceeded
      if (shouldBypassSnapshotReuseForHighZoomInteraction && !previewReuseResult.handled) {
        cacheFallbackReason = ENGINE_RENDER_FALLBACK_REASON.L0_ZOOM_ONLY_PAN_BLOCKED
      }
      if (previewReuseResult.handled && previewReuseResult.result) {
        return previewReuseResult.result
      }

      if (modelCompleteComposite && !interactionRenderLane) {
        const modelCompleteState = {
          l1CompositeHitCount,
          l1CompositeMissCount,
          l2TileHitCount,
          l2TileMissCount,
          cacheFallbackReason,
          webglTextureUploadMs,
          webglDrawSubmitMs,
          webglSnapshotCaptureMs,
          webglModelRenderMs,
          overlayBudgetExceeded,
          tileSynchronousRebuildCount,
        }
        const modelCompleteResult = await tryRenderWebGLModelCompletePath({
          effectiveFrame,
          frame,
          modelRenderer,
          modelSurfaceCanvas: modelSurface.canvas,
          context,
          pipeline,
          clearColor,
          canvasSize: {
            width: ('width' in options.canvas ? options.canvas.width : frame.viewport.viewportWidth),
            height: ('height' in options.canvas ? options.canvas.height : frame.viewport.viewportHeight),
          },
          tileCache,
          tileCacheCapability,
          tileQueueCapability,
          tileTextures,
          nextTileTextureId: () => nextTileTextureId++,
          frameBudget: {
            tilePreloadBudgetMs: frameBudget.tilePreloadBudgetMs,
            tilePreloadMaxUploads: frameBudget.tilePreloadMaxUploads,
          },
          baseSceneRenderMode,
          predictorState,
          maxTileCacheSize: options.tileConfig?.maxCacheSize,
          overlaySurface,
          overlayTexture,
          snapshotCapability,
          compositeTexture,
          resolveSharedDiagnostics,
          startAt,
          state: modelCompleteState,
          resolveImageTextureBytes: () => resolveCachedTextureBytes(imageCache),
          resolveGpuTextureBytes: () => resourceBudget.getTextureBytes(),
          resolveInitialRenderPhase: () => initialRenderController?.getPhase()?.toString(),
          resolveInitialRenderProgress: () => initialRenderController?.getDetailPassProgress(),
          dirtyRegionCount,
          dirtyTileCount,
        })

        l1CompositeHitCount = modelCompleteState.l1CompositeHitCount
        l1CompositeMissCount = modelCompleteState.l1CompositeMissCount
        l2TileHitCount = modelCompleteState.l2TileHitCount
        l2TileMissCount = modelCompleteState.l2TileMissCount
        cacheFallbackReason = modelCompleteState.cacheFallbackReason
        webglTextureUploadMs = modelCompleteState.webglTextureUploadMs
        webglDrawSubmitMs = modelCompleteState.webglDrawSubmitMs
        webglSnapshotCaptureMs = modelCompleteState.webglSnapshotCaptureMs
        webglModelRenderMs = modelCompleteState.webglModelRenderMs
        overlayBudgetExceeded = modelCompleteState.overlayBudgetExceeded
        tileSynchronousRebuildCount = modelCompleteState.tileSynchronousRebuildCount
        if (modelCompleteResult) {
          return modelCompleteResult
        }
      }

      const canvasPixelWidth = 'width' in options.canvas
        ? options.canvas.width
        : frame.viewport.viewportWidth
      const canvasPixelHeight = 'height' in options.canvas
        ? options.canvas.height
        : frame.viewport.viewportHeight
      const packetPathState = {
        cacheFallbackReason,
        l1CompositeMissCount,
        drawSubmitBudgetExceeded,
        textureUploadBudgetExceeded,
        highZoomTextSlaChecked,
        highZoomTextSlaViolationCount,
        webglPlanBuildMs,
        webglTextureUploadMs,
        webglDrawSubmitMs,
        webglSnapshotCaptureMs,
        webglModelRenderMs,
        overlayBudgetExceeded,
      }
      const packetResult = await renderWebGLPacketPath({
        effectiveFrame,
        frame,
        context,
        pipeline,
        clearColor,
        frameBudget,
        canvasPixelWidth,
        canvasPixelHeight,
        highZoomTextSlaScale,
        interactionRenderLane,
        activeLayerMaskEnabled,
        activeLayerNodeIdSet,
        visibleElementCountForLod,
        tileCacheEnabled,
        lodCapability,
        modelCompleteComposite,
        modelRenderer,
        modelSurfaceCanvas: modelSurface.canvas,
        textCropSurfaceCanvas: textCropSurface.canvas,
        compositeTexture,
        imageCache,
        textCache,
        resourceBudget,
        tileCacheCapability,
        tileQueueCapability,
        snapshotCapability,
        overlaySurface,
        overlayTexture,
        baseSceneRenderMode,
        tileCacheBaseSceneOnly,
        startAt,
        resolveInitialRenderPhase: () => initialRenderController?.getPhase()?.toString(),
        resolveInitialRenderProgress: () => initialRenderController?.getDetailPassProgress(),
        dirtyRegionCount,
        dirtyTileCount,
        resolveSharedDiagnostics,
        state: packetPathState,
      })
      cacheFallbackReason = packetPathState.cacheFallbackReason
      l1CompositeMissCount = packetPathState.l1CompositeMissCount
      drawSubmitBudgetExceeded = packetPathState.drawSubmitBudgetExceeded
      textureUploadBudgetExceeded = packetPathState.textureUploadBudgetExceeded
      highZoomTextSlaChecked = packetPathState.highZoomTextSlaChecked
      highZoomTextSlaViolationCount = packetPathState.highZoomTextSlaViolationCount
      webglPlanBuildMs = packetPathState.webglPlanBuildMs
      webglTextureUploadMs = packetPathState.webglTextureUploadMs
      webglDrawSubmitMs = packetPathState.webglDrawSubmitMs
      webglSnapshotCaptureMs = packetPathState.webglSnapshotCaptureMs
      webglModelRenderMs = packetPathState.webglModelRenderMs
      overlayBudgetExceeded = packetPathState.overlayBudgetExceeded
      return packetResult
    },
    dispose: () => {
      tileQueueCapability?.delete()
      tileCacheCapability.delete()
      lodCapability.delete()
      snapshotCapability.delete()
      modelRenderer.dispose?.()
      context.deleteTexture(compositeTexture)
      if (overlayTexture) {
        context.deleteTexture(overlayTexture)
      }
      for (const texture of tileTextures.values()) {
        context.deleteTexture(texture)
      }
      tileTextures.clear()
      disposeCachedTextures(context, imageCache, resourceBudget)
      disposeCachedTextures(context, textCache, resourceBudget)
      disposeWebGLQuadPipeline(context, pipeline)
    },
  }
}

