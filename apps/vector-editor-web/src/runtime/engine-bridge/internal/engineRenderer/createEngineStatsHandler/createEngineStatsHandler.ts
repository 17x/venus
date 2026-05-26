import {publishRuntimeRenderDiagnostics} from '../../../../events/index/index.ts'
import {
  DEFAULT_RUNTIME_DIRTY_REGION_DIAGNOSTICS_POLICY,
  DEFAULT_RUNTIME_DIRTY_REGION_RISK_POLICY,
  DEFAULT_RUNTIME_DIRTY_REGION_RISK_SCORE_POLICY,
  DEFAULT_RUNTIME_DIRTY_REGION_TREND_POLICY,
} from '../../../renderPolicy.ts'
import {buildRuntimeDiagnosticsPayload} from '../../../runtimeDiagnosticsPayload.ts'
import {shouldQueueDeferredVisualRecovery} from '../../engineRendererRecovery/engineRendererRecovery.ts'
import {type EngineStatsHandlerParams, type EngineStatsPayload, type WebGLEnrichedStatsPayload} from './createEngineStatsHandler.types.ts'

// ---------------------------------------------------------------------------
// createEngineStatsHandler — GAP-05 runtime diagnostics integration point
//
// The two source streams (engine.getDiagnostics + scheduler.getDiagnostics)
// represent the same contract as RuntimeDiagnosticsSnapshot from
// engineContractAdapters.ts. They are consumed here separately because the
// handler holds locally-typed refs (engine dist types not yet built).
// When engine dist types are stable, this can delegate to getRuntimeDiagnosticsSnapshot.
// ---------------------------------------------------------------------------

const PLAN_DIAGNOSTIC_SAMPLE_MS = 1200

/**
 * Builds the engine on-stats callback used by lifecycle setup to publish runtime diagnostics.
 * @param params Runtime diagnostics refs and callbacks required to process one stats payload.
 */
