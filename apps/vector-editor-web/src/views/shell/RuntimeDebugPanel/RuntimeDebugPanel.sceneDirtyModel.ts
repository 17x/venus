import {useEffect, useMemo, useRef} from 'react'
import type {RuntimeRenderDiagnostics} from '../../../runtime/events/index/index.ts'
const DEFAULT_TREND_WINDOW_FRAMES = 90
const DEFAULT_FORCED_SPIKE_PER_SECOND_THRESHOLD = 0.75
const DEFAULT_SKIP_SPIKE_PER_SECOND_THRESHOLD = 2
const DEFAULT_RISK_SCORE_HIGH_THRESHOLD = 75
const DEFAULT_RISK_SCORE_SKIP_WEIGHT = 0.55
const DEFAULT_RISK_SCORE_FORCED_WEIGHT = 0.3
const DEFAULT_RISK_SCORE_STREAK_WEIGHT = 0.15
const DEFAULT_RISK_SCORE_FORCED_RATE_SCALE = 120
const DEFAULT_PROLONGED_HIGH_RISK_SECONDS_THRESHOLD = 8
const DEFAULT_TRANSITION_RATE_WATCH_THRESHOLD = 5
const TREND_HISTORY_LIMIT = 240
const ACTIVE_OVERLAY_MIN_ACTIVE_NODE_COUNT_WHEN_ACTIVE_PLANE = 1
const ACTIVE_OVERLAY_MIN_PROTECTED_NODE_COUNT_WHEN_ACTIVE_PLANE = 1
// Require a minimum sample size so early-session noise does not trigger runtime-v2 migration alerts.
export const RUNTIME_V2_ALERT_MIN_SAMPLE = 20
// Treat >=1% mismatch rate as watch-level migration risk once sample size is meaningful.
export const RUNTIME_V2_ALERT_WATCH_MISMATCH_RATE_PERCENT = 1
// Treat >=3% mismatch rate as high migration risk once sample size is meaningful.
export const RUNTIME_V2_ALERT_HIGH_MISMATCH_RATE_PERCENT = 3
type SceneDirtyTrendSample = {
  frameCount: number
  offscreenSkipCount: number
  forcedSceneDirtyCount: number
  dirtyBoundsMarkCount: number
}
type TrendDirection = 'up' | 'down' | 'flat'
type SceneDirtyRiskStatus = 'stable' | 'watch' | 'high' | 'forcing'
type SceneDirtyTransitionReason =
  | 'init'
  | 'streak-force-threshold'
  | 'skip-and-forced-threshold'
  | 'skip-watch-threshold'
  | 'cooling'
  | 'recovered'
type SceneDirtyTransitionRateStatus = 'stable' | 'watch' | 'churning'
type ActiveOverlayRoutingAlertLevel = 'stable' | 'watch' | 'high'
type ActiveOverlayRoutingAlertReason =
  | 'none'
  | 'active-plane-empty-active-nodes'
  | 'active-plane-empty-protected-nodes'
  | 'base-plane-with-active-nodes'
/**
 * Resolves one trend sample from diagnostics counters.
 * @param diagnostics Runtime diagnostics snapshot.
 */
function createSceneDirtyTrendSample(diagnostics: RuntimeRenderDiagnostics): SceneDirtyTrendSample {
  return {
    frameCount: diagnostics.frameCount,
    offscreenSkipCount: diagnostics.offscreenSceneDirtySkipRequestCount,
    forcedSceneDirtyCount: diagnostics.forcedSceneDirtyRequestCount,
    dirtyBoundsMarkCount: diagnostics.dirtyBoundsMarkCount,
  }
}
/**
 * Builds scene-dirty risk and shortlist model values consumed by the debug panel.
 * @param diagnostics Runtime diagnostics snapshot.
 */
