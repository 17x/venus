import * as React from 'react'
import {type EditorDocument} from '../../../model/index.ts'
import type {CanvasViewportState as EngineViewportState} from '../../../index.ts'
import type {
  RuntimeEngine as Engine,
  EngineRenderScheduler,
} from '../../engine.ts'
import {createEngineRenderScheduler} from '../../engine.ts'
import {
  createEngineSceneAdapterDiagnosticsReport,
  type CreateEngineSceneFromRuntimeSnapshotOptions,
} from '../../../presets/index.ts'
import type {SceneShapeSnapshot} from '../../../shared-memory/index.ts'
import {type EngineRendererProps, type RuntimeRenderPhase} from '../engineTypes.ts'
import {VECTOR_ENGINE_SCENE_PROFILE} from './engineSceneProfile.ts'
import {useEngineRendererLifecycle} from './useEngineRendererLifecycle.ts'
import {useEngineRendererSceneSync} from './useEngineRendererSceneSync.ts'
import {useEngineRendererViewport} from './useEngineRendererViewport.ts'
import {createEngineStatsHandler} from './createEngineStatsHandler/createEngineStatsHandler.ts'
import {resolveEngineBackendRenderPaths} from './engineRenderPathClassification.ts'
import {
  createInitialPlanDiagnostics,
  createInitialRenderPrepStats,
  createInitialRenderRequestStats,
  createInitialRuntimeStageTimingState,
  createInitialSceneApplyDebugState,
} from './engineRenderer.initialState.ts'
import {
  useEngineRendererDeferredRecoveryEffect,
  useEngineRendererInteractionSettleEffect,
  useEngineRendererOverlayDiagnosticsEffect,
  useEngineRendererOverlaySyncEffect,
} from './engineRenderer.effects.ts'
import {
  cancelDeferredFullRedrawHandle,
  cancelDeferredResizeCommitHandle,
  requestDeferredVisualRecoveryFrame,
} from './engineRenderer.scheduling.ts'
import {createEngineStatsPayload} from './engineRenderer.statsPayload.ts'
/**
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
  const lastRenderChainDebugSignatureRef = React.useRef('')

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
  const renderRequestStatsRef = React.useRef(createInitialRenderRequestStats())
  const latestRenderPrepStatsRef = React.useRef(createInitialRenderPrepStats())
  const latestSceneAdapterReportRef = React.useRef(createEngineSceneAdapterDiagnosticsReport([]))
  const latestPlanDiagnosticsRef = React.useRef(createInitialPlanDiagnostics())
  const sceneApplyDebugRef = React.useRef(createInitialSceneApplyDebugState())
  const runtimeStageTimingMsRef = React.useRef(createInitialRuntimeStageTimingState())
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

  const interactionActive = React.useMemo(
    () => isInteractionPhase(effectiveInteractionPhase),
    [effectiveInteractionPhase],
  )

  const effectiveInteractiveIntervalMs = React.useMemo(() => {
    if (interactionActive) {
      return INTERACTION_ACTIVE_SCHEDULER_INTERVAL_MS
    }

    return 8
  }, [interactionActive, INTERACTION_ACTIVE_SCHEDULER_INTERVAL_MS])

  isInteractingRef.current = isInteracting

  const cancelDeferredFullRedraw = React.useCallback(() => {
    cancelDeferredFullRedrawHandle(deferredFullRedrawHandleRef)
  }, [])

  const cancelScheduledRender = React.useCallback(() => {
    renderSchedulerRef.current?.cancel()
  }, [])

  const cancelDeferredResizeCommit = React.useCallback(() => {
    cancelDeferredResizeCommitHandle(deferredResizeCommitHandleRef)
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
    renderRequestStatsRef.current.frameStageSequence += 1
    renderRequestStatsRef.current.frameStageIssuedAtMs = performance.now()
    renderRequestStatsRef.current.frameStageId =
      `frame-stage-${renderRequestStatsRef.current.frameStageSequence}`
    renderRequestStatsRef.current.frameStageSchedulerMode = mode
    renderRequestStatsRef.current.frameStageSceneApplyMode =
      sceneApplyDebugRef.current.lastSceneApplyMode
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

  const requestDeferredVisualRecovery = React.useCallback(() => {
    requestDeferredVisualRecoveryFrame(
      deferredVisualRecoveryPendingRef,
      deferredVisualRecoveryAfterInteractionRef,
      isInteractingRef,
      requestEngineRender,
    )
  }, [requestEngineRender])

  const handleEngineStats = React.useMemo(() => createEngineStatsHandler({
    drawSerialRef,
    renderSchedulerRef,
    engineRef,
    runtimeStageTimingMsRef,
    renderRequestStatsRef,
    lastPlanDiagnosticSampleAtRef,
    latestPlanDiagnosticsRef,
    latestRenderPrepStatsRef,
    latestSceneAdapterReportRef,
    lastZeroVisibilityDebugFrameRef,
    sceneApplyDebugRef,
    deferredVisualRecoveryPendingRef,
    requestDeferredVisualRecovery,
    presentLatencyRafPendingRef,
    requestEngineRender,
  }), [requestDeferredVisualRecovery, requestEngineRender])

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
        return engine.render().then((renderResult) => {
          const diagnostics = engine.getDiagnostics()
          const backendInfo = engine.getBackendInfo()
          const backendDiagnostics = diagnostics.backendDiagnostics
          const backendFeatureGateDiagnostics = backendDiagnostics as {
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
          }
          const renderChain = renderResult.renderChain ?? diagnostics.renderChain
          const backendPresentCompleted = renderChain?.backendPresentCompleted ?? false
          // Keep backend fallback classification deterministic so WebGL/WebGPU
          // parity reports compare equivalent clear/fallback semantics.
          const {webglRenderPath, webgpuRenderPath} = resolveEngineBackendRenderPaths({
            backendResolved: backendInfo.resolved,
            drawCount: renderResult.drawCount,
            visibleCount: renderResult.visibleCount,
            backendPresentCompleted,
            backendWebglRenderPath: backendDiagnostics?.webglRenderPath,
            backendWebgpuRenderPath: backendDiagnostics?.webgpuRenderPath,
          })

          handleEngineStats(createEngineStatsPayload({
            renderResult,
            backendDiagnostics,
            backendResolved: backendInfo.resolved,
            backendPresentCompleted,
            backendFeatureGateDiagnostics,
            engineFrameQuality: renderRequestStatsRef.current.renderPolicyQuality,
            webglRenderPath,
            webgpuRenderPath,
          }))

          if (!VECTOR_ENGINE_SCENE_PROFILE.render.modelCompleteComposite) {
            // AI-TEMP: publish render-chain failure snapshots through window bridge for live field triage; remove when dedicated runtime diagnostics panel is available; ref DEX-065.
            const lastWarning = diagnostics.lastRenderWarning ?? null
            const shouldPublishRenderChainDebug = Boolean(lastWarning) || Boolean(renderChain && (
              renderChain.failedStage !== null ||
              !renderChain.browserBridgeReachable ||
              !renderChain.backendPresentCompleted
            ))

            if (renderChain && shouldPublishRenderChainDebug) {
              const hostWindow = window as Window & {
                __venusRenderChainDebug?: {
                  at: number
                  backendRequested: string
                  backendResolved: string
                  fallbackReason: string | null
                  drawCount: number
                  visibleCount: number
                  renderChain: typeof renderChain
                  lastRenderWarning: typeof lastWarning
                }
              }
              const debugSignature = [
                backendInfo.requested,
                backendInfo.resolved,
                renderChain.failedStage ?? 'ok',
                String(renderChain.browserBridgeReachable),
                String(renderChain.backendPresentCompleted),
                lastWarning?.code ?? 'none',
                lastWarning?.reason ?? 'none',
              ].join('|')
              if (lastRenderChainDebugSignatureRef.current !== debugSignature) {
                hostWindow.__venusRenderChainDebug = {
                  at: performance.now(),
                  backendRequested: backendInfo.requested,
                  backendResolved: backendInfo.resolved,
                  fallbackReason: backendInfo.fallbackReason,
                  drawCount: renderResult.drawCount,
                  visibleCount: renderResult.visibleCount,
                  renderChain,
                  lastRenderWarning: lastWarning,
                }
                lastRenderChainDebugSignatureRef.current = debugSignature
              }
            }
          }

          return renderResult
        })
      },
      interactiveIntervalMs: effectiveInteractiveIntervalMs,
    })
    // Queue one bootstrap frame after scheduler wiring so startup does not
    // depend on viewport/scene effects winning the scheduler initialization race.
    renderSchedulerRef.current.request('normal')

    return () => {
      renderSchedulerRef.current?.dispose()
      renderSchedulerRef.current = null
    }
  }, [effectiveInteractiveIntervalMs])

  useEngineRendererInteractionSettleEffect({
    isInteractionPhase,
    effectiveInteractionPhase,
    interactionSettleMs: INTERACTION_SETTLE_MS,
    viewportOffsetX: viewport.offsetX,
    viewportOffsetY: viewport.offsetY,
    viewportScale: viewport.scale,
    interactionSettleTimerRef,
    lastInteractionAtRef,
    setIsInteracting,
  })

  useEngineRendererDeferredRecoveryEffect({
    isInteracting,
    deferredVisualRecoveryAfterInteractionRef,
    deferredVisualRecoveryPendingRef,
    requestEngineRender,
  })

  useEngineRendererOverlaySyncEffect({
    engineRef,
    overlayNodes,
    interactionPhase,
    effectiveInteractionPhase,
    requestEngineRender,
  })

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
    latestSceneAdapterReportRef,
    sceneApplyDebugRef,
    runtimeStageTimingMsRef,
    renderRequestStatsRef,
    requestEngineRender,
  })

  useEngineRendererOverlayDiagnosticsEffect({
    overlayDiagnostics,
    renderRequestStatsRef,
  })

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
