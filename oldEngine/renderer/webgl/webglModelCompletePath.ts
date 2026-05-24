import type {
  EngineInteractionPredictorState,
  EngineRenderFrame,
  EngineRenderStats,
  EngineRenderer,
} from '../types/index.ts'
import type { EngineTileCache } from '../tileManager/index.ts'
import type { EngineRenderFallbackReason } from '../fallbackTaxonomy/index.ts'
import { ENGINE_RENDER_FALLBACK_REASON } from '../fallbackTaxonomy/index.ts'
import { createViewportMatrixForRender, type WebGLQuadPipeline } from './core/index.ts'
import { drawCompositeTextureFrame, resolveCompositeSnapshotPixelRatio } from './preview/index.ts'
import { drawModelSurfaceAsTiles } from './tiles/index.ts'
import {
  resolvePredictiveOverscanCssPx,
  resolvePredictivePreloadRing,
} from '../interactionPredictiveTiles/index.ts'
import {
  createWebGLSnapshotCapability,
  createWebGLTileCacheCapability,
  createWebGLTileQueueCapability,
} from './capabilities/index.ts'
import { shouldBypassTileCompositorForFrame } from './runtime/index.ts'
import { drawWebGLOverlayPass } from './webglOverlayPass.ts'

const TILE_PRELOAD_RING_DEFAULT = 1
const TILE_SIZE_CSS_FALLBACK = 512
const TILE_CACHE_SIZE_MIN = 64
const TEXTURE_BYTES_PER_PIXEL_RGBA = 4

/**
 * Shared diagnostics resolver input used by the WebGL render path.
 */
interface WebGLSharedDiagnosticsParams {
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
}

/**
 * Mutable state bucket shared with render orchestration.
 */
interface WebGLModelCompleteMutableState {
  l1CompositeHitCount: number
  l1CompositeMissCount: number
  l2TileHitCount: number
  l2TileMissCount: number
  cacheFallbackReason: EngineRenderFallbackReason
  webglTextureUploadMs: number
  webglDrawSubmitMs: number
  webglSnapshotCaptureMs: number
  webglModelRenderMs: number
  overlayBudgetExceeded: boolean
  tileSynchronousRebuildCount: number
}

/**
 * Input contract for model-complete path execution.
 */
interface WebGLModelCompletePathArgs {
  effectiveFrame: EngineRenderFrame
  frame: EngineRenderFrame
  modelRenderer: EngineRenderer
  modelSurfaceCanvas: HTMLCanvasElement | OffscreenCanvas
  context: WebGLRenderingContext
  pipeline: WebGLQuadPipeline
  clearColor: readonly [number, number, number, number]
  canvasSize: { width: number; height: number }
  tileCache: EngineTileCache | null
  tileCacheCapability: ReturnType<typeof createWebGLTileCacheCapability>
  tileQueueCapability: ReturnType<typeof createWebGLTileQueueCapability> | null
  tileTextures: Map<number, WebGLTexture>
  nextTileTextureId: () => number
  frameBudget: {
    tilePreloadBudgetMs: number
    tilePreloadMaxUploads: number
  }
  baseSceneRenderMode: 'vector-live' | 'tile-cache' | 'progressive-refresh'
  predictorState?: EngineInteractionPredictorState
  maxTileCacheSize?: number
  overlaySurface: { canvas: HTMLCanvasElement | OffscreenCanvas } | null
  overlayTexture: WebGLTexture | null
  snapshotCapability: ReturnType<typeof createWebGLSnapshotCapability>
  compositeTexture: WebGLTexture
  resolveSharedDiagnostics: (params: WebGLSharedDiagnosticsParams) => Record<string, unknown>
  startAt: number
  state: WebGLModelCompleteMutableState
  resolveImageTextureBytes: () => number
  resolveGpuTextureBytes: () => number
  resolveInitialRenderPhase: () => string | undefined
  resolveInitialRenderProgress: () => number | undefined
  dirtyRegionCount: number
  dirtyTileCount: number
}

/**
 * Attempts model-complete composition path and returns final stats when handled.
 * @param args Model-complete path dependencies and mutable state references.
 * @returns Render stats when model-complete path produced final output, otherwise null.
 */
