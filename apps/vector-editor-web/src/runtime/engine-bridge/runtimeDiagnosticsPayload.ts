import type {RuntimeRenderDiagnostics} from '../events/index/index.ts'

interface RenderStatsSnapshot {
  drawCount: number
  frameMs: number
  visibleCount: number
  cacheHits: number
  cacheMisses: number
  frameReuseHits: number
  frameReuseMisses: number
  cameraAnimationActive?: boolean
  cameraAnimationCachePreviewOnly?: boolean
  cameraAnimationPreviewHitCount?: number
  cameraAnimationPreviewMissCount?: number
  tileCacheSize?: number
  tileDirtyCount?: number
  tileCacheTotalBytes?: number
  tileUploadCount?: number
  tileRenderCount?: number
  visibleTileCount?: number
  tileSchedulerPendingCount?: number
  gpuTextureBytes?: number
  imageTextureBytes?: number
  initialRenderPhase?: string
  initialRenderProgress?: number
  dirtyRegionCount?: number
  dirtyTileCount?: number
  incrementalUpdateCount?: number
}

interface RuntimeStageTimingSnapshot {
  scenePrepareMs: number
  sceneApplyMs: number
  viewportCommitMs: number
  viewportResizeMs: number
  viewportStateUpdateMs: number
  diagnosticsPublishMs: number
  plannerSampleMs: number
  schedulerQueueWaitMs: number
  schedulerThrottleDelayMs: number
  presentRafDelayMs: number
}

