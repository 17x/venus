import * as React from 'react'
import {type EditorDocument} from '../../../model/index.ts'
import type {
  RuntimeEngine as Engine,
  EngineRenderScheduler,
} from '../../engine.ts'
import {createEngine} from '../../engine.ts'
import {buildDocumentImageAssetUrlMap} from '../../../presets/index.ts'
import {type RuntimeRenderPhase} from '../engineTypes.ts'
import {VECTOR_ENGINE_SCENE_PROFILE} from './engineSceneProfile.ts'

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

    const engine = createEngine({
      backend: VECTOR_ENGINE_SCENE_PROFILE.render.backend,
      surface: {
        width: Math.max(1, renderSurface.clientWidth || renderSurface.width || 1),
        height: Math.max(1, renderSurface.clientHeight || renderSurface.height || 1),
        canvas: {
          // Keep bridge dimensions live so backend adapters always project
          // against the current canvas backing-store size after runtime resizes.
          get width() {
            return renderSurface.width
          },
          get height() {
            return renderSurface.height
          },
          getContext: (contextId) => {
            if (contextId === '2d') {
              return renderSurface.getContext('2d') as CanvasRenderingContext2D | null
            }
            if (contextId === 'webgl') {
              return renderSurface.getContext('webgl') as WebGLRenderingContext | null
            }
            return renderSurface.getContext('webgl2') as WebGL2RenderingContext | null
          },
        },
      },
      // AI-TEMP: keep debug wiring on boolean contract during hard-cut; remove when engine exposes typed diagnostics subscription replacing compat onStats callback; ref ai/operations/vector-engine-vnext-feasibility-2026-05-21.md
      debug: ENABLE_RUNTIME_RENDER_DIAGNOSTICS,
    })
    // Mount runtime host so browser-bridge diagnostics reflect real app lifecycle state.
    engine.mount({
      id: 'vector-engine-render-surface',
      surface: renderSurface,
    })
    // AI-TEMP: publish context probe snapshot to isolate persistent missing-context failures in field sessions; remove when in-app diagnostics panel is available; ref DEX-065.
    const hostWindow = window as Window & {
      __venusRenderSurfaceContextDebug?: {
        at: number
        canvasWidth: number
        canvasHeight: number
        has2d: boolean
        hasWebgl: boolean
        hasWebgl2: boolean
      }
    }
    hostWindow.__venusRenderSurfaceContextDebug = {
      at: performance.now(),
      canvasWidth: renderSurface.width,
      canvasHeight: renderSurface.height,
      has2d: Boolean(renderSurface.getContext('2d')),
      hasWebgl: Boolean(renderSurface.getContext('webgl')),
      hasWebgl2: Boolean(renderSurface.getContext('webgl2')),
    }
    params.engineRef.current = engine
    params.hasLoadedSceneInEngineRef.current = false

    // Register loaded images so model-complete image nodes can render.
    const engineWithRegistry = engine as import('../../engine.ts').RuntimeEngine & {
      setImageRegistry?: (images: ReadonlyMap<string, HTMLImageElement>) => void
    };
    if (params.imageCacheRef.current.size > 0) {
      engineWithRegistry.setImageRegistry?.(params.imageCacheRef.current);
    }

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
      engine.unmount()
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
