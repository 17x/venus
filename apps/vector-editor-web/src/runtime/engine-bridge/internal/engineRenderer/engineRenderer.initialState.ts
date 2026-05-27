import {type RuntimeRenderPhase} from '../engineTypes.ts'

/**
 * Creates initial renderer request/interaction counters used by diagnostics hooks.
 */
export function createInitialRenderRequestStats() {
  return {
    lastReason: 'none',
    frameStageId: 'bootstrap-stage-0',
    frameStageSequence: 0,
    frameStageIssuedAtMs: 0,
    frameStageSchedulerMode: 'normal' as 'interactive' | 'normal',
    frameStageSceneApplyMode: 'none' as 'none' | 'full-load' | 'preview-load' | 'incremental-patch',
    activeOverlayScenePlane: 'base' as 'base' | 'active',
    activeOverlayOverlayPlane: 'base' as 'base' | 'overlay',
    activeOverlayUsesActivePlane: false,
    activeOverlayProtectedNodeCount: 0,
    activeOverlayInteractionActiveNodeCount: 0,
    renderPhase: 'settled' as RuntimeRenderPhase,
    renderPhaseTransitionCount: 0,
    lastRenderPhaseTransition: 'none',
    renderPolicyQuality: 'full' as 'full' | 'interactive',
    renderPolicyDpr: 'auto' as number | 'auto',
    viewportInteractionType: 'other' as 'pan' | 'zoom' | 'other',
    overlayMode: 'full' as 'full' | 'degraded',
    renderPolicyTransitionCount: 0,
    lastRenderPolicyTransition: 'none',
    sideTargetDpr: 1,
    outputDpr: 1,
    overlayDegraded: false,
    overlayGuideInputCount: 0,
    overlayGuideKeptCount: 0,
    overlayGuideDroppedCount: 0,
    overlayGuideSelectionStrategy: 'full' as 'full' | 'axis-first' | 'axis-relevance',
    overlayPathEditWhitelistActive: false,
    sceneDirtyCount: 0,
    deferredImageDrainCount: 0,
    idleRedrawCount: 0,
    interactiveCount: 0,
    offscreenSceneDirtySkipCount: 0,
    forcedSceneDirtyRenderCount: 0,
    offscreenSceneDirtySkipConsecutiveMaxCount: 0,
    dirtyBoundsMarkSmallAreaCount: 0,
    dirtyBoundsMarkMediumAreaCount: 0,
    dirtyBoundsMarkLargeAreaCount: 0,
    canvasResizeCommitCount: 0,
    canvasResizeDeferredCommitCount: 0,
    canvasResizeLastCommitReason: 'none',
    canvasResizeLastOutputSize: 'none',
  }
}

/**
 * Creates initial render-prep diagnostics counters.
 */
export function createInitialRenderPrepStats() {
  return {
    dirtyCandidateCount: 0,
    dirtyOffscreenCount: 0,
    offscreenSceneDirtySkipConsecutiveCount: 0,
    dirtyBoundsMarkCount: 0,
    dirtyBoundsMarkArea: 0,
  }
}

/**
 * Creates initial frame/hit plan diagnostics counters.
 */
export function createInitialPlanDiagnostics() {
  return {
    framePlanVersion: 0,
    framePlanCandidateCount: 0,
    framePlanSceneNodeCount: 0,
    framePlanVisibleRatio: 0,
    framePlanShortlistActive: false,
    framePlanShortlistCandidateRatio: 0,
    framePlanShortlistAppliedCandidateCount: 0,
    framePlanShortlistPendingState: null as boolean | null,
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
  }
}

/**
 * Creates initial scene-apply debug counters.
 */
export function createInitialSceneApplyDebugState() {
  return {
    lastSceneApplyMode: 'none' as 'none' | 'full-load' | 'preview-load' | 'incremental-patch',
    lastSceneApplyRevision: 'none' as string,
    lastSceneShapeCount: 0,
    lastScenePatchUpsertCount: 0,
    sceneLoadCount: 0,
    scenePatchCount: 0,
  }
}

/**
 * Creates initial runtime stage timing counters.
 */
export function createInitialRuntimeStageTimingState() {
  return {
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
  }
}
