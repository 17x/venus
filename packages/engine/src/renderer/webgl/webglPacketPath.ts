import type { EngineRenderFrame, EngineRenderStats, EngineRenderer } from '../types/index.ts'
import { prepareEngineRenderPlan } from '../plan/index.ts'
import { prepareEngineRenderInstanceView } from '../instances/instances.ts'
import { compileEngineWebGLPacketPlan, type WebGLQuadPipeline } from './core/index.ts'
import {
  countPendingImageTextureEstimate,
  disposeEvictedTextures,
  pruneTextCache,
  resolveCachedTextureBytes,
  type CachedTextureEntry,
} from './runtime/index.ts'
import {
  ENGINE_RENDER_FALLBACK_REASON,
  type EngineRenderFallbackReason,
} from '../fallbackTaxonomy/index.ts'
import { submitWebGLPacketSequence } from './webglPacketSubmission.ts'
import { applyWebGLZeroDrawModelFallback } from './webglZeroDrawFallback.ts'
import { drawWebGLOverlayPass } from './webglOverlayPass.ts'
import { createWebGLLodCapability, createWebGLSnapshotCapability, createWebGLTileCacheCapability, createWebGLTileQueueCapability } from './capabilities/index.ts'

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
 * Mutable state bucket shared with packet-path orchestration.
 */
interface WebGLPacketPathMutableState {
  cacheFallbackReason: EngineRenderFallbackReason
  l1CompositeMissCount: number
  drawSubmitBudgetExceeded: boolean
  textureUploadBudgetExceeded: boolean
  highZoomTextSlaChecked: boolean
  highZoomTextSlaViolationCount: number
  webglPlanBuildMs: number
  webglTextureUploadMs: number
  webglDrawSubmitMs: number
  webglSnapshotCaptureMs: number
  webglModelRenderMs: number
  overlayBudgetExceeded: boolean
}

/**
 * Input contract for packet-path orchestration.
 */
interface WebGLPacketPathArgs {
  effectiveFrame: EngineRenderFrame
  frame: EngineRenderFrame
  context: WebGLRenderingContext
  pipeline: WebGLQuadPipeline
  clearColor: readonly [number, number, number, number]
  frameBudget: {
    drawSubmitBudgetMs: number
    imageTextureUploadMaxCount: number
    textureUploadBudgetBytes: number
    textureUploadTotalBudgetBytes: number
    textTextureUploadMaxCount: number
  }
  canvasPixelWidth: number
  canvasPixelHeight: number
  highZoomTextSlaScale: number
  interactionRenderLane: boolean
  activeLayerMaskEnabled: boolean
  activeLayerNodeIdSet: ReadonlySet<string>
  visibleElementCountForLod: number
  tileCacheEnabled: boolean
  lodCapability: ReturnType<typeof createWebGLLodCapability>
  modelCompleteComposite: boolean
  modelRenderer: EngineRenderer
  modelSurfaceCanvas: HTMLCanvasElement | OffscreenCanvas
  textCropSurfaceCanvas: HTMLCanvasElement | OffscreenCanvas
  compositeTexture: WebGLTexture
  imageCache: Map<string, CachedTextureEntry>
  textCache: Map<string, CachedTextureEntry>
  resourceBudget: {
    getTextureBytes(): number
  } & Parameters<typeof pruneTextCache>[3]
  tileCacheCapability: ReturnType<typeof createWebGLTileCacheCapability>
  tileQueueCapability: ReturnType<typeof createWebGLTileQueueCapability> | null
  snapshotCapability: ReturnType<typeof createWebGLSnapshotCapability>
  overlaySurface: { canvas: HTMLCanvasElement | OffscreenCanvas } | null
  overlayTexture: WebGLTexture | null
  baseSceneRenderMode: 'vector-live' | 'tile-cache' | 'progressive-refresh'
  tileCacheBaseSceneOnly: boolean
  startAt: number
  resolveSharedDiagnostics: (params: WebGLSharedDiagnosticsParams) => Record<string, unknown>
  resolveInitialRenderPhase: () => string | undefined
  resolveInitialRenderProgress: () => number | undefined
  dirtyRegionCount: number
  dirtyTileCount: number
  state: WebGLPacketPathMutableState
}

