import type { EngineFrameBudget } from '../types/index.ts'
import type { EngineRenderFallbackReason } from '../fallbackTaxonomy/index.ts'

/**
 * Cache-stage counters and selected fallback reason for one render frame.
 */
interface WebGLCacheStageDiagnostics {
  /** L0 snapshot preview hit count for this frame. */
  l0PreviewHitCount: number
  /** L0 snapshot preview miss count for this frame. */
  l0PreviewMissCount: number
  /** L1 model-complete path hit count for this frame. */
  l1CompositeHitCount: number
  /** L1 model-complete path miss count for this frame. */
  l1CompositeMissCount: number
  /** L2 tile cache hit count for this frame. */
  l2TileHitCount: number
  /** L2 tile cache miss count for this frame. */
  l2TileMissCount: number
  /** Most specific fallback reason selected by current frame path. */
  cacheFallbackReason: EngineRenderFallbackReason
}

/**
 * Pipeline timing slices measured across one frame.
 */
interface WebGLTimingDiagnostics {
  /** Snapshot reuse/reprojection execution time in milliseconds. */
  webglPreviewReuseMs: number
  /** Snapshot execution mode selected by preview reuse capability. */
  webglPreviewExecutionMode: 'affine-snapshot' | 'temporal-reprojection-required'
  /** Plan and packet build time in milliseconds. */
  webglPlanBuildMs: number
  /** Texture upload time in milliseconds. */
  webglTextureUploadMs: number
  /** Packet/tile/composite draw submit time in milliseconds. */
  webglDrawSubmitMs: number
  /** Snapshot capture time in milliseconds. */
  webglSnapshotCaptureMs: number
  /** Canvas2D model render fallback/composite time in milliseconds. */
  webglModelRenderMs: number
}

/**
 * Budget snapshot and overrun state for one frame.
 */
interface WebGLBudgetDiagnostics {
  /** Runtime pressure bucket attached to frame budget broker state. */
  frameBudgetPressure: 'low' | 'medium' | 'high'
  /** Effective normalized frame budget used by this frame. */
  frameBudget: EngineFrameBudget
  /** Whether draw-submit budget exceeded during packet/tile/composite stage. */
  drawSubmitBudgetExceeded: boolean
  /** Whether texture-upload budget exceeded during this frame. */
  textureUploadBudgetExceeded: boolean
  /** Whether overlay pass budget exceeded during this frame. */
  overlayBudgetExceeded: boolean
}

/**
 * Predictor payload and preloading counters attached to diagnostics.
 */
interface WebGLPredictorDiagnostics {
  /** Predictor state snapshot from frame context. */
  predictorState?: {
    /** Predicted horizontal pan direction. */
    directionX?: number
    /** Predicted vertical pan direction. */
    directionY?: number
    /** Predicted pan speed in pixels per second. */
    speedPxPerSec?: number
    /** Predictor confidence in range [0, 1]. */
    confidence?: number
  }
  /** Ring size used for predictive tile preload this frame. */
  predictorPreloadRing: number
  /** Overscan in CSS pixels used for predictive preload. */
  predictorOverscanCssPx: number
  /** Number of predictive enqueue operations requested. */
  predictivePreloadEnqueueCount: number
  /** Number of predictive preload operations processed. */
  predictivePreloadProcessedCount: number
  /** Number of predictive preload candidates pruned. */
  predictivePreloadPrunedCount: number
}

/**
 * High-zoom text SLA and deferred text texture diagnostics.
 */
interface WebGLTextSlaDiagnostics {
  /** Whether high-zoom text SLA check executed in this frame. */
  highZoomTextSlaChecked: boolean
  /** Zoom threshold used for high-zoom text SLA checks. */
  highZoomTextSlaScale: number
  /** Number of SLA violations observed in this frame. */
  highZoomTextSlaViolationCount: number
  /** Number of deferred text texture uploads in this frame. */
  deferredTextTextureCount: number
}

/**
 * Queue/scheduler and texture usage diagnostics.
 */
interface WebGLRuntimeResourceDiagnostics {
  /** Pending tile scheduler task count after render path completion. */
  tileSchedulerPendingCount: number
  /** Number of pan predictive schedule requests issued this frame. */
  panScheduleRequestCount: number
  /** Number of synchronous tile rebuilds executed this frame. */
  tileSynchronousRebuildCount: number
  /** Total GPU texture bytes tracked at frame end. */
  gpuTextureBytes: number
  /** Image texture cache bytes tracked at frame end. */
  imageTextureBytes: number
  /** End-to-end frame time in milliseconds. */
  frameMs: number
}