interface WebglStatsSnapshot {
  engineFrameQuality?: 'full' | 'interactive'
  webglRenderPath?: 'model-complete' | 'packet' | 'none'
  // Mirrors backend-selected WebGPU path to monitor hybrid fallback pressure.
  webgpuRenderPath?: 'hybrid-webgl' | 'native-clear-only' | 'native-rect-batch' | 'native-model-complete'
  // Counts native WebGPU submit attempts in the current frame.
  webgpuNativeSubmissionAttemptedCount?: number
  // Counts successful native WebGPU submit operations in the current frame.
  webgpuNativeSubmissionSuccessCount?: number
  // Counts failed native WebGPU submit operations in the current frame.
  webgpuNativeSubmissionFailureCount?: number
  // Tracks cumulative successful native WebGPU submit operations.
  webgpuNativeSubmissionTotalCount?: number
  // Tracks cumulative failed native WebGPU submit operations.
  webgpuNativeSubmissionTotalFailureCount?: number
  // Captures native rect-batch eligible shape count for current scene snapshot.
  webgpuNativeRectBatchEligibleCount?: number
  // Records why native rect batching was rejected when eligibility is not full.
  webgpuNativeRectBatchRejectedReason?:
    | 'none'
    | 'scene-empty'
    | 'group-node-unsupported'
    | 'non-shape-node-unsupported'
    | 'non-rect-shape-unsupported'
    | 'shape-style-unsupported'
    | 'shape-transform-unsupported'
  // Records WebGL feature-capability gate reason for rich semantic fallbacks.
  webglFeatureCapabilityGateReason?:
    | 'none'
    | 'image-node-unsupported'
    | 'clip-node-unsupported'
    | 'text-style-unsupported'
    | 'shadow-style-unsupported'
    | 'gradient-style-unsupported'
  // Records WebGPU feature-capability gate reason for rich semantic fallbacks.
  webgpuFeatureCapabilityGateReason?:
    | 'none'
    | 'image-node-unsupported'
    | 'clip-node-unsupported'
    | 'text-style-unsupported'
    | 'shadow-style-unsupported'
    | 'gradient-style-unsupported'
  webglInteractiveTextFallbackCount?: number
  webglImageTextureUploadCount?: number
  webglImageTextureUploadBytes?: number
  webglImageDownsampledUploadCount?: number
  webglImageDownsampledUploadBytesSaved?: number
  webglDeferredImageTextureCount?: number
  webglTextTextureUploadCount?: number
  webglTextTextureUploadBytes?: number
  webglTextCacheHitCount?: number
  webglPrecomputedTextCacheKeyCount?: number
  webglFallbackTextCacheKeyCount?: number
  webglFrameReuseEdgeRedrawCount?: number
  webglCompositeUploadBytes?: number
  canvas2dTrivialPathFastPathCount?: number
  canvas2dContourParseCount?: number
  canvas2dSingleLineTextFastPathCount?: number
  canvas2dPrecomputedTextLineHeightCount?: number
  l0PreviewHitCount?: number
  l0PreviewMissCount?: number
  l1CompositeHitCount?: number
  l1CompositeMissCount?: number
  l2TileHitCount?: number
  l2TileMissCount?: number
  cacheFallbackReason?:
    | 'none'
    | 'l0-no-snapshot'
    | 'l0-preview-miss'
    | 'l0-revision-mismatch'
    | 'l0-viewport-width-mismatch'
    | 'l0-viewport-height-mismatch'
    | 'l0-pixel-ratio-mismatch'
    | 'l0-invalid-scale-ratio'
    | 'l0-zoom-only-pan-blocked'
    | 'l0-scale-step-exceeded'
    | 'l0-translate-exceeded'
    | 'l1-bypass-interactive'
    | 'l1-disabled'
    | 'l2-tile-seed-upload-failed'
    | 'l2-tile-partial-region-canvas-crop'
    | 'l2-tile-framebuffer-copy-fallback-canvas'
    | 'l2-tile-framebuffer-copy-failed'
    | 'l2-tile-source-build-failed'
    | 'l2-bypass-visible-tile-pressure'
    | 'l2-tile-fallback-to-composite'
    | 'l3-budget-draw-submit-cap'
    | 'l3-empty-frame-model-fallback'
  webglPreviewReuseMs?: number
  webglPlanBuildMs?: number
  webglTextureUploadMs?: number
  webglDrawSubmitMs?: number
  webglSnapshotCaptureMs?: number
  webglModelRenderMs?: number
  webglPreviewExecutionMode?: 'affine-snapshot' | 'temporal-reprojection-required'
  // Marks where preview execution mode was derived from.
  webglPreviewExecutionSource?: 'backend-native' | 'engine-cache-fallback-taxonomy'
  webglBudgetPressure?: 'low' | 'medium' | 'high'
  // Records the threshold cause behind the selected budget pressure tier.
  webglBudgetPressureReason?: string
  // Marks where budget pressure diagnostics were derived from.
  webglBudgetPressureSource?: 'backend-native' | 'engine-frame-budget'
  webglDrawSubmitBudgetMs?: number
  webglTextureUploadBudgetBytes?: number
  webglTextureUploadTotalBudgetBytes?: number
  webglImageTextureUploadBudgetCount?: number
  webglTextTextureUploadBudgetCount?: number
  webglTilePreloadBudgetMs?: number
  webglTilePreloadBudgetUploads?: number
  webglOverlayPassBudgetMs?: number
  webglDrawSubmitBudgetExceeded?: boolean
  webglTextureUploadBudgetExceeded?: boolean
  webglOverlayBudgetExceeded?: boolean
  webglPredictorDirectionX?: number
  webglPredictorDirectionY?: number
  webglPredictorSpeedPxPerSec?: number
  webglPredictorConfidence?: number
  webglPredictorPreloadRing?: number
  webglPredictorOverscanCssPx?: number
  webglPredictivePreloadEnqueueCount?: number
  webglPredictivePreloadProcessedCount?: number
  webglPredictivePreloadPrunedCount?: number
  webglHighZoomTextSlaChecked?: boolean
  webglHighZoomTextSlaScale?: number
  webglHighZoomTextSlaViolationCount?: number
  webglDeferredTextTextureCount?: number
  panScheduleRequestCount?: number
  tileSynchronousRebuildCount?: number
  hiddenCount?: number
  pointCount?: number
  blockCount?: number
  bboxCount?: number
  simplifiedCount?: number
  normalCount?: number
  fullCount?: number
  shadowSkippedCount?: number
  filterSkippedCount?: number
  thumbnailImageCount?: number
  fullImageCount?: number
  groupThumbnailCount?: number
  lodDecisionTimeMs?: number
}

