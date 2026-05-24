import type { EngineRenderFrame, EngineRenderStats } from '../types/index.ts'
import {
  ENGINE_RENDER_FALLBACK_REASON,
  type EngineRenderFallbackReason,
} from '../fallbackTaxonomy/index.ts'
import { drawWebGLOverlayPass } from './webglOverlayPass.ts'
import { resolveCachedTextureBytes, type CachedTextureEntry } from './runtime/index.ts'
import { createWebGLSnapshotCapability, createWebGLTileQueueCapability } from './capabilities/index.ts'
import type { WebGLQuadPipeline } from './core/index.ts'

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
 * Mutable state bucket shared with preview-reuse path orchestration.
 */
interface WebGLPreviewReuseMutableState {
  l0PreviewHitCount: number
  l0PreviewMissCount: number
  cacheFallbackReason: EngineRenderFallbackReason
  panScheduleRequestCount: number
  webglPreviewExecutionMode: 'affine-snapshot' | 'temporal-reprojection-required'
  webglPreviewReuseMs: number
  webglTextureUploadMs: number
  overlayBudgetExceeded: boolean
}

/**
 * Input contract for preview-reuse path orchestration.
 */
interface WebGLPreviewReuseArgs {
  effectiveFrame: EngineRenderFrame
  context: WebGLRenderingContext
  pipeline: WebGLQuadPipeline
  clearColor: readonly [number, number, number, number]
  baseSceneRenderMode: 'vector-live' | 'tile-cache' | 'progressive-refresh'
  tileCacheBaseSceneOnly: boolean
  snapshotCapability: ReturnType<typeof createWebGLSnapshotCapability>
  tileQueueCapability: ReturnType<typeof createWebGLTileQueueCapability> | null
  overlaySurface: { canvas: HTMLCanvasElement | OffscreenCanvas } | null
  overlayTexture: WebGLTexture | null
  shouldBypassSnapshotReuse: boolean
  imageCache: Map<string, CachedTextureEntry>
  resourceBudget: {
    getTextureBytes(): number
  }
  resolveSharedDiagnostics: (params: WebGLSharedDiagnosticsParams) => Record<string, unknown>
  startAt: number
  state: WebGLPreviewReuseMutableState
}

/**
 * Tries the L0 snapshot preview path and returns early stats when reuse is final.
 * @param args Preview-reuse dependencies and mutable frame state.
 * @returns Result object with early-return stats when preview path is fully handled.
 */
export function tryRenderWebGLPreviewReusePath(
  args: WebGLPreviewReuseArgs,
): { handled: boolean; result: EngineRenderStats | null } {
  const previewReuseStart = performance.now()
  const previewReuse = args.snapshotCapability.read(args.effectiveFrame, {
    clearColor: args.clearColor,
  })
  args.state.webglPreviewExecutionMode = previewReuse.executionMode
  args.state.webglPreviewReuseMs += performance.now() - previewReuseStart

  if (previewReuse.reused && !args.shouldBypassSnapshotReuse) {
    args.state.l0PreviewHitCount += 1
    const edgeRedrawCount = previewReuse.edgeRedrawRegions.length
    const snapshotState = args.snapshotCapability.snapshot()
    if (args.tileQueueCapability && snapshotState.snapshot) {
      args.state.panScheduleRequestCount = args.tileQueueCapability.create({
        panPredictive: {
          frame: args.effectiveFrame,
          snapshot: snapshotState.snapshot,
        },
      })
    }
    if (edgeRedrawCount > 0) {
      args.state.l0PreviewMissCount += 1
      args.state.cacheFallbackReason = ENGINE_RENDER_FALLBACK_REASON.L0_PREVIEW_MISS
      return {handled: false, result: null}
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
      handled: true,
      result: {
        drawCount: 1 + edgeRedrawCount + overlayResult.drawCount,
        engineFrameQuality: args.effectiveFrame.context.quality,
        baseSceneRenderMode: args.baseSceneRenderMode,
        tileCacheBaseSceneOnly: args.tileCacheBaseSceneOnly,
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
        frameMs: performance.now() - args.startAt,
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
          gpuTextureBytes: args.resourceBudget.getTextureBytes(),
          imageTextureBytes: resolveCachedTextureBytes(args.imageCache),
          frameMs: performance.now() - args.startAt,
        }),
      },
    }
  }

  args.state.l0PreviewMissCount += 1
  args.state.cacheFallbackReason = previewReuse.missReason ?? ENGINE_RENDER_FALLBACK_REASON.L0_PREVIEW_MISS
  return {handled: false, result: null}
}
