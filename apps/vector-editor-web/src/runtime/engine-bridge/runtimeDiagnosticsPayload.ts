import type {RuntimeRenderDiagnostics} from '../events/index/index.ts'
import {buildRuntimeDiagnosticsPayloadFields} from './runtimeDiagnosticsPayload.fields.ts'

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
  return buildRuntimeDiagnosticsPayloadFields(input)
}
