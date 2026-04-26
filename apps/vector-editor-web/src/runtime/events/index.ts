import type { RuntimeModifiers, RuntimePoint } from '../types/index.ts'

export interface RuntimePointerInput {
  readonly type: 'pointerdown' | 'pointermove' | 'pointerup' | 'pointerleave'
  readonly point: RuntimePoint
  readonly modifiers?: RuntimeModifiers
}

export interface RuntimeWheelInput {
  readonly type: 'wheel'
  readonly deltaX: number
  readonly deltaY: number
  readonly ctrlKey: boolean
  readonly point: RuntimePoint
}

export interface RuntimeKeyboardInput {
  readonly type: 'keydown' | 'keyup'
  readonly key: string
  readonly modifiers?: RuntimeModifiers
}

export type RuntimeInputEvent = RuntimePointerInput | RuntimeWheelInput | RuntimeKeyboardInput

export interface RuntimeInputSink {
  onInput(event: RuntimeInputEvent): void
}

export interface RuntimeRenderDiagnosticsStats {
  performance: {
    timing: {
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
      fpsInstantaneous: number
      fpsEstimate: number
      fpsPeak: number
      fpsEstimatePeak: number
      fpsReached60: boolean
      fpsReached120: boolean
    }
    lod: {
      engineFrameQuality: 'full' | 'interactive'
      renderPolicyQuality: 'full' | 'interactive'
      renderPolicyDpr: number | 'auto'
      renderPhase: 'static' | 'pan' | 'zoom' | 'drag' | 'precision' | 'settled'
      viewportInteractionType: 'pan' | 'zoom' | 'other'
      overlayMode: 'full' | 'degraded'
    }
    cache: {
      cacheMode: 'none' | 'frame'
      cacheHitCount: number
      cacheMissCount: number
      frameReuseHitCount: number
      frameReuseMissCount: number
      cacheFallbackReason: string
    }
    webgl: {
      webglRenderPath: 'model-complete' | 'packet' | 'none'
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
    }
  }
  planner: {
    frame: {
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
    }
    hit: {
      hitPlanVersion: number
      hitPlanCandidateCount: number
      hitPlanHitCount: number
      hitPlanExactCheckCount: number
    }
    dirtyRegion: {
      renderPrepDirtyCandidateCount: number
      renderPrepDirtyOffscreenCount: number
      offscreenSceneDirtyForceRenderFrameThreshold: number
      offscreenSceneDirtySkipConsecutiveCount: number
      offscreenSceneDirtySkipConsecutiveMaxCount: number
      dirtyBoundsSmallAreaThreshold: number
      dirtyBoundsMediumAreaThreshold: number
      dirtyBoundsMarkCount: number
      dirtyBoundsMarkArea: number
      dirtyBoundsMarkSmallAreaCount: number
      dirtyBoundsMarkMediumAreaCount: number
      dirtyBoundsMarkLargeAreaCount: number
    }
  }
  overlay: {
    overlayDegraded: boolean
    overlayGuideInputCount: number
    overlayGuideKeptCount: number
    overlayGuideDroppedCount: number
    overlayGuideSelectionStrategy: 'full' | 'axis-first' | 'axis-relevance'
    overlayPathEditWhitelistActive: boolean
  }
  requests: {
    lastRenderRequestReason: string
    sceneDirtyRequestCount: number
    deferredImageDrainRequestCount: number
    idleRedrawRequestCount: number
    interactiveRequestCount: number
    offscreenSceneDirtySkipRequestCount: number
    forcedSceneDirtyRequestCount: number
  }
}

