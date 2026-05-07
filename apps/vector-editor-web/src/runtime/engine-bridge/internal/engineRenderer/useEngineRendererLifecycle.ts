import * as React from 'react'
import {type EditorDocument} from '../../../model/index.ts'
import type {
  RuntimeEngine as Engine,
  EngineRenderScheduler,
} from '../../engine.ts'
import {createEngine} from '../../engine.ts'
import {buildDocumentImageAssetUrlMap} from '../../../presets/index.ts'
import {type RuntimeRenderPhase} from '../engineTypes.ts'
import {createEngineStatsHandler} from './createEngineStatsHandler.ts'

const ENABLE_RUNTIME_RENDER_DIAGNOSTICS = true

/**
 * Manages engine creation/disposal and diagnostics publication for the runtime renderer.
 * @param params Runtime lifecycle dependencies and mutable renderer refs.
 */
export function useEngineRendererLifecycle(params: {
  document: EditorDocument
  renderSurfaceRef: React.MutableRefObject<HTMLCanvasElement | null>
  engineRef: React.MutableRefObject<Engine | null>
  drawSerialRef: React.MutableRefObject<number>
  assetUrlByIdRef: React.MutableRefObject<Map<string, string>>
  imageCacheRef: React.MutableRefObject<Map<string, HTMLImageElement>>
  appliedRenderSizeRef: React.MutableRefObject<{width: number; height: number} | null>
  appliedOutputSizeRef: React.MutableRefObject<{width: number; height: number} | null>
  appliedViewportRef: React.MutableRefObject<{
    viewportWidth: number
    viewportHeight: number
    offsetX: number
    offsetY: number
    scale: number
  } | null>
  hasCommittedInitialViewportFrameRef: React.MutableRefObject<boolean>
  viewportReadyRef: React.MutableRefObject<boolean>
  pendingSceneRenderRef: React.MutableRefObject<boolean>
  interactionSettleTimerRef: React.MutableRefObject<number | null>
  deferredFullRedrawHandleRef: React.MutableRefObject<number | null>
  deferredResizeCommitHandleRef: React.MutableRefObject<number | null>
  pendingRenderSizeRef: React.MutableRefObject<{width: number; height: number} | null>
  renderSchedulerRef: React.MutableRefObject<EngineRenderScheduler | null>
  deferredVisualRecoveryPendingRef: React.MutableRefObject<boolean>
  hasLoadedSceneInEngineRef: React.MutableRefObject<boolean>
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
  presentLatencyRafPendingRef: React.MutableRefObject<boolean>
  lastZeroVisibilityDebugFrameRef: React.MutableRefObject<number>
  lastPlanDiagnosticSampleAtRef: React.MutableRefObject<number>
  latestRenderPrepStatsRef: React.MutableRefObject<{
    dirtyCandidateCount: number
    dirtyOffscreenCount: number
    offscreenSceneDirtySkipConsecutiveCount: number
    dirtyBoundsMarkCount: number
    dirtyBoundsMarkArea: number
  }>
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
  sceneApplyDebugRef: React.MutableRefObject<{
    lastSceneApplyMode: 'none' | 'full-load' | 'preview-load' | 'incremental-patch'
    lastSceneApplyRevision: string
    lastSceneShapeCount: number
    lastScenePatchUpsertCount: number
    sceneLoadCount: number
    scenePatchCount: number
  }>
  renderRequestStatsRef: React.MutableRefObject<{
    lastReason: string
    renderPhase: RuntimeRenderPhase
    renderPhaseTransitionCount: number
    lastRenderPhaseTransition: string
    renderPolicyQuality: 'full' | 'interactive'
    renderPolicyDpr: number | 'auto'
    viewportInteractionType: 'pan' | 'zoom' | 'other'
    overlayMode: 'full' | 'degraded'
    renderPolicyTransitionCount: number
    lastRenderPolicyTransition: string
    sideTargetDpr: number
    outputDpr: number
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
    canvasResizeCommitCount: number
    canvasResizeDeferredCommitCount: number
    canvasResizeLastCommitReason: string
    canvasResizeLastOutputSize: string
  }>
  isInteractingRef: React.MutableRefObject<boolean>
  cancelDeferredFullRedraw: () => void
  cancelDeferredResizeCommit: () => void
  cancelScheduledRender: () => void
  requestDeferredVisualRecovery: () => void
  requestEngineRender: (
    mode?: 'interactive' | 'normal',
    reason?: 'scene-dirty' | 'deferred-image-drain' | 'idle-redraw' | 'interactive-viewport' | 'camera-animation' | 'overlay-dirty',
  ) => void
}): void {
  React.useEffect(() => {
    params.assetUrlByIdRef.current = buildDocumentImageAssetUrlMap(params.document)
  }, [params.assetUrlByIdRef, params.document])

  React.useEffect(() => {
    const renderSurface = params.renderSurfaceRef.current
    if (!renderSurface) {
      return
    }

    const onStats = createEngineStatsHandler({
      drawSerialRef: params.drawSerialRef,
      renderSchedulerRef: params.renderSchedulerRef,
      engineRef: params.engineRef as React.MutableRefObject<{
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
      } | null>,
      runtimeStageTimingMsRef: params.runtimeStageTimingMsRef,
      renderRequestStatsRef: params.renderRequestStatsRef,
      lastPlanDiagnosticSampleAtRef: params.lastPlanDiagnosticSampleAtRef,
      latestPlanDiagnosticsRef: params.latestPlanDiagnosticsRef,
      latestRenderPrepStatsRef: params.latestRenderPrepStatsRef,
      lastZeroVisibilityDebugFrameRef: params.lastZeroVisibilityDebugFrameRef,
      sceneApplyDebugRef: params.sceneApplyDebugRef,
      deferredVisualRecoveryPendingRef: params.deferredVisualRecoveryPendingRef,
      requestDeferredVisualRecovery: params.requestDeferredVisualRecovery,
      presentLatencyRafPendingRef: params.presentLatencyRafPendingRef,
      isInteractingRef: params.isInteractingRef,
      requestEngineRender: params.requestEngineRender,
    })
    const engineOnStats = onStats as NonNullable<
      NonNullable<Parameters<typeof createEngine>[0]['debug']>['onStats']
    >

    const engine = createEngine({
      canvas: renderSurface,
      host: {
        resolvePixelRatio: () => window.devicePixelRatio || 1,
        createCanvasSurface: (width: number, height: number) => {
          const element = window.document.createElement('canvas')
          element.width = width
          element.height = height
          return element
        },
      },
      render: {
        webglClearColor: [1, 1, 1, 1],
        layeredBridgeEnabled: true,
      },
      resource: {
        loader: {
          resolveImage: (assetId: string) => {
            const src = params.assetUrlByIdRef.current.get(assetId)
            if (!src) {
              return null
            }

            const cached = params.imageCacheRef.current.get(src)
            if (cached) {
              return cached.complete && cached.naturalWidth > 0
                ? cached
                : null
            }

            const image = new Image()
            image.decoding = 'async'
            image.onload = () => {
              params.requestDeferredVisualRecovery()
            }
            image.onerror = () => {
              params.imageCacheRef.current.delete(src)
            }
            image.src = src
            params.imageCacheRef.current.set(src, image)
            return null
          },
        },
      },
      debug: {
        onStats: ENABLE_RUNTIME_RENDER_DIAGNOSTICS ? engineOnStats : undefined,
      },
    })
    params.engineRef.current = engine
    params.hasLoadedSceneInEngineRef.current = false

    return () => {
      params.cancelDeferredFullRedraw()
      params.cancelDeferredResizeCommit()
      params.cancelScheduledRender()
      if (params.interactionSettleTimerRef.current !== null) {
        window.clearTimeout(params.interactionSettleTimerRef.current)
        params.interactionSettleTimerRef.current = null
      }
      params.appliedRenderSizeRef.current = null
      params.appliedOutputSizeRef.current = null
      params.appliedViewportRef.current = null
      params.hasCommittedInitialViewportFrameRef.current = false
      params.viewportReadyRef.current = false
      params.pendingSceneRenderRef.current = false
      params.deferredVisualRecoveryPendingRef.current = false
      params.hasLoadedSceneInEngineRef.current = false
      params.pendingRenderSizeRef.current = null
      params.engineRef.current = null
      engine.dispose()
    }
  }, [
    params.cancelDeferredFullRedraw,
    params.cancelDeferredResizeCommit,
    params.cancelScheduledRender,
    params.requestDeferredVisualRecovery,
    params.requestEngineRender,
  ])
}