export async function tryRenderWebGLModelCompletePath(
  args: WebGLModelCompletePathArgs,
): Promise<EngineRenderStats | null> {
  args.state.l1CompositeHitCount += 1
  const modelSurfacePixelRatio = args.effectiveFrame.context.pixelRatio ?? args.effectiveFrame.context.outputPixelRatio ?? 1
  // Size the model-complete offscreen surface from its own DPR lane so
  // side-target degradation never rewrites the app-owned main canvas.
  args.modelRenderer.resize?.({
    viewportWidth: args.effectiveFrame.viewport.viewportWidth,
    viewportHeight: args.effectiveFrame.viewport.viewportHeight,
    outputWidth: Math.max(1, Math.round(args.effectiveFrame.viewport.viewportWidth * modelSurfacePixelRatio)),
    outputHeight: Math.max(1, Math.round(args.effectiveFrame.viewport.viewportHeight * modelSurfacePixelRatio)),
  })
  const modelFrame: EngineRenderFrame = {
    ...args.effectiveFrame,
    context: {
      ...args.effectiveFrame.context,
      outputPixelRatio: modelSurfacePixelRatio,
    },
  }
  const modelRenderStart = performance.now()
  const modelStats = await args.modelRenderer.render(modelFrame)
  args.state.webglModelRenderMs += performance.now() - modelRenderStart

  args.context.viewport(0, 0, args.canvasSize.width, args.canvasSize.height)
  args.context.enable(args.context.BLEND)
  args.context.blendFunc(args.context.ONE, args.context.ONE_MINUS_SRC_ALPHA)
  const [clearR, clearG, clearB, clearA] = args.clearColor
  args.context.clearColor(clearR, clearG, clearB, clearA)
  args.context.clear(args.context.COLOR_BUFFER_BIT)

  const tileDrawStart = performance.now()
  const currentTileZoomLevel = args.tileCacheCapability.read({
    kind: 'active-zoom-level',
    scale: args.effectiveFrame.viewport.scale,
  })
  const predictivePreloadRing = args.baseSceneRenderMode === 'progressive-refresh'
    ? resolvePredictivePreloadRing(TILE_PRELOAD_RING_DEFAULT, args.predictorState)
    : 0
  const predictiveOverscanCssPx = args.baseSceneRenderMode === 'progressive-refresh'
    ? resolvePredictiveOverscanCssPx(
      args.tileCache?.getTileSizePx(currentTileZoomLevel) ?? TILE_SIZE_CSS_FALLBACK,
      args.predictorState,
    )
    : 0
  const shouldBypassTileCompositor = args.tileCache
    ? shouldBypassTileCompositorForFrame(
      args.effectiveFrame,
      args.tileCache,
      Math.max(TILE_CACHE_SIZE_MIN, args.maxTileCacheSize ?? TILE_CACHE_SIZE_MIN),
      currentTileZoomLevel,
    )
    : false
  const tileDrawResult = args.tileCache && !shouldBypassTileCompositor
    ? drawModelSurfaceAsTiles({
      context: args.context,
      frame: args.effectiveFrame,
      tileCache: args.tileCache,
      tileTextures: args.tileTextures,
      nextTileTextureId: args.nextTileTextureId,
      modelSurface: args.modelSurfaceCanvas,
      pipeline: args.pipeline,
      tileScheduler: args.tileQueueCapability?.getScheduler() ?? null,
      previousZoomLevel: args.tileCacheCapability.read({kind: 'previous-zoom-level'}),
      preloadRing: predictivePreloadRing,
      preloadOverscanCssPx: predictiveOverscanCssPx,
      preloadBudgetMs: args.baseSceneRenderMode === 'progressive-refresh'
        ? args.frameBudget.tilePreloadBudgetMs
        : 0,
      maxPreloadUploads: args.baseSceneRenderMode === 'progressive-refresh'
        ? args.frameBudget.tilePreloadMaxUploads
        : 0,
    })
    : null
  args.state.webglDrawSubmitMs += performance.now() - tileDrawStart

  if (tileDrawResult) {
    args.tileCacheCapability.update({
      kind: 'set-previous-zoom-level',
      zoomLevel: tileDrawResult.zoomLevel,
    })
    args.state.l2TileHitCount += tileDrawResult.tileHitCount
    args.state.l2TileMissCount += tileDrawResult.tileMissCount
    if (tileDrawResult.fallbackReason !== ENGINE_RENDER_FALLBACK_REASON.NONE) {
      args.state.cacheFallbackReason = tileDrawResult.fallbackReason
    }

    const shouldSkipTileSnapshotCapture =
      args.effectiveFrame.scene.nodes.length > 0 &&
      modelStats.visibleCount === 0 &&
      (args.effectiveFrame.context.overlayNodes?.length ?? 0) > 0
    if (!shouldSkipTileSnapshotCapture) {
      const tileSnapshotCaptureStart = performance.now()
      args.snapshotCapability.create({
        frame: args.effectiveFrame,
        visibleCount: modelStats.visibleCount,
        culledCount: modelStats.culledCount,
      })
      args.state.webglSnapshotCaptureMs += performance.now() - tileSnapshotCaptureStart
    }

    const tileStats = args.tileCacheCapability.read({kind: 'stats'})
    const overlayResult = drawWebGLOverlayPass({
      context: args.context,
      pipeline: args.pipeline,
      frame: args.effectiveFrame,
      overlaySurface: args.overlaySurface,
      overlayTexture: args.overlayTexture,
    })
    args.state.webglTextureUploadMs += overlayResult.textureUploadMs
    args.state.overlayBudgetExceeded = args.state.overlayBudgetExceeded || overlayResult.budgetExceeded
    args.state.tileSynchronousRebuildCount = tileDrawResult.tileRenderCount

    return {
      ...modelStats,
      drawCount: Math.max(1, tileDrawResult.drawCount) + overlayResult.drawCount,
      engineFrameQuality: args.effectiveFrame.context.quality,
      baseSceneRenderMode: args.baseSceneRenderMode,
      tileCacheBaseSceneOnly: true,
      cacheHits: tileDrawResult.tileHitCount,
      cacheMisses: tileDrawResult.tileMissCount,
      webglRenderPath: 'model-complete',
      webglCompositeUploadBytes: 0,
      webglInteractiveTextFallbackCount: 0,
      webglTextTextureUploadCount: 0,
      webglTextTextureUploadBytes: 0,
      webglTextCacheHitCount: 0,
      tileCacheSize: tileStats?.tileCount,
      tileDirtyCount: tileStats?.dirtyCount,
      tileCacheTotalBytes: tileStats?.totalTextureBytes,
      tileUploadCount: tileDrawResult.tileUploadCount,
      tileRenderCount: tileDrawResult.tileRenderCount,
      visibleTileCount: tileDrawResult.visibleTileCount,
      initialRenderPhase: args.resolveInitialRenderPhase(),
      initialRenderProgress: args.resolveInitialRenderProgress(),
      dirtyRegionCount: args.dirtyRegionCount,
      dirtyTileCount: args.dirtyTileCount,
      incrementalUpdateCount: args.dirtyTileCount > 0 ? 1 : 0,
      ...args.resolveSharedDiagnostics({
        predictorPreloadRing: predictivePreloadRing,
        predictorOverscanCssPx: predictiveOverscanCssPx,
        predictivePreloadEnqueueCount: tileDrawResult.predictivePreloadEnqueueCount,
        predictivePreloadProcessedCount: tileDrawResult.predictivePreloadProcessedCount,
        predictivePreloadPrunedCount: tileDrawResult.predictivePreloadPrunedCount,
        highZoomTextSlaChecked: false,
        highZoomTextSlaViolationCount: 0,
        deferredTextTextureCount: 0,
        tileSchedulerPendingCount: args.tileQueueCapability?.read().pendingCount ?? 0,
        gpuTextureBytes: (tileStats?.totalTextureBytes ?? 0) + args.resolveGpuTextureBytes(),
        imageTextureBytes: args.resolveImageTextureBytes(),
        frameMs: performance.now() - args.startAt,
      }),
    }
  }

  args.state.cacheFallbackReason = args.tileCache
    ? (shouldBypassTileCompositor
      ? ENGINE_RENDER_FALLBACK_REASON.L2_BYPASS_VISIBLE_TILE_PRESSURE
      : ENGINE_RENDER_FALLBACK_REASON.L2_TILE_FALLBACK_TO_COMPOSITE)
    : args.state.cacheFallbackReason

  const compositeFrame: EngineRenderFrame = {
    ...args.effectiveFrame,
    viewport: {
      ...args.effectiveFrame.viewport,
      matrix: createViewportMatrixForRender(1, 0, 0),
      scale: 1,
      offsetX: 0,
      offsetY: 0,
    },
  }

  args.context.bindTexture(args.context.TEXTURE_2D, args.compositeTexture)
  args.context.pixelStorei(args.context.UNPACK_PREMULTIPLY_ALPHA_WEBGL, 1)
  try {
    args.context.texImage2D(
      args.context.TEXTURE_2D,
      0,
      args.context.RGBA,
      args.context.RGBA,
      args.context.UNSIGNED_BYTE,
      args.modelSurfaceCanvas as unknown as TexImageSource,
    )
  } catch {
    args.state.l1CompositeMissCount += 1
    args.state.cacheFallbackReason = ENGINE_RENDER_FALLBACK_REASON.L3_EMPTY_FRAME_MODEL_FALLBACK
  }

  if (args.state.cacheFallbackReason === ENGINE_RENDER_FALLBACK_REASON.L3_EMPTY_FRAME_MODEL_FALLBACK) {
    return null
  }

  const compositeDrawStart = performance.now()
  drawCompositeTextureFrame({
    context: args.context,
    pipeline: args.pipeline,
    frame: compositeFrame,
    texture: args.compositeTexture,
    viewportWidth: args.frame.viewport.viewportWidth,
    viewportHeight: args.frame.viewport.viewportHeight,
    textureSource: 'canvas-upload',
  })
  args.state.webglDrawSubmitMs += performance.now() - compositeDrawStart

  const shouldSkipCompositeSnapshotUpdate =
    args.effectiveFrame.scene.nodes.length > 0 &&
    modelStats.visibleCount === 0 &&
    (args.effectiveFrame.context.overlayNodes?.length ?? 0) > 0
  if (!shouldSkipCompositeSnapshotUpdate) {
    args.snapshotCapability.update({
      snapshot: {
        revision: args.effectiveFrame.scene.revision,
        scale: args.effectiveFrame.viewport.scale,
        offsetX: args.effectiveFrame.viewport.offsetX,
        offsetY: args.effectiveFrame.viewport.offsetY,
        viewportWidth: args.effectiveFrame.viewport.viewportWidth,
        viewportHeight: args.effectiveFrame.viewport.viewportHeight,
        pixelRatio: resolveCompositeSnapshotPixelRatio(args.effectiveFrame),
        visibleCount: modelStats.visibleCount,
        culledCount: modelStats.culledCount,
        textureSource: 'canvas-upload',
      },
    })
  }

  const overlayResult = drawWebGLOverlayPass({
    context: args.context,
    pipeline: args.pipeline,
    frame: args.effectiveFrame,
    overlaySurface: args.overlaySurface,
    overlayTexture: args.overlayTexture,
  })
  args.state.webglTextureUploadMs += overlayResult.textureUploadMs
  args.state.overlayBudgetExceeded = args.state.overlayBudgetExceeded || overlayResult.budgetExceeded

  return {
    ...modelStats,
    drawCount: Math.max(1, modelStats.drawCount) + overlayResult.drawCount,
    baseSceneRenderMode: args.baseSceneRenderMode,
    tileCacheBaseSceneOnly: true,
    cacheHits: 0,
    cacheMisses: 0,
    webglRenderPath: 'model-complete',
    webglCompositeUploadBytes:
      Math.max(1, args.effectiveFrame.viewport.viewportWidth) *
      Math.max(1, args.effectiveFrame.viewport.viewportHeight) *
      Math.max(1, args.effectiveFrame.context.outputPixelRatio ?? args.effectiveFrame.context.pixelRatio ?? 1) *
      Math.max(1, args.effectiveFrame.context.outputPixelRatio ?? args.effectiveFrame.context.pixelRatio ?? 1) *
      TEXTURE_BYTES_PER_PIXEL_RGBA,
    webglInteractiveTextFallbackCount: 0,
    webglTextTextureUploadCount: 0,
    webglTextTextureUploadBytes: 0,
    webglTextCacheHitCount: 0,
    ...args.resolveSharedDiagnostics({
      predictorPreloadRing: 0,
      predictorOverscanCssPx: 0,
      predictivePreloadEnqueueCount: 0,
      predictivePreloadProcessedCount: 0,
      predictivePreloadPrunedCount: 0,
      highZoomTextSlaChecked: false,
      highZoomTextSlaViolationCount: 0,
      deferredTextTextureCount: 0,
      tileSchedulerPendingCount: args.tileQueueCapability?.read().pendingCount ?? 0,
      gpuTextureBytes: args.resolveGpuTextureBytes(),
      imageTextureBytes: args.resolveImageTextureBytes(),
      frameMs: performance.now() - args.startAt,
    }),
  }
}
