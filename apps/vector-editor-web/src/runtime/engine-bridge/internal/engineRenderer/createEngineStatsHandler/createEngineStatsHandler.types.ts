import * as React from 'react'
import {type RuntimeRenderPhase} from '../../engineTypes.ts'

// ---------------------------------------------------------------------------
// EngineStatsHandlerParams — all refs and callbacks required per stats frame
// ---------------------------------------------------------------------------

/**
 * All refs and callbacks required by createEngineStatsHandler to process one
 * stats payload per render frame. Extracted here to keep the main handler
 * file under the governance line-count limit.
 */
export type EngineStatsHandlerParams = {
  /** Monotonically increasing frame-draw counter. */
  drawSerialRef: React.MutableRefObject<number>
  /** Provides scheduler diagnostics for latency/throttle metrics. */
  renderSchedulerRef: React.MutableRefObject<{
    getDiagnostics?: () => {
      lastQueueWaitMs: number
      lastInteractiveThrottleDelayMs: number
    }
  } | null>
  /**
   * Provides engine core diagnostics (frame plan, hit plan, shortlist)
   * and stats (backend selection, QoS, frame pressure).
   */
  engineRef: React.MutableRefObject<{
    getDiagnostics: () => {
      pixelRatio: number
      outputPixelRatio: number
      framePlan?: {
        planVersion?: number
        candidateCount?: number
        sceneNodeCount?: number
      }
      hitPlan?: {
        planVersion?: number
        candidateCount?: number
        hitCount?: number
        exactCheckCount?: number
      }
      shortlist?: {
        active?: boolean
        candidateRatio?: number
        appliedCandidateCount?: number
        pendingState?: boolean | null
        pendingFrameCount?: number
        toggleCount?: number
        debounceBlockedToggleCount?: number
        enterRatioThreshold?: number
        leaveRatioThreshold?: number
        stableFrameCount?: number
      }
    }
    getStats: () => {
      backendSelection: {
        requested: 'auto' | 'webgpu' | 'webgl' | 'canvas2d' | 'headless'
        resolved: 'auto' | 'webgpu' | 'webgl' | 'canvas2d' | 'headless'
        fallbackReason: string | null
      }
      runtimeProfileId?: string
      runtimeCapabilityCount?: number
      lastFramePressureReason?: string
      lastFramePressure?: 'low' | 'medium' | 'high'
      lastFramePhase?: 'static' | 'pan' | 'zoom' | 'camera' | 'settling'
      lastQosDegradationLevel?: 'none' | 'light' | 'heavy'
      lastQosFallbackReason?: string | null
      lastQosGuardTriggers?: string[]
      lastQosTrace?: string
    }
  } | null>
  /** Stage timing breakdown written during each phase; mutated in-place per frame. */
  runtimeStageTimingMsRef: React.MutableRefObject<{
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
  }>
  /** Rendering metadata accumulated across the current frame lifecycle. */
  renderRequestStatsRef: React.MutableRefObject<{
    lastReason: string
    // Stores the current frame-stage correlation token emitted at render request time.
    frameStageId: string
    // Stores monotonically increasing frame-stage sequence for timeline ordering.
    frameStageSequence: number
    // Stores request timestamp for the current frame-stage token.
    frameStageIssuedAtMs: number
    // Stores scheduler lane selected for the current frame-stage token.
    frameStageSchedulerMode: 'interactive' | 'normal'
    // Stores latest scene apply path bound to the current frame-stage token.
    frameStageSceneApplyMode: 'none' | 'full-load' | 'preview-load' | 'incremental-patch'
    activeOverlayScenePlane: 'base' | 'active'
    activeOverlayOverlayPlane: 'base' | 'overlay'
    activeOverlayUsesActivePlane: boolean
    activeOverlayProtectedNodeCount: number
    activeOverlayInteractionActiveNodeCount: number
    renderPhase: RuntimeRenderPhase
    viewportInteractionType: 'pan' | 'zoom' | 'other'
    sideTargetDpr: number
    outputDpr: number
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
    renderPhaseTransitionCount: number
    lastRenderPhaseTransition: string
    renderPolicyQuality: 'full' | 'interactive'
    renderPolicyDpr: number | 'auto'
    overlayMode: 'full' | 'degraded'
    renderPolicyTransitionCount: number
    lastRenderPolicyTransition: string
    overlayDegraded: boolean
    overlayGuideInputCount: number
    overlayGuideKeptCount: number
    overlayGuideDroppedCount: number
    overlayGuideSelectionStrategy: 'full' | 'axis-first' | 'axis-relevance'
    overlayPathEditWhitelistActive: boolean
    canvasResizeCommitCount: number
    canvasResizeDeferredCommitCount: number
    canvasResizeLastCommitReason: string
    canvasResizeLastOutputSize: string
  }>
  /** Tracks when the most recent planner sample was taken (epoch ms). */
  lastPlanDiagnosticSampleAtRef: React.MutableRefObject<number>
  /** Latest sampled frame-plan and hit-plan diagnostic counts. */
  latestPlanDiagnosticsRef: React.MutableRefObject<{
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
  }>
  /** Latest render-prep stats (dirty region counts, offscreen skip run). */
  latestRenderPrepStatsRef: React.MutableRefObject<{
    dirtyCandidateCount: number
    dirtyOffscreenCount: number
    offscreenSceneDirtySkipConsecutiveCount: number
    dirtyBoundsMarkCount: number
    dirtyBoundsMarkArea: number
  }>
  /** Frame serial of the last zero-visibility debug snapshot written to window. */
  lastZeroVisibilityDebugFrameRef: React.MutableRefObject<number>
  /** Last scene apply mode and revision metadata for zero-visibility diagnostics. */
  sceneApplyDebugRef: React.MutableRefObject<{
    lastSceneApplyMode: 'none' | 'full-load' | 'preview-load' | 'incremental-patch'
    lastSceneApplyRevision: string
    lastSceneShapeCount: number
    lastScenePatchUpsertCount: number
    sceneLoadCount: number
    scenePatchCount: number
  }>
  /** Whether a deferred visual recovery is pending this frame. */
  deferredVisualRecoveryPendingRef: React.MutableRefObject<boolean>
  /** Callback to schedule a deferred visual recovery render. */
  requestDeferredVisualRecovery: () => void
  /** Whether a present-latency RAF probe is already in flight. */
  presentLatencyRafPendingRef: React.MutableRefObject<boolean>
  /** Callback to queue an engine render at a given mode and reason. */
  requestEngineRender: (
    mode?: 'interactive' | 'normal',
    reason?: 'scene-dirty' | 'deferred-image-drain' | 'idle-redraw' | 'interactive-viewport' | 'camera-animation' | 'overlay-dirty',
  ) => void
}