export interface RuntimeRenderDiagnostics {
  frameCount: number
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
  cacheFallbackReason: string
  lastRenderRequestReason: string
  renderPhase: 'static' | 'pan' | 'zoom' | 'drag' | 'precision' | 'settled'
  renderPhaseTransitionCount: number
  lastRenderPhaseTransition: string
  renderPolicyQuality: 'full' | 'interactive'
  renderPolicyDpr: number | 'auto'
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

export interface RuntimeViewportSnapshot {
  scale: number
}

export interface RuntimeShellSnapshot {
  selectedCount: number
  layerCount: number
}

export const EMPTY_RUNTIME_RENDER_DIAGNOSTICS: RuntimeRenderDiagnostics = {
  frameCount: 0,
  drawCount: 0,
  drawMs: 0,
  scenePrepareMs: 0,
  sceneApplyMs: 0,
  viewportCommitMs: 0,
  viewportResizeMs: 0,
  viewportStateUpdateMs: 0,
  diagnosticsPublishMs: 0,
  plannerSampleMs: 0,
  schedulerQueueWaitMs: 0,
  schedulerThrottleDelayMs: 0,
  presentRafDelayMs: 0,
  engineFrameQuality: 'full',
  fpsInstantaneous: 0,
  fpsEstimate: 0,
  fpsPeak: 0,
  fpsEstimatePeak: 0,
  fpsReached60: false,
  fpsReached120: false,
  visibleShapeCount: 0,
  groupCollapseCount: 0,
  groupCollapseCulledCount: 0,
  framePlanVersion: 0,
  framePlanCandidateCount: 0,
  framePlanSceneNodeCount: 0,
  framePlanVisibleRatio: 0,
  framePlanShortlistActive: false,
  framePlanShortlistCandidateRatio: 0,
  framePlanShortlistAppliedCandidateCount: 0,
  framePlanShortlistPendingState: null,
  framePlanShortlistPendingFrameCount: 0,
  framePlanShortlistToggleCount: 0,
  framePlanShortlistDebounceBlockedToggleCount: 0,
  framePlanShortlistEnterRatioThreshold: 0,
  framePlanShortlistLeaveRatioThreshold: 0,
  framePlanShortlistStableFrameCount: 0,
  hitPlanVersion: 0,
  hitPlanCandidateCount: 0,
  hitPlanHitCount: 0,
  hitPlanExactCheckCount: 0,
  renderPrepDirtyCandidateCount: 0,
  renderPrepDirtyOffscreenCount: 0,
  offscreenSceneDirtyForceRenderFrameThreshold: 0,
  dirtyBoundsSmallAreaThreshold: 0,
  dirtyBoundsMediumAreaThreshold: 0,
  offscreenSceneDirtySkipConsecutiveCount: 0,
  offscreenSceneDirtySkipConsecutiveMaxCount: 0,
  offscreenSceneDirtyRiskWatchSkipRateThreshold: 0,
  offscreenSceneDirtyRiskHighSkipRateThreshold: 0,
  offscreenSceneDirtyRiskHighForcedPerSecondThreshold: 0,
  sceneDirtyProlongedHighRiskSecondsThreshold: 0,
  sceneDirtyTransitionRateWatchThreshold: 0,
  sceneDirtyTrendWindowFrames: 0,
  offscreenSceneDirtyForcedSpikePerSecondThreshold: 0,
  offscreenSceneDirtySkipSpikePerSecondThreshold: 0,
  sceneDirtyRiskScoreHighThreshold: 0,
  sceneDirtyRiskScoreSkipWeight: 0,
  sceneDirtyRiskScoreForcedWeight: 0,
  sceneDirtyRiskScoreStreakWeight: 0,
  sceneDirtyRiskScoreForcedRateScale: 0,
  dirtyBoundsMarkCount: 0,
  dirtyBoundsMarkArea: 0,
  dirtyBoundsMarkSmallAreaCount: 0,
  dirtyBoundsMarkMediumAreaCount: 0,
  dirtyBoundsMarkLargeAreaCount: 0,
  cacheHitCount: 0,
  cacheMissCount: 0,
  frameReuseHitCount: 0,
  frameReuseMissCount: 0,
  cacheMode: 'none',
  webglRenderPath: 'none',
  webglInteractiveTextFallbackCount: 0,
  webglImageTextureUploadCount: 0,
  webglImageTextureUploadBytes: 0,
  webglImageDownsampledUploadCount: 0,
  webglImageDownsampledUploadBytesSaved: 0,
  webglDeferredImageTextureCount: 0,
  webglTextTextureUploadCount: 0,
  webglTextTextureUploadBytes: 0,
  webglTextCacheHitCount: 0,
  webglPrecomputedTextCacheKeyCount: 0,
  webglFallbackTextCacheKeyCount: 0,
  webglFrameReuseEdgeRedrawCount: 0,
  webglCompositeUploadBytes: 0,
  canvas2dTrivialPathFastPathCount: 0,
  canvas2dContourParseCount: 0,
  canvas2dSingleLineTextFastPathCount: 0,
  canvas2dPrecomputedTextLineHeightCount: 0,
  l0PreviewHitCount: 0,
  l0PreviewMissCount: 0,
  l1CompositeHitCount: 0,
  l1CompositeMissCount: 0,
  l2TileHitCount: 0,
  l2TileMissCount: 0,
  webglPreviewReuseMs: 0,
  webglPlanBuildMs: 0,
  webglTextureUploadMs: 0,
  webglDrawSubmitMs: 0,
  webglSnapshotCaptureMs: 0,
  webglModelRenderMs: 0,
  cacheFallbackReason: 'none',
  lastRenderRequestReason: 'none',
  renderPhase: 'settled',
  renderPhaseTransitionCount: 0,
  lastRenderPhaseTransition: 'none',
  renderPolicyQuality: 'full',
  renderPolicyDpr: 'auto',
  viewportInteractionType: 'other',
  overlayMode: 'full',
  renderPolicyTransitionCount: 0,
  lastRenderPolicyTransition: 'none',
  overlayDegraded: false,
  overlayGuideInputCount: 0,
  overlayGuideKeptCount: 0,
  overlayGuideDroppedCount: 0,
  overlayGuideSelectionStrategy: 'full',
  overlayPathEditWhitelistActive: false,
  sceneDirtyRequestCount: 0,
  deferredImageDrainRequestCount: 0,
  idleRedrawRequestCount: 0,
  interactiveRequestCount: 0,
  offscreenSceneDirtySkipRequestCount: 0,
  forcedSceneDirtyRequestCount: 0,
  cameraAnimationActive: false,
  cameraAnimationCachePreviewOnly: false,
  cameraAnimationPreviewHitCount: 0,
  cameraAnimationPreviewMissCount: 0,
  tileCacheSize: 0,
  tileDirtyCount: 0,
  tileCacheTotalBytes: 0,
  tileUploadCount: 0,
  tileRenderCount: 0,
  visibleTileCount: 0,
  tileSchedulerPendingCount: 0,
  gpuTextureBytes: 0,
  imageTextureBytes: 0,
  initialRenderPhase: 'none',
  initialRenderProgress: 0,
  dirtyRegionCount: 0,
  dirtyTileCount: 0,
  incrementalUpdateCount: 0,
  hiddenCount: 0,
  pointCount: 0,
  blockCount: 0,
  bboxCount: 0,
  simplifiedCount: 0,
  normalCount: 0,
  fullCount: 0,
  shadowSkippedCount: 0,
  filterSkippedCount: 0,
  thumbnailImageCount: 0,
  fullImageCount: 0,
  groupThumbnailCount: 0,
  lodDecisionTimeMs: 0,
  stats: {
    performance: {
      timing: {
        drawMs: 0,
        scenePrepareMs: 0,
        sceneApplyMs: 0,
        viewportCommitMs: 0,
        viewportResizeMs: 0,
        viewportStateUpdateMs: 0,
        diagnosticsPublishMs: 0,
        plannerSampleMs: 0,
        schedulerQueueWaitMs: 0,
        schedulerThrottleDelayMs: 0,
        presentRafDelayMs: 0,
        fpsInstantaneous: 0,
        fpsEstimate: 0,
        fpsPeak: 0,
        fpsEstimatePeak: 0,
        fpsReached60: false,
        fpsReached120: false,
      },
      lod: {
        engineFrameQuality: 'full',
        renderPolicyQuality: 'full',
        renderPolicyDpr: 'auto',
        renderPhase: 'settled',
        viewportInteractionType: 'other',
        overlayMode: 'full',
      },
      cache: {
        cacheMode: 'none',
        cacheHitCount: 0,
        cacheMissCount: 0,
        frameReuseHitCount: 0,
        frameReuseMissCount: 0,
        cacheFallbackReason: 'none',
      },
      webgl: {
        webglRenderPath: 'none',
        webglInteractiveTextFallbackCount: 0,
        webglImageTextureUploadCount: 0,
        webglImageTextureUploadBytes: 0,
        webglImageDownsampledUploadCount: 0,
        webglImageDownsampledUploadBytesSaved: 0,
        webglDeferredImageTextureCount: 0,
        webglTextTextureUploadCount: 0,
        webglTextTextureUploadBytes: 0,
        webglTextCacheHitCount: 0,
        webglPrecomputedTextCacheKeyCount: 0,
        webglFallbackTextCacheKeyCount: 0,
        webglFrameReuseEdgeRedrawCount: 0,
        webglCompositeUploadBytes: 0,
        l0PreviewHitCount: 0,
        l0PreviewMissCount: 0,
        l1CompositeHitCount: 0,
        l1CompositeMissCount: 0,
        l2TileHitCount: 0,
        l2TileMissCount: 0,
        webglPreviewReuseMs: 0,
        webglPlanBuildMs: 0,
        webglTextureUploadMs: 0,
        webglDrawSubmitMs: 0,
        webglSnapshotCaptureMs: 0,
        webglModelRenderMs: 0,
        tileCacheSize: 0,
        tileDirtyCount: 0,
        tileCacheTotalBytes: 0,
        tileUploadCount: 0,
        tileRenderCount: 0,
        visibleTileCount: 0,
        tileSchedulerPendingCount: 0,
        gpuTextureBytes: 0,
        imageTextureBytes: 0,
        initialRenderPhase: 'none',
        initialRenderProgress: 0,
        dirtyRegionCount: 0,
        dirtyTileCount: 0,
        incrementalUpdateCount: 0,
        hiddenCount: 0,
        pointCount: 0,
        blockCount: 0,
        bboxCount: 0,
        simplifiedCount: 0,
        normalCount: 0,
        fullCount: 0,
        shadowSkippedCount: 0,
        filterSkippedCount: 0,
        thumbnailImageCount: 0,
        fullImageCount: 0,
        groupThumbnailCount: 0,
        lodDecisionTimeMs: 0,
      },
    },
    planner: {
      frame: {
        framePlanVersion: 0,
        framePlanCandidateCount: 0,
        framePlanSceneNodeCount: 0,
        framePlanVisibleRatio: 0,
        framePlanShortlistActive: false,
        framePlanShortlistCandidateRatio: 0,
        framePlanShortlistAppliedCandidateCount: 0,
        framePlanShortlistPendingState: null,
        framePlanShortlistPendingFrameCount: 0,
        framePlanShortlistToggleCount: 0,
        framePlanShortlistDebounceBlockedToggleCount: 0,
        framePlanShortlistEnterRatioThreshold: 0,
        framePlanShortlistLeaveRatioThreshold: 0,
        framePlanShortlistStableFrameCount: 0,
      },
      hit: {
        hitPlanVersion: 0,
        hitPlanCandidateCount: 0,
        hitPlanHitCount: 0,
        hitPlanExactCheckCount: 0,
      },
      dirtyRegion: {
        renderPrepDirtyCandidateCount: 0,
        renderPrepDirtyOffscreenCount: 0,
        offscreenSceneDirtyForceRenderFrameThreshold: 0,
        offscreenSceneDirtySkipConsecutiveCount: 0,
        offscreenSceneDirtySkipConsecutiveMaxCount: 0,
        dirtyBoundsSmallAreaThreshold: 0,
        dirtyBoundsMediumAreaThreshold: 0,
        dirtyBoundsMarkCount: 0,
        dirtyBoundsMarkArea: 0,
        dirtyBoundsMarkSmallAreaCount: 0,
        dirtyBoundsMarkMediumAreaCount: 0,
        dirtyBoundsMarkLargeAreaCount: 0,
      },
    },
    overlay: {
      overlayDegraded: false,
      overlayGuideInputCount: 0,
      overlayGuideKeptCount: 0,
      overlayGuideDroppedCount: 0,
      overlayGuideSelectionStrategy: 'full',
      overlayPathEditWhitelistActive: false,
    },
    requests: {
      lastRenderRequestReason: 'none',
      sceneDirtyRequestCount: 0,
      deferredImageDrainRequestCount: 0,
      idleRedrawRequestCount: 0,
      interactiveRequestCount: 0,
      offscreenSceneDirtySkipRequestCount: 0,
      forcedSceneDirtyRequestCount: 0,
    },
  },
}

const renderDiagnosticsListeners = new Set<VoidFunction>()
let currentRenderDiagnostics = EMPTY_RUNTIME_RENDER_DIAGNOSTICS
let previousFrameCount = 0
let previousDrawTimestamp = 0
let smoothedFpsEstimate = 0
let peakInstantaneousFps = 0
let peakSmoothedFpsEstimate = 0

export const EMPTY_RUNTIME_VIEWPORT_SNAPSHOT: RuntimeViewportSnapshot = {
  scale: 1,
}

export const EMPTY_RUNTIME_SHELL_SNAPSHOT: RuntimeShellSnapshot = {
  selectedCount: 0,
  layerCount: 0,
}

const viewportSnapshotListeners = new Set<VoidFunction>()
let currentViewportSnapshot = EMPTY_RUNTIME_VIEWPORT_SNAPSHOT
const shellSnapshotListeners = new Set<VoidFunction>()
let currentShellSnapshot = EMPTY_RUNTIME_SHELL_SNAPSHOT

export function resetRuntimeEventSnapshots() {
  currentRenderDiagnostics = EMPTY_RUNTIME_RENDER_DIAGNOSTICS
  previousFrameCount = 0
  previousDrawTimestamp = 0
  smoothedFpsEstimate = 0
  peakInstantaneousFps = 0
  peakSmoothedFpsEstimate = 0
  currentViewportSnapshot = EMPTY_RUNTIME_VIEWPORT_SNAPSHOT
  currentShellSnapshot = EMPTY_RUNTIME_SHELL_SNAPSHOT
  renderDiagnosticsListeners.forEach((listener) => listener())
  viewportSnapshotListeners.forEach((listener) => listener())
  shellSnapshotListeners.forEach((listener) => listener())
}

export function publishRuntimeRenderDiagnostics(next: RuntimeRenderDiagnostics) {
  const now = globalThis.performance?.now?.() ?? Date.now()
  const frameDelta = next.frameCount - previousFrameCount
  const timeDelta = now - previousDrawTimestamp
  let instantaneousFps = 0

  if (previousDrawTimestamp > 0 && frameDelta > 0 && timeDelta > 0) {
    instantaneousFps = (frameDelta * 1000) / timeDelta
    // Clamp to realistic display-driven bounds so tiny render times do not report impossible FPS spikes.
    const clampedInstantaneousFps = Math.min(Math.max(instantaneousFps, 0), 240)
    const smoothingFactor = 0.2
    smoothedFpsEstimate = smoothedFpsEstimate > 0
      ? smoothedFpsEstimate + (clampedInstantaneousFps - smoothedFpsEstimate) * smoothingFactor
      : clampedInstantaneousFps
  }

  previousFrameCount = next.frameCount
  previousDrawTimestamp = now

  peakInstantaneousFps = Math.max(peakInstantaneousFps, Math.min(Math.max(instantaneousFps, 0), 1000))
  peakSmoothedFpsEstimate = Math.max(peakSmoothedFpsEstimate, smoothedFpsEstimate)

  const baseDiagnostics: RuntimeRenderDiagnostics = {
    ...next,
    fpsInstantaneous: Math.min(Math.max(instantaneousFps, 0), 1000),
    fpsEstimate: smoothedFpsEstimate,
    fpsPeak: peakInstantaneousFps,
    fpsEstimatePeak: peakSmoothedFpsEstimate,
    fpsReached60: peakInstantaneousFps >= 60,
    fpsReached120: peakInstantaneousFps >= 120,
  }
  // Keep a sectioned mirror so engine and UI debug surfaces can consume
  // hierarchical groups (for example: stats.performance.lod).
  currentRenderDiagnostics = {
    ...baseDiagnostics,
    stats: baseDiagnostics.stats ?? resolveRuntimeRenderDiagnosticsStats(baseDiagnostics),
  }
  renderDiagnosticsListeners.forEach((listener) => listener())
}

function resolveRuntimeRenderDiagnosticsStats(
  diagnostics: RuntimeRenderDiagnostics,
): RuntimeRenderDiagnosticsStats {
  return {
    performance: {
      timing: {
        drawMs: diagnostics.drawMs,
        scenePrepareMs: diagnostics.scenePrepareMs,
        sceneApplyMs: diagnostics.sceneApplyMs,
        viewportCommitMs: diagnostics.viewportCommitMs,
        viewportResizeMs: diagnostics.viewportResizeMs,
        viewportStateUpdateMs: diagnostics.viewportStateUpdateMs,
        diagnosticsPublishMs: diagnostics.diagnosticsPublishMs,
        plannerSampleMs: diagnostics.plannerSampleMs,
        schedulerQueueWaitMs: diagnostics.schedulerQueueWaitMs,
        schedulerThrottleDelayMs: diagnostics.schedulerThrottleDelayMs,
        presentRafDelayMs: diagnostics.presentRafDelayMs,
        fpsInstantaneous: diagnostics.fpsInstantaneous,
        fpsEstimate: diagnostics.fpsEstimate,
        fpsPeak: diagnostics.fpsPeak,
        fpsEstimatePeak: diagnostics.fpsEstimatePeak,
        fpsReached60: diagnostics.fpsReached60,
        fpsReached120: diagnostics.fpsReached120,
      },
      lod: {
        engineFrameQuality: diagnostics.engineFrameQuality,
        renderPolicyQuality: diagnostics.renderPolicyQuality,
        renderPolicyDpr: diagnostics.renderPolicyDpr,
        renderPhase: diagnostics.renderPhase,
        viewportInteractionType: diagnostics.viewportInteractionType,
        overlayMode: diagnostics.overlayMode,
      },
      cache: {
        cacheMode: diagnostics.cacheMode,
        cacheHitCount: diagnostics.cacheHitCount,
        cacheMissCount: diagnostics.cacheMissCount,
        frameReuseHitCount: diagnostics.frameReuseHitCount,
        frameReuseMissCount: diagnostics.frameReuseMissCount,
        cacheFallbackReason: diagnostics.cacheFallbackReason,
      },
      webgl: {
        webglRenderPath: diagnostics.webglRenderPath,
        webglInteractiveTextFallbackCount: diagnostics.webglInteractiveTextFallbackCount,
        webglImageTextureUploadCount: diagnostics.webglImageTextureUploadCount,
        webglImageTextureUploadBytes: diagnostics.webglImageTextureUploadBytes,
        webglImageDownsampledUploadCount: diagnostics.webglImageDownsampledUploadCount,
        webglImageDownsampledUploadBytesSaved: diagnostics.webglImageDownsampledUploadBytesSaved,
        webglDeferredImageTextureCount: diagnostics.webglDeferredImageTextureCount,
        webglTextTextureUploadCount: diagnostics.webglTextTextureUploadCount,
        webglTextTextureUploadBytes: diagnostics.webglTextTextureUploadBytes,
        webglTextCacheHitCount: diagnostics.webglTextCacheHitCount,
        webglPrecomputedTextCacheKeyCount: diagnostics.webglPrecomputedTextCacheKeyCount,
        webglFallbackTextCacheKeyCount: diagnostics.webglFallbackTextCacheKeyCount,
        webglFrameReuseEdgeRedrawCount: diagnostics.webglFrameReuseEdgeRedrawCount,
        webglCompositeUploadBytes: diagnostics.webglCompositeUploadBytes,
        l0PreviewHitCount: diagnostics.l0PreviewHitCount,
        l0PreviewMissCount: diagnostics.l0PreviewMissCount,
        l1CompositeHitCount: diagnostics.l1CompositeHitCount,
        l1CompositeMissCount: diagnostics.l1CompositeMissCount,
        l2TileHitCount: diagnostics.l2TileHitCount,
        l2TileMissCount: diagnostics.l2TileMissCount,
        webglPreviewReuseMs: diagnostics.webglPreviewReuseMs,
        webglPlanBuildMs: diagnostics.webglPlanBuildMs,
        webglTextureUploadMs: diagnostics.webglTextureUploadMs,
        webglDrawSubmitMs: diagnostics.webglDrawSubmitMs,
        webglSnapshotCaptureMs: diagnostics.webglSnapshotCaptureMs,
        webglModelRenderMs: diagnostics.webglModelRenderMs,
        tileCacheSize: diagnostics.tileCacheSize,
        tileDirtyCount: diagnostics.tileDirtyCount,
        tileCacheTotalBytes: diagnostics.tileCacheTotalBytes,
        tileUploadCount: diagnostics.tileUploadCount,
        tileRenderCount: diagnostics.tileRenderCount,
        visibleTileCount: diagnostics.visibleTileCount,
        tileSchedulerPendingCount: diagnostics.tileSchedulerPendingCount,
        gpuTextureBytes: diagnostics.gpuTextureBytes,
        imageTextureBytes: diagnostics.imageTextureBytes,
        initialRenderPhase: diagnostics.initialRenderPhase,
        initialRenderProgress: diagnostics.initialRenderProgress,
        dirtyRegionCount: diagnostics.dirtyRegionCount,
        dirtyTileCount: diagnostics.dirtyTileCount,
        incrementalUpdateCount: diagnostics.incrementalUpdateCount,
        hiddenCount: diagnostics.hiddenCount,
        pointCount: diagnostics.pointCount,
        blockCount: diagnostics.blockCount,
        bboxCount: diagnostics.bboxCount,
        simplifiedCount: diagnostics.simplifiedCount,
        normalCount: diagnostics.normalCount,
        fullCount: diagnostics.fullCount,
        shadowSkippedCount: diagnostics.shadowSkippedCount,
        filterSkippedCount: diagnostics.filterSkippedCount,
        thumbnailImageCount: diagnostics.thumbnailImageCount,
        fullImageCount: diagnostics.fullImageCount,
        groupThumbnailCount: diagnostics.groupThumbnailCount,
        lodDecisionTimeMs: diagnostics.lodDecisionTimeMs,
      },
    },
    planner: {
      frame: {
        framePlanVersion: diagnostics.framePlanVersion,
        framePlanCandidateCount: diagnostics.framePlanCandidateCount,
        framePlanSceneNodeCount: diagnostics.framePlanSceneNodeCount,
        framePlanVisibleRatio: diagnostics.framePlanVisibleRatio,
        framePlanShortlistActive: diagnostics.framePlanShortlistActive,
        framePlanShortlistCandidateRatio: diagnostics.framePlanShortlistCandidateRatio,
        framePlanShortlistAppliedCandidateCount: diagnostics.framePlanShortlistAppliedCandidateCount,
        framePlanShortlistPendingState: diagnostics.framePlanShortlistPendingState,
        framePlanShortlistPendingFrameCount: diagnostics.framePlanShortlistPendingFrameCount,
        framePlanShortlistToggleCount: diagnostics.framePlanShortlistToggleCount,
        framePlanShortlistDebounceBlockedToggleCount: diagnostics.framePlanShortlistDebounceBlockedToggleCount,
        framePlanShortlistEnterRatioThreshold: diagnostics.framePlanShortlistEnterRatioThreshold,
        framePlanShortlistLeaveRatioThreshold: diagnostics.framePlanShortlistLeaveRatioThreshold,
        framePlanShortlistStableFrameCount: diagnostics.framePlanShortlistStableFrameCount,
      },
      hit: {
        hitPlanVersion: diagnostics.hitPlanVersion,
        hitPlanCandidateCount: diagnostics.hitPlanCandidateCount,
        hitPlanHitCount: diagnostics.hitPlanHitCount,
        hitPlanExactCheckCount: diagnostics.hitPlanExactCheckCount,
      },
      dirtyRegion: {
        renderPrepDirtyCandidateCount: diagnostics.renderPrepDirtyCandidateCount,
        renderPrepDirtyOffscreenCount: diagnostics.renderPrepDirtyOffscreenCount,
        offscreenSceneDirtyForceRenderFrameThreshold: diagnostics.offscreenSceneDirtyForceRenderFrameThreshold,
        offscreenSceneDirtySkipConsecutiveCount: diagnostics.offscreenSceneDirtySkipConsecutiveCount,
        offscreenSceneDirtySkipConsecutiveMaxCount: diagnostics.offscreenSceneDirtySkipConsecutiveMaxCount,
        dirtyBoundsSmallAreaThreshold: diagnostics.dirtyBoundsSmallAreaThreshold,
        dirtyBoundsMediumAreaThreshold: diagnostics.dirtyBoundsMediumAreaThreshold,
        dirtyBoundsMarkCount: diagnostics.dirtyBoundsMarkCount,
        dirtyBoundsMarkArea: diagnostics.dirtyBoundsMarkArea,
        dirtyBoundsMarkSmallAreaCount: diagnostics.dirtyBoundsMarkSmallAreaCount,
        dirtyBoundsMarkMediumAreaCount: diagnostics.dirtyBoundsMarkMediumAreaCount,
        dirtyBoundsMarkLargeAreaCount: diagnostics.dirtyBoundsMarkLargeAreaCount,
      },
    },
    overlay: {
      overlayDegraded: diagnostics.overlayDegraded,
      overlayGuideInputCount: diagnostics.overlayGuideInputCount,
      overlayGuideKeptCount: diagnostics.overlayGuideKeptCount,
      overlayGuideDroppedCount: diagnostics.overlayGuideDroppedCount,
      overlayGuideSelectionStrategy: diagnostics.overlayGuideSelectionStrategy,
      overlayPathEditWhitelistActive: diagnostics.overlayPathEditWhitelistActive,
    },
    requests: {
      lastRenderRequestReason: diagnostics.lastRenderRequestReason,
      sceneDirtyRequestCount: diagnostics.sceneDirtyRequestCount,
      deferredImageDrainRequestCount: diagnostics.deferredImageDrainRequestCount,
      idleRedrawRequestCount: diagnostics.idleRedrawRequestCount,
      interactiveRequestCount: diagnostics.interactiveRequestCount,
      offscreenSceneDirtySkipRequestCount: diagnostics.offscreenSceneDirtySkipRequestCount,
      forcedSceneDirtyRequestCount: diagnostics.forcedSceneDirtyRequestCount,
    },
  }
}

export function getRuntimeRenderDiagnosticsSnapshot() {
  return currentRenderDiagnostics
}

export function subscribeRuntimeRenderDiagnostics(listener: VoidFunction) {
  renderDiagnosticsListeners.add(listener)
  return () => {
    renderDiagnosticsListeners.delete(listener)
  }
}

export function publishRuntimeViewportSnapshot(next: RuntimeViewportSnapshot) {
  currentViewportSnapshot = next
  viewportSnapshotListeners.forEach((listener) => listener())
}

export function getRuntimeViewportSnapshot() {
  return currentViewportSnapshot
}

export function subscribeRuntimeViewportSnapshot(listener: VoidFunction) {
  viewportSnapshotListeners.add(listener)
  return () => {
    viewportSnapshotListeners.delete(listener)
  }
}

export function publishRuntimeShellSnapshot(next: RuntimeShellSnapshot) {
  currentShellSnapshot = next
  shellSnapshotListeners.forEach((listener) => listener())
}

export function getRuntimeShellSnapshot() {
  return currentShellSnapshot
}

export function subscribeRuntimeShellSnapshot(listener: VoidFunction) {
  shellSnapshotListeners.add(listener)
  return () => {
    shellSnapshotListeners.delete(listener)
  }
}

/**
 * Shared TS-only input router used by UI bridges to forward raw input streams.
 */
export function createRuntimeInputRouter(sink: RuntimeInputSink) {
  return {
    dispatch(event: RuntimeInputEvent) {
      sink.onInput(event)
    },
  }
}

export interface RuntimeCanvasInputHandlers {
  onPointerMove(point: RuntimePoint): void
  onPointerDown(
    point: RuntimePoint,
    modifiers?: {
      shiftKey: boolean
      metaKey: boolean
      ctrlKey: boolean
      altKey: boolean
    },
  ): void
  onPointerUp(): void
  onPointerLeave(): void
}

/**
 * Creates a canvas-facing adapter that always routes input through
 * RuntimeInputEvent before invoking pointer lifecycle handlers.
 */
export function createRuntimeCanvasInputBridge(
  router: ReturnType<typeof createRuntimeInputRouter>,
  handlers: RuntimeCanvasInputHandlers,
): RuntimeCanvasInputHandlers {
  return {
    onPointerMove(point) {
      router.dispatch({
        type: 'pointermove',
        point,
      })
      handlers.onPointerMove(point)
    },
    onPointerDown(point, modifiers) {
      router.dispatch({
        type: 'pointerdown',
        point,
        modifiers,
      })
      handlers.onPointerDown(point, modifiers)
    },
    onPointerUp() {
      router.dispatch({
        type: 'pointerup',
        point: {x: 0, y: 0},
      })
      handlers.onPointerUp()
    },
    onPointerLeave() {
      router.dispatch({
        type: 'pointerleave',
        point: {x: 0, y: 0},
      })
      handlers.onPointerLeave()
    },
  }
}
