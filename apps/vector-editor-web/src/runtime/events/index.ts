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

export interface RuntimeRenderDiagnostics {
  frameCount: number
  drawCount: number
  drawMs: number
  fpsInstantaneous: number
  fpsEstimate: number
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
  webglCompositeUploadBytes: number
  l0PreviewHitCount: number
  l0PreviewMissCount: number
  l1CompositeHitCount: number
  l1CompositeMissCount: number
  l2TileHitCount: number
  l2TileMissCount: number
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
  fpsInstantaneous: 0,
  fpsEstimate: 0,
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
  webglCompositeUploadBytes: 0,
  l0PreviewHitCount: 0,
  l0PreviewMissCount: 0,
  l1CompositeHitCount: 0,
  l1CompositeMissCount: 0,
  l2TileHitCount: 0,
  l2TileMissCount: 0,
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
}

const renderDiagnosticsListeners = new Set<VoidFunction>()
let currentRenderDiagnostics = EMPTY_RUNTIME_RENDER_DIAGNOSTICS
let previousFrameCount = 0
let previousDrawTimestamp = 0
let smoothedFpsEstimate = 0

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

  currentRenderDiagnostics = {
    ...next,
    fpsInstantaneous: Math.min(Math.max(instantaneousFps, 0), 1000),
    fpsEstimate: smoothedFpsEstimate,
  }
  renderDiagnosticsListeners.forEach((listener) => listener())
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