/**
 * Input contract for assembling shared WebGL diagnostics fields.
 */
interface WebGLSharedDiagnosticsInput {
  /** Cache-stage counters and selected fallback reason. */
  cacheStage: WebGLCacheStageDiagnostics
  /** Timing slices for the current frame. */
  timing: WebGLTimingDiagnostics
  /** Frame budget values and overrun flags. */
  budget: WebGLBudgetDiagnostics
  /** Predictor state and predictive-preload counters. */
  predictor: WebGLPredictorDiagnostics
  /** High-zoom text SLA and text deferral metrics. */
  textSla: WebGLTextSlaDiagnostics
  /** Runtime queue/resource counters and frame duration. */
  runtimeResources: WebGLRuntimeResourceDiagnostics
}

/**
 * Builds the repeated WebGL diagnostics payload shared by all render return paths.
 * @param input Aggregated diagnostics inputs from one render frame.
 * @returns Flat diagnostics fields consumed by renderer stats output.
 */
export function resolveWebGLSharedDiagnostics(input: WebGLSharedDiagnosticsInput) {
  return {
    l0PreviewHitCount: input.cacheStage.l0PreviewHitCount,
    l0PreviewMissCount: input.cacheStage.l0PreviewMissCount,
    l1CompositeHitCount: input.cacheStage.l1CompositeHitCount,
    l1CompositeMissCount: input.cacheStage.l1CompositeMissCount,
    l2TileHitCount: input.cacheStage.l2TileHitCount,
    l2TileMissCount: input.cacheStage.l2TileMissCount,
    cacheFallbackReason: input.cacheStage.cacheFallbackReason,
    webglPreviewReuseMs: input.timing.webglPreviewReuseMs,
    webglPreviewExecutionMode: input.timing.webglPreviewExecutionMode,
    webglPlanBuildMs: input.timing.webglPlanBuildMs,
    webglTextureUploadMs: input.timing.webglTextureUploadMs,
    webglDrawSubmitMs: input.timing.webglDrawSubmitMs,
    webglSnapshotCaptureMs: input.timing.webglSnapshotCaptureMs,
    webglModelRenderMs: input.timing.webglModelRenderMs,
    webglBudgetPressure: input.budget.frameBudgetPressure,
    webglDrawSubmitBudgetMs: input.budget.frameBudget.drawSubmitBudgetMs,
    webglTextureUploadBudgetBytes: input.budget.frameBudget.textureUploadBudgetBytes,
    webglTextureUploadTotalBudgetBytes: input.budget.frameBudget.textureUploadTotalBudgetBytes,
    webglImageTextureUploadBudgetCount: input.budget.frameBudget.imageTextureUploadMaxCount,
    webglTextTextureUploadBudgetCount: input.budget.frameBudget.textTextureUploadMaxCount,
    webglTilePreloadBudgetMs: input.budget.frameBudget.tilePreloadBudgetMs,
    webglTilePreloadBudgetUploads: input.budget.frameBudget.tilePreloadMaxUploads,
    webglOverlayPassBudgetMs: input.budget.frameBudget.overlayPassBudgetMs,
    webglDrawSubmitBudgetExceeded: input.budget.drawSubmitBudgetExceeded,
    webglTextureUploadBudgetExceeded: input.budget.textureUploadBudgetExceeded,
    webglOverlayBudgetExceeded: input.budget.overlayBudgetExceeded,
    webglPredictorDirectionX: input.predictor.predictorState?.directionX,
    webglPredictorDirectionY: input.predictor.predictorState?.directionY,
    webglPredictorSpeedPxPerSec: input.predictor.predictorState?.speedPxPerSec,
    webglPredictorConfidence: input.predictor.predictorState?.confidence,
    webglPredictorPreloadRing: input.predictor.predictorPreloadRing,
    webglPredictorOverscanCssPx: input.predictor.predictorOverscanCssPx,
    webglPredictivePreloadEnqueueCount: input.predictor.predictivePreloadEnqueueCount,
    webglPredictivePreloadProcessedCount: input.predictor.predictivePreloadProcessedCount,
    webglPredictivePreloadPrunedCount: input.predictor.predictivePreloadPrunedCount,
    webglHighZoomTextSlaChecked: input.textSla.highZoomTextSlaChecked,
    webglHighZoomTextSlaScale: input.textSla.highZoomTextSlaScale,
    webglHighZoomTextSlaViolationCount: input.textSla.highZoomTextSlaViolationCount,
    webglDeferredTextTextureCount: input.textSla.deferredTextTextureCount,
    tileSchedulerPendingCount: input.runtimeResources.tileSchedulerPendingCount,
    panScheduleRequestCount: input.runtimeResources.panScheduleRequestCount,
    tileSynchronousRebuildCount: input.runtimeResources.tileSynchronousRebuildCount,
    gpuTextureBytes: input.runtimeResources.gpuTextureBytes,
    imageTextureBytes: input.runtimeResources.imageTextureBytes,
    frameMs: input.runtimeResources.frameMs,
  }
}