interface GroupCollapseStatsSnapshot {
  groupCollapseCount?: number
  groupCollapseCulledCount?: number
}

interface PlanDiagnosticsSnapshot {
  framePlanVersion: number
  framePlanCandidateCount: number
  framePlanSceneNodeCount: number
  framePlanVisibleRatio: number
  framePlanShortlistActive: boolean
  framePlanShortlistCandidateRatio: number
  framePlanShortlistAppliedCandidateCount: number
  framePlanShortlistPendingState: boolean | null
  framePlanShortlistPendingFrameCount: number
  framePlanShortlistToggleCount: number
  framePlanShortlistDebounceBlockedToggleCount: number
  framePlanShortlistEnterRatioThreshold: number
  framePlanShortlistLeaveRatioThreshold: number
  framePlanShortlistStableFrameCount: number
  hitPlanVersion: number
  hitPlanCandidateCount: number
  hitPlanHitCount: number
  hitPlanExactCheckCount: number
}

interface RenderPrepDiagnosticsSnapshot {
  renderPrepDirtyCandidateCount: number
  renderPrepDirtyOffscreenCount: number
  offscreenSceneDirtySkipConsecutiveCount: number
  dirtyBoundsMarkCount: number
  dirtyBoundsMarkArea: number
}

/**
 * Captures renderer-owned request and routing counters mirrored into diagnostics payloads.
 */
interface RenderRequestStatsSnapshot {
  lastReason: string
  // Stores stage correlation token for the queued frame represented by this sample.
  frameStageId: string
  // Stores monotonic sequence number for stage timeline ordering.
  frameStageSequence: number
  // Stores issue timestamp for stage timeline reconstruction.
  frameStageIssuedAtMs: number
  // Stores scheduler lane selected for this frame-stage token.
  frameStageSchedulerMode: 'interactive' | 'normal'
  // Stores scene apply path associated with this frame-stage token.
  frameStageSceneApplyMode: 'none' | 'full-load' | 'preview-load' | 'incremental-patch'
  // Stores current scene routing plane resolved by active/overlay contract.
  activeOverlayScenePlane: 'base' | 'active'
  // Stores current overlay routing plane resolved by active/overlay contract.
  activeOverlayOverlayPlane: 'base' | 'overlay'
  // Indicates whether active plane routing is enabled for this diagnostics sample.
  activeOverlayUsesActivePlane: boolean
  // Stores protected-node count routed through active/overlay policy.
  activeOverlayProtectedNodeCount: number
  // Stores interaction-active node count routed through active/overlay policy.
  activeOverlayInteractionActiveNodeCount: number
  renderPhase: 'static' | 'pan' | 'zoom' | 'drag' | 'precision' | 'settled'
  renderPhaseTransitionCount: number
  lastRenderPhaseTransition: string
  renderPolicyQuality: 'full' | 'interactive'
  renderPolicyDpr: number | 'auto'
  sideTargetDpr: number
  outputDpr: number
  viewportInteractionType: 'pan' | 'zoom' | 'other'
  overlayMode: 'full' | 'degraded'
  renderPolicyTransitionCount: number
  lastRenderPolicyTransition: string
  overlayDegraded: boolean
  overlayGuideInputCount: number
  overlayGuideKeptCount: number
  overlayGuideDroppedCount: number
  overlayGuideSelectionStrategy: 'full' | 'axis-first' | 'axis-relevance'
  overlayPathEditWhitelistActive: boolean
  sceneDirtyCount: number
  deferredImageDrainCount: number
  idleRedrawCount: number
  interactiveCount: number
  offscreenSceneDirtySkipCount: number
  forcedSceneDirtyRenderCount: number
  offscreenSceneDirtySkipConsecutiveMaxCount: number
  dirtyBoundsMarkSmallAreaCount: number
  dirtyBoundsMarkMediumAreaCount: number
  dirtyBoundsMarkLargeAreaCount: number
}

