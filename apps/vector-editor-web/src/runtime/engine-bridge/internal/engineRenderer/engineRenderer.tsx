import * as React from 'react'
import {type EditorDocument} from '../../../model/index.ts'
import type {CanvasViewportState as EngineViewportState} from '../../../index.ts'
import type {
  RuntimeEngine as Engine,
  EngineRenderScheduler,
} from '../../engine.ts'
import {createEngineRenderScheduler} from '../../engine.ts'
import {
  type CreateEngineSceneFromRuntimeSnapshotOptions,
} from '../../../presets/index.ts'
import type {SceneShapeSnapshot} from '../../../shared-memory/index.ts'
import {type EngineRendererProps, type RuntimeRenderPhase} from '../engineTypes.ts'
import {VECTOR_ENGINE_SCENE_PROFILE} from './engineSceneProfile.ts'
import {useEngineRendererLifecycle} from './useEngineRendererLifecycle.ts'
import {useEngineRendererSceneSync} from './useEngineRendererSceneSync.ts'
import {useEngineRendererViewport} from './useEngineRendererViewport.ts'

/**
 * Orchestrates runtime engine rendering by delegating lifecycle, scene sync, and viewport commits.
 * @param props Runtime renderer inputs from app state.
 */
export function EngineRenderer({
  document,
  shapes,
  stats,
  viewport,
  transformPreviewActive = false,
  overlayNodes,
  protectedNodeIds,
  overlayDiagnostics,
  interactionPhase = 'settled',
}: EngineRendererProps) {
  const INTERACTION_SETTLE_MS = 120
  const INTERACTION_ACTIVE_SCHEDULER_INTERVAL_MS = 4
  const OVERSCAN_PX = VECTOR_ENGINE_SCENE_PROFILE.overscanPx

  /**
   * Resolves whether one render phase is considered actively interacting.
   * @param phase Runtime render phase.
   * @returns True when the phase is an active interaction lane.
   */
  const isInteractionPhase = (phase: RuntimeRenderPhase): boolean => (
    phase === 'pan' ||
    phase === 'zoom' ||
    phase === 'drag' ||
    phase === 'precision'
  )

  const renderSurfaceRef = React.useRef<HTMLCanvasElement | null>(null)
  const engineRef = React.useRef<Engine | null>(null)
  const drawSerialRef = React.useRef(0)
  const assetUrlByIdRef = React.useRef<Map<string, string>>(new Map())
  const imageCacheRef = React.useRef<Map<string, HTMLImageElement>>(new Map())
  const appliedRenderSizeRef = React.useRef<{width: number; height: number} | null>(null)
  const appliedOutputSizeRef = React.useRef<{width: number; height: number} | null>(null)
  const appliedViewportRef = React.useRef<{
    viewportWidth: number
    viewportHeight: number
    offsetX: number
    offsetY: number
    scale: number
  } | null>(null)
  const hasCommittedInitialViewportFrameRef = React.useRef(false)
  const viewportReadyRef = React.useRef(false)
  const pendingSceneRenderRef = React.useRef(false)
  const [isInteracting, setIsInteracting] = React.useState(false)
  const isInteractingRef = React.useRef(isInteracting)
  const lastInteractionAtRef = React.useRef(0)
  const interactionSettleTimerRef = React.useRef<number | null>(null)
  const deferredFullRedrawHandleRef = React.useRef<number | null>(null)
  const deferredResizeCommitHandleRef = React.useRef<number | null>(null)
  const pendingRenderSizeRef = React.useRef<{width: number; height: number} | null>(null)
  const deferredFullRedrawTokenRef = React.useRef(0)
  const renderSchedulerRef = React.useRef<EngineRenderScheduler | null>(null)
  const deferredVisualRecoveryPendingRef = React.useRef(false)
  const deferredVisualRecoveryAfterInteractionRef = React.useRef(false)
  const renderRequestStatsRef = React.useRef({
    lastReason: 'none',
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
  })
  const latestRenderPrepStatsRef = React.useRef({
    dirtyCandidateCount: 0,
    dirtyOffscreenCount: 0,
    offscreenSceneDirtySkipConsecutiveCount: 0,
    dirtyBoundsMarkCount: 0,
    dirtyBoundsMarkArea: 0,
  })
  const latestPlanDiagnosticsRef = React.useRef({
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
  })
  const sceneApplyDebugRef = React.useRef({
    lastSceneApplyMode: 'none' as 'none' | 'full-load' | 'preview-load' | 'incremental-patch',
    lastSceneApplyRevision: 'none' as string,
    lastSceneShapeCount: 0,
    lastScenePatchUpsertCount: 0,
    sceneLoadCount: 0,
    scenePatchCount: 0,
  })
  const runtimeStageTimingMsRef = React.useRef({
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
  })
  const presentLatencyRafPendingRef = React.useRef(false)
  const lastZeroVisibilityDebugFrameRef = React.useRef(0)
  const lastPlanDiagnosticSampleAtRef = React.useRef(0)
  const protectedNodeSignatureRef = React.useRef('')
  const interactionActiveNodeSignatureRef = React.useRef('')
  const previewSceneRevisionRef = React.useRef(0)
  const hasLoadedSceneInEngineRef = React.useRef(false)
  const previousRenderPrepRef = React.useRef<{
    revision: number
    document: EditorDocument
    shapes: SceneShapeSnapshot[]
    viewport: EngineViewportState
  } | null>(null)

  const replayScenePayload = React.useMemo<CreateEngineSceneFromRuntimeSnapshotOptions>(
    () => ({
      document,
      shapes,
      revision: stats.version,
      backgroundFill: '#ffffff',
      backgroundStroke: '#d0d7de',
      compatibility: VECTOR_ENGINE_SCENE_PROFILE.sceneAdapter,
    }),
    [document, shapes, stats.version],
  )

  const effectiveInteractionPhase = React.useMemo<RuntimeRenderPhase>(() => {
    if (
      transformPreviewActive &&
      (interactionPhase === 'static' || interactionPhase === 'settled')
    ) {
      return 'precision'
    }

    return interactionPhase
  }, [interactionPhase, transformPreviewActive])

  const interactionActive = React.useMemo(() => {
    return isInteractionPhase(effectiveInteractionPhase)
  }, [effectiveInteractionPhase])

  const effectiveInteractiveIntervalMs = React.useMemo(() => {
    if (interactionActive) {
      // Keep scheduler cadence low-but-nonzero during gestures so render
      // pressure remains responsive without starving main-thread input.
      return INTERACTION_ACTIVE_SCHEDULER_INTERVAL_MS
    }

    return 8
  }, [interactionActive, INTERACTION_ACTIVE_SCHEDULER_INTERVAL_MS])

  isInteractingRef.current = isInteracting

  /**
   * Cancels any deferred full redraw handle.
   */
  const cancelDeferredFullRedraw = React.useCallback(() => {
    if (deferredFullRedrawHandleRef.current === null) {
      return
    }

    const idleApi = window as Window & {
      requestIdleCallback?: (callback: IdleRequestCallback, options?: IdleRequestOptions) => number
      cancelIdleCallback?: (handle: number) => void
    }

    if (idleApi.cancelIdleCallback) {
      idleApi.cancelIdleCallback(deferredFullRedrawHandleRef.current)
    } else {
      window.clearTimeout(deferredFullRedrawHandleRef.current)
    }

    deferredFullRedrawHandleRef.current = null
  }, [])

  /**
   * Cancels queued scheduler-driven render work.
   */
  const cancelScheduledRender = React.useCallback(() => {
    renderSchedulerRef.current?.cancel()
  }, [])

  /**
   * Cancels deferred resize commit scheduling.
   */
  const cancelDeferredResizeCommit = React.useCallback(() => {
    if (deferredResizeCommitHandleRef.current === null) {
      return
    }

    window.clearTimeout(deferredResizeCommitHandleRef.current)
    deferredResizeCommitHandleRef.current = null
  }, [])

  /**
   * Requests a render frame through the engine scheduler and records request attribution.
   * @param mode Scheduling mode for the render request.
   * @param reason Reason classification for diagnostics accounting.
   */
  const requestEngineRender = React.useCallback((
    mode: 'interactive' | 'normal' = 'normal',
    reason: 'scene-dirty' | 'deferred-image-drain' | 'idle-redraw' | 'interactive-viewport' | 'camera-animation' | 'overlay-dirty' = 'scene-dirty',
  ) => {
    renderRequestStatsRef.current.lastReason = reason
    if (reason === 'scene-dirty') {
      renderRequestStatsRef.current.sceneDirtyCount += 1
    } else if (reason === 'deferred-image-drain') {
      renderRequestStatsRef.current.deferredImageDrainCount += 1
    } else if (reason === 'idle-redraw') {
      renderRequestStatsRef.current.idleRedrawCount += 1
    } else {
      renderRequestStatsRef.current.interactiveCount += 1
    }
    renderSchedulerRef.current?.request(mode)
  }, [])

  /**
   * Schedules one post-interaction recovery frame for deferred visual resources.
   */
  const requestDeferredVisualRecovery = React.useCallback(() => {
    if (deferredVisualRecoveryPendingRef.current) {
      return
    }

    if (isInteractingRef.current) {
      deferredVisualRecoveryAfterInteractionRef.current = true
      return
    }

    deferredVisualRecoveryPendingRef.current = true
    requestEngineRender('normal', 'idle-redraw')
  }, [requestEngineRender])

  useEngineRendererLifecycle({
    document,
    renderSurfaceRef,
    engineRef,
    drawSerialRef,
    assetUrlByIdRef,
    imageCacheRef,
    appliedRenderSizeRef,
    appliedOutputSizeRef,
    appliedViewportRef,
    hasCommittedInitialViewportFrameRef,
    viewportReadyRef,
    pendingSceneRenderRef,
    interactionSettleTimerRef,
    deferredFullRedrawHandleRef,
    deferredResizeCommitHandleRef,
    pendingRenderSizeRef,
    renderSchedulerRef,
    deferredVisualRecoveryPendingRef,
    hasLoadedSceneInEngineRef,
    runtimeStageTimingMsRef,
    presentLatencyRafPendingRef,
    lastZeroVisibilityDebugFrameRef,
    lastPlanDiagnosticSampleAtRef,
    latestRenderPrepStatsRef,
    latestPlanDiagnosticsRef,
    sceneApplyDebugRef,
    renderRequestStatsRef,
    isInteractingRef,
    cancelDeferredFullRedraw,
    cancelDeferredResizeCommit,
    cancelScheduledRender,
    requestDeferredVisualRecovery,
    requestEngineRender,
  })

  React.useEffect(() => {
    const engine = engineRef.current
    if (!engine) {
      return
    }

    renderSchedulerRef.current?.dispose()
    renderSchedulerRef.current = createEngineRenderScheduler({
      render: () => {
        if (!viewportReadyRef.current || !appliedViewportRef.current) {
          return Promise.resolve(null)
        }

        return engine.render()
      },
      interactiveIntervalMs: effectiveInteractiveIntervalMs,
    })

    return () => {
      renderSchedulerRef.current?.dispose()
      renderSchedulerRef.current = null
    }
  }, [effectiveInteractiveIntervalMs])

  React.useEffect(() => {
    if (!isInteractionPhase(effectiveInteractionPhase)) {
      if (interactionSettleTimerRef.current !== null) {
        window.clearTimeout(interactionSettleTimerRef.current)
        interactionSettleTimerRef.current = null
      }
      setIsInteracting(false)
      return
    }

    lastInteractionAtRef.current = performance.now()
    setIsInteracting(true)
    if (interactionSettleTimerRef.current !== null) {
      window.clearTimeout(interactionSettleTimerRef.current)
    }
    interactionSettleTimerRef.current = window.setTimeout(() => {
      setIsInteracting(false)
      interactionSettleTimerRef.current = null
    }, INTERACTION_SETTLE_MS)
  }, [INTERACTION_SETTLE_MS, effectiveInteractionPhase, viewport.offsetX, viewport.offsetY, viewport.scale])

  React.useEffect(() => {
    if (isInteracting || !deferredVisualRecoveryAfterInteractionRef.current) {
      return
    }

    deferredVisualRecoveryAfterInteractionRef.current = false
    deferredVisualRecoveryPendingRef.current = true
    requestEngineRender('normal', 'idle-redraw')
  }, [isInteracting, requestEngineRender])

  React.useEffect(() => {
    const engine = engineRef.current
    if (!engine) {
      return
    }

    const overlayEnabledEngine = engine as Engine & {
      setOverlayNodes?: (nodes?: readonly import('../../engine.ts').EngineOverlayDrawNode[]) => void
    }
    overlayEnabledEngine.setOverlayNodes?.(overlayNodes)
    const overlayRenderMode: 'interactive' | 'normal' = (
      interactionPhase === 'pan' ||
      effectiveInteractionPhase === 'zoom' ||
      effectiveInteractionPhase === 'drag' ||
      effectiveInteractionPhase === 'precision'
    )
      ? 'interactive'
      : 'normal'
    requestEngineRender(overlayRenderMode, 'overlay-dirty')
  }, [effectiveInteractionPhase, interactionPhase, overlayNodes, requestEngineRender])

  useEngineRendererSceneSync({
    document,
    replayScenePayload,
    shapes,
    statsVersion: stats.version,
    viewport,
    protectedNodeIds,
    transformPreviewActive,
    interactionPhase,
    effectiveInteractionPhase,
    engineRef,
    previousRenderPrepRef,
    hasLoadedSceneInEngineRef,
    previewSceneRevisionRef,
    protectedNodeSignatureRef,
    interactionActiveNodeSignatureRef,
    appliedViewportRef,
    pendingSceneRenderRef,
    latestRenderPrepStatsRef,
    sceneApplyDebugRef,
    runtimeStageTimingMsRef,
    renderRequestStatsRef,
    requestEngineRender,
  })

  React.useEffect(() => {
    renderRequestStatsRef.current.overlayDegraded = overlayDiagnostics?.degraded ?? false
    renderRequestStatsRef.current.overlayGuideInputCount = overlayDiagnostics?.guideInputCount ?? 0
    renderRequestStatsRef.current.overlayGuideKeptCount = overlayDiagnostics?.guideKeptCount ?? 0
    renderRequestStatsRef.current.overlayGuideDroppedCount = overlayDiagnostics?.guideDroppedCount ?? 0
    renderRequestStatsRef.current.overlayGuideSelectionStrategy =
      overlayDiagnostics?.guideSelectionStrategy ?? 'full'
    renderRequestStatsRef.current.overlayPathEditWhitelistActive =
      overlayDiagnostics?.pathEditWhitelistActive ?? false
  }, [overlayDiagnostics])

  useEngineRendererViewport({
    viewport,
    interactionPhase,
    interactionActive,
    renderSurfaceRef,
    engineRef,
    appliedRenderSizeRef,
    appliedOutputSizeRef,
    appliedViewportRef,
    hasCommittedInitialViewportFrameRef,
    viewportReadyRef,
    pendingSceneRenderRef,
    isInteractingRef,
    lastInteractionAtRef,
    deferredFullRedrawHandleRef,
    deferredResizeCommitHandleRef,
    pendingRenderSizeRef,
    deferredFullRedrawTokenRef,
    runtimeStageTimingMsRef,
    renderRequestStatsRef,
    cancelDeferredFullRedraw,
    cancelDeferredResizeCommit,
    cancelScheduledRender,
    requestEngineRender,
  })

  React.useEffect(() => {
    imageCacheRef.current.clear()
  }, [document.id])

  return (
    <canvas
      ref={renderSurfaceRef}
      style={{
        display: 'block',
        position: 'absolute',
        left: -OVERSCAN_PX,
        top: -OVERSCAN_PX,
        width: `calc(100% + ${OVERSCAN_PX * 2}px)`,
        height: `calc(100% + ${OVERSCAN_PX * 2}px)`,
        backgroundColor: '#ffffff',
        pointerEvents: 'none',
      }}
    />
  )
}