/**
 * Builds shared diagnostics from mutable renderer frame state and branch-specific counters.
 * @param state Mutable frame-level counters/timings collected in renderer orchestration.
 * @param params Branch-specific predictor/SLA/resource counters for current return path.
 * @returns Flat diagnostics fields consumed by renderer stats output.
 */
export function resolveWebGLSharedDiagnosticsFromState(
  state: {
    l0PreviewHitCount: number
    l0PreviewMissCount: number
    l1CompositeHitCount: number
    l1CompositeMissCount: number
    l2TileHitCount: number
    l2TileMissCount: number
    cacheFallbackReason: EngineRenderFallbackReason
    webglPreviewReuseMs: number
    webglPreviewExecutionMode: 'affine-snapshot' | 'temporal-reprojection-required'
    webglPlanBuildMs: number
    webglTextureUploadMs: number
    webglDrawSubmitMs: number
    webglSnapshotCaptureMs: number
    webglModelRenderMs: number
    frameBudgetPressure: 'low' | 'medium' | 'high'
    frameBudget: EngineFrameBudget
    drawSubmitBudgetExceeded: boolean
    textureUploadBudgetExceeded: boolean
    overlayBudgetExceeded: boolean
    predictorState?: {
      directionX?: number
      directionY?: number
      speedPxPerSec?: number
      confidence?: number
    }
    highZoomTextSlaScale: number
    panScheduleRequestCount: number
    tileSynchronousRebuildCount: number
  },
  params: {
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
  },
) {
  return resolveWebGLSharedDiagnostics({
    cacheStage: {
      l0PreviewHitCount: state.l0PreviewHitCount,
      l0PreviewMissCount: state.l0PreviewMissCount,
      l1CompositeHitCount: state.l1CompositeHitCount,
      l1CompositeMissCount: state.l1CompositeMissCount,
      l2TileHitCount: state.l2TileHitCount,
      l2TileMissCount: state.l2TileMissCount,
      cacheFallbackReason: state.cacheFallbackReason,
    },
    timing: {
      webglPreviewReuseMs: state.webglPreviewReuseMs,
      webglPreviewExecutionMode: state.webglPreviewExecutionMode,
      webglPlanBuildMs: state.webglPlanBuildMs,
      webglTextureUploadMs: state.webglTextureUploadMs,
      webglDrawSubmitMs: state.webglDrawSubmitMs,
      webglSnapshotCaptureMs: state.webglSnapshotCaptureMs,
      webglModelRenderMs: state.webglModelRenderMs,
    },
    budget: {
      frameBudgetPressure: state.frameBudgetPressure,
      frameBudget: state.frameBudget,
      drawSubmitBudgetExceeded: state.drawSubmitBudgetExceeded,
      textureUploadBudgetExceeded: state.textureUploadBudgetExceeded,
      overlayBudgetExceeded: state.overlayBudgetExceeded,
    },
    predictor: {
      predictorState: state.predictorState,
      predictorPreloadRing: params.predictorPreloadRing,
      predictorOverscanCssPx: params.predictorOverscanCssPx,
      predictivePreloadEnqueueCount: params.predictivePreloadEnqueueCount,
      predictivePreloadProcessedCount: params.predictivePreloadProcessedCount,
      predictivePreloadPrunedCount: params.predictivePreloadPrunedCount,
    },
    textSla: {
      highZoomTextSlaChecked: params.highZoomTextSlaChecked,
      highZoomTextSlaScale: state.highZoomTextSlaScale,
      highZoomTextSlaViolationCount: params.highZoomTextSlaViolationCount,
      deferredTextTextureCount: params.deferredTextTextureCount,
    },
    runtimeResources: {
      tileSchedulerPendingCount: params.tileSchedulerPendingCount,
      panScheduleRequestCount: state.panScheduleRequestCount,
      tileSynchronousRebuildCount: state.tileSynchronousRebuildCount,
      gpuTextureBytes: params.gpuTextureBytes,
      imageTextureBytes: params.imageTextureBytes,
      frameMs: params.frameMs,
    },
  })
}