export function useRuntimeDebugSceneDirtyModel(diagnostics: RuntimeRenderDiagnostics) {
  const trendHistoryRef = useRef<SceneDirtyTrendSample[]>([])
  const riskStatusTrackingRef = useRef<{
    lastStatus: SceneDirtyRiskStatus
    lastTransitionReason: SceneDirtyTransitionReason
    transitionCount: number
    lastTransitionFrame: number
  }>({
    lastStatus: 'stable',
    lastTransitionReason: 'init',
    transitionCount: 0,
    lastTransitionFrame: 0,
  })
  const trendSample = createSceneDirtyTrendSample(diagnostics)
  const trendWindowFrames = diagnostics.sceneDirtyTrendWindowFrames > 0
    ? diagnostics.sceneDirtyTrendWindowFrames
    : DEFAULT_TREND_WINDOW_FRAMES
  const forcedSpikePerSecondThreshold =
    diagnostics.offscreenSceneDirtyForcedSpikePerSecondThreshold > 0
      ? diagnostics.offscreenSceneDirtyForcedSpikePerSecondThreshold
      : DEFAULT_FORCED_SPIKE_PER_SECOND_THRESHOLD
  const skipSpikePerSecondThreshold =
    diagnostics.offscreenSceneDirtySkipSpikePerSecondThreshold > 0
      ? diagnostics.offscreenSceneDirtySkipSpikePerSecondThreshold
      : DEFAULT_SKIP_SPIKE_PER_SECOND_THRESHOLD
  const riskScoreHighThreshold = diagnostics.sceneDirtyRiskScoreHighThreshold > 0
    ? diagnostics.sceneDirtyRiskScoreHighThreshold
    : DEFAULT_RISK_SCORE_HIGH_THRESHOLD
  const riskScoreSkipWeight = diagnostics.sceneDirtyRiskScoreSkipWeight > 0
    ? diagnostics.sceneDirtyRiskScoreSkipWeight
    : DEFAULT_RISK_SCORE_SKIP_WEIGHT
  const riskScoreForcedWeight = diagnostics.sceneDirtyRiskScoreForcedWeight > 0
    ? diagnostics.sceneDirtyRiskScoreForcedWeight
    : DEFAULT_RISK_SCORE_FORCED_WEIGHT
  const riskScoreStreakWeight = diagnostics.sceneDirtyRiskScoreStreakWeight > 0
    ? diagnostics.sceneDirtyRiskScoreStreakWeight
    : DEFAULT_RISK_SCORE_STREAK_WEIGHT
  const riskScoreForcedRateScale = diagnostics.sceneDirtyRiskScoreForcedRateScale > 0
    ? diagnostics.sceneDirtyRiskScoreForcedRateScale
    : DEFAULT_RISK_SCORE_FORCED_RATE_SCALE
  const prolongedHighRiskSecondsThreshold = diagnostics.sceneDirtyProlongedHighRiskSecondsThreshold > 0
    ? diagnostics.sceneDirtyProlongedHighRiskSecondsThreshold
    : DEFAULT_PROLONGED_HIGH_RISK_SECONDS_THRESHOLD
  const transitionRateWatchThreshold = diagnostics.sceneDirtyTransitionRateWatchThreshold > 0
    ? diagnostics.sceneDirtyTransitionRateWatchThreshold
    : DEFAULT_TRANSITION_RATE_WATCH_THRESHOLD
  const sceneDirtyTrend = useMemo(() => {
    // Build a sliding frame-window trend so policy tuning can react to recent behavior.
    const samples = [...trendHistoryRef.current, trendSample]
    const latest = samples[samples.length - 1]
    let baseline = samples[0] ?? latest
    for (let index = samples.length - 1; index >= 0; index -= 1) {
      const candidate = samples[index]
      if (latest.frameCount - candidate.frameCount >= trendWindowFrames) {
        baseline = candidate
        break
      }
      baseline = candidate
    }
    const deltaFrames = Math.max(0, latest.frameCount - baseline.frameCount)
    const inferredFps = diagnostics.fpsEstimate > 0 ? diagnostics.fpsEstimate : 60
    const deltaSeconds = deltaFrames > 0 ? deltaFrames / inferredFps : 0
    if (deltaSeconds <= 0) {
      return {
        offscreenSkipsPerSecond: 0,
        forcedSceneDirtyPerSecond: 0,
        dirtyBoundsMarksPerSecond: 0,
      }
    }
    return {
      offscreenSkipsPerSecond:
        Math.max(0, latest.offscreenSkipCount - baseline.offscreenSkipCount) / deltaSeconds,
      forcedSceneDirtyPerSecond:
        Math.max(0, latest.forcedSceneDirtyCount - baseline.forcedSceneDirtyCount) / deltaSeconds,
      dirtyBoundsMarksPerSecond:
        Math.max(0, latest.dirtyBoundsMarkCount - baseline.dirtyBoundsMarkCount) / deltaSeconds,
    }
  }, [diagnostics.fpsEstimate, trendSample, trendWindowFrames])
  const sceneDirtyTrendDirection = useMemo(() => {
    const samples = trendHistoryRef.current
    if (samples.length < 3) {
      return {
        offscreenSkipsDirection: 'flat' as TrendDirection,
        forcedSceneDirtyDirection: 'flat' as TrendDirection,
        dirtyBoundsMarksDirection: 'flat' as TrendDirection,
      }
    }
    const latest = samples[samples.length - 1]
    const previous = samples[samples.length - 2]
    const earlier = samples[samples.length - 3]
    const inferredFps = diagnostics.fpsEstimate > 0 ? diagnostics.fpsEstimate : 60
    const recentSeconds = Math.max(1 / inferredFps, (latest.frameCount - previous.frameCount) / inferredFps)
    const previousSeconds = Math.max(1 / inferredFps, (previous.frameCount - earlier.frameCount) / inferredFps)
    const latestOffscreenRate = Math.max(0, latest.offscreenSkipCount - previous.offscreenSkipCount) / recentSeconds
    const previousOffscreenRate = Math.max(0, previous.offscreenSkipCount - earlier.offscreenSkipCount) / previousSeconds
    const latestForcedRate = Math.max(0, latest.forcedSceneDirtyCount - previous.forcedSceneDirtyCount) / recentSeconds
    const previousForcedRate = Math.max(0, previous.forcedSceneDirtyCount - earlier.forcedSceneDirtyCount) / previousSeconds
    const latestDirtyMarkRate = Math.max(0, latest.dirtyBoundsMarkCount - previous.dirtyBoundsMarkCount) / recentSeconds
    const previousDirtyMarkRate = Math.max(0, previous.dirtyBoundsMarkCount - earlier.dirtyBoundsMarkCount) / previousSeconds
    const resolveDirection = (next: number, prev: number): TrendDirection => {
      const delta = next - prev
      const epsilon = Math.max(0.05, prev * 0.08)
      if (Math.abs(delta) <= epsilon) {
        return 'flat'
      }
      return delta > 0 ? 'up' : 'down'
    }
    return {
      offscreenSkipsDirection: resolveDirection(latestOffscreenRate, previousOffscreenRate),
      forcedSceneDirtyDirection: resolveDirection(latestForcedRate, previousForcedRate),
      dirtyBoundsMarksDirection: resolveDirection(latestDirtyMarkRate, previousDirtyMarkRate),
    }
  }, [diagnostics.fpsEstimate, diagnostics.frameCount])
  const sceneDirtyForceWindowRemainingFrames = Math.max(
    0,
    diagnostics.offscreenSceneDirtyForceRenderFrameThreshold -
      diagnostics.offscreenSceneDirtySkipConsecutiveCount,
  )
  const sceneDirtyTrendPressure =
    sceneDirtyTrendDirection.offscreenSkipsDirection === 'up' &&
    sceneDirtyTrendDirection.forcedSceneDirtyDirection === 'up'
      ? 'rising'
      : sceneDirtyTrendDirection.offscreenSkipsDirection === 'down' &&
          sceneDirtyTrendDirection.forcedSceneDirtyDirection === 'down'
        ? 'easing'
        : 'mixed'
  const offscreenSceneDirtySkipRatePercent = (
    diagnostics.sceneDirtyRequestCount + diagnostics.offscreenSceneDirtySkipRequestCount
  ) > 0
    ? (diagnostics.offscreenSceneDirtySkipRequestCount /
      (diagnostics.sceneDirtyRequestCount + diagnostics.offscreenSceneDirtySkipRequestCount)) * 100
    : 0
  const sceneDirtyRiskStatus: SceneDirtyRiskStatus = diagnostics.offscreenSceneDirtySkipConsecutiveCount
    >= diagnostics.offscreenSceneDirtyForceRenderFrameThreshold
    ? 'forcing'
    : offscreenSceneDirtySkipRatePercent >= diagnostics.offscreenSceneDirtyRiskHighSkipRateThreshold &&
        sceneDirtyTrend.forcedSceneDirtyPerSecond >= diagnostics.offscreenSceneDirtyRiskHighForcedPerSecondThreshold
      ? 'high'
      : offscreenSceneDirtySkipRatePercent >= diagnostics.offscreenSceneDirtyRiskWatchSkipRateThreshold
        ? 'watch'
        : 'stable'
  const sceneDirtySkipRiskContribution = offscreenSceneDirtySkipRatePercent * riskScoreSkipWeight
  const sceneDirtyForcedRiskContribution =
    Math.min(100, sceneDirtyTrend.forcedSceneDirtyPerSecond * riskScoreForcedRateScale) *
    riskScoreForcedWeight
  const sceneDirtyStreakRiskContribution =
    (diagnostics.offscreenSceneDirtyForceRenderFrameThreshold > 0
      ? (diagnostics.offscreenSceneDirtySkipConsecutiveCount /
          diagnostics.offscreenSceneDirtyForceRenderFrameThreshold) * 100
      : 0) * riskScoreStreakWeight
  const sceneDirtyRiskScore = Math.min(
    100,
    Math.max(
      0,
      sceneDirtySkipRiskContribution +
        sceneDirtyForcedRiskContribution +
        sceneDirtyStreakRiskContribution,
    ),
  )
  const sceneDirtyRiskContributionTotal =
    sceneDirtySkipRiskContribution +
    sceneDirtyForcedRiskContribution +
    sceneDirtyStreakRiskContribution
  const sceneDirtySkipRiskContributionPercent = sceneDirtyRiskContributionTotal > 0
    ? (sceneDirtySkipRiskContribution / sceneDirtyRiskContributionTotal) * 100
    : 0
  const sceneDirtyForcedRiskContributionPercent = sceneDirtyRiskContributionTotal > 0
    ? (sceneDirtyForcedRiskContribution / sceneDirtyRiskContributionTotal) * 100
    : 0
  const sceneDirtyStreakRiskContributionPercent = sceneDirtyRiskContributionTotal > 0
    ? (sceneDirtyStreakRiskContribution / sceneDirtyRiskContributionTotal) * 100
    : 0
  const sceneDirtyRiskScoreBand = sceneDirtyRiskScore >= riskScoreHighThreshold
    ? 'high'
    : sceneDirtyRiskScore >= 50
      ? 'medium'
      : 'low'
  const sceneDirtySpikeSignal = sceneDirtyTrend.forcedSceneDirtyPerSecond
    >= forcedSpikePerSecondThreshold &&
    sceneDirtyTrend.offscreenSkipsPerSecond >= skipSpikePerSecondThreshold
    ? 'forced+skip'
    : sceneDirtyTrend.forcedSceneDirtyPerSecond >= forcedSpikePerSecondThreshold
      ? 'forced'
      : sceneDirtyTrend.offscreenSkipsPerSecond >= skipSpikePerSecondThreshold
        ? 'skip'
        : 'none'
  const sceneDirtyRiskStatusClassName = sceneDirtyRiskStatus === 'forcing'
    ? 'text-rose-600 dark:text-rose-400'
    : sceneDirtyRiskStatus === 'high'
      ? 'text-orange-600 dark:text-orange-400'
      : sceneDirtyRiskStatus === 'watch'
        ? 'text-amber-600 dark:text-amber-400'
        : 'text-emerald-600 dark:text-emerald-400'
  const activeOverlayRoutingAlert = useMemo(() => {
    // Keep routing alert logic deterministic so active-layer regressions are
    // triaged from one stable signal set in both compact and verbose panels.
    const usesActivePlane = diagnostics.activeOverlayUsesActivePlane
    const activeNodeCount = diagnostics.activeOverlayInteractionActiveNodeCount
    const protectedNodeCount = diagnostics.activeOverlayProtectedNodeCount
    if (usesActivePlane && activeNodeCount < ACTIVE_OVERLAY_MIN_ACTIVE_NODE_COUNT_WHEN_ACTIVE_PLANE) {
      return {
        level: 'high' as ActiveOverlayRoutingAlertLevel,
        reason: 'active-plane-empty-active-nodes' as ActiveOverlayRoutingAlertReason,
      }
    }
    // If base plane keeps non-zero active ids, the routing state can be stale
    // and should be watched for phase-transition cleanup regressions.
    if (!usesActivePlane && activeNodeCount > 0) {
      return {
        level: 'watch' as ActiveOverlayRoutingAlertLevel,
        reason: 'base-plane-with-active-nodes' as ActiveOverlayRoutingAlertReason,
      }
    }
    // Drag/precision flows usually publish at least one protected id (selection
    // or ancestor guardrail). Empty protected set is suspicious but non-fatal.
    if (usesActivePlane && protectedNodeCount < ACTIVE_OVERLAY_MIN_PROTECTED_NODE_COUNT_WHEN_ACTIVE_PLANE) {
      return {
        level: 'watch' as ActiveOverlayRoutingAlertLevel,
        reason: 'active-plane-empty-protected-nodes' as ActiveOverlayRoutingAlertReason,
      }
    }
    return {
      level: 'stable' as ActiveOverlayRoutingAlertLevel,
      reason: 'none' as ActiveOverlayRoutingAlertReason,
    }
  }, [
    diagnostics.activeOverlayInteractionActiveNodeCount,
    diagnostics.activeOverlayProtectedNodeCount,
    diagnostics.activeOverlayUsesActivePlane,
  ])
  const activeOverlayRoutingAlertClassName = activeOverlayRoutingAlert.level === 'high'
    ? 'text-rose-600 dark:text-rose-400'
    : activeOverlayRoutingAlert.level === 'watch'
      ? 'text-amber-600 dark:text-amber-400'
      : 'text-emerald-600 dark:text-emerald-400'
  const activeOverlayRoutingSummary = [
    `${diagnostics.activeOverlayScenePlane}/${diagnostics.activeOverlayOverlayPlane}`,
    diagnostics.activeOverlayUsesActivePlane ? 'active:on' : 'active:off',
    `protected ${diagnostics.activeOverlayProtectedNodeCount}`,
    `active ${diagnostics.activeOverlayInteractionActiveNodeCount}`,
  ].join(' | ')
  useEffect(() => {
    if (diagnostics.frameCount <= 0) {
      return
    }
    const history = trendHistoryRef.current
    const previous = history[history.length - 1]
    if (previous?.frameCount === trendSample.frameCount) {
      history[history.length - 1] = trendSample
    } else {
      history.push(trendSample)
      const historyLimit = Math.max(TREND_HISTORY_LIMIT, trendWindowFrames * 3)
      if (history.length > historyLimit) {
        history.splice(0, history.length - historyLimit)
      }
    }
  }, [diagnostics.frameCount, trendSample, trendWindowFrames])
  useEffect(() => {
    if (diagnostics.frameCount <= 0) {
      return
    }
    const tracking = riskStatusTrackingRef.current
    if (tracking.lastTransitionFrame === 0) {
      tracking.lastTransitionFrame = diagnostics.frameCount
      tracking.lastStatus = sceneDirtyRiskStatus
      tracking.lastTransitionReason = 'init'
      return
    }
    if (tracking.lastStatus !== sceneDirtyRiskStatus) {
      const nextReason: SceneDirtyTransitionReason = sceneDirtyRiskStatus === 'forcing'
        ? 'streak-force-threshold'
        : sceneDirtyRiskStatus === 'high'
          ? 'skip-and-forced-threshold'
          : sceneDirtyRiskStatus === 'watch'
            ? 'skip-watch-threshold'
            : sceneDirtyTrendPressure === 'easing'
              ? 'cooling'
              : 'recovered'
      tracking.lastStatus = sceneDirtyRiskStatus
      tracking.lastTransitionReason = nextReason
      tracking.transitionCount += 1
      tracking.lastTransitionFrame = diagnostics.frameCount
    }
  }, [diagnostics.frameCount, sceneDirtyRiskStatus, sceneDirtyTrendPressure])
  const sceneDirtyRiskTransitionCount = riskStatusTrackingRef.current.transitionCount
  const sceneDirtyRiskLastTransitionReason = riskStatusTrackingRef.current.lastTransitionReason
  const sceneDirtyRiskFramesSinceTransition = Math.max(
    0,
    diagnostics.frameCount - riskStatusTrackingRef.current.lastTransitionFrame,
  )
  const sceneDirtyRiskSecondsSinceTransition = diagnostics.fpsEstimate > 0
    ? sceneDirtyRiskFramesSinceTransition / diagnostics.fpsEstimate
    : 0
  const runtimeMinutes = diagnostics.fpsEstimate > 0
    ? diagnostics.frameCount / diagnostics.fpsEstimate / 60
    : 0
  const sceneDirtyRiskTransitionsPerMinute = runtimeMinutes > 0
    ? sceneDirtyRiskTransitionCount / runtimeMinutes
    : 0
  const sceneDirtyTransitionRateStatus: SceneDirtyTransitionRateStatus =
    sceneDirtyRiskTransitionsPerMinute >= transitionRateWatchThreshold * 1.5
      ? 'churning'
      : sceneDirtyRiskTransitionsPerMinute >= transitionRateWatchThreshold
        ? 'watch'
        : 'stable'
  const sceneDirtyTransitionRateStatusClassName = sceneDirtyTransitionRateStatus === 'churning'
    ? 'text-rose-600 dark:text-rose-400'
    : sceneDirtyTransitionRateStatus === 'watch'
      ? 'text-amber-600 dark:text-amber-400'
      : 'text-emerald-600 dark:text-emerald-400'
  const sceneDirtyHighRiskSustained =
    (sceneDirtyRiskStatus === 'high' || sceneDirtyRiskStatus === 'forcing') &&
    sceneDirtyRiskSecondsSinceTransition >= prolongedHighRiskSecondsThreshold
  const framePlanShortlistCoveragePercent = diagnostics.framePlanCandidateCount > 0
    ? (diagnostics.framePlanShortlistAppliedCandidateCount / diagnostics.framePlanCandidateCount) * 100
    : 0
  const framePlanShortlistGapPercent = diagnostics.framePlanCandidateCount > 0
    ? 100 - framePlanShortlistCoveragePercent
    : 0
  const shortlistTogglePerMinute = runtimeMinutes > 0
    ? diagnostics.framePlanShortlistToggleCount / runtimeMinutes
    : 0
  const shortlistDebounceTotal =
    diagnostics.framePlanShortlistToggleCount +
    diagnostics.framePlanShortlistDebounceBlockedToggleCount
  const shortlistDebounceBlockedRatePercent = shortlistDebounceTotal > 0
    ? (diagnostics.framePlanShortlistDebounceBlockedToggleCount / shortlistDebounceTotal) * 100
    : 0
  const shortlistDistanceToEnterPercent =
    (diagnostics.framePlanShortlistCandidateRatio - diagnostics.framePlanShortlistEnterRatioThreshold) * 100
  const shortlistDistanceToLeavePercent =
    (diagnostics.framePlanShortlistLeaveRatioThreshold - diagnostics.framePlanShortlistCandidateRatio) * 100
  const shortlistThresholdZone = diagnostics.framePlanShortlistCandidateRatio <= diagnostics.framePlanShortlistEnterRatioThreshold
    ? 'enter-zone'
    : diagnostics.framePlanShortlistCandidateRatio <= diagnostics.framePlanShortlistLeaveRatioThreshold
      ? 'hysteresis-zone'
      : 'leave-zone'
  const shortlistThresholdZoneLabel = shortlistThresholdZone === 'enter-zone'
    ? 'enter'
    : shortlistThresholdZone === 'hysteresis-zone'
      ? 'hysteresis'
      : 'leave'
  const shortlistThresholdZoneClassName = shortlistThresholdZone === 'enter-zone'
    ? 'text-emerald-600 dark:text-emerald-400'
    : shortlistThresholdZone === 'hysteresis-zone'
      ? 'text-amber-600 dark:text-amber-400'
      : 'text-rose-600 dark:text-rose-400'
  const shortlistStabilityStatus = shortlistDebounceBlockedRatePercent >= 55
    ? 'unstable'
    : shortlistDebounceBlockedRatePercent >= 30
      ? 'watch'
      : 'stable'
  const shortlistStabilityClassName = shortlistStabilityStatus === 'unstable'
    ? 'text-rose-600 dark:text-rose-400'
    : shortlistStabilityStatus === 'watch'
      ? 'text-amber-600 dark:text-amber-400'
      : 'text-emerald-600 dark:text-emerald-400'
  const shortlistSummary = [
    `${shortlistThresholdZoneLabel}`,
    `${shortlistStabilityStatus}`,
    `cov ${framePlanShortlistCoveragePercent.toFixed(1)}%`,
    `tog/min ${shortlistTogglePerMinute.toFixed(2)}`,
  ].join(' | ')
  const hitExactRatioPercent = diagnostics.hitPlanCandidateCount > 0
    ? (diagnostics.hitPlanExactCheckCount / diagnostics.hitPlanCandidateCount) * 100
    : 0
  return {
    trendWindowFrames,
    forcedSpikePerSecondThreshold,
    skipSpikePerSecondThreshold,
    riskScoreHighThreshold,
    prolongedHighRiskSecondsThreshold,
    transitionRateWatchThreshold,
    sceneDirtyTrend,
    sceneDirtyTrendDirection,
    sceneDirtyForceWindowRemainingFrames,
    sceneDirtyTrendPressure,
    sceneDirtyRiskStatus,
    sceneDirtyRiskStatusClassName,
    sceneDirtySkipRiskContribution,
    sceneDirtyForcedRiskContribution,
    sceneDirtyStreakRiskContribution,
    sceneDirtyRiskScore,
    sceneDirtyRiskScoreBand,
    sceneDirtySpikeSignal,
    sceneDirtySkipRiskContributionPercent,
    sceneDirtyForcedRiskContributionPercent,
    sceneDirtyStreakRiskContributionPercent,
    sceneDirtyRiskTransitionCount,
    sceneDirtyRiskTransitionsPerMinute,
    sceneDirtyRiskLastTransitionReason,
    sceneDirtyRiskSecondsSinceTransition,
    sceneDirtyTransitionRateStatus,
    sceneDirtyTransitionRateStatusClassName,
    sceneDirtyHighRiskSustained,
    framePlanShortlistCoveragePercent,
    framePlanShortlistGapPercent,
    shortlistTogglePerMinute,
    shortlistDebounceBlockedRatePercent,
    shortlistDistanceToEnterPercent,
    shortlistDistanceToLeavePercent,
    shortlistThresholdZoneLabel,
    shortlistThresholdZoneClassName,
    shortlistStabilityStatus,
    shortlistStabilityClassName,
    shortlistSummary,
    hitExactRatioPercent,
    activeOverlayRoutingSummary,
    activeOverlayRoutingAlertLevel: activeOverlayRoutingAlert.level,
    activeOverlayRoutingAlertReason: activeOverlayRoutingAlert.reason,
    activeOverlayRoutingAlertClassName,
    activeOverlayScenePlane: diagnostics.activeOverlayScenePlane,
    activeOverlayOverlayPlane: diagnostics.activeOverlayOverlayPlane,
    activeOverlayUsesActivePlane: diagnostics.activeOverlayUsesActivePlane,
    activeOverlayProtectedNodeCount: diagnostics.activeOverlayProtectedNodeCount,
    activeOverlayInteractionActiveNodeCount: diagnostics.activeOverlayInteractionActiveNodeCount,
    activeOverlayMinActiveNodeCountWhenActivePlane:
      ACTIVE_OVERLAY_MIN_ACTIVE_NODE_COUNT_WHEN_ACTIVE_PLANE,
    activeOverlayMinProtectedNodeCountWhenActivePlane:
      ACTIVE_OVERLAY_MIN_PROTECTED_NODE_COUNT_WHEN_ACTIVE_PLANE,
  }
}
