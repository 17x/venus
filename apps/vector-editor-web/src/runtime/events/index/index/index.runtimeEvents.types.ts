import type { RuntimeModifiers, RuntimePoint } from '../../../types/index.ts'
import type {
  NormalizedInteractionEvent,
  NormalizedPointerType,
} from '@venus/editor-primitive'

export interface RuntimePointerInput {
  readonly type: 'pointerdown' | 'pointermove' | 'pointerup' | 'pointerleave'
  readonly point: RuntimePoint
  readonly modifiers?: RuntimeModifiers
  /** Stores pointer stream identifier when upstream adapter exposes it. */
  readonly pointerId?: number
  /** Stores pointer device type used by primitive cursor/gesture policy. */
  readonly pointerType?: NormalizedPointerType
  /** Stores triggering button index from source pointer event. */
  readonly button?: number
  /** Stores active pointer button bitmask from source pointer event. */
  readonly buttons?: number
  /** Indicates whether source pointer stream is primary. */
  readonly isPrimary?: boolean
  /** Stores pointer pressure when available on source platform. */
  readonly pressure?: number
  /** Stores source event timestamp to keep normalization deterministic in tests. */
  readonly timestamp?: number
}

export interface RuntimeWheelInput {
  readonly type: 'wheel'
  readonly deltaX: number
  readonly deltaY: number
  readonly ctrlKey: boolean
  readonly point: RuntimePoint
  /** Stores optional non-ctrl modifier flags for extended wheel shortcuts. */
  readonly modifiers?: RuntimeModifiers
  /** Stores source delta mode when adapter can forward it. */
  readonly deltaMode?: 'pixel' | 'line' | 'page'
  /** Stores source event timestamp to keep normalization deterministic in tests. */
  readonly timestamp?: number
}

export interface RuntimeKeyboardInput {
  readonly type: 'keydown' | 'keyup'
  readonly key: string
  readonly modifiers?: RuntimeModifiers
  /** Stores physical key code for layout-aware shortcut branches. */
  readonly code?: string
  /** Indicates whether this keydown is auto-repeat. */
  readonly repeat?: boolean
  /** Indicates whether IME composition is active during the keyboard event. */
  readonly isComposing?: boolean
  /** Stores source target tag name to support shortcut guard decisions. */
  readonly targetTagName?: string
  /** Indicates whether source target is contenteditable. */
  readonly isContentEditable?: boolean
  /** Stores source event timestamp to keep normalization deterministic in tests. */
  readonly timestamp?: number
}

export type RuntimeInputEvent = RuntimePointerInput | RuntimeWheelInput | RuntimeKeyboardInput

export interface RuntimeInputSink {
  onInput(event: RuntimeInputEvent): void
}

/**
 * Defines one published snapshot that binds runtime input and primitive normalized event.
 */
export interface RuntimeNormalizedInteractionSnapshot {
  /** Stores latest runtime input event as emitted by UI adapters. */
  runtimeEvent: RuntimeInputEvent
  /** Stores corresponding primitive normalized interaction event when one mapping exists. */
  normalizedEvent: NormalizedInteractionEvent
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
      sideTargetDpr: number
      outputDpr: number
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

export interface RuntimeViewportSnapshot {
  scale: number
}

export interface RuntimeShellSnapshot {
  selectedCount: number
  layerCount: number
}

export interface RuntimeMigrationSnapshot {
  runtimeV2: {
    // Stores cumulative worker dual-write consistency check count.
    checks: number
    // Stores cumulative worker dual-write mismatch count.
    mismatches: number
    // Stores latest command type associated with mismatch diagnostics.
    lastCommandType: string | null
    // Stores latest mismatch issue set for quick debug visibility.
    lastIssues: string[]
    // Stores cumulative shape-tree invariant checks executed at worker frame boundaries.
    frameBoundaryChecks: number
    // Stores cumulative shape-tree invariant mismatches detected at worker frame boundaries.
    frameBoundaryMismatches: number
    // Stores latest frame-boundary invariant issue set for quick debug visibility.
    lastFrameBoundaryIssues: string[]
    // Indicates whether worker strict mismatch mode is currently enabled.
    strictModeEnabled: boolean
  }
}

