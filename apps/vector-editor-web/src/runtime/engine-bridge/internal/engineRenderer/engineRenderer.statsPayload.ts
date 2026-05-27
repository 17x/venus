import type {RuntimeEngine as Engine} from '../../engine.ts'
import {createEngineStatsHandler} from './createEngineStatsHandler/createEngineStatsHandler.ts'

type EngineStatsPayload = Parameters<ReturnType<typeof createEngineStatsHandler>>[0]

interface BackendFeatureCapabilityGateDiagnostics {
  webglFeatureCapabilityGateReason?:
    | 'none'
    | 'image-node-unsupported'
    | 'clip-node-unsupported'
    | 'text-style-unsupported'
    | 'shadow-style-unsupported'
    | 'gradient-style-unsupported'
  webgpuFeatureCapabilityGateReason?:
    | 'none'
    | 'image-node-unsupported'
    | 'clip-node-unsupported'
    | 'text-style-unsupported'
    | 'shadow-style-unsupported'
    | 'gradient-style-unsupported'
}

/**
 * Builds a normalized engine stats payload from one render result and backend diagnostics snapshot.
 * @param input Render outputs, backend diagnostics, and policy context needed by stats handler.
 */
export function createEngineStatsPayload(input: {
  renderResult: Awaited<ReturnType<Engine['render']>>
  backendDiagnostics: Record<string, unknown> | null | undefined
  backendResolved: string
  backendPresentCompleted: boolean
  backendFeatureGateDiagnostics: BackendFeatureCapabilityGateDiagnostics
  engineFrameQuality: EngineStatsPayload['engineFrameQuality']
  webglRenderPath: EngineStatsPayload['webglRenderPath']
  webgpuRenderPath: EngineStatsPayload['webgpuRenderPath']
}): EngineStatsPayload {
  const backendDiagnostics = input.backendDiagnostics

  return {
    drawCount: input.renderResult.drawCount,
    frameMs: input.renderResult.frameMs,
    visibleCount: input.renderResult.visibleCount,
    cacheHits: (backendDiagnostics?.cacheHits as number | undefined) ?? 0,
    cacheMisses: (backendDiagnostics?.cacheMisses as number | undefined) ?? 0,
    frameReuseHits: (backendDiagnostics?.frameReuseHits as number | undefined) ?? 0,
    frameReuseMisses: (backendDiagnostics?.frameReuseMisses as number | undefined) ?? 0,
    l0PreviewHitCount: (backendDiagnostics?.l0PreviewHitCount as number | undefined) ?? 0,
    l0PreviewMissCount: (backendDiagnostics?.l0PreviewMissCount as number | undefined) ?? 0,
    l1CompositeHitCount: (backendDiagnostics?.l1CompositeHitCount as number | undefined) ?? 0,
    l1CompositeMissCount: (backendDiagnostics?.l1CompositeMissCount as number | undefined) ?? 0,
    l2TileHitCount: (backendDiagnostics?.l2TileHitCount as number | undefined) ?? 0,
    l2TileMissCount: (backendDiagnostics?.l2TileMissCount as number | undefined) ?? 0,
    cacheFallbackReason:
      (backendDiagnostics?.cacheFallbackReason as EngineStatsPayload['cacheFallbackReason']) ??
      'none',
    tileCacheSize: (backendDiagnostics?.tileCacheSize as number | undefined) ?? 0,
    tileDirtyCount: (backendDiagnostics?.tileDirtyCount as number | undefined) ?? 0,
    tileCacheTotalBytes: (backendDiagnostics?.tileCacheTotalBytes as number | undefined) ?? 0,
    tileUploadCount: (backendDiagnostics?.tileUploadCount as number | undefined) ?? 0,
    tileRenderCount: (backendDiagnostics?.tileRenderCount as number | undefined) ?? 0,
    visibleTileCount: (backendDiagnostics?.visibleTileCount as number | undefined) ?? 0,
    tileSchedulerPendingCount: (backendDiagnostics?.tileSchedulerPendingCount as number | undefined) ?? 0,
    gpuTextureBytes: (backendDiagnostics?.gpuTextureBytes as number | undefined) ?? 0,
    imageTextureBytes: (backendDiagnostics?.imageTextureBytes as number | undefined) ?? 0,
    initialRenderPhase: 'complete',
    initialRenderProgress: 1,
    dirtyRegionCount: 0,
    dirtyTileCount: 0,
    incrementalUpdateCount: 0,
    engineFrameQuality: input.engineFrameQuality,
    webglRenderPath: input.webglRenderPath,
    webgpuRenderPath: input.webgpuRenderPath,
    webgpuNativeSubmissionAttemptedCount:
      (backendDiagnostics?.webgpuNativeSubmissionAttemptedCount as number | undefined) ??
      (input.backendResolved === 'webgpu' ? 1 : 0),
    webgpuNativeSubmissionSuccessCount:
      (backendDiagnostics?.webgpuNativeSubmissionSuccessCount as number | undefined) ??
      (input.backendResolved === 'webgpu' && input.backendPresentCompleted ? 1 : 0),
    webgpuNativeSubmissionFailureCount:
      (backendDiagnostics?.webgpuNativeSubmissionFailureCount as number | undefined) ??
      (input.backendResolved === 'webgpu' && !input.backendPresentCompleted ? 1 : 0),
    webgpuNativeSubmissionTotalCount:
      (backendDiagnostics?.webgpuNativeSubmissionTotalCount as number | undefined) ??
      (input.backendResolved === 'webgpu' && input.backendPresentCompleted ? 1 : 0),
    webgpuNativeSubmissionTotalFailureCount:
      (backendDiagnostics?.webgpuNativeSubmissionTotalFailureCount as number | undefined) ??
      (input.backendResolved === 'webgpu' && !input.backendPresentCompleted ? 1 : 0),
    webgpuNativeRectBatchEligibleCount:
      (backendDiagnostics?.webgpuNativeRectBatchEligibleCount as number | undefined) ??
      (input.backendResolved === 'webgpu' ? input.renderResult.visibleCount : 0),
    webgpuNativeRectBatchRejectedReason:
      (backendDiagnostics?.webgpuNativeRectBatchRejectedReason as EngineStatsPayload['webgpuNativeRectBatchRejectedReason']) ??
      (input.backendResolved === 'webgpu' && input.renderResult.visibleCount <= 0
        ? 'scene-empty'
        : 'none'),
    webglFeatureCapabilityGateReason:
      input.backendFeatureGateDiagnostics.webglFeatureCapabilityGateReason ?? 'none',
    webgpuFeatureCapabilityGateReason:
      input.backendFeatureGateDiagnostics.webgpuFeatureCapabilityGateReason ?? 'none',
    webglPreviewReuseMs: (backendDiagnostics?.webglPreviewReuseMs as number | undefined) ?? 0,
    webglPlanBuildMs: (backendDiagnostics?.webglPlanBuildMs as number | undefined) ?? 0,
    webglTextureUploadMs: (backendDiagnostics?.webglTextureUploadMs as number | undefined) ?? 0,
    webglDrawSubmitMs: (backendDiagnostics?.webglDrawSubmitMs as number | undefined) ?? 0,
    webglSnapshotCaptureMs: (backendDiagnostics?.webglSnapshotCaptureMs as number | undefined) ?? 0,
    webglModelRenderMs: (backendDiagnostics?.webglModelRenderMs as number | undefined) ?? 0,
    webglPreviewExecutionMode:
      (backendDiagnostics?.webglPreviewExecutionMode as EngineStatsPayload['webglPreviewExecutionMode']) ??
      'affine-snapshot',
    webglPreviewExecutionSource:
      (backendDiagnostics?.webglPreviewExecutionSource as EngineStatsPayload['webglPreviewExecutionSource']) ??
      'backend-native',
    webglBudgetPressure:
      (backendDiagnostics?.webglBudgetPressure as EngineStatsPayload['webglBudgetPressure']) ??
      'low',
    webglBudgetPressureReason:
      (backendDiagnostics?.webglBudgetPressureReason as string | undefined) ??
      'within-low-thresholds',
    webglBudgetPressureSource:
      (backendDiagnostics?.webglBudgetPressureSource as EngineStatsPayload['webglBudgetPressureSource']) ??
      'backend-native',
    webglDrawSubmitBudgetMs:
      (backendDiagnostics?.webglDrawSubmitBudgetMs as number | undefined) ?? 0,
    webglTextureUploadBudgetBytes:
      (backendDiagnostics?.webglTextureUploadBudgetBytes as number | undefined) ?? 0,
    webglTextureUploadTotalBudgetBytes:
      (backendDiagnostics?.webglTextureUploadTotalBudgetBytes as number | undefined) ?? 0,
    webglImageTextureUploadBudgetCount:
      (backendDiagnostics?.webglImageTextureUploadBudgetCount as number | undefined) ?? 0,
    webglTextTextureUploadBudgetCount:
      (backendDiagnostics?.webglTextTextureUploadBudgetCount as number | undefined) ?? 0,
    webglTilePreloadBudgetMs:
      (backendDiagnostics?.webglTilePreloadBudgetMs as number | undefined) ?? 0,
    webglTilePreloadBudgetUploads:
      (backendDiagnostics?.webglTilePreloadBudgetUploads as number | undefined) ?? 0,
    webglOverlayPassBudgetMs:
      (backendDiagnostics?.webglOverlayPassBudgetMs as number | undefined) ?? 0,
    webglDrawSubmitBudgetExceeded:
      (backendDiagnostics?.webglDrawSubmitBudgetExceeded as boolean | undefined) ?? false,
    webglTextureUploadBudgetExceeded:
      (backendDiagnostics?.webglTextureUploadBudgetExceeded as boolean | undefined) ?? false,
    webglOverlayBudgetExceeded:
      (backendDiagnostics?.webglOverlayBudgetExceeded as boolean | undefined) ?? false,
    webglPredictorDirectionX:
      (backendDiagnostics?.webglPredictorDirectionX as number | undefined) ?? 0,
    webglPredictorDirectionY:
      (backendDiagnostics?.webglPredictorDirectionY as number | undefined) ?? 0,
    webglPredictorSpeedPxPerSec:
      (backendDiagnostics?.webglPredictorSpeedPxPerSec as number | undefined) ?? 0,
    webglPredictorConfidence:
      (backendDiagnostics?.webglPredictorConfidence as number | undefined) ?? 0,
    webglPredictorPreloadRing:
      (backendDiagnostics?.webglPredictorPreloadRing as number | undefined) ?? 0,
    webglPredictorOverscanCssPx:
      (backendDiagnostics?.webglPredictorOverscanCssPx as number | undefined) ?? 0,
    webglPredictivePreloadEnqueueCount:
      (backendDiagnostics?.webglPredictivePreloadEnqueueCount as number | undefined) ?? 0,
    webglPredictivePreloadProcessedCount:
      (backendDiagnostics?.webglPredictivePreloadProcessedCount as number | undefined) ?? 0,
    webglPredictivePreloadPrunedCount:
      (backendDiagnostics?.webglPredictivePreloadPrunedCount as number | undefined) ?? 0,
    webglHighZoomTextSlaChecked:
      (backendDiagnostics?.webglHighZoomTextSlaChecked as boolean | undefined) ?? false,
    webglHighZoomTextSlaScale:
      (backendDiagnostics?.webglHighZoomTextSlaScale as number | undefined) ?? 0,
    webglHighZoomTextSlaViolationCount:
      (backendDiagnostics?.webglHighZoomTextSlaViolationCount as number | undefined) ?? 0,
    webglDeferredTextTextureCount:
      (backendDiagnostics?.webglDeferredTextTextureCount as number | undefined) ?? 0,
    panScheduleRequestCount:
      (backendDiagnostics?.panScheduleRequestCount as number | undefined) ?? 0,
    tileSynchronousRebuildCount:
      (backendDiagnostics?.tileSynchronousRebuildCount as number | undefined) ?? 0,
  }
}
