import type {RuntimeRenderDiagnosticsStats} from './index.runtimeEvents.types.ts'

export interface RuntimeRenderDiagnostics {
  frameCount: number
  // Monotonic timestamp (performance.now) when this diagnostics snapshot was published.
  diagnosticsUpdatedAtMs: number
  // Correlation token that binds this diagnostics row to one render-stage request.
  frameStageId: string
  // Monotonic sequence used to order stage tokens for replay/timeline analysis.
  frameStageSequence: number
  // Timestamp when the current frame-stage token was issued.
  frameStageIssuedAtMs: number
  // Scheduler lane selected for the current frame-stage token.
  frameStageSchedulerMode: 'interactive' | 'normal'
  // Scene-apply path correlated with the current frame-stage token.
  frameStageSceneApplyMode: 'none' | 'full-load' | 'preview-load' | 'incremental-patch'
  drawCount: number
  drawMs: number
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
  engineFrameQuality: 'full' | 'interactive'
  fpsInstantaneous: number
  fpsEstimate: number
  fpsPeak: number
  fpsEstimatePeak: number
  fpsReached60: boolean
  fpsReached120: boolean
  visibleShapeCount: number
  groupCollapseCount: number
  groupCollapseCulledCount: number
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
  renderPrepDirtyCandidateCount: number
  renderPrepDirtyOffscreenCount: number
  offscreenSceneDirtyForceRenderFrameThreshold: number
  dirtyBoundsSmallAreaThreshold: number
  dirtyBoundsMediumAreaThreshold: number
  offscreenSceneDirtySkipConsecutiveCount: number
  offscreenSceneDirtySkipConsecutiveMaxCount: number
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
  dirtyBoundsMarkCount: number
  dirtyBoundsMarkArea: number
  dirtyBoundsMarkSmallAreaCount: number
  dirtyBoundsMarkMediumAreaCount: number
  dirtyBoundsMarkLargeAreaCount: number
  cacheHitCount: number
  cacheMissCount: number
  frameReuseHitCount: number
  frameReuseMissCount: number
  cacheMode: 'none' | 'frame'
  webglRenderPath: 'model-complete' | 'packet' | 'none'
  // Mirrors backend-selected WebGPU path to monitor hybrid fallback pressure.
  webgpuRenderPath: 'hybrid-webgl' | 'native-clear-only' | 'native-rect-batch' | 'native-model-complete'
  // Counts native WebGPU submit attempts in the current frame.
  webgpuNativeSubmissionAttemptedCount: number
  // Counts successful native WebGPU submit operations in the current frame.
  webgpuNativeSubmissionSuccessCount: number
  // Counts failed native WebGPU submit operations in the current frame.
  webgpuNativeSubmissionFailureCount: number
  // Tracks cumulative successful native WebGPU submit operations.
  webgpuNativeSubmissionTotalCount: number
  // Tracks cumulative failed native WebGPU submit operations.
  webgpuNativeSubmissionTotalFailureCount: number
  // Captures native rect-batch eligible shape count for current scene snapshot.
  webgpuNativeRectBatchEligibleCount: number
  // Records why native rect batching was rejected when eligibility is not full.
  webgpuNativeRectBatchRejectedReason:
    | 'none'
    | 'scene-empty'
    | 'group-node-unsupported'
    | 'non-shape-node-unsupported'
    | 'non-rect-shape-unsupported'
    | 'shape-style-unsupported'
    | 'shape-transform-unsupported'
  // Records WebGL feature-capability gate reason for rich semantic fallbacks.
  webglFeatureCapabilityGateReason:
    | 'none'
    | 'image-node-unsupported'
    | 'clip-node-unsupported'
    | 'text-style-unsupported'
    | 'shadow-style-unsupported'
    | 'gradient-style-unsupported'
  // Records WebGPU feature-capability gate reason for rich semantic fallbacks.
  webgpuFeatureCapabilityGateReason:
    | 'none'
    | 'image-node-unsupported'
    | 'clip-node-unsupported'
    | 'text-style-unsupported'
    | 'shadow-style-unsupported'
    | 'gradient-style-unsupported'
  webglInteractiveTextFallbackCount: number
  webglImageTextureUploadCount: number
  webglImageTextureUploadBytes: number
  webglImageDownsampledUploadCount: number
  webglImageDownsampledUploadBytesSaved: number
  webglDeferredImageTextureCount: number
  webglTextTextureUploadCount: number
  webglTextTextureUploadBytes: number
  webglTextCacheHitCount: number
  webglPrecomputedTextCacheKeyCount: number
  webglFallbackTextCacheKeyCount: number
  webglFrameReuseEdgeRedrawCount: number
  webglCompositeUploadBytes: number
  canvas2dTrivialPathFastPathCount: number
  canvas2dContourParseCount: number
  canvas2dSingleLineTextFastPathCount: number
  canvas2dPrecomputedTextLineHeightCount: number
  l0PreviewHitCount: number
  l0PreviewMissCount: number
  l1CompositeHitCount: number
  l1CompositeMissCount: number
  l2TileHitCount: number
  l2TileMissCount: number
  webglPreviewReuseMs: number
  webglPlanBuildMs: number
  webglTextureUploadMs: number
  webglDrawSubmitMs: number
  webglSnapshotCaptureMs: number
  webglModelRenderMs: number
  webglPreviewExecutionMode: 'affine-snapshot' | 'temporal-reprojection-required'
  webglPreviewExecutionSource: 'backend-native' | 'engine-cache-fallback-taxonomy' // Source of preview mode derivation.
  webglBudgetPressure: 'low' | 'medium' | 'high'
  webglBudgetPressureReason: string // Human-readable threshold cause for current pressure tier.
  webglBudgetPressureSource: 'backend-native' | 'engine-frame-budget' // Source of pressure tier derivation.
  webglDrawSubmitBudgetMs: number
  webglTextureUploadBudgetBytes: number
  webglTextureUploadTotalBudgetBytes: number
  webglImageTextureUploadBudgetCount: number
  webglTextTextureUploadBudgetCount: number
  webglTilePreloadBudgetMs: number
  webglTilePreloadBudgetUploads: number
  webglOverlayPassBudgetMs: number
  webglDrawSubmitBudgetExceeded: boolean
  webglTextureUploadBudgetExceeded: boolean
  webglOverlayBudgetExceeded: boolean
  webglPredictorDirectionX: number
  webglPredictorDirectionY: number
  webglPredictorSpeedPxPerSec: number
  webglPredictorConfidence: number
  webglPredictorPreloadRing: number
  webglPredictorOverscanCssPx: number
  webglPredictivePreloadEnqueueCount: number
  webglPredictivePreloadProcessedCount: number
  webglPredictivePreloadPrunedCount: number
  webglHighZoomTextSlaChecked: boolean
  webglHighZoomTextSlaScale: number
  webglHighZoomTextSlaViolationCount: number
  webglDeferredTextTextureCount: number
  panScheduleRequestCount: number
  tileSynchronousRebuildCount: number
  cacheFallbackReason: string
  // Backend requested by runtime when creating engine instance.
  engineBackendRequested: 'auto' | 'webgpu' | 'webgl' | 'canvas2d' | 'headless'
  // Backend resolved by engine backend selector after capability checks.
  engineBackendResolved: 'auto' | 'webgpu' | 'webgl' | 'canvas2d' | 'headless'
  // Selector fallback reason when requested backend differs from resolved backend.
  engineBackendFallbackReason: string | null
  // Active runtime profile identifier selected by engine bootstrap.
  engineRuntimeProfileId: string
  // Active runtime capability count exposed by selected runtime profile.
  engineRuntimeCapabilityCount: number
  // Latest frame-budget pressure reason from engine scheduler diagnostics.
  engineFramePressureReason: string
  // Latest frame-budget pressure tier from engine scheduler diagnostics.
  engineFramePressure: 'low' | 'medium' | 'high'
  // Latest frame strategy phase resolved by engine scheduler diagnostics.
  engineFramePhase: 'static' | 'pan' | 'zoom' | 'camera' | 'settling'
  // Latest QoS degradation level derived from engine diagnostics.
  engineQosDegradationLevel: 'none' | 'light' | 'heavy'
  // Latest QoS fallback reason mirrored from cache fallback taxonomy.
  engineQosFallbackReason: string | null
  // Latest QoS guard trigger tokens used for diagnostics triage.
  engineQosGuardTriggers: string[]
  // Latest QoS trace id used for frame-level diagnostics correlation.
  engineQosTrace: string
  lastRenderRequestReason: string
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
  sceneDirtyRequestCount: number
  deferredImageDrainRequestCount: number
  idleRedrawRequestCount: number
  interactiveRequestCount: number
  offscreenSceneDirtySkipRequestCount: number
  forcedSceneDirtyRequestCount: number
  cameraAnimationActive: boolean
  cameraAnimationCachePreviewOnly: boolean
  cameraAnimationPreviewHitCount: number
  cameraAnimationPreviewMissCount: number
  tileCacheSize: number
  tileDirtyCount: number
  tileCacheTotalBytes: number
  tileUploadCount: number
  tileRenderCount: number
  visibleTileCount: number
  tileSchedulerPendingCount: number
  gpuTextureBytes: number
  imageTextureBytes: number
  initialRenderPhase: string
  initialRenderProgress: number
  dirtyRegionCount: number
  dirtyTileCount: number
  incrementalUpdateCount: number
  hiddenCount: number
  pointCount: number
  blockCount: number
  bboxCount: number
  simplifiedCount: number
  normalCount: number
  fullCount: number
  shadowSkippedCount: number
  filterSkippedCount: number
  thumbnailImageCount: number
  fullImageCount: number
  groupThumbnailCount: number
  lodDecisionTimeMs: number
  // Sectioned diagnostics mirror of flat fields for structured debug surfaces.
  stats?: RuntimeRenderDiagnosticsStats
}