// ---------------------------------------------------------------------------
// EngineStatsPayload — base stats shape emitted by the engine on-stats callback
// ---------------------------------------------------------------------------

/**
 * Base stats payload emitted by the engine renderer on every drawn frame.
 * The engine emits this through the onStats callback registered in lifecycle setup.
 */
export type EngineStatsPayload = {
  drawCount: number
  frameMs: number
  visibleCount: number
  cacheHits: number
  cacheMisses: number
  frameReuseHits: number
  frameReuseMisses: number
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
  engineFrameQuality?: 'full' | 'interactive'
  webglRenderPath?: 'model-complete' | 'packet' | 'none'
  webgpuRenderPath?: 'hybrid-webgl' | 'native-clear-only' | 'native-rect-batch' | 'native-model-complete'
  webgpuNativeSubmissionAttemptedCount?: number
  webgpuNativeSubmissionSuccessCount?: number
  webgpuNativeSubmissionFailureCount?: number
  webgpuNativeSubmissionTotalCount?: number
  webgpuNativeSubmissionTotalFailureCount?: number
  webgpuNativeRectBatchEligibleCount?: number
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
  webglPreviewReuseMs?: number
  webglPlanBuildMs?: number
  webglTextureUploadMs?: number
  webglDrawSubmitMs?: number
  webglSnapshotCaptureMs?: number
  webglModelRenderMs?: number
  webglPreviewExecutionMode?: 'affine-snapshot' | 'temporal-reprojection-required'
  webglPreviewExecutionSource?: 'backend-native' | 'engine-cache-fallback-taxonomy'
  webglBudgetPressure?: 'low' | 'medium' | 'high'
  webglBudgetPressureReason?: string
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
  groupCollapseCount?: number
  groupCollapseCulledCount?: number
}

// ---------------------------------------------------------------------------
// WebGLEnrichedStatsPayload — runtime intersection used inside the callback
// to access WebGL-specific fields added by the backend at emit time
// ---------------------------------------------------------------------------

/**
 * Engine stats payload enriched with backend-specific WebGL/WebGPU fields
 * that are emitted at runtime but absent from the base EngineStatsPayload type.
 * Used internally in the stats callback via `as WebGLEnrichedStatsPayload`.
 */
export type WebGLEnrichedStatsPayload = EngineStatsPayload & {
  engineFrameQuality?: 'full' | 'interactive'
  webglRenderPath?: 'model-complete' | 'packet' | 'none'
  webgpuRenderPath?: 'hybrid-webgl' | 'native-clear-only' | 'native-rect-batch' | 'native-model-complete'
  webgpuNativeSubmissionAttemptedCount?: number
  webgpuNativeSubmissionSuccessCount?: number
  webgpuNativeSubmissionFailureCount?: number
  webgpuNativeSubmissionTotalCount?: number
  webgpuNativeSubmissionTotalFailureCount?: number
  webgpuNativeRectBatchEligibleCount?: number
  webgpuNativeRectBatchRejectedReason?:
    | 'none'
    | 'scene-empty'
    | 'group-node-unsupported'
    | 'non-shape-node-unsupported'
    | 'non-rect-shape-unsupported'
    | 'shape-style-unsupported'
    | 'shape-transform-unsupported'
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
  webglInteractiveTextFallbackCount?: number
  webglImageTextureUploadCount?: number
  webglImageTextureUploadBytes?: number
  webglDeferredImageTextureCount?: number
  webglTextTextureUploadCount?: number
  webglTextTextureUploadBytes?: number
  webglTextCacheHitCount?: number
  webglPrecomputedTextCacheKeyCount?: number
  webglFallbackTextCacheKeyCount?: number
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
  webglPreviewExecutionSource?: 'backend-native' | 'engine-cache-fallback-taxonomy'
  webglBudgetPressure?: 'low' | 'medium' | 'high'
  webglBudgetPressureReason?: string
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
  cameraAnimationActive?: boolean
  cameraAnimationCachePreviewOnly?: boolean
  cameraAnimationPreviewHitCount?: number
  cameraAnimationPreviewMissCount?: number
}