interface EngineCoreStatsSnapshot {
  // Backend requested by runtime when creating engine instance.
  backendRequested: 'auto' | 'webgpu' | 'webgl' | 'canvas2d' | 'headless'
  // Backend resolved by engine backend selector after capability checks.
  backendResolved: 'auto' | 'webgpu' | 'webgl' | 'canvas2d' | 'headless'
  // Selector fallback reason when requested backend differs from resolved backend.
  backendFallbackReason: string | null
  // Active runtime profile identifier selected by engine bootstrap.
  runtimeProfileId: string
  // Active runtime capability count exposed by selected runtime profile.
  runtimeCapabilityCount: number
  // Latest frame-budget pressure reason from engine scheduler diagnostics.
  framePressureReason: string
  // Latest frame-budget pressure tier from engine scheduler diagnostics.
  framePressure: 'low' | 'medium' | 'high'
  // Latest strategy phase resolved by engine frame orchestration.
  framePhase: 'static' | 'pan' | 'zoom' | 'camera' | 'settling'
  // Latest QoS degradation level derived from engine diagnostics.
  qosDegradationLevel: 'none' | 'light' | 'heavy'
  // Latest QoS fallback reason mirrored from cache fallback taxonomy.
  qosFallbackReason: string | null
  // Latest QoS guard trigger tokens used for diagnostics triage.
  qosGuardTriggers: string[]
  // Latest QoS trace id used for frame-level correlation.
  qosTrace: string
}

export interface BuildRuntimeDiagnosticsPayloadInput {
  frameCount: number
  diagnosticsUpdatedAtMs: number
  renderStats: RenderStatsSnapshot
  runtimeStageTimingMs: RuntimeStageTimingSnapshot
  webglStats: WebglStatsSnapshot
  groupCollapseStats: GroupCollapseStatsSnapshot
  planDiagnostics: PlanDiagnosticsSnapshot
  renderPrepDiagnostics: RenderPrepDiagnosticsSnapshot
  renderRequestStats: RenderRequestStatsSnapshot
  engineCoreStats: EngineCoreStatsSnapshot
  offscreenSceneDirtyForceRenderFrameThreshold: number
  dirtyBoundsSmallAreaThreshold: number
  dirtyBoundsMediumAreaThreshold: number
  offscreenSceneDirtyRiskWatchSkipRateThreshold: number
  offscreenSceneDirtyRiskHighSkipRateThreshold: number
  offscreenSceneDirtyRiskHighForcedPerSecondThreshold: number
  sceneDirtyProlongedHighRiskSecondsThreshold: number
  sceneDirtyTransitionRateWatchThreshold: number
  sceneDirtyTrendWindowFrames: number
  offscreenSceneDirtyForcedSpikePerSecondThreshold: number
  offscreenSceneDirtySkipSpikePerSecondThreshold: number
  sceneDirtyRiskScoreHighThreshold: number
  sceneDirtyRiskScoreSkipWeight: number
  sceneDirtyRiskScoreForcedWeight: number
  sceneDirtyRiskScoreStreakWeight: number
  sceneDirtyRiskScoreForcedRateScale: number
}

export function buildRuntimeDiagnosticsPayload(
  input: BuildRuntimeDiagnosticsPayloadInput,
): RuntimeRenderDiagnostics {
  // Keep all legacy flat fields so existing debug subscribers remain stable.
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
