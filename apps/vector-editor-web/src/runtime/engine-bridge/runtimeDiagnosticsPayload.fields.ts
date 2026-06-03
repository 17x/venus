import type {RuntimeRenderDiagnostics} from '../events/index/index.ts'
import type {BuildRuntimeDiagnosticsPayloadInput} from './runtimeDiagnosticsPayload.ts'

/**
 * Builds the flat diagnostics payload body from runtime render samples.
 * @param input Runtime diagnostics builder input from engine/render loop.
 */
export function buildRuntimeDiagnosticsPayloadFields(
  input: BuildRuntimeDiagnosticsPayloadInput,
): RuntimeRenderDiagnostics {
  return {
    frameCount: input.frameCount,
    diagnosticsUpdatedAtMs: input.diagnosticsUpdatedAtMs,
    frameStageId: input.renderRequestStats.frameStageId,
    frameStageSequence: input.renderRequestStats.frameStageSequence,
    frameStageIssuedAtMs: input.renderRequestStats.frameStageIssuedAtMs,
    frameStageSchedulerMode: input.renderRequestStats.frameStageSchedulerMode,
    frameStageSceneApplyMode: input.renderRequestStats.frameStageSceneApplyMode,
    drawCount: input.renderStats.drawCount,
    drawMs: input.renderStats.frameMs,
    // Keep stage timings explicit so debug panel can pinpoint hot sections quickly.
    scenePrepareMs: input.runtimeStageTimingMs.scenePrepareMs,
    sceneApplyMs: input.runtimeStageTimingMs.sceneApplyMs,
    viewportCommitMs: input.runtimeStageTimingMs.viewportCommitMs,
    viewportResizeMs: input.runtimeStageTimingMs.viewportResizeMs,
    viewportStateUpdateMs: input.runtimeStageTimingMs.viewportStateUpdateMs,
    diagnosticsPublishMs: input.runtimeStageTimingMs.diagnosticsPublishMs,
    plannerSampleMs: input.runtimeStageTimingMs.plannerSampleMs,
    schedulerQueueWaitMs: input.runtimeStageTimingMs.schedulerQueueWaitMs,
    schedulerThrottleDelayMs: input.runtimeStageTimingMs.schedulerThrottleDelayMs,
    presentRafDelayMs: input.runtimeStageTimingMs.presentRafDelayMs,
    engineFrameQuality: input.webglStats.engineFrameQuality ?? 'full',
    fpsInstantaneous: 0,
    fpsEstimate: 0,
    fpsPeak: 0,
    fpsEstimatePeak: 0,
    fpsReached60: false,
    fpsReached120: false,
    visibleShapeCount: input.renderStats.visibleCount,
    groupCollapseCount: input.groupCollapseStats.groupCollapseCount ?? 0,
    groupCollapseCulledCount: input.groupCollapseStats.groupCollapseCulledCount ?? 0,
    framePlanVersion: input.planDiagnostics.framePlanVersion,
    framePlanCandidateCount: input.planDiagnostics.framePlanCandidateCount,
    framePlanSceneNodeCount: input.planDiagnostics.framePlanSceneNodeCount,
    framePlanVisibleRatio: input.planDiagnostics.framePlanVisibleRatio,
    framePlanShortlistActive: input.planDiagnostics.framePlanShortlistActive,
    framePlanShortlistCandidateRatio: input.planDiagnostics.framePlanShortlistCandidateRatio,
    framePlanShortlistAppliedCandidateCount:
      input.planDiagnostics.framePlanShortlistAppliedCandidateCount,
    framePlanShortlistPendingState:
      input.planDiagnostics.framePlanShortlistPendingState,
    framePlanShortlistPendingFrameCount:
      input.planDiagnostics.framePlanShortlistPendingFrameCount,
    framePlanShortlistToggleCount:
      input.planDiagnostics.framePlanShortlistToggleCount,
    framePlanShortlistDebounceBlockedToggleCount:
      input.planDiagnostics.framePlanShortlistDebounceBlockedToggleCount,
    framePlanShortlistEnterRatioThreshold:
      input.planDiagnostics.framePlanShortlistEnterRatioThreshold,
    framePlanShortlistLeaveRatioThreshold:
      input.planDiagnostics.framePlanShortlistLeaveRatioThreshold,
    framePlanShortlistStableFrameCount:
      input.planDiagnostics.framePlanShortlistStableFrameCount,
    hitPlanVersion: input.planDiagnostics.hitPlanVersion,
    hitPlanCandidateCount: input.planDiagnostics.hitPlanCandidateCount,
    hitPlanHitCount: input.planDiagnostics.hitPlanHitCount,
    hitPlanExactCheckCount: input.planDiagnostics.hitPlanExactCheckCount,
    renderPrepDirtyCandidateCount: input.renderPrepDiagnostics.renderPrepDirtyCandidateCount,
    renderPrepDirtyOffscreenCount: input.renderPrepDiagnostics.renderPrepDirtyOffscreenCount,
    offscreenSceneDirtyForceRenderFrameThreshold:
      input.offscreenSceneDirtyForceRenderFrameThreshold,
    dirtyBoundsSmallAreaThreshold: input.dirtyBoundsSmallAreaThreshold,
    dirtyBoundsMediumAreaThreshold: input.dirtyBoundsMediumAreaThreshold,
    offscreenSceneDirtySkipConsecutiveCount:
      input.renderPrepDiagnostics.offscreenSceneDirtySkipConsecutiveCount,
    offscreenSceneDirtySkipConsecutiveMaxCount:
      input.renderRequestStats.offscreenSceneDirtySkipConsecutiveMaxCount,
    offscreenSceneDirtyRiskWatchSkipRateThreshold:
      input.offscreenSceneDirtyRiskWatchSkipRateThreshold,
    offscreenSceneDirtyRiskHighSkipRateThreshold:
      input.offscreenSceneDirtyRiskHighSkipRateThreshold,
    offscreenSceneDirtyRiskHighForcedPerSecondThreshold:
      input.offscreenSceneDirtyRiskHighForcedPerSecondThreshold,
    sceneDirtyProlongedHighRiskSecondsThreshold:
      input.sceneDirtyProlongedHighRiskSecondsThreshold,
    sceneDirtyTransitionRateWatchThreshold:
      input.sceneDirtyTransitionRateWatchThreshold,
    sceneDirtyTrendWindowFrames: input.sceneDirtyTrendWindowFrames,
    offscreenSceneDirtyForcedSpikePerSecondThreshold:
      input.offscreenSceneDirtyForcedSpikePerSecondThreshold,
    offscreenSceneDirtySkipSpikePerSecondThreshold:
      input.offscreenSceneDirtySkipSpikePerSecondThreshold,
    sceneDirtyRiskScoreHighThreshold: input.sceneDirtyRiskScoreHighThreshold,
    sceneDirtyRiskScoreSkipWeight: input.sceneDirtyRiskScoreSkipWeight,
    sceneDirtyRiskScoreForcedWeight: input.sceneDirtyRiskScoreForcedWeight,
    sceneDirtyRiskScoreStreakWeight: input.sceneDirtyRiskScoreStreakWeight,
    sceneDirtyRiskScoreForcedRateScale: input.sceneDirtyRiskScoreForcedRateScale,
    dirtyBoundsMarkCount: input.renderPrepDiagnostics.dirtyBoundsMarkCount,
    dirtyBoundsMarkArea: input.renderPrepDiagnostics.dirtyBoundsMarkArea,
    dirtyBoundsMarkSmallAreaCount:
      input.renderRequestStats.dirtyBoundsMarkSmallAreaCount,
    dirtyBoundsMarkMediumAreaCount:
      input.renderRequestStats.dirtyBoundsMarkMediumAreaCount,
    dirtyBoundsMarkLargeAreaCount:
      input.renderRequestStats.dirtyBoundsMarkLargeAreaCount,
    cacheHitCount: input.renderStats.cacheHits,
    cacheMissCount: input.renderStats.cacheMisses,
    frameReuseHitCount: input.renderStats.frameReuseHits,
    frameReuseMissCount: input.renderStats.frameReuseMisses,
    cacheMode: input.renderStats.frameReuseHits > 0 ? 'frame' : 'none',
    webglRenderPath: input.webglStats.webglRenderPath ?? 'none',
    webgpuRenderPath: input.webglStats.webgpuRenderPath ?? 'hybrid-webgl',
    webgpuNativeSubmissionAttemptedCount:
      input.webglStats.webgpuNativeSubmissionAttemptedCount ?? 0,
    webgpuNativeSubmissionSuccessCount:
      input.webglStats.webgpuNativeSubmissionSuccessCount ?? 0,
    webgpuNativeSubmissionFailureCount:
      input.webglStats.webgpuNativeSubmissionFailureCount ?? 0,
    webgpuNativeSubmissionTotalCount:
      input.webglStats.webgpuNativeSubmissionTotalCount ?? 0,
    webgpuNativeSubmissionTotalFailureCount:
      input.webglStats.webgpuNativeSubmissionTotalFailureCount ?? 0,
    webgpuNativeRectBatchEligibleCount:
      input.webglStats.webgpuNativeRectBatchEligibleCount ?? 0,
    webgpuNativeRectBatchRejectedReason:
      input.webglStats.webgpuNativeRectBatchRejectedReason ?? 'none',
    webglFeatureCapabilityGateReason:
      input.webglStats.webglFeatureCapabilityGateReason ?? 'none',
    webgpuFeatureCapabilityGateReason:
      input.webglStats.webgpuFeatureCapabilityGateReason ?? 'none',
    webglInteractiveTextFallbackCount:
      input.webglStats.webglInteractiveTextFallbackCount ?? 0,
    webglImageTextureUploadCount:
      input.webglStats.webglImageTextureUploadCount ?? 0,
    webglImageTextureUploadBytes:
      input.webglStats.webglImageTextureUploadBytes ?? 0,
    webglImageDownsampledUploadCount:
      input.webglStats.webglImageDownsampledUploadCount ?? 0,
    webglImageDownsampledUploadBytesSaved:
      input.webglStats.webglImageDownsampledUploadBytesSaved ?? 0,
    webglDeferredImageTextureCount:
      input.webglStats.webglDeferredImageTextureCount ?? 0,
    webglTextTextureUploadCount:
      input.webglStats.webglTextTextureUploadCount ?? 0,
    webglTextTextureUploadBytes:
      input.webglStats.webglTextTextureUploadBytes ?? 0,
    webglTextCacheHitCount:
      input.webglStats.webglTextCacheHitCount ?? 0,
    webglPrecomputedTextCacheKeyCount:
      input.webglStats.webglPrecomputedTextCacheKeyCount ?? 0,
    webglFallbackTextCacheKeyCount:
      input.webglStats.webglFallbackTextCacheKeyCount ?? 0,
    webglFrameReuseEdgeRedrawCount:
      input.webglStats.webglFrameReuseEdgeRedrawCount ?? 0,
    webglCompositeUploadBytes:
      input.webglStats.webglCompositeUploadBytes ?? 0,
    canvas2dTrivialPathFastPathCount:
      input.webglStats.canvas2dTrivialPathFastPathCount ?? 0,
    canvas2dContourParseCount:
      input.webglStats.canvas2dContourParseCount ?? 0,
    canvas2dSingleLineTextFastPathCount:
      input.webglStats.canvas2dSingleLineTextFastPathCount ?? 0,
    canvas2dPrecomputedTextLineHeightCount:
      input.webglStats.canvas2dPrecomputedTextLineHeightCount ?? 0,
    l0PreviewHitCount:
      input.webglStats.l0PreviewHitCount ?? 0,
    l0PreviewMissCount:
      input.webglStats.l0PreviewMissCount ?? 0,
    l1CompositeHitCount:
      input.webglStats.l1CompositeHitCount ?? 0,
    l1CompositeMissCount:
      input.webglStats.l1CompositeMissCount ?? 0,
    l2TileHitCount:
      input.webglStats.l2TileHitCount ?? 0,
    l2TileMissCount:
      input.webglStats.l2TileMissCount ?? 0,
    webglPreviewReuseMs:
      input.webglStats.webglPreviewReuseMs ?? 0,
    webglPlanBuildMs:
      input.webglStats.webglPlanBuildMs ?? 0,
    webglTextureUploadMs:
      input.webglStats.webglTextureUploadMs ?? 0,
    webglDrawSubmitMs:
      input.webglStats.webglDrawSubmitMs ?? 0,
    webglSnapshotCaptureMs:
      input.webglStats.webglSnapshotCaptureMs ?? 0,
    webglModelRenderMs:
      input.webglStats.webglModelRenderMs ?? 0,
    webglPreviewExecutionMode:
      input.webglStats.webglPreviewExecutionMode ?? 'affine-snapshot',
    webglPreviewExecutionSource:
      input.webglStats.webglPreviewExecutionSource ?? 'backend-native',
    webglBudgetPressure:
      input.webglStats.webglBudgetPressure ?? 'low',
    webglBudgetPressureReason:
      input.webglStats.webglBudgetPressureReason ?? 'within-low-thresholds',
    webglBudgetPressureSource:
      input.webglStats.webglBudgetPressureSource ?? 'backend-native',
    webglDrawSubmitBudgetMs:
      input.webglStats.webglDrawSubmitBudgetMs ?? 0,
    webglTextureUploadBudgetBytes:
      input.webglStats.webglTextureUploadBudgetBytes ?? 0,
    webglTextureUploadTotalBudgetBytes:
      input.webglStats.webglTextureUploadTotalBudgetBytes ?? 0,
    webglImageTextureUploadBudgetCount:
      input.webglStats.webglImageTextureUploadBudgetCount ?? 0,
    webglTextTextureUploadBudgetCount:
      input.webglStats.webglTextTextureUploadBudgetCount ?? 0,
    webglTilePreloadBudgetMs:
      input.webglStats.webglTilePreloadBudgetMs ?? 0,
    webglTilePreloadBudgetUploads:
      input.webglStats.webglTilePreloadBudgetUploads ?? 0,
    webglOverlayPassBudgetMs:
      input.webglStats.webglOverlayPassBudgetMs ?? 0,
    webglDrawSubmitBudgetExceeded:
      input.webglStats.webglDrawSubmitBudgetExceeded ?? false,
    webglTextureUploadBudgetExceeded:
      input.webglStats.webglTextureUploadBudgetExceeded ?? false,
    webglOverlayBudgetExceeded:
      input.webglStats.webglOverlayBudgetExceeded ?? false,
    webglPredictorDirectionX:
      input.webglStats.webglPredictorDirectionX ?? 0,
    webglPredictorDirectionY:
      input.webglStats.webglPredictorDirectionY ?? 0,
    webglPredictorSpeedPxPerSec:
      input.webglStats.webglPredictorSpeedPxPerSec ?? 0,
    webglPredictorConfidence:
      input.webglStats.webglPredictorConfidence ?? 0,
    webglPredictorPreloadRing:
      input.webglStats.webglPredictorPreloadRing ?? 0,
    webglPredictorOverscanCssPx:
      input.webglStats.webglPredictorOverscanCssPx ?? 0,
    webglPredictivePreloadEnqueueCount:
      input.webglStats.webglPredictivePreloadEnqueueCount ?? 0,
    webglPredictivePreloadProcessedCount:
      input.webglStats.webglPredictivePreloadProcessedCount ?? 0,
    webglPredictivePreloadPrunedCount:
      input.webglStats.webglPredictivePreloadPrunedCount ?? 0,
    webglHighZoomTextSlaChecked:
      input.webglStats.webglHighZoomTextSlaChecked ?? false,
    webglHighZoomTextSlaScale:
      input.webglStats.webglHighZoomTextSlaScale ?? 0,
    webglHighZoomTextSlaViolationCount:
      input.webglStats.webglHighZoomTextSlaViolationCount ?? 0,
    webglDeferredTextTextureCount:
      input.webglStats.webglDeferredTextTextureCount ?? 0,
    panScheduleRequestCount:
      input.webglStats.panScheduleRequestCount ?? 0,
    tileSynchronousRebuildCount:
      input.webglStats.tileSynchronousRebuildCount ?? 0,
    cacheFallbackReason:
      input.webglStats.cacheFallbackReason ?? 'none',
    engineBackendRequested: input.engineCoreStats.backendRequested,
    engineBackendResolved: input.engineCoreStats.backendResolved,
    engineBackendFallbackReason: input.engineCoreStats.backendFallbackReason,
    engineRuntimeProfileId: input.engineCoreStats.runtimeProfileId,
    engineRuntimeCapabilityCount: input.engineCoreStats.runtimeCapabilityCount,
    engineFramePressureReason: input.engineCoreStats.framePressureReason,
    engineFramePressure: input.engineCoreStats.framePressure,
    engineFramePhase: input.engineCoreStats.framePhase,
    engineQosDegradationLevel: input.engineCoreStats.qosDegradationLevel,
    engineQosFallbackReason: input.engineCoreStats.qosFallbackReason,
    engineQosGuardTriggers: [...input.engineCoreStats.qosGuardTriggers],
    engineQosTrace: input.engineCoreStats.qosTrace,
    engineSceneAdapterReport: input.engineSceneAdapterReport,
    lastRenderRequestReason: input.renderRequestStats.lastReason,
    activeOverlayScenePlane: input.renderRequestStats.activeOverlayScenePlane,
    activeOverlayOverlayPlane: input.renderRequestStats.activeOverlayOverlayPlane,
    activeOverlayUsesActivePlane: input.renderRequestStats.activeOverlayUsesActivePlane,
    activeOverlayProtectedNodeCount:
      input.renderRequestStats.activeOverlayProtectedNodeCount,
    activeOverlayInteractionActiveNodeCount:
      input.renderRequestStats.activeOverlayInteractionActiveNodeCount,
    renderPhase: input.renderRequestStats.renderPhase,
    renderPhaseTransitionCount:
      input.renderRequestStats.renderPhaseTransitionCount,
    lastRenderPhaseTransition:
      input.renderRequestStats.lastRenderPhaseTransition,
    renderPolicyQuality: input.renderRequestStats.renderPolicyQuality,
    renderPolicyDpr: input.renderRequestStats.renderPolicyDpr,
    sideTargetDpr: input.renderRequestStats.sideTargetDpr,
    outputDpr: input.renderRequestStats.outputDpr,
    viewportInteractionType: input.renderRequestStats.viewportInteractionType,
    overlayMode: input.renderRequestStats.overlayMode,
    renderPolicyTransitionCount:
      input.renderRequestStats.renderPolicyTransitionCount,
    lastRenderPolicyTransition:
      input.renderRequestStats.lastRenderPolicyTransition,
    overlayDegraded: input.renderRequestStats.overlayDegraded,
    overlayGuideInputCount: input.renderRequestStats.overlayGuideInputCount,
    overlayGuideKeptCount: input.renderRequestStats.overlayGuideKeptCount,
    overlayGuideDroppedCount: input.renderRequestStats.overlayGuideDroppedCount,
    overlayGuideSelectionStrategy:
      input.renderRequestStats.overlayGuideSelectionStrategy,
    overlayPathEditWhitelistActive:
      input.renderRequestStats.overlayPathEditWhitelistActive,
    sceneDirtyRequestCount: input.renderRequestStats.sceneDirtyCount,
    deferredImageDrainRequestCount: input.renderRequestStats.deferredImageDrainCount,
    idleRedrawRequestCount: input.renderRequestStats.idleRedrawCount,
    interactiveRequestCount: input.renderRequestStats.interactiveCount,
    offscreenSceneDirtySkipRequestCount:
      input.renderRequestStats.offscreenSceneDirtySkipCount,
    forcedSceneDirtyRequestCount:
      input.renderRequestStats.forcedSceneDirtyRenderCount,
    cameraAnimationActive: input.renderStats.cameraAnimationActive ?? false,
    cameraAnimationCachePreviewOnly: input.renderStats.cameraAnimationCachePreviewOnly ?? false,
    cameraAnimationPreviewHitCount: input.renderStats.cameraAnimationPreviewHitCount ?? 0,
    cameraAnimationPreviewMissCount: input.renderStats.cameraAnimationPreviewMissCount ?? 0,
    tileCacheSize: input.renderStats.tileCacheSize ?? 0,
    tileDirtyCount: input.renderStats.tileDirtyCount ?? 0,
    tileCacheTotalBytes: input.renderStats.tileCacheTotalBytes ?? 0,
    tileUploadCount: input.renderStats.tileUploadCount ?? 0,
    tileRenderCount: input.renderStats.tileRenderCount ?? 0,
    visibleTileCount: input.renderStats.visibleTileCount ?? 0,
    tileSchedulerPendingCount: input.renderStats.tileSchedulerPendingCount ?? 0,
    gpuTextureBytes: input.renderStats.gpuTextureBytes ?? 0,
    imageTextureBytes: input.renderStats.imageTextureBytes ?? 0,
    initialRenderPhase: input.renderStats.initialRenderPhase ?? 'none',
    initialRenderProgress: input.renderStats.initialRenderProgress ?? 0,
    dirtyRegionCount: input.renderStats.dirtyRegionCount ?? 0,
    dirtyTileCount: input.renderStats.dirtyTileCount ?? 0,
    incrementalUpdateCount: input.renderStats.incrementalUpdateCount ?? 0,
    // Mirror renderer LOD counters so runtime diagnostics panels can verify policy behavior.
    hiddenCount: input.webglStats.hiddenCount ?? 0,
    pointCount: input.webglStats.pointCount ?? 0,
    blockCount: input.webglStats.blockCount ?? 0,
    bboxCount: input.webglStats.bboxCount ?? 0,
    simplifiedCount: input.webglStats.simplifiedCount ?? 0,
    normalCount: input.webglStats.normalCount ?? 0,
    fullCount: input.webglStats.fullCount ?? 0,
    shadowSkippedCount: input.webglStats.shadowSkippedCount ?? 0,
    filterSkippedCount: input.webglStats.filterSkippedCount ?? 0,
    thumbnailImageCount: input.webglStats.thumbnailImageCount ?? 0,
    fullImageCount: input.webglStats.fullImageCount ?? 0,
    groupThumbnailCount: input.webglStats.groupThumbnailCount ?? 0,
    lodDecisionTimeMs: input.webglStats.lodDecisionTimeMs ?? 0,
  }

}
