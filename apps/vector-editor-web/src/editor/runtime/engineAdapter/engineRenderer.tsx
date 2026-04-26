import * as React from 'react'
import {type EditorDocument} from '@vector/model'
import type {CanvasViewportState as EngineViewportState} from '@vector/runtime'
import type {
  Engine,
  EngineRenderScheduler,
} from '@vector/runtime/engine'
import {
  createEngine,
  createEngineRenderScheduler,
} from '@vector/runtime/engine'
import {
  publishRuntimeRenderDiagnostics,
} from '../../../runtime/events/index.ts'
import {
  buildDocumentImageAssetUrlMap,
  createEngineSceneFromRuntimeSnapshot,
  type CreateEngineSceneFromRuntimeSnapshotOptions,
} from '@vector/runtime/presets'
import type {SceneShapeSnapshot} from '@vector/runtime/shared-memory'
import {prepareRenderFrame} from '../../render-prep/prepareFrame.ts'
import {
  resolveRuntimeRenderPolicy,
  DEFAULT_RUNTIME_DIRTY_REGION_DIAGNOSTICS_POLICY,
  DEFAULT_RUNTIME_DIRTY_REGION_RISK_POLICY,
  DEFAULT_RUNTIME_DIRTY_REGION_RISK_SCORE_POLICY,
  DEFAULT_RUNTIME_DIRTY_REGION_TREND_POLICY,
  type RuntimeRenderPhase,
} from '../renderPolicy.ts'
import {buildRuntimeDiagnosticsPayload} from '../runtimeDiagnosticsPayload.ts'
import {resolveExpandedChangedIds, resolveMergedNodeBounds} from './scenePatch.ts'
import {ENGINE_RENDER_LOD_CONFIG, type EngineRendererProps} from './engineTypes.ts'

const ENABLE_RUNTIME_RENDER_DIAGNOSTICS = true
// Gate camera animation integration for controlled rollout during tuning.
const ENABLE_CAMERA_ANIMATION = true
// Keep cache-only disabled by default until preview-hit stability is verified.
const CAMERA_ANIMATION_ZOOM_CACHE_PREVIEW_ONLY = false
// Use immediate camera updates for pan to avoid lag/offset drift under dense input.
const CAMERA_ANIMATION_PAN_DURATION_MS = 0
// Use immediate zoom target updates to prevent repeated animation restarts from stalling.
const CAMERA_ANIMATION_ZOOM_DURATION_MS = 0