export function createEngineStatsHandler(params: EngineStatsHandlerParams): (nextStats: EngineStatsPayload) => void {
  let consecutiveEmptyFrameRecoveryCount = 0
  let fpsEstimate = 0
  let fpsPeak = 0
  let fpsEstimatePeak = 0
  let lastFramePublishedAtMs = 0

  /**
   * Resolves one stable frame duration in milliseconds for diagnostics/fps math.
   * @param frameMs Frame duration candidate from renderer stats payload.
   */
  function resolveDiagnosticsFrameMs(frameMs: number) {
    const finiteFrameMs = Number.isFinite(frameMs) ? frameMs : 0
    // Guard against impossible values (timestamp leaks or zero/negative) and
    // fallback to wall-clock delta between published frames when available.
    if (finiteFrameMs > 0 && finiteFrameMs <= 1000) {
      return finiteFrameMs
    }
    if (lastFramePublishedAtMs <= 0) {
      return 0
    }
    return Math.max(0, performance.now() - lastFramePublishedAtMs)
  }

  return (nextStats) => {
    // Cast to the enriched payload shape to access backend-specific fields
    // that the engine emits at runtime but are absent from the base type.
    const webglStats = nextStats as WebGLEnrichedStatsPayload
    const schedulerDiagnostics = params.renderSchedulerRef.current?.getDiagnostics?.()
    const runtimeDiagnostics = params.engineRef.current?.getDiagnostics()
    const engineStats = params.engineRef.current?.getStats()
    if (schedulerDiagnostics) {
      params.runtimeStageTimingMsRef.current.schedulerQueueWaitMs = schedulerDiagnostics.lastQueueWaitMs
      params.runtimeStageTimingMsRef.current.schedulerThrottleDelayMs = schedulerDiagnostics.lastInteractiveThrottleDelayMs
    }
    if (runtimeDiagnostics) {
      params.renderRequestStatsRef.current.sideTargetDpr = runtimeDiagnostics.pixelRatio
      params.renderRequestStatsRef.current.outputDpr = runtimeDiagnostics.outputPixelRatio
    }

    const now = performance.now()
    let plannerSampleMs = 0
    if (now - params.lastPlanDiagnosticSampleAtRef.current >= PLAN_DIAGNOSTIC_SAMPLE_MS) {
      const plannerSampleStart = performance.now()
      const sampledDiagnostics = runtimeDiagnostics
      const shortlistDiagnostics = sampledDiagnostics?.shortlist
      const framePlanVersion = sampledDiagnostics?.framePlan?.planVersion ?? 0
      const framePlanCandidateCount = sampledDiagnostics?.framePlan?.candidateCount ?? 0
      const framePlanSceneNodeCount = sampledDiagnostics?.framePlan?.sceneNodeCount ?? 0
      const framePlanVisibleRatio = framePlanSceneNodeCount > 0
        ? framePlanCandidateCount / framePlanSceneNodeCount
        : 0
      params.latestPlanDiagnosticsRef.current = {
        framePlanVersion,
        framePlanCandidateCount,
        framePlanSceneNodeCount,
        framePlanVisibleRatio,
        framePlanShortlistActive: shortlistDiagnostics?.active ?? false,
        framePlanShortlistCandidateRatio: shortlistDiagnostics?.candidateRatio ?? 0,
        framePlanShortlistAppliedCandidateCount: shortlistDiagnostics?.appliedCandidateCount ?? 0,
        framePlanShortlistPendingState: shortlistDiagnostics?.pendingState ?? null,
        framePlanShortlistPendingFrameCount: shortlistDiagnostics?.pendingFrameCount ?? 0,
        framePlanShortlistToggleCount: shortlistDiagnostics?.toggleCount ?? 0,
        framePlanShortlistDebounceBlockedToggleCount: shortlistDiagnostics?.debounceBlockedToggleCount ?? 0,
        framePlanShortlistEnterRatioThreshold: shortlistDiagnostics?.enterRatioThreshold ?? 0,
        framePlanShortlistLeaveRatioThreshold: shortlistDiagnostics?.leaveRatioThreshold ?? 0,
        framePlanShortlistStableFrameCount: shortlistDiagnostics?.stableFrameCount ?? 0,
        hitPlanVersion: sampledDiagnostics?.hitPlan?.planVersion ?? 0,
        hitPlanCandidateCount: sampledDiagnostics?.hitPlan?.candidateCount ?? 0,
        hitPlanHitCount: sampledDiagnostics?.hitPlan?.hitCount ?? 0,
        hitPlanExactCheckCount: sampledDiagnostics?.hitPlan?.exactCheckCount ?? 0,
      }
      params.lastPlanDiagnosticSampleAtRef.current = now
      plannerSampleMs = performance.now() - plannerSampleStart
    }
    params.runtimeStageTimingMsRef.current.plannerSampleMs = plannerSampleMs

    const planDiagnostics = params.latestPlanDiagnosticsRef.current
    const renderPrepDirtyCandidateCount = params.latestRenderPrepStatsRef.current.dirtyCandidateCount
    const renderPrepDirtyOffscreenCount = params.latestRenderPrepStatsRef.current.dirtyOffscreenCount
    const offscreenSceneDirtySkipConsecutiveCount =
      params.latestRenderPrepStatsRef.current.offscreenSceneDirtySkipConsecutiveCount
    const dirtyBoundsMarkCount = params.latestRenderPrepStatsRef.current.dirtyBoundsMarkCount
    const dirtyBoundsMarkArea = params.latestRenderPrepStatsRef.current.dirtyBoundsMarkArea
    const deferredImageTextureCount = webglStats.webglDeferredImageTextureCount ?? 0
    const interactiveTextFallbackCount = webglStats.webglInteractiveTextFallbackCount ?? 0
    const renderRequestStats = params.renderRequestStatsRef.current
    const groupCollapseStats = nextStats as {
      groupCollapseCount?: number
      groupCollapseCulledCount?: number
    }

    if (
      nextStats.visibleCount <= 0 &&
      planDiagnostics.framePlanSceneNodeCount <= 0 &&
      params.drawSerialRef.current !== params.lastZeroVisibilityDebugFrameRef.current
    ) {
      const hostWindow = window as Window & {
        __venusZeroVisibilityDebug?: {
          at: number
          frameCount: number
          renderPhase: typeof renderRequestStats.renderPhase
          viewportInteractionType: 'pan' | 'zoom' | 'other'
          lastRenderRequestReason: string
          sceneApply: typeof params.sceneApplyDebugRef.current
          lastZoomDiagnostic?: unknown
        }
      }
      hostWindow.__venusZeroVisibilityDebug = {
        at: performance.now(),
        frameCount: params.drawSerialRef.current,
        renderPhase: renderRequestStats.renderPhase,
        viewportInteractionType: renderRequestStats.viewportInteractionType,
        lastRenderRequestReason: renderRequestStats.lastReason,
        sceneApply: params.sceneApplyDebugRef.current,
        lastZoomDiagnostic: (window as Window & {__venusLastZoomDiagnostic?: unknown}).__venusLastZoomDiagnostic,
      }
      params.lastZeroVisibilityDebugFrameRef.current = params.drawSerialRef.current
    }

    params.deferredVisualRecoveryPendingRef.current = false

    if (shouldQueueDeferredVisualRecovery({
      engineFrameQuality: webglStats.engineFrameQuality,
      deferredImageTextureCount,
      interactiveTextFallbackCount,
    })) {
      params.requestDeferredVisualRecovery()
    }

    if (nextStats.drawCount <= 0 && nextStats.visibleCount > 0) {
      // Guard against persistent blank output by forcing one immediate redraw
      // when the frame unexpectedly reports empty draw submission.
      if (consecutiveEmptyFrameRecoveryCount < 2) {
        consecutiveEmptyFrameRecoveryCount += 1
        params.requestEngineRender('normal', 'idle-redraw')
      }
    } else {
      consecutiveEmptyFrameRecoveryCount = 0
    }

    params.drawSerialRef.current += 1
    const diagnosticsUpdatedAtMs = performance.now()
    const diagnosticsPublishStart = performance.now()
    const diagnosticsPayload = buildRuntimeDiagnosticsPayload({
      frameCount: params.drawSerialRef.current,
      diagnosticsUpdatedAtMs,
      renderStats: {
        drawCount: nextStats.drawCount,
        frameMs: nextStats.frameMs,
        visibleCount: nextStats.visibleCount,
        cacheHits: nextStats.cacheHits,
        cacheMisses: nextStats.cacheMisses,
        frameReuseHits: nextStats.frameReuseHits,
        frameReuseMisses: nextStats.frameReuseMisses,
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
      runtimeStageTimingMs: params.runtimeStageTimingMsRef.current,
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
      engineCoreStats: {
        backendRequested: engineStats?.backendSelection.requested ?? 'auto',
        backendResolved: engineStats?.backendSelection.resolved ?? 'headless',
        backendFallbackReason: engineStats?.backendSelection.fallbackReason ?? null,
        runtimeProfileId: engineStats?.runtimeProfileId ?? 'unknown',
        runtimeCapabilityCount: engineStats?.runtimeCapabilityCount ?? 0,
        framePressureReason: engineStats?.lastFramePressureReason ?? 'within-low-thresholds',
        framePressure: engineStats?.lastFramePressure ?? (webglStats.webglBudgetPressure ?? 'low'),
        framePhase: engineStats?.lastFramePhase ?? 'static',
        qosDegradationLevel: engineStats?.lastQosDegradationLevel ?? 'none',
        qosFallbackReason: engineStats?.lastQosFallbackReason ?? null,
        qosGuardTriggers: [...(engineStats?.lastQosGuardTriggers ?? [])],
        qosTrace: engineStats?.lastQosTrace ?? `qos:${params.drawSerialRef.current}:static:low`,
      },
      offscreenSceneDirtyForceRenderFrameThreshold:
        DEFAULT_RUNTIME_DIRTY_REGION_DIAGNOSTICS_POLICY.sceneDirtySkipForceRenderFrames,
      dirtyBoundsSmallAreaThreshold:
        DEFAULT_RUNTIME_DIRTY_REGION_DIAGNOSTICS_POLICY.dirtyBoundsSmallAreaPx2,
      dirtyBoundsMediumAreaThreshold:
        DEFAULT_RUNTIME_DIRTY_REGION_DIAGNOSTICS_POLICY.dirtyBoundsMediumAreaPx2,
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
    params.runtimeStageTimingMsRef.current.diagnosticsPublishMs =
      performance.now() - diagnosticsPublishStart

    const resolvedFrameMs = resolveDiagnosticsFrameMs(nextStats.frameMs)
    const fpsInstantaneous = resolvedFrameMs > 0
      ? Math.min(240, 1000 / resolvedFrameMs)
      : 0
    if (fpsEstimate <= 0) {
      fpsEstimate = fpsInstantaneous
    } else {
      // Keep fps smooth with a lightweight EMA so panel values remain readable
      // during interactive camera gestures and scheduler cadence changes.
      fpsEstimate += (fpsInstantaneous - fpsEstimate) * 0.18
    }
    fpsPeak = Math.max(fpsPeak, fpsInstantaneous)
    fpsEstimatePeak = Math.max(fpsEstimatePeak, fpsEstimate)
    lastFramePublishedAtMs = performance.now()

    publishRuntimeRenderDiagnostics({
      ...diagnosticsPayload,
      drawMs: resolvedFrameMs,
      fpsInstantaneous,
      fpsEstimate,
      fpsPeak,
      fpsEstimatePeak,
      fpsReached60: fpsEstimate >= 60,
      fpsReached120: fpsEstimate >= 120,
      diagnosticsPublishMs: params.runtimeStageTimingMsRef.current.diagnosticsPublishMs,
      cameraAnimationActive: webglStats.cameraAnimationActive ?? false,
      cameraAnimationCachePreviewOnly: webglStats.cameraAnimationCachePreviewOnly ?? false,
      cameraAnimationPreviewHitCount: webglStats.cameraAnimationPreviewHitCount ?? 0,
      cameraAnimationPreviewMissCount: webglStats.cameraAnimationPreviewMissCount ?? 0,
    })

    if (!params.presentLatencyRafPendingRef.current) {
      params.presentLatencyRafPendingRef.current = true
      const presentProbeStart = performance.now()
      requestAnimationFrame(() => {
        params.runtimeStageTimingMsRef.current.presentRafDelayMs =
          performance.now() - presentProbeStart
        params.presentLatencyRafPendingRef.current = false
      })
    }

    // Keep camera interpolation advancing while active regardless of
    // interaction state, otherwise animation can stall after first input tick.
    if (webglStats.cameraAnimationActive) {
      params.requestEngineRender('interactive', 'camera-animation')
    }
  }
}