/**
 * Executes packet-plan path including packet submission, zero-draw fallback, and final stats assembly.
 * @param args Packet-path dependencies and mutable state references.
 * @returns Final packet-path render stats.
 */
export async function renderWebGLPacketPath(args: WebGLPacketPathArgs): Promise<EngineRenderStats> {
  const planBuildStart = performance.now()
  const plan = prepareEngineRenderPlan(args.effectiveFrame)
  if (args.interactionRenderLane || !args.modelCompleteComposite) {
    args.state.l1CompositeMissCount += 1
    if (args.state.cacheFallbackReason === ENGINE_RENDER_FALLBACK_REASON.NONE) {
      args.state.cacheFallbackReason = args.interactionRenderLane
        ? ENGINE_RENDER_FALLBACK_REASON.L1_BYPASS_INTERACTIVE
        : ENGINE_RENDER_FALLBACK_REASON.L1_DISABLED
    }
  }

  const instanceView = prepareEngineRenderInstanceView(args.effectiveFrame, plan)
  const packetPlan = compileEngineWebGLPacketPlan(plan, instanceView)
  pruneTextCache(args.context, args.textCache, packetPlan.packets, args.resourceBudget)
  args.state.webglPlanBuildMs += performance.now() - planBuildStart

  const frameTextureEstimate =
    args.resourceBudget.getTextureBytes() +
    countPendingImageTextureEstimate(packetPlan.packets, args.imageCache)

  const budgetState = args.resourceBudget.recordFrameUsage({
    bufferBytes: packetPlan.uploadBytesEstimate,
    textureBytes: frameTextureEstimate,
  })

  if (budgetState.overTextureBudget && budgetState.textureOverflowBytes > 0) {
    const evictedTextureIds = args.resourceBudget.evictLeastRecentlyUsedTextures(
      budgetState.textureOverflowBytes,
    )
    disposeEvictedTextures(args.context, args.imageCache, args.textCache, evictedTextureIds)
  }

  args.context.viewport(
    0,
    0,
    args.canvasPixelWidth,
    args.canvasPixelHeight,
  )
  args.context.enable(args.context.BLEND)
  args.context.blendFunc(args.context.ONE, args.context.ONE_MINUS_SRC_ALPHA)

  const [clearR, clearG, clearB, clearA] = args.clearColor
  args.context.clearColor(clearR, clearG, clearB, clearA)
  args.context.clear(args.context.COLOR_BUFFER_BIT)

  const needsModelTextComposite =
    !args.interactionRenderLane && packetPlan.richTextPacketCount > 0
  if (needsModelTextComposite) {
    try {
      const modelTextRenderStart = performance.now()
      await args.modelRenderer.render(args.effectiveFrame)
      args.state.webglModelRenderMs += performance.now() - modelTextRenderStart
    } catch {
      // Keep packet path running when model text composite fallback fails.
    }
  }

  const frameLodState = args.lodCapability.read({
    frame: args.effectiveFrame,
    tileCacheEnabled: args.tileCacheEnabled,
    visibleElementCount: args.visibleElementCountForLod,
  })
  const packetSubmission = submitWebGLPacketSequence({
    context: args.context,
    pipeline: args.pipeline,
    effectiveFrame: args.effectiveFrame,
    drawSubmitBudgetMs: args.frameBudget.drawSubmitBudgetMs,
    imageTextureUploadMaxCount: args.frameBudget.imageTextureUploadMaxCount,
    textureUploadBudgetBytes: args.frameBudget.textureUploadBudgetBytes,
    textureUploadTotalBudgetBytes: args.frameBudget.textureUploadTotalBudgetBytes,
    textTextureUploadMaxCount: args.frameBudget.textTextureUploadMaxCount,
    highZoomTextSlaScale: args.highZoomTextSlaScale,
    interactionRenderLane: args.interactionRenderLane,
    activeLayerMaskEnabled: args.activeLayerMaskEnabled,
    activeLayerNodeIdSet: args.activeLayerNodeIdSet,
    frameLodEnabled: frameLodState.frameLodEnabled,
    useTextPlaceholderMode: frameLodState.useTextPlaceholderMode,
    packets: packetPlan.packets,
    imageCache: args.imageCache,
    textCache: args.textCache,
    resourceBudget: args.resourceBudget,
    modelSurfaceCanvas: args.modelSurfaceCanvas,
    textCropSurfaceCanvas: args.textCropSurfaceCanvas,
    textureBytesPerPixel: TEXTURE_BYTES_PER_PIXEL_RGBA,
    cacheFallbackReason: args.state.cacheFallbackReason,
  })

  let drawCount = packetSubmission.drawCount
  args.state.drawSubmitBudgetExceeded = packetSubmission.drawSubmitBudgetExceeded
  args.state.textureUploadBudgetExceeded = packetSubmission.textureUploadBudgetExceeded
  args.state.highZoomTextSlaChecked = packetSubmission.highZoomTextSlaChecked
  args.state.highZoomTextSlaViolationCount = packetSubmission.highZoomTextSlaViolationCount
  args.state.cacheFallbackReason = packetSubmission.cacheFallbackReason
  args.state.webglTextureUploadMs += packetSubmission.textureUploadMs
  args.state.webglDrawSubmitMs += packetSubmission.drawSubmitMs

  if (drawCount === 0 && args.effectiveFrame.scene.nodes.length > 0) {
    args.state.cacheFallbackReason = args.state.cacheFallbackReason === ENGINE_RENDER_FALLBACK_REASON.NONE
      ? ENGINE_RENDER_FALLBACK_REASON.L3_EMPTY_FRAME_MODEL_FALLBACK
      : args.state.cacheFallbackReason
    const zeroDrawFallback = await applyWebGLZeroDrawModelFallback({
      context: args.context,
      pipeline: args.pipeline,
      compositeTexture: args.compositeTexture,
      modelSurfaceCanvas: args.modelSurfaceCanvas,
      modelRenderer: args.modelRenderer,
      effectiveFrame: args.effectiveFrame,
    })
    args.state.webglModelRenderMs += zeroDrawFallback.modelRenderMs
    drawCount = zeroDrawFallback.drawCount
  }

  const tileStats = args.tileCacheCapability.read({kind: 'stats'})
  const snapshotState = args.snapshotCapability.snapshot()
  const shouldSkipPacketSnapshotCapture =
    args.effectiveFrame.scene.nodes.length > 0 &&
    plan.stats.visibleCount === 0 &&
    (args.effectiveFrame.context.overlayNodes?.length ?? 0) > 0
  const shouldCaptureSnapshot =
    !shouldSkipPacketSnapshotCapture &&
    (!snapshotState.snapshot ||
      (!args.interactionRenderLane && snapshotState.snapshot.revision !== args.effectiveFrame.scene.revision)
    )
  if (shouldCaptureSnapshot) {
    const snapshotCaptureStart = performance.now()
    args.snapshotCapability.create({
      frame: args.effectiveFrame,
      visibleCount: plan.stats.visibleCount,
      culledCount: plan.stats.culledCount,
    })
    args.state.webglSnapshotCaptureMs += performance.now() - snapshotCaptureStart
  }

  const overlayResult = drawWebGLOverlayPass({
    context: args.context,
    pipeline: args.pipeline,
    frame: args.effectiveFrame,
    overlaySurface: args.overlaySurface,
    overlayTexture: args.overlayTexture,
  })
  drawCount += overlayResult.drawCount
  args.state.webglTextureUploadMs += overlayResult.textureUploadMs
  args.state.overlayBudgetExceeded = args.state.overlayBudgetExceeded || overlayResult.budgetExceeded

  return {
    drawCount,
    engineFrameQuality: args.effectiveFrame.context.quality,
    baseSceneRenderMode: args.baseSceneRenderMode,
    tileCacheBaseSceneOnly: args.tileCacheBaseSceneOnly,
    visibleCount: plan.stats.visibleCount,
    culledCount: plan.stats.culledCount,
    groupCollapseCount: plan.stats.collapsedGroupCount,
    groupCollapseCulledCount: plan.stats.collapsedDescendantCulledCount,
    geometryCacheHitCount: plan.stats.geometryCacheHitCount,
    geometryCacheMissCount: plan.stats.geometryCacheMissCount,
    geometryCacheHitRate: plan.stats.geometryCacheHitRate,
    cacheHits: 0,
    cacheMisses: 0,
    frameReuseHits: 0,
    frameReuseMisses: 0,
    webglRenderPath: 'packet',
    webglCompositeUploadBytes: 0,
    webglInteractiveTextFallbackCount: packetSubmission.interactiveTextFallbackCount,
    webglImageTextureUploadCount: packetSubmission.imageTextureUploadCount,
    webglImageTextureUploadBytes: packetSubmission.imageTextureUploadBytes,
    webglImageDownsampledUploadCount: packetSubmission.imageDownsampledUploadCount,
    webglImageDownsampledUploadBytesSaved: packetSubmission.imageDownsampledUploadBytesSaved,
    webglDeferredImageTextureCount: packetSubmission.deferredImageTextureCount,
    webglTextTextureUploadCount: packetSubmission.textTextureUploadCount,
    webglTextTextureUploadBytes: packetSubmission.textTextureUploadBytes,
    webglTextCacheHitCount: packetSubmission.textCacheHitCount,
    webglFrameReuseEdgeRedrawCount: 0,
    webglPrecomputedTextCacheKeyCount: packetPlan.precomputedTextCacheKeyCount,
    webglFallbackTextCacheKeyCount: packetPlan.fallbackTextCacheKeyCount,
    frameMs: performance.now() - args.startAt,
    tileCacheSize: tileStats?.tileCount,
    tileDirtyCount: tileStats?.dirtyCount,
    tileCacheTotalBytes: tileStats?.totalTextureBytes,
    tileUploadCount: 0,
    tileRenderCount: 0,
    visibleTileCount: 0,
    initialRenderPhase: args.resolveInitialRenderPhase(),
    initialRenderProgress: args.resolveInitialRenderProgress(),
    dirtyRegionCount: args.dirtyRegionCount,
    dirtyTileCount: args.dirtyTileCount,
    incrementalUpdateCount: args.dirtyTileCount > 0 ? 1 : 0,
    ...args.resolveSharedDiagnostics({
      predictorPreloadRing: 0,
      predictorOverscanCssPx: 0,
      predictivePreloadEnqueueCount: 0,
      predictivePreloadProcessedCount: 0,
      predictivePreloadPrunedCount: 0,
      highZoomTextSlaChecked: args.state.highZoomTextSlaChecked,
      highZoomTextSlaViolationCount: args.state.highZoomTextSlaViolationCount,
      deferredTextTextureCount: packetSubmission.deferredTextTextureCount,
      tileSchedulerPendingCount: args.tileQueueCapability?.read().pendingCount ?? 0,
      gpuTextureBytes: (tileStats?.totalTextureBytes ?? 0) + args.resourceBudget.getTextureBytes(),
      imageTextureBytes: resolveCachedTextureBytes(args.imageCache),
      frameMs: performance.now() - args.startAt,
    }),
  }
}