// Keep renderer orchestration in a dedicated module so viewport and scene-patch
// concerns can evolve independently without growing one monolithic file.
export function EngineRenderer({
  document,
  shapes,
  stats,
  viewport,
  protectedNodeIds,
  overlayDiagnostics,
  interactionPhase = 'settled',
  viewportInteractionType = 'other',
  lodLevel = 0,
  lodConfig,
}: EngineRendererProps) {
  // Derive camera animation behavior by interaction type so cache-only policy
  // can favor smooth zoom while keeping pan resilient to preview misses.
  const resolveCameraAnimationPolicy = React.useCallback(() => {
    if (viewportInteractionType === 'zoom') {
      return {
        durationMs: CAMERA_ANIMATION_ZOOM_DURATION_MS,
        easing: 'linear' as const,
        cachePreviewOnly: CAMERA_ANIMATION_ZOOM_CACHE_PREVIEW_ONLY,
      }
    }

    return {
      durationMs: CAMERA_ANIMATION_PAN_DURATION_MS,
      easing: 'linear' as const,
      cachePreviewOnly: false,
    }
  }, [viewportInteractionType])

  const INTERACTION_SETTLE_MS = 120
  const PLAN_DIAGNOSTIC_SAMPLE_MS = 1200
  const FULL_REDRAW_QUIET_WINDOW_MS = 140
  const FULL_REDRAW_IDLE_TIMEOUT_MS = 80
  const FULL_REDRAW_DEFER_MS = 32
  const DPR_RESTORE_DEFER_MS = 220
  const RESIZE_COMMIT_DEFER_MS = 260
  const RESIZE_COMMIT_THRESHOLD_PX = 96
  const FORCE_STABLE_DPR = true
  // Keep interaction-time backing resolution conservative to protect frame pacing.
  const STABLE_DPR_VALUE = 1
  const SCENE_DIRTY_SKIP_FORCE_RENDER_FRAMES =
    DEFAULT_RUNTIME_DIRTY_REGION_DIAGNOSTICS_POLICY.sceneDirtySkipForceRenderFrames
  const DIRTY_BOUNDS_SMALL_AREA_PX2 =
    DEFAULT_RUNTIME_DIRTY_REGION_DIAGNOSTICS_POLICY.dirtyBoundsSmallAreaPx2
  const DIRTY_BOUNDS_MEDIUM_AREA_PX2 =
    DEFAULT_RUNTIME_DIRTY_REGION_DIAGNOSTICS_POLICY.dirtyBoundsMediumAreaPx2
  // Keep moderate overscan so panning stays stable without oversized render targets.
  const OVERSCAN_PX = 96
  // Keep host surface naming engine-centric even though the DOM element is a canvas.
  const renderSurfaceRef = React.useRef<HTMLCanvasElement | null>(null)
  const engineRef = React.useRef<Engine | null>(null)
  const drawSerialRef = React.useRef(0)
  const assetUrlByIdRef = React.useRef<Map<string, string>>(new Map())
  const imageCacheRef = React.useRef<Map<string, HTMLImageElement>>(new Map())
  const appliedQualityRef = React.useRef<'full' | 'interactive' | null>(null)
  const appliedDprRef = React.useRef<number | 'auto' | null>(null)
  const appliedRenderSizeRef = React.useRef<{width: number; height: number} | null>(null)
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
  const deferredDprRestoreHandleRef = React.useRef<number | null>(null)
  const deferredResizeCommitHandleRef = React.useRef<number | null>(null)
  const pendingRenderSizeRef = React.useRef<{width: number; height: number} | null>(null)
  const deferredFullRedrawTokenRef = React.useRef(0)
  const renderSchedulerRef = React.useRef<EngineRenderScheduler | null>(null)
  const deferredImageWakeupPendingRef = React.useRef(false)
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
  const previewSceneRevisionRef = React.useRef(0)
  const hasLoadedSceneInEngineRef = React.useRef(false)
  const cameraAnimationActiveRef = React.useRef(false)
  const measuredSurfaceSizeRef = React.useRef<{width: number; height: number} | null>(null)
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
    }),
    [document, shapes, stats.version],
  )
  const renderPolicy = React.useMemo(
    () => resolveRuntimeRenderPolicy({
      phase: interactionPhase,
      lodLevel,
      lodConfig,
    }),
    [interactionPhase, lodConfig, lodLevel],
  )
  const effectiveInteractiveIntervalMs = React.useMemo(() => {
    // Keep interaction frames unthrottled so scheduler delay does not dominate
    // pan/zoom frame pacing under continuous pointer input.
    if (renderPolicy.interactionActive) {
      return 0
    }

    return renderPolicy.interactiveIntervalMs
  }, [renderPolicy.interactionActive, renderPolicy.interactiveIntervalMs])

  isInteractingRef.current = isInteracting

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

  const cancelScheduledRender = React.useCallback(() => {
    renderSchedulerRef.current?.cancel()
  }, [])

  const cancelDeferredResizeCommit = React.useCallback(() => {
    if (deferredResizeCommitHandleRef.current === null) {
      return
    }

    // Coalesce viewport resize commits so canvas realloc does not thrash.
    window.clearTimeout(deferredResizeCommitHandleRef.current)
    deferredResizeCommitHandleRef.current = null
  }, [])

  const cancelDeferredDprRestore = React.useCallback(() => {
    if (deferredDprRestoreHandleRef.current === null) {
      return
    }

    // Clear deferred DPR restore when interaction resumes to avoid resize thrash.
    window.clearTimeout(deferredDprRestoreHandleRef.current)
    deferredDprRestoreHandleRef.current = null
  }, [])

  const requestEngineRender = React.useCallback((
    mode: 'interactive' | 'normal' = 'normal',
    reason: 'scene-dirty' | 'deferred-image-drain' | 'idle-redraw' | 'interactive-viewport' | 'camera-animation' = 'scene-dirty',
  ) => {
    // Track request sources in the app adapter so idle redraw churn can be
    // attributed without touching the engine scheduler contract.
    renderRequestStatsRef.current.lastReason = reason
    if (reason === 'scene-dirty') {
      renderRequestStatsRef.current.sceneDirtyCount += 1
    } else if (reason === 'deferred-image-drain') {
      renderRequestStatsRef.current.deferredImageDrainCount += 1
    } else if (reason === 'idle-redraw') {
      renderRequestStatsRef.current.idleRedrawCount += 1
    } else if (reason === 'interactive-viewport') {
      renderRequestStatsRef.current.interactiveCount += 1
    } else if (reason === 'camera-animation') {
      renderRequestStatsRef.current.interactiveCount += 1
    }
    renderSchedulerRef.current?.request(mode)
  }, [])

  React.useEffect(() => {
    assetUrlByIdRef.current = buildDocumentImageAssetUrlMap(document)
  }, [document])

  React.useEffect(() => {
    const renderSurface = renderSurfaceRef.current
    if (!renderSurface) {
      return
    }

    const engine = createEngine({
      canvas: renderSurface,
      // Keep runtime performance knobs grouped so each capability can be
      // toggled independently during engine strategy tuning.
      performance: {
        culling: true,
        lod: ENGINE_RENDER_LOD_CONFIG as {
          enabled: boolean
          options?: {
            mode?: 'conservative' | 'moderate' | 'aggressive'
          }
        },
        // Keep tile cache disabled until incremental tile reuse is stable.
        tiles: {
          enabled: true,
          tileSizePx: 512,
          maxCacheSize: 64,
        },
        // Keep overscan disabled because app-side render overscan is managed
        // separately through viewport sizing in this adapter.
        overscan: {
          enabled: true,
          borderPx: 240,
        },
      },
      render: {
        quality: 'full',
        webglClearColor: [0.9529, 0.9569, 0.9647, 1],
        interactionPreview: {
          enabled: false,
        },
      },
      resource: {
        loader: {
          resolveImage: (assetId) => {
            const src = assetUrlByIdRef.current.get(assetId)
            if (!src) {
              return null
            }

            const cached = imageCacheRef.current.get(src)
            if (cached) {
              return cached.complete && cached.naturalWidth > 0
                ? cached
                : null
            }

            const image = new Image()
            image.decoding = 'async'
            // Resume a settled render only when the browser has an actual image
            // ready, instead of spinning deferred drain frames with no upload progress.
            image.onload = () => {
              if (
                isInteractingRef.current ||
                deferredImageWakeupPendingRef.current
              ) {
                return
              }

              deferredImageWakeupPendingRef.current = true
              requestEngineRender('normal', 'idle-redraw')
            }
            image.onerror = () => {
              imageCacheRef.current.delete(src)
            }
            image.src = src
            imageCacheRef.current.set(src, image)
            return null
          },
        },
      },
      debug: {
        onStats: (nextStats) => {
          if (!ENABLE_RUNTIME_RENDER_DIAGNOSTICS) {
            return
          }
          const webglStats = nextStats as typeof nextStats & {
            engineFrameQuality?: 'full' | 'interactive'
            webglRenderPath?: 'model-complete' | 'packet'
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
            cacheFallbackReason?: string
            webglPreviewReuseMs?: number
            webglPlanBuildMs?: number
            webglTextureUploadMs?: number
            webglDrawSubmitMs?: number
            webglSnapshotCaptureMs?: number
            webglModelRenderMs?: number
            cameraAnimationActive?: boolean
            cameraAnimationCachePreviewOnly?: boolean
            cameraAnimationPreviewHitCount?: number
            cameraAnimationPreviewMissCount?: number
          }
          const schedulerDiagnostics = renderSchedulerRef.current?.getDiagnostics?.()
          if (schedulerDiagnostics) {
            // Capture scheduler-side wait/throttle attribution per published frame.
            runtimeStageTimingMsRef.current.schedulerQueueWaitMs =
              schedulerDiagnostics.lastQueueWaitMs
            runtimeStageTimingMsRef.current.schedulerThrottleDelayMs =
              schedulerDiagnostics.lastInteractiveThrottleDelayMs
          }
          const now = performance.now()
          let plannerSampleMs = 0
          if (now - lastPlanDiagnosticSampleAtRef.current >= PLAN_DIAGNOSTIC_SAMPLE_MS) {
            // Sample planner diagnostics cost so debug panel can separate
            // sampling overhead from draw/scene workloads.
            const plannerSampleStart = performance.now()
            // Poll planner diagnostics at a lower cadence so debug introspection
            // does not add fixed per-frame overhead to interactive rendering.
            const runtimeDiagnostics = engineRef.current?.getDiagnostics()
            const shortlistDiagnostics = (runtimeDiagnostics as {
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
            } | undefined)?.shortlist
            const framePlanVersion = runtimeDiagnostics?.framePlan?.planVersion ?? 0
            const framePlanCandidateCount = runtimeDiagnostics?.framePlan?.candidateCount ?? 0
            const framePlanSceneNodeCount = runtimeDiagnostics?.framePlan?.sceneNodeCount ?? 0
            const framePlanVisibleRatio = framePlanSceneNodeCount > 0
              ? framePlanCandidateCount / framePlanSceneNodeCount
              : 0
            latestPlanDiagnosticsRef.current = {
              framePlanVersion,
              framePlanCandidateCount,
              framePlanSceneNodeCount,
              framePlanVisibleRatio,
              framePlanShortlistActive: shortlistDiagnostics?.active ?? false,
              framePlanShortlistCandidateRatio: shortlistDiagnostics?.candidateRatio ?? 0,
              framePlanShortlistAppliedCandidateCount:
                shortlistDiagnostics?.appliedCandidateCount ?? 0,
              framePlanShortlistPendingState:
                shortlistDiagnostics?.pendingState ?? null,
              framePlanShortlistPendingFrameCount:
                shortlistDiagnostics?.pendingFrameCount ?? 0,
              framePlanShortlistToggleCount:
                shortlistDiagnostics?.toggleCount ?? 0,
              framePlanShortlistDebounceBlockedToggleCount:
                shortlistDiagnostics?.debounceBlockedToggleCount ?? 0,
              framePlanShortlistEnterRatioThreshold:
                shortlistDiagnostics?.enterRatioThreshold ?? 0,
              framePlanShortlistLeaveRatioThreshold:
                shortlistDiagnostics?.leaveRatioThreshold ?? 0,
              framePlanShortlistStableFrameCount:
                shortlistDiagnostics?.stableFrameCount ?? 0,
              hitPlanVersion: runtimeDiagnostics?.hitPlan?.planVersion ?? 0,
              hitPlanCandidateCount: runtimeDiagnostics?.hitPlan?.candidateCount ?? 0,
              hitPlanHitCount: runtimeDiagnostics?.hitPlan?.hitCount ?? 0,
              hitPlanExactCheckCount: (
                runtimeDiagnostics?.hitPlan as {exactCheckCount?: number} | null | undefined
              )?.exactCheckCount ?? 0,
            }
            lastPlanDiagnosticSampleAtRef.current = now
            plannerSampleMs = performance.now() - plannerSampleStart
          }
          runtimeStageTimingMsRef.current.plannerSampleMs = plannerSampleMs
          const planDiagnostics = latestPlanDiagnosticsRef.current
          const renderPrepDirtyCandidateCount = latestRenderPrepStatsRef.current.dirtyCandidateCount
          const renderPrepDirtyOffscreenCount = latestRenderPrepStatsRef.current.dirtyOffscreenCount
          const offscreenSceneDirtySkipConsecutiveCount =
            latestRenderPrepStatsRef.current.offscreenSceneDirtySkipConsecutiveCount
          const dirtyBoundsMarkCount = latestRenderPrepStatsRef.current.dirtyBoundsMarkCount
          const dirtyBoundsMarkArea = latestRenderPrepStatsRef.current.dirtyBoundsMarkArea
          const deferredImageTextureCount =
            webglStats.webglDeferredImageTextureCount ?? 0
          const renderRequestStats = renderRequestStatsRef.current
          const groupCollapseStats = nextStats as {
            groupCollapseCount?: number
            groupCollapseCulledCount?: number
          }

          if (
            nextStats.visibleCount <= 0 &&
            planDiagnostics.framePlanSceneNodeCount <= 0 &&
            drawSerialRef.current !== lastZeroVisibilityDebugFrameRef.current
          ) {
            // Capture first-class debug context when rendering drops to 0/0 so
            // root-cause analysis can start from event entry instead of guesswork.
            const hostWindow = window as Window & {
              __venusZeroVisibilityDebug?: {
                at: number
                frameCount: number
                renderPhase: RuntimeRenderPhase
                viewportInteractionType: 'pan' | 'zoom' | 'other'
                lastRenderRequestReason: string
                sceneApply: typeof sceneApplyDebugRef.current
                lastZoomDiagnostic?: unknown
              }
            }
            hostWindow.__venusZeroVisibilityDebug = {
              at: performance.now(),
              frameCount: drawSerialRef.current,
              renderPhase: renderRequestStats.renderPhase,
              viewportInteractionType: renderRequestStats.viewportInteractionType,
              lastRenderRequestReason: renderRequestStats.lastReason,
              sceneApply: sceneApplyDebugRef.current,
              lastZoomDiagnostic: (window as Window & {__venusLastZoomDiagnostic?: unknown}).__venusLastZoomDiagnostic,
            }
            lastZeroVisibilityDebugFrameRef.current = drawSerialRef.current
          }

          deferredImageWakeupPendingRef.current = false

          drawSerialRef.current += 1
          const diagnosticsPublishStart = performance.now()
          const diagnosticsPayload = buildRuntimeDiagnosticsPayload({
            frameCount: drawSerialRef.current,
            renderStats: {
              drawCount: nextStats.drawCount,
              frameMs: nextStats.frameMs,
              visibleCount: nextStats.visibleCount,
              cacheHits: nextStats.cacheHits,
              cacheMisses: nextStats.cacheMisses,
              frameReuseHits: nextStats.frameReuseHits,
              frameReuseMisses: nextStats.frameReuseMisses,
              // Forward renderer-owned frame diagnostics so debug panel can
              // correlate low FPS with tile/dirty/initial-render behavior.
              tileCacheSize: nextStats.tileCacheSize,
              tileDirtyCount: nextStats.tileDirtyCount,
              tileCacheTotalBytes: nextStats.tileCacheTotalBytes,
              tileUploadCount: nextStats.tileUploadCount,
              tileRenderCount: nextStats.tileRenderCount,
              visibleTileCount: nextStats.visibleTileCount,
              tileSchedulerPendingCount: nextStats.tileSchedulerPendingCount,
              gpuTextureBytes: nextStats.gpuTextureBytes,
              imageTextureBytes: nextStats.imageTextureBytes,
              initialRenderPhase: nextStats.initialRenderPhase,
              initialRenderProgress: nextStats.initialRenderProgress,
              dirtyRegionCount: nextStats.dirtyRegionCount,
              dirtyTileCount: nextStats.dirtyTileCount,
              incrementalUpdateCount: nextStats.incrementalUpdateCount,
              cameraAnimationActive: webglStats.cameraAnimationActive,
              cameraAnimationCachePreviewOnly: webglStats.cameraAnimationCachePreviewOnly,
              cameraAnimationPreviewHitCount: webglStats.cameraAnimationPreviewHitCount,
              cameraAnimationPreviewMissCount: webglStats.cameraAnimationPreviewMissCount,
            },
            // Publish stage-level timings for frame-time hotspot analysis.
            runtimeStageTimingMs: runtimeStageTimingMsRef.current,
            webglStats: {
              ...webglStats,
              webglDeferredImageTextureCount: deferredImageTextureCount,
            },
            groupCollapseStats,
            planDiagnostics,
            renderPrepDiagnostics: {
              renderPrepDirtyCandidateCount,
              renderPrepDirtyOffscreenCount,
              offscreenSceneDirtySkipConsecutiveCount,
              dirtyBoundsMarkCount,
              dirtyBoundsMarkArea,
            },
            renderRequestStats,
            offscreenSceneDirtyForceRenderFrameThreshold:
              SCENE_DIRTY_SKIP_FORCE_RENDER_FRAMES,
            dirtyBoundsSmallAreaThreshold: DIRTY_BOUNDS_SMALL_AREA_PX2,
            dirtyBoundsMediumAreaThreshold: DIRTY_BOUNDS_MEDIUM_AREA_PX2,
            offscreenSceneDirtyRiskWatchSkipRateThreshold:
              DEFAULT_RUNTIME_DIRTY_REGION_RISK_POLICY.watchSkipRateThreshold,
            offscreenSceneDirtyRiskHighSkipRateThreshold:
              DEFAULT_RUNTIME_DIRTY_REGION_RISK_POLICY.highSkipRateThreshold,
            offscreenSceneDirtyRiskHighForcedPerSecondThreshold:
              DEFAULT_RUNTIME_DIRTY_REGION_RISK_POLICY.highForcedPerSecondThreshold,
            sceneDirtyProlongedHighRiskSecondsThreshold:
              DEFAULT_RUNTIME_DIRTY_REGION_RISK_POLICY.prolongedHighRiskSecondsThreshold,
            sceneDirtyTransitionRateWatchThreshold:
              DEFAULT_RUNTIME_DIRTY_REGION_RISK_POLICY.transitionRateWatchThreshold,
            sceneDirtyTrendWindowFrames:
              DEFAULT_RUNTIME_DIRTY_REGION_TREND_POLICY.trendWindowFrames,
            offscreenSceneDirtyForcedSpikePerSecondThreshold:
              DEFAULT_RUNTIME_DIRTY_REGION_TREND_POLICY.forcedSpikePerSecondThreshold,
            offscreenSceneDirtySkipSpikePerSecondThreshold:
              DEFAULT_RUNTIME_DIRTY_REGION_TREND_POLICY.skipSpikePerSecondThreshold,
            sceneDirtyRiskScoreHighThreshold:
              DEFAULT_RUNTIME_DIRTY_REGION_TREND_POLICY.riskScoreHighThreshold,
            sceneDirtyRiskScoreSkipWeight:
              DEFAULT_RUNTIME_DIRTY_REGION_RISK_SCORE_POLICY.skipWeight,
            sceneDirtyRiskScoreForcedWeight:
              DEFAULT_RUNTIME_DIRTY_REGION_RISK_SCORE_POLICY.forcedWeight,
            sceneDirtyRiskScoreStreakWeight:
              DEFAULT_RUNTIME_DIRTY_REGION_RISK_SCORE_POLICY.streakWeight,
            sceneDirtyRiskScoreForcedRateScale:
              DEFAULT_RUNTIME_DIRTY_REGION_RISK_SCORE_POLICY.forcedRateScale,
          })
          runtimeStageTimingMsRef.current.diagnosticsPublishMs =
            performance.now() - diagnosticsPublishStart
          // Build diagnostics payload in a dedicated module to keep this
          // adapter focused on orchestration and lifecycle responsibilities.
          publishRuntimeRenderDiagnostics({
            ...diagnosticsPayload,
            diagnosticsPublishMs: runtimeStageTimingMsRef.current.diagnosticsPublishMs,
            cameraAnimationActive: webglStats.cameraAnimationActive ?? false,
            cameraAnimationCachePreviewOnly: webglStats.cameraAnimationCachePreviewOnly ?? false,
            cameraAnimationPreviewHitCount: webglStats.cameraAnimationPreviewHitCount ?? 0,
            cameraAnimationPreviewMissCount: webglStats.cameraAnimationPreviewMissCount ?? 0,
          })

          if (!presentLatencyRafPendingRef.current) {
            presentLatencyRafPendingRef.current = true
            const presentProbeStart = performance.now()
            // Approximate request->next-paint delay as a present-latency proxy.
            requestAnimationFrame(() => {
              runtimeStageTimingMsRef.current.presentRafDelayMs =
                performance.now() - presentProbeStart
              presentLatencyRafPendingRef.current = false
            })
          }

          if (webglStats.cameraAnimationActive && !isInteractingRef.current) {
            // Drive camera-only settle animations, but avoid duplicate scheduling
            // while pointer interaction already requests interactive frames.
            requestEngineRender('interactive', 'camera-animation')
          }

          // No auto-drain chaining here: image uploads wake rendering via
          // image.onload to prevent self-sustaining deferred request loops.
        },
      },
    })
    engineRef.current = engine
    // Reset bootstrap state for each engine lifecycle so scene ingestion does
    // not rely on stale diff state from a previous engine instance.
    hasLoadedSceneInEngineRef.current = false
    renderSchedulerRef.current = createEngineRenderScheduler({
      render: () => engine.renderFrame(),
      interactiveIntervalMs: effectiveInteractiveIntervalMs,
    })

    // Cache host canvas dimensions via ResizeObserver to avoid per-frame
    // layout reads in viewport commit path.
    measuredSurfaceSizeRef.current = {
      width: renderSurface.clientWidth,
      height: renderSurface.clientHeight,
    }
    const resizeObserver = typeof ResizeObserver !== 'undefined'
      ? new ResizeObserver((entries) => {
        const entry = entries[0]
        if (!entry) {
          return
        }

        const measuredWidth = Math.max(1, Math.floor(entry.contentRect.width))
        const measuredHeight = Math.max(1, Math.floor(entry.contentRect.height))
        measuredSurfaceSizeRef.current = {
          width: measuredWidth,
          height: measuredHeight,
        }
      })
      : null
    resizeObserver?.observe(renderSurface)

    return () => {
      resizeObserver?.disconnect()
      cancelDeferredFullRedraw()
      cancelDeferredDprRestore()
      cancelDeferredResizeCommit()
      cancelScheduledRender()
      if (interactionSettleTimerRef.current !== null) {
        window.clearTimeout(interactionSettleTimerRef.current)
        interactionSettleTimerRef.current = null
      }
      renderSchedulerRef.current?.dispose()
      renderSchedulerRef.current = null
      appliedQualityRef.current = null
      appliedDprRef.current = null
      appliedRenderSizeRef.current = null
      appliedViewportRef.current = null
      hasCommittedInitialViewportFrameRef.current = false
      viewportReadyRef.current = false
      pendingSceneRenderRef.current = false
      deferredImageWakeupPendingRef.current = false
      hasLoadedSceneInEngineRef.current = false
      cameraAnimationActiveRef.current = false
      pendingRenderSizeRef.current = null
      measuredSurfaceSizeRef.current = null
      engineRef.current = null
      engine.dispose()
    }
  }, [
    cancelDeferredDprRestore,
    cancelDeferredFullRedraw,
    cancelDeferredResizeCommit,
    cancelScheduledRender,
    effectiveInteractiveIntervalMs,
  ])

  React.useEffect(() => {
    const engine = engineRef.current
    if (!engine) {
      return
    }

    renderSchedulerRef.current?.dispose()
    renderSchedulerRef.current = createEngineRenderScheduler({
      render: () => engine.renderFrame(),
      interactiveIntervalMs: effectiveInteractiveIntervalMs,
    })

    return () => {
      renderSchedulerRef.current?.dispose()
      renderSchedulerRef.current = null
    }
  }, [effectiveInteractiveIntervalMs])

  React.useEffect(() => {
    lastInteractionAtRef.current = performance.now()
    setIsInteracting(true)
    if (interactionSettleTimerRef.current !== null) {
      window.clearTimeout(interactionSettleTimerRef.current)
    }
    interactionSettleTimerRef.current = window.setTimeout(() => {
      setIsInteracting(false)
      interactionSettleTimerRef.current = null
    }, INTERACTION_SETTLE_MS)
  }, [INTERACTION_SETTLE_MS, viewport.offsetX, viewport.offsetY, viewport.scale])

  React.useEffect(() => {
    const engine = engineRef.current
    if (!engine) {
      return
    }
    let scenePrepareMs = 0
    let sceneApplyMs = 0

    const sceneDirtyRenderMode: 'interactive' | 'normal' =
      interactionPhase === 'pan' || interactionPhase === 'zoom'
        ? 'interactive'
        : 'normal'

    const normalizedProtectedNodeIds = (
      protectedNodeIds
      ? [...protectedNodeIds]
      : shapes.filter((shape) => shape.isSelected).map((shape) => shape.id)
    ).sort()
    const protectedNodeSignature = normalizedProtectedNodeIds.join('|')
    if (protectedNodeSignatureRef.current !== protectedNodeSignature) {
      // Keep selected nodes and their ancestor groups out of aggressive
      // collapse so active manipulation remains visually stable.
      const engineWithProtectedNodes = engine as Engine & {
        setProtectedNodeIds?: (nodeIds?: readonly string[]) => void
      }
      engineWithProtectedNodes.setProtectedNodeIds?.(normalizedProtectedNodeIds)
      protectedNodeSignatureRef.current = protectedNodeSignature
    }

    const previous = previousRenderPrepRef.current
    const shouldBootstrapScene = !hasLoadedSceneInEngineRef.current
    const sceneRevisionStable = Boolean(
      previous &&
      previous.revision === stats.version &&
      previous.document === document,
    )

    // Skip expensive scene diff/prep for viewport-only updates (common during
    // wheel/pinch zoom) when scene revision and document identity are stable.
    if (!shouldBootstrapScene && sceneRevisionStable) {
      // Explicitly record fast-path scene timings so viewport-only frames are
      // distinguishable from full scene-prep frames in diagnostics.
      runtimeStageTimingMsRef.current.scenePrepareMs = 0
      runtimeStageTimingMsRef.current.sceneApplyMs = 0
      latestRenderPrepStatsRef.current = {
        dirtyCandidateCount: 0,
        dirtyOffscreenCount: 0,
        offscreenSceneDirtySkipConsecutiveCount: 0,
        dirtyBoundsMarkCount: 0,
        dirtyBoundsMarkArea: 0,
      }
      renderRequestStatsRef.current.lastReason = 'viewport-only-scene-skip'
      previousRenderPrepRef.current = {
        revision: stats.version,
        document,
        shapes,
        viewport,
      }
      return
    }

    const previousFrameCandidateIds =
      engine.getDiagnostics().framePlan?.candidateNodeIds
    const scenePrepareStart = performance.now()
    const preparedFrame = prepareRenderFrame({
      revision: stats.version,
      document,
      previousDocument: previous?.document ?? null,
      shapes,
      previousShapes: previous?.shapes ?? [],
      previousFrameCandidateIds,
      overlay: {
        selectedShapeIds: shapes.filter((shape) => shape.isSelected).map((shape) => shape.id),
        hoveredShapeId: shapes.find((shape) => shape.isHovered)?.id ?? null,
        marqueeActive: false,
        snapGuideCount: 0,
      },
      includePicking: false,
      cameraDirty:
        !previous ||
        previous.viewport.scale !== viewport.scale ||
        previous.viewport.offsetX !== viewport.offsetX ||
        previous.viewport.offsetY !== viewport.offsetY ||
        previous.viewport.viewportWidth !== viewport.viewportWidth ||
        previous.viewport.viewportHeight !== viewport.viewportHeight,
    })
    scenePrepareMs = performance.now() - scenePrepareStart
    const shouldForcePreviewOnlySceneReload = Boolean(
      previous &&
      previous.revision === stats.version &&
      previous.document !== document &&
      !preparedFrame.scene.dirty &&
      interactionPhase !== 'pan' &&
      interactionPhase !== 'zoom',
    )

    if (shouldBootstrapScene || preparedFrame.scene.dirty || shouldForcePreviewOnlySceneReload) {
      const sceneApplyStart = performance.now()
      let dirtyBoundsMarkCount = 0
      let dirtyBoundsMarkArea = 0
      const shouldRenderSceneDirtyNow =
        shouldBootstrapScene ||
        shouldForcePreviewOnlySceneReload ||
        preparedFrame.dirtyState.sceneStructureDirty ||
        preparedFrame.dirtyState.dirtyCandidateCount > 0 ||
        preparedFrame.dirtyState.previousFrameCandidateCount === 0
      const nextOffscreenSceneDirtySkipConsecutiveCount = shouldRenderSceneDirtyNow
        ? 0
        : latestRenderPrepStatsRef.current.offscreenSceneDirtySkipConsecutiveCount + 1
      const shouldForceOffscreenSceneDirtyRender =
        nextOffscreenSceneDirtySkipConsecutiveCount >= SCENE_DIRTY_SKIP_FORCE_RENDER_FRAMES
      if (shouldBootstrapScene || preparedFrame.dirtyState.sceneStructureDirty || !previous || shouldForcePreviewOnlySceneReload) {
        const isPreviewLoad = shouldForcePreviewOnlySceneReload
        const debugRevision = isPreviewLoad
          ? `${stats.version}:preview:${previewSceneRevisionRef.current + 1}`
          : String(stats.version)
        const nextEngineScene = createEngineSceneFromRuntimeSnapshot(
          isPreviewLoad
            ? {
                ...replayScenePayload,
                revision: `${stats.version}:preview:${++previewSceneRevisionRef.current}`,
              }
            : replayScenePayload,
        )
        engine.loadScene(nextEngineScene)
          hasLoadedSceneInEngineRef.current = true
        // Track scene load mode/count so visible=0 episodes can be tied back
        // to the last scene mutation path before render diagnostics dropped.
        sceneApplyDebugRef.current.lastSceneApplyMode = isPreviewLoad ? 'preview-load' : 'full-load'
        sceneApplyDebugRef.current.lastSceneApplyRevision = debugRevision
        sceneApplyDebugRef.current.lastSceneShapeCount = replayScenePayload.shapes.length
        sceneApplyDebugRef.current.lastScenePatchUpsertCount = 0
        sceneApplyDebugRef.current.sceneLoadCount += 1
      } else {
        const changedIds = resolveExpandedChangedIds(preparedFrame.dirtyState.sceneInstanceIds, document)
        const incrementalScene = createEngineSceneFromRuntimeSnapshot({
          ...replayScenePayload,
          includeShapeIds: changedIds,
          includeDocumentBackground: false,
        })
        const upsertNodes = incrementalScene.nodes

        if (upsertNodes.length > 0) {
          engine.applyScenePatchBatch({
            patches: [{
              revision: stats.version,
              upsertNodes,
            }],
          })
          hasLoadedSceneInEngineRef.current = true
          // Keep incremental patch telemetry so event-entry debugging can
          // confirm whether the scene was patched or fully replaced.
          sceneApplyDebugRef.current.lastSceneApplyMode = 'incremental-patch'
          sceneApplyDebugRef.current.lastSceneApplyRevision = String(stats.version)
          sceneApplyDebugRef.current.lastSceneShapeCount = replayScenePayload.shapes.length
          sceneApplyDebugRef.current.lastScenePatchUpsertCount = upsertNodes.length
          sceneApplyDebugRef.current.scenePatchCount += 1
          // Coalesce dirty marks to one merged region so tile invalidation can
          // stay local even when many nodes are updated in one patch burst.
          // Include both previous and next positions so moved nodes invalidate
          // the tiles they vacated as well as the tiles they now occupy.
          const mergedDirtyBounds = resolveMergedNodeBounds({
            nodes: upsertNodes,
            currentDocument: document,
            previousDocument: previous.document,
            changedIds,
          })
          if (mergedDirtyBounds) {
            engine.markDirtyBounds(mergedDirtyBounds)
            dirtyBoundsMarkCount = 1
            dirtyBoundsMarkArea = Math.max(
              0,
              Math.abs(mergedDirtyBounds.width * mergedDirtyBounds.height),
            )
            // Bucket dirty invalidation area to spot whether redraw pressure is
            // dominated by tiny local edits or broad invalidation bursts.
            if (dirtyBoundsMarkArea <= DIRTY_BOUNDS_SMALL_AREA_PX2) {
              renderRequestStatsRef.current.dirtyBoundsMarkSmallAreaCount += 1
            } else if (dirtyBoundsMarkArea <= DIRTY_BOUNDS_MEDIUM_AREA_PX2) {
              renderRequestStatsRef.current.dirtyBoundsMarkMediumAreaCount += 1
            } else {
              renderRequestStatsRef.current.dirtyBoundsMarkLargeAreaCount += 1
            }
          }
        }
      }

      if (!shouldRenderSceneDirtyNow && !shouldForceOffscreenSceneDirtyRender) {
        // Keep scene state in sync but skip immediate redraw when all dirty
        // nodes are outside the previous frame's candidate set.
        renderRequestStatsRef.current.lastReason = 'offscreen-scene-dirty-skip'
        renderRequestStatsRef.current.offscreenSceneDirtySkipCount += 1
        // Track peak skip streak so long-run starvation pressure is visible
        // even after intermittent forced flushes reset the live streak.
        renderRequestStatsRef.current.offscreenSceneDirtySkipConsecutiveMaxCount = Math.max(
          renderRequestStatsRef.current.offscreenSceneDirtySkipConsecutiveMaxCount,
          nextOffscreenSceneDirtySkipConsecutiveCount,
        )
      } else if (!appliedViewportRef.current) {
        // Queue scene-driven render until viewport alignment is committed to
        // avoid one startup frame using stale/default viewport transforms.
        pendingSceneRenderRef.current = true
        if (shouldForceOffscreenSceneDirtyRender) {
          renderRequestStatsRef.current.forcedSceneDirtyRenderCount += 1
        }
      } else {
        requestEngineRender(sceneDirtyRenderMode, 'scene-dirty')
        if (shouldForceOffscreenSceneDirtyRender) {
          renderRequestStatsRef.current.forcedSceneDirtyRenderCount += 1
        }
      }

      latestRenderPrepStatsRef.current = {
        dirtyCandidateCount: preparedFrame.dirtyState.dirtyCandidateCount,
        dirtyOffscreenCount: preparedFrame.dirtyState.dirtyOffscreenCount,
        offscreenSceneDirtySkipConsecutiveCount:
          shouldRenderSceneDirtyNow || shouldForceOffscreenSceneDirtyRender
            ? 0
            : nextOffscreenSceneDirtySkipConsecutiveCount,
        dirtyBoundsMarkCount,
        dirtyBoundsMarkArea,
      }
      sceneApplyMs = performance.now() - sceneApplyStart
    } else {
      latestRenderPrepStatsRef.current = {
        dirtyCandidateCount: preparedFrame.dirtyState.dirtyCandidateCount,
        dirtyOffscreenCount: preparedFrame.dirtyState.dirtyOffscreenCount,
        offscreenSceneDirtySkipConsecutiveCount: 0,
        dirtyBoundsMarkCount: 0,
        dirtyBoundsMarkArea: 0,
      }
      sceneApplyMs = 0
    }

    previousRenderPrepRef.current = {
      revision: stats.version,
      document,
      shapes,
      viewport,
    }
    // Record scene-stage timing after effect work so onStats can publish it.
    runtimeStageTimingMsRef.current.scenePrepareMs = scenePrepareMs
    runtimeStageTimingMsRef.current.sceneApplyMs = sceneApplyMs
  }, [
    document,
    protectedNodeIds,
    replayScenePayload,
    requestEngineRender,
    interactionPhase,
    shapes,
    stats.version,
    viewport,
  ])

  React.useEffect(() => {
    const renderSurface = renderSurfaceRef.current
    const engine = engineRef.current
    if (!renderSurface || !engine) {
      return
    }
    const viewportCommitStart = performance.now()
    let viewportResizeMs = 0
    let viewportStateUpdateMs = 0
    const recordViewportCommitMs = () => {
      // Track viewport policy/commit overhead independently from draw time.
      runtimeStageTimingMsRef.current.viewportCommitMs =
        performance.now() - viewportCommitStart
      runtimeStageTimingMsRef.current.viewportResizeMs = viewportResizeMs
      runtimeStageTimingMsRef.current.viewportStateUpdateMs = viewportStateUpdateMs
    }

    const previousPhase = renderRequestStatsRef.current.renderPhase
    const previousQuality = renderRequestStatsRef.current.renderPolicyQuality
    const previousDpr = renderRequestStatsRef.current.renderPolicyDpr
    const previousOverlayMode = renderRequestStatsRef.current.overlayMode
    renderRequestStatsRef.current.renderPhase = interactionPhase
    renderRequestStatsRef.current.overlayMode = renderPolicy.overlayMode
    renderRequestStatsRef.current.overlayDegraded = overlayDiagnostics?.degraded ?? false
    renderRequestStatsRef.current.overlayGuideInputCount = overlayDiagnostics?.guideInputCount ?? 0
    renderRequestStatsRef.current.overlayGuideKeptCount = overlayDiagnostics?.guideKeptCount ?? 0
    renderRequestStatsRef.current.overlayGuideDroppedCount = overlayDiagnostics?.guideDroppedCount ?? 0
    renderRequestStatsRef.current.overlayGuideSelectionStrategy =
      overlayDiagnostics?.guideSelectionStrategy ?? 'full'
    renderRequestStatsRef.current.overlayPathEditWhitelistActive =
      overlayDiagnostics?.pathEditWhitelistActive ?? false
    const nextDpr = FORCE_STABLE_DPR ? STABLE_DPR_VALUE : renderPolicy.dpr
    const dprChanged = appliedDprRef.current !== nextDpr
    renderRequestStatsRef.current.renderPolicyDpr = nextDpr
    if (appliedDprRef.current !== nextDpr) {
      const shouldDeferDprRestore =
        !renderPolicy.interactionActive &&
        nextDpr === 'auto' &&
        typeof appliedDprRef.current === 'number'

      if (shouldDeferDprRestore) {
        cancelDeferredDprRestore()
        // Defer post-interaction DPR restoration to avoid one-frame resize spikes.
        deferredDprRestoreHandleRef.current = window.setTimeout(() => {
          deferredDprRestoreHandleRef.current = null
          const liveEngine = engineRef.current
          if (!liveEngine || isInteractingRef.current) {
            return
          }

          liveEngine.setDpr('auto', {maxDpr: 2})
          appliedDprRef.current = 'auto'
          requestEngineRender('normal', 'idle-redraw')
        }, DPR_RESTORE_DEFER_MS)
      } else {
        cancelDeferredDprRestore()
        engine.setDpr(nextDpr, {maxDpr: 2})
        appliedDprRef.current = nextDpr
      }
    } else if (renderPolicy.interactionActive) {
      // Interaction should cancel pending DPR restore to keep viewport updates cheap.
      cancelDeferredDprRestore()
    }

    // Keep quality transitions policy-driven so phase tuning does not spread.
    const nextQuality = renderPolicy.quality
    const qualityChanged = appliedQualityRef.current !== nextQuality
    renderRequestStatsRef.current.renderPolicyQuality = nextQuality
    if (appliedQualityRef.current !== nextQuality) {
      engine.setQuality(nextQuality)
      appliedQualityRef.current = nextQuality
    }

    const previewConfigurableEngine = engine as Engine & {
      setInteractionPreview?: (config?: {enabled?: boolean; mode?: 'interaction' | 'zoom-only'; cacheOnly?: boolean; maxScaleStep?: number; maxTranslatePx?: number}) => void
      startCameraAnimation?: (
        target: {viewportWidth: number; viewportHeight: number; offsetX: number; offsetY: number; scale: number},
        options?: {durationMs?: number; easing?: 'linear' | 'easeIn' | 'easeOut' | 'easeInOut'; cachePreviewOnly?: boolean},
      ) => void
      updateCameraAnimation?: (
        target: {viewportWidth: number; viewportHeight: number; offsetX: number; offsetY: number; scale: number},
        options?: {durationMs?: number; easing?: 'linear' | 'easeIn' | 'easeOut' | 'easeInOut'; cachePreviewOnly?: boolean},
      ) => void
      stopCameraAnimation?: (options?: {commitTarget?: boolean}) => void
    }
    previewConfigurableEngine.setInteractionPreview?.(
      renderPolicy.interactionPreview === false
        ? {enabled: false}
        : renderPolicy.interactionPreview,
    )

    // Keep a compact transition trail so policy tuning can verify phase and
    // degradation switches instead of relying only on the current snapshot.
    if (previousPhase !== interactionPhase) {
      renderRequestStatsRef.current.renderPhaseTransitionCount += 1
      renderRequestStatsRef.current.lastRenderPhaseTransition = `${previousPhase}->${interactionPhase}`
    }

    if (
      previousQuality !== nextQuality ||
      previousDpr !== nextDpr ||
      previousOverlayMode !== renderPolicy.overlayMode
    ) {
      renderRequestStatsRef.current.renderPolicyTransitionCount += 1
      renderRequestStatsRef.current.lastRenderPolicyTransition =
        `${previousQuality}/${String(previousDpr)}/${previousOverlayMode}` +
        `->${nextQuality}/${String(nextDpr)}/${renderPolicy.overlayMode}`
    }

    const measuredViewportWidth = measuredSurfaceSizeRef.current?.width ?? viewport.viewportWidth
    const measuredViewportHeight = measuredSurfaceSizeRef.current?.height ?? viewport.viewportHeight

    if (measuredViewportWidth <= 1 || measuredViewportHeight <= 1) {
      // Only trust runtime-measured viewport dimensions here.
      // Rendering against DOM fallback size can paint one pre-fit frame and
      // then snap when runtime applies the first fitViewport transform.
      viewportReadyRef.current = false
      recordViewportCommitMs()
      return
    }

    viewportReadyRef.current = true
    // Use host canvas client size as resize baseline so zoom-time viewport
    // math changes do not force backing-store reallocations.
    const width = Math.max(1, Math.floor(measuredViewportWidth))
    const height = Math.max(1, Math.floor(measuredViewportHeight))
    const renderWidth = width + OVERSCAN_PX * 2
    const renderHeight = height + OVERSCAN_PX * 2
    const renderSizeChanged =
      !appliedRenderSizeRef.current ||
      appliedRenderSizeRef.current.width !== renderWidth ||
      appliedRenderSizeRef.current.height !== renderHeight
    const renderSizeDeltaWidth = Math.abs((appliedRenderSizeRef.current?.width ?? renderWidth) - renderWidth)
    const renderSizeDeltaHeight = Math.abs((appliedRenderSizeRef.current?.height ?? renderHeight) - renderHeight)
    const shouldCommitResize =
      renderSizeDeltaWidth >= RESIZE_COMMIT_THRESHOLD_PX ||
      renderSizeDeltaHeight >= RESIZE_COMMIT_THRESHOLD_PX
    if (
      !appliedRenderSizeRef.current ||
      appliedRenderSizeRef.current.width !== renderWidth ||
      appliedRenderSizeRef.current.height !== renderHeight
    ) {
      if (!appliedRenderSizeRef.current) {
        // First frame needs an immediate resize for correct initial backing store.
        const resizeStart = performance.now()
        engine.resize(renderWidth, renderHeight)
        viewportResizeMs += performance.now() - resizeStart
        appliedRenderSizeRef.current = {width: renderWidth, height: renderHeight}
        pendingRenderSizeRef.current = null
      } else if (renderPolicy.interactionActive) {
        // Freeze backing-store realloc while interacting; commit once settled.
        pendingRenderSizeRef.current = {width: renderWidth, height: renderHeight}
        cancelDeferredResizeCommit()
      } else if (!shouldCommitResize) {
        // Ignore micro resize jitter to avoid repeated expensive realloc.
        pendingRenderSizeRef.current = {width: renderWidth, height: renderHeight}
        cancelDeferredResizeCommit()
      } else {
        // Defer follow-up resizes to collapse rapid layout size changes.
        pendingRenderSizeRef.current = {width: renderWidth, height: renderHeight}
        cancelDeferredResizeCommit()
        deferredResizeCommitHandleRef.current = window.setTimeout(() => {
          const commitResizeWhenQuiet = () => {
            const liveEngine = engineRef.current
            const pendingRenderSize = pendingRenderSizeRef.current
            if (!liveEngine || !pendingRenderSize) {
              deferredResizeCommitHandleRef.current = null
              return
            }

            const quietForMs = performance.now() - lastInteractionAtRef.current
            if (quietForMs < FULL_REDRAW_QUIET_WINDOW_MS) {
              deferredResizeCommitHandleRef.current = window.setTimeout(
                commitResizeWhenQuiet,
                Math.max(0, FULL_REDRAW_QUIET_WINDOW_MS - quietForMs),
              )
              return
            }

            deferredResizeCommitHandleRef.current = null
            liveEngine.resize(pendingRenderSize.width, pendingRenderSize.height)
            appliedRenderSizeRef.current = pendingRenderSize
            pendingRenderSizeRef.current = null
            requestEngineRender('normal', 'idle-redraw')
          }

          commitResizeWhenQuiet()
        }, RESIZE_COMMIT_DEFER_MS)
      }
    }
    const committedRenderSize = appliedRenderSizeRef.current ?? {
      width: renderWidth,
      height: renderHeight,
    }
    const nextViewportState = {
      viewportWidth: committedRenderSize.width,
      viewportHeight: committedRenderSize.height,
      offsetX: viewport.offsetX + OVERSCAN_PX,
      offsetY: viewport.offsetY + OVERSCAN_PX,
      scale: viewport.scale,
    }
    const viewportChanged =
      !appliedViewportRef.current ||
      appliedViewportRef.current.viewportWidth !== nextViewportState.viewportWidth ||
      appliedViewportRef.current.viewportHeight !== nextViewportState.viewportHeight ||
      appliedViewportRef.current.offsetX !== nextViewportState.offsetX ||
      appliedViewportRef.current.offsetY !== nextViewportState.offsetY ||
      appliedViewportRef.current.scale !== nextViewportState.scale
    if (viewportChanged) {
      const viewportStateUpdateStart = performance.now()
      const shouldUseCameraAnimation =
        ENABLE_CAMERA_ANIMATION &&
        (interactionPhase === 'pan' || interactionPhase === 'zoom')
      if (shouldUseCameraAnimation) {
        const animationPolicy = resolveCameraAnimationPolicy()
        if (animationPolicy.durationMs <= 0) {
          // Bypass animation controller in zero-duration mode to avoid extra
          // animation bookkeeping on high-frequency viewport updates.
          previewConfigurableEngine.stopCameraAnimation?.({commitTarget: false})
          cameraAnimationActiveRef.current = false
          engine.setViewport(nextViewportState)
        } else {
          // Drive camera interpolation through engine animation hooks during gestures.
          if (!cameraAnimationActiveRef.current) {
            previewConfigurableEngine.startCameraAnimation?.(nextViewportState, {
              durationMs: animationPolicy.durationMs,
              easing: animationPolicy.easing,
              cachePreviewOnly: animationPolicy.cachePreviewOnly,
            })
            cameraAnimationActiveRef.current = true
          } else {
            previewConfigurableEngine.updateCameraAnimation?.(nextViewportState, {
              durationMs: animationPolicy.durationMs,
              easing: animationPolicy.easing,
              cachePreviewOnly: animationPolicy.cachePreviewOnly,
            })
          }
        }
      } else {
        previewConfigurableEngine.stopCameraAnimation?.({commitTarget: false})
        cameraAnimationActiveRef.current = false
        engine.setViewport(nextViewportState)
      }
      appliedViewportRef.current = nextViewportState
      viewportStateUpdateMs += performance.now() - viewportStateUpdateStart
    }

    if (!renderPolicy.interactionActive && cameraAnimationActiveRef.current) {
      // Commit final animation target on settle so camera does not freeze at an in-between frame.
      previewConfigurableEngine.stopCameraAnimation?.({commitTarget: true})
      cameraAnimationActiveRef.current = false
    }

    const renderStateChanged =
      dprChanged ||
      qualityChanged ||
      renderSizeChanged ||
      viewportChanged
    const shouldFlushPendingSceneRender =
      pendingSceneRenderRef.current && Boolean(appliedViewportRef.current) && viewportReadyRef.current

    if (renderPolicy.interactionActive) {
      cancelDeferredFullRedraw()
      cancelScheduledRender()
      requestEngineRender('interactive', 'interactive-viewport')
      recordViewportCommitMs()
      return
    }

    if (!renderStateChanged && !shouldFlushPendingSceneRender) {
      recordViewportCommitMs()
      return
    }

    if (!hasCommittedInitialViewportFrameRef.current) {
      // Make the first post-layout frame immediate so startup does not show a
      // stale pre-layout viewport offset before deferred redraw kicks in.
      hasCommittedInitialViewportFrameRef.current = true
      cancelDeferredFullRedraw()
      cancelScheduledRender()
      if (shouldFlushPendingSceneRender) {
        pendingSceneRenderRef.current = false
        requestEngineRender('normal', 'scene-dirty')
      } else {
        requestEngineRender('normal', 'idle-redraw')
      }
      recordViewportCommitMs()
      return
    }

    if (shouldFlushPendingSceneRender) {
      pendingSceneRenderRef.current = false
      cancelDeferredFullRedraw()
      cancelScheduledRender()
      requestEngineRender('normal', 'scene-dirty')
      recordViewportCommitMs()
      return
    }

    // Defer full-quality redraw so a quick next pan can cancel it and keep
    // interaction input responsive on very large scenes.
    cancelDeferredFullRedraw()
    const redrawToken = ++deferredFullRedrawTokenRef.current
    const runDeferredFullRedraw = () => {
      if (deferredFullRedrawTokenRef.current !== redrawToken || isInteractingRef.current) {
        return
      }

      const quietForMs = performance.now() - lastInteractionAtRef.current
      if (quietForMs < FULL_REDRAW_QUIET_WINDOW_MS) {
        deferredFullRedrawHandleRef.current = window.setTimeout(() => {
          deferredFullRedrawHandleRef.current = null
          runDeferredFullRedraw()
        }, Math.max(0, FULL_REDRAW_QUIET_WINDOW_MS - quietForMs))
        return
      }

      requestEngineRender('normal', 'idle-redraw')
    }

    const idleApi = window as Window & {
      requestIdleCallback?: (callback: IdleRequestCallback, options?: IdleRequestOptions) => number
    }
    if (idleApi.requestIdleCallback) {
      deferredFullRedrawHandleRef.current = idleApi.requestIdleCallback(() => {
        deferredFullRedrawHandleRef.current = null
        runDeferredFullRedraw()
      }, {timeout: FULL_REDRAW_IDLE_TIMEOUT_MS})
      return
    }

    deferredFullRedrawHandleRef.current = window.setTimeout(() => {
      deferredFullRedrawHandleRef.current = null
      runDeferredFullRedraw()
    }, FULL_REDRAW_DEFER_MS)
    recordViewportCommitMs()
  }, [
    FULL_REDRAW_DEFER_MS,
    FULL_REDRAW_IDLE_TIMEOUT_MS,
    FULL_REDRAW_QUIET_WINDOW_MS,
    DPR_RESTORE_DEFER_MS,
    cancelDeferredDprRestore,
    cancelDeferredFullRedraw,
    cancelDeferredResizeCommit,
    cancelScheduledRender,
    isInteracting,
    overlayDiagnostics,
    interactionPhase,
    FULL_REDRAW_QUIET_WINDOW_MS,
    viewportInteractionType,
    viewport,
    resolveCameraAnimationPolicy,
    requestEngineRender,
    RESIZE_COMMIT_DEFER_MS,
    RESIZE_COMMIT_THRESHOLD_PX,
  ])

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
        pointerEvents: 'none',
      }}
    />
  )
}
