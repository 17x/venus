import {useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore} from 'react'
import {useTranslation} from 'react-i18next'
import {
  EMPTY_RUNTIME_RENDER_DIAGNOSTICS,
  getRuntimeRenderDiagnosticsSnapshot,
  subscribeRuntimeRenderDiagnostics,
} from '../../runtime/events/index.ts'

function DebugRow(props: {label: string; value: string}) {
  return (
    <div className={'flex items-center justify-between rounded bg-white px-2 py-1.5 text-xs text-slate-800 dark:bg-slate-900 dark:text-slate-100'}>
      <span className={'text-slate-500 dark:text-slate-400'}>{props.label}</span>
      <span className={'font-mono'}>{props.value}</span>
    </div>
  )
}

function formatDiagnosticBytes(value: number) {
  if (value < 1024) {
    return `${value} B`
  }

  if (value < 1024 * 1024) {
    return `${(value / 1024).toFixed(1)} KB`
  }

  return `${(value / (1024 * 1024)).toFixed(1)} MB`
}

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

function createSceneDirtyTrendSample(diagnostics: {
  frameCount: number
  offscreenSceneDirtySkipRequestCount: number
  forcedSceneDirtyRequestCount: number
  dirtyBoundsMarkCount: number
}): SceneDirtyTrendSample {
  return {
    frameCount: diagnostics.frameCount,
    offscreenSkipCount: diagnostics.offscreenSceneDirtySkipRequestCount,
    forcedSceneDirtyCount: diagnostics.forcedSceneDirtyRequestCount,
    dirtyBoundsMarkCount: diagnostics.dirtyBoundsMarkCount,
  }
}

export function RuntimeDebugPanel() {
  const {t} = useTranslation()
  const [copyDiagnosticsState, setCopyDiagnosticsState] = useState<'idle' | 'copied' | 'failed'>('idle')
  const diagnostics = useSyncExternalStore(
    subscribeRuntimeRenderDiagnostics,
    getRuntimeRenderDiagnosticsSnapshot,
    () => EMPTY_RUNTIME_RENDER_DIAGNOSTICS,
  )

  const cacheTotal = diagnostics.cacheHitCount + diagnostics.cacheMissCount
  const cacheHitRate = cacheTotal > 0
    ? (diagnostics.cacheHitCount / cacheTotal) * 100
    : 0
  const overlayGuideRetentionPercent = diagnostics.overlayGuideInputCount > 0
    ? (diagnostics.overlayGuideKeptCount / diagnostics.overlayGuideInputCount) * 100
    : 100
  const overlayGuideDroppedRatePercent = diagnostics.overlayGuideInputCount > 0
    ? (diagnostics.overlayGuideDroppedCount / diagnostics.overlayGuideInputCount) * 100
    : 0
  const renderRequestTotal =
    diagnostics.sceneDirtyRequestCount +
    diagnostics.deferredImageDrainRequestCount +
    diagnostics.idleRedrawRequestCount +
    diagnostics.interactiveRequestCount
  const sceneDirtyRequestRatePercent = renderRequestTotal > 0
    ? (diagnostics.sceneDirtyRequestCount / renderRequestTotal) * 100
    : 0
  const deferredImageRequestRatePercent = renderRequestTotal > 0
    ? (diagnostics.deferredImageDrainRequestCount / renderRequestTotal) * 100
    : 0
  const idleRedrawRequestRatePercent = renderRequestTotal > 0
    ? (diagnostics.idleRedrawRequestCount / renderRequestTotal) * 100
    : 0
  const interactiveRequestRatePercent = renderRequestTotal > 0
    ? (diagnostics.interactiveRequestCount / renderRequestTotal) * 100
    : 0
  const sceneDirtyDecisionTotal =
    diagnostics.sceneDirtyRequestCount +
    diagnostics.offscreenSceneDirtySkipRequestCount
  const offscreenSceneDirtySkipRatePercent = sceneDirtyDecisionTotal > 0
    ? (diagnostics.offscreenSceneDirtySkipRequestCount / sceneDirtyDecisionTotal) * 100
    : 0
  const forcedSceneDirtyRenderRatePercent = diagnostics.sceneDirtyRequestCount > 0
    ? (diagnostics.forcedSceneDirtyRequestCount / diagnostics.sceneDirtyRequestCount) * 100
    : 0
  const dirtyBoundsBucketTotal =
    diagnostics.dirtyBoundsMarkSmallAreaCount +
    diagnostics.dirtyBoundsMarkMediumAreaCount +
    diagnostics.dirtyBoundsMarkLargeAreaCount
  const dirtyBoundsSmallBucketRatePercent = dirtyBoundsBucketTotal > 0
    ? (diagnostics.dirtyBoundsMarkSmallAreaCount / dirtyBoundsBucketTotal) * 100
    : 0
  const dirtyBoundsMediumBucketRatePercent = dirtyBoundsBucketTotal > 0
    ? (diagnostics.dirtyBoundsMarkMediumAreaCount / dirtyBoundsBucketTotal) * 100
    : 0
  const dirtyBoundsLargeBucketRatePercent = dirtyBoundsBucketTotal > 0
    ? (diagnostics.dirtyBoundsMarkLargeAreaCount / dirtyBoundsBucketTotal) * 100
    : 0
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
    // Build a sliding frame-window trend so policy tuning can react to recent
    // behavior instead of lifetime averages.
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
    // Keep the score explainable by summing visible contribution terms.
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
    : sceneDirtyTrend.forcedSceneDirtyPerSecond
      >= forcedSpikePerSecondThreshold
      ? 'forced'
      : sceneDirtyTrend.offscreenSkipsPerSecond
        >= skipSpikePerSecondThreshold
        ? 'skip'
        : 'none'
  const sceneDirtyRiskStatusClassName = sceneDirtyRiskStatus === 'forcing'
    ? 'text-rose-600 dark:text-rose-400'
    : sceneDirtyRiskStatus === 'high'
      ? 'text-orange-600 dark:text-orange-400'
      : sceneDirtyRiskStatus === 'watch'
        ? 'text-amber-600 dark:text-amber-400'
        : 'text-emerald-600 dark:text-emerald-400'

  useEffect(() => {
    if (diagnostics.frameCount <= 0) {
      return
    }

    // Keep a bounded history so trend calculations remain local and cheap.
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
  const framePlanVisibleRatioPercent = diagnostics.framePlanVisibleRatio * 100
  const framePlanShortlistCandidateRatioPercent = diagnostics.framePlanShortlistCandidateRatio * 100
  const framePlanShortlistEnterRatioThresholdPercent = diagnostics.framePlanShortlistEnterRatioThreshold * 100
  const framePlanShortlistLeaveRatioThresholdPercent = diagnostics.framePlanShortlistLeaveRatioThreshold * 100
  // Derive shortlist effectiveness/zone indicators directly from sampled diagnostics.
  const framePlanShortlistCoveragePercent = diagnostics.framePlanCandidateCount > 0
    ? (diagnostics.framePlanShortlistAppliedCandidateCount / diagnostics.framePlanCandidateCount) * 100
    : 0
  const framePlanShortlistGapPercent = diagnostics.framePlanCandidateCount > 0
    ? 100 - framePlanShortlistCoveragePercent
    : 0
  // Translate cumulative toggle counters into a rough per-minute stability signal.
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
  const handleCopyDiagnosticsSnapshot = useCallback(async () => {
    try {
      // Export the live diagnostics snapshot plus key derived indicators for quick perf triage.
      const exportSnapshot = {
        at: new Date().toISOString(),
        diagnostics,
        derived: {
          sceneDirtyRiskStatus,
          sceneDirtyRiskScore,
          sceneDirtyRiskScoreBand,
          sceneDirtyTrendPressure,
          sceneDirtySpikeSignal,
          sceneDirtyHighRiskSustained,
          sceneDirtyRiskTransitionCount,
          sceneDirtyRiskTransitionsPerMinute,
          sceneDirtyRiskLastTransitionReason,
          sceneDirtySkipRiskContribution,
          sceneDirtyForcedRiskContribution,
          sceneDirtyStreakRiskContribution,
        },
      }
      await navigator.clipboard.writeText(JSON.stringify(exportSnapshot, null, 2))
      setCopyDiagnosticsState('copied')
    } catch {
      setCopyDiagnosticsState('failed')
    }
  }, [
    diagnostics,
    sceneDirtyForcedRiskContribution,
    sceneDirtyHighRiskSustained,
    sceneDirtyRiskLastTransitionReason,
    sceneDirtyRiskScore,
    sceneDirtyRiskScoreBand,
    sceneDirtyRiskStatus,
    sceneDirtyRiskTransitionCount,
    sceneDirtyRiskTransitionsPerMinute,
    sceneDirtySkipRiskContribution,
    sceneDirtySpikeSignal,
    sceneDirtyStreakRiskContribution,
    sceneDirtyTrendPressure,
  ])

  const copyDiagnosticsStateLabel = copyDiagnosticsState === 'copied'
    ? 'copied'
    : copyDiagnosticsState === 'failed'
      ? 'failed'
      : 'idle'

  useEffect(() => {
    if (copyDiagnosticsState === 'idle') {
      return
    }

    const handle = window.setTimeout(() => {
      setCopyDiagnosticsState('idle')
    }, 1800)

    return () => {
      window.clearTimeout(handle)
    }
  }, [copyDiagnosticsState])

  return (
    <section id={'variant-b-tabpanel-debug'} role={'tabpanel'} className={'scrollbar-custom flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto p-3'}>
      <DebugRow label={t('shell.variantB.debug.engineFrameCount', 'Engine Frame Count')} value={String(diagnostics.frameCount)}/>
      <DebugRow label={t('shell.variantB.debug.engineDrawCount', 'Engine Draw Calls')} value={String(diagnostics.drawCount)}/>
      <DebugRow label={t('shell.variantB.debug.drawMs', 'Draw Ms')} value={diagnostics.drawMs.toFixed(2)}/>
      <DebugRow label={t('shell.variantB.debug.fps', 'FPS (Smooth)')} value={diagnostics.fpsEstimate.toFixed(1)}/>
      <DebugRow label={t('shell.variantB.debug.fpsInstant', 'FPS (Instant)')} value={diagnostics.fpsInstantaneous.toFixed(1)}/>
      <DebugRow label={t('shell.variantB.debug.renderPhase', 'Render Phase')} value={diagnostics.renderPhase}/>
      <DebugRow label={t('shell.variantB.debug.renderPhaseTransitionCount', 'Render Phase Transitions')} value={String(diagnostics.renderPhaseTransitionCount)}/>
      <DebugRow label={t('shell.variantB.debug.lastRenderPhaseTransition', 'Last Render Phase Transition')} value={diagnostics.lastRenderPhaseTransition}/>
      <DebugRow label={t('shell.variantB.debug.viewportInteractionType', 'Viewport Interaction')} value={diagnostics.viewportInteractionType}/>
      <DebugRow label={t('shell.variantB.debug.renderPolicyQuality', 'Render Policy Quality')} value={diagnostics.renderPolicyQuality}/>
      <DebugRow label={t('shell.variantB.debug.renderPolicyDpr', 'Render Policy DPR')} value={String(diagnostics.renderPolicyDpr)}/>
      <DebugRow label={t('shell.variantB.debug.overlayMode', 'Overlay Mode')} value={diagnostics.overlayMode}/>
      <DebugRow label={t('shell.variantB.debug.renderPolicyTransitionCount', 'Render Policy Transitions')} value={String(diagnostics.renderPolicyTransitionCount)}/>
      <DebugRow label={t('shell.variantB.debug.lastRenderPolicyTransition', 'Last Render Policy Transition')} value={diagnostics.lastRenderPolicyTransition}/>
      <DebugRow label={t('shell.variantB.debug.overlayDegraded', 'Overlay Degraded')} value={diagnostics.overlayDegraded ? 'yes' : 'no'}/>
      <DebugRow label={t('shell.variantB.debug.overlayGuideInputCount', 'Overlay Guides Input')} value={String(diagnostics.overlayGuideInputCount)}/>
      <DebugRow label={t('shell.variantB.debug.overlayGuideKeptCount', 'Overlay Guides Kept')} value={String(diagnostics.overlayGuideKeptCount)}/>
      <DebugRow label={t('shell.variantB.debug.overlayGuideDroppedCount', 'Overlay Guides Dropped')} value={String(diagnostics.overlayGuideDroppedCount)}/>
      <DebugRow label={t('shell.variantB.debug.overlayGuideRetention', 'Overlay Guide Retention')} value={`${overlayGuideRetentionPercent.toFixed(1)}%`}/>
      <DebugRow label={t('shell.variantB.debug.overlayGuideDroppedRate', 'Overlay Guide Dropped Rate')} value={`${overlayGuideDroppedRatePercent.toFixed(1)}%`}/>
      <DebugRow label={t('shell.variantB.debug.overlayGuideSelectionStrategy', 'Overlay Guide Strategy')} value={diagnostics.overlayGuideSelectionStrategy}/>
      <DebugRow label={t('shell.variantB.debug.overlayPathEditWhitelistActive', 'Overlay Path-Edit Whitelist')} value={diagnostics.overlayPathEditWhitelistActive ? 'yes' : 'no'}/>
      <DebugRow label={t('shell.variantB.debug.framePlanVersion', 'Frame Plan Version')} value={String(diagnostics.framePlanVersion)}/>
      <DebugRow label={t('shell.variantB.debug.visibleShapeCount', 'Visible Shapes')} value={String(diagnostics.visibleShapeCount)}/>
      <DebugRow label={t('shell.variantB.debug.groupCollapseCount', 'Collapsed Groups')} value={String(diagnostics.groupCollapseCount)}/>
      <DebugRow label={t('shell.variantB.debug.groupCollapseCulledCount', 'Collapse-Culled Nodes')} value={String(diagnostics.groupCollapseCulledCount)}/>
      <DebugRow label={t('shell.variantB.debug.framePlanCandidateCount', 'Frame Candidates')} value={String(diagnostics.framePlanCandidateCount)}/>
      <DebugRow label={t('shell.variantB.debug.framePlanSceneNodeCount', 'Scene Nodes')} value={String(diagnostics.framePlanSceneNodeCount)}/>
      <DebugRow label={t('shell.variantB.debug.framePlanVisibleRatio', 'Candidate Ratio')} value={`${framePlanVisibleRatioPercent.toFixed(1)}%`}/>
      <DebugRow label={t('shell.variantB.debug.framePlanShortlistActive', 'Shortlist Active')} value={diagnostics.framePlanShortlistActive ? 'yes' : 'no'}/>
      <DebugRow label={t('shell.variantB.debug.framePlanShortlistCandidateRatio', 'Shortlist Ratio')} value={`${framePlanShortlistCandidateRatioPercent.toFixed(1)}%`}/>
      <DebugRow label={t('shell.variantB.debug.framePlanShortlistSummary', 'Shortlist Summary')} value={shortlistSummary}/>
      <DebugRow label={t('shell.variantB.debug.framePlanShortlistAppliedCandidateCount', 'Shortlist Applied Candidates')} value={String(diagnostics.framePlanShortlistAppliedCandidateCount)}/>
      <DebugRow
        label={t('shell.variantB.debug.framePlanShortlistPendingState', 'Shortlist Pending State')}
        value={diagnostics.framePlanShortlistPendingState === null ? 'none' : diagnostics.framePlanShortlistPendingState ? 'enable' : 'disable'}
      />
      <DebugRow label={t('shell.variantB.debug.framePlanShortlistPendingFrameCount', 'Shortlist Pending Frames')} value={String(diagnostics.framePlanShortlistPendingFrameCount)}/>
      <DebugRow label={t('shell.variantB.debug.framePlanShortlistToggleCount', 'Shortlist Toggle Count')} value={String(diagnostics.framePlanShortlistToggleCount)}/>
      <DebugRow label={t('shell.variantB.debug.framePlanShortlistDebounceBlockedToggleCount', 'Shortlist Debounce-Blocked')} value={String(diagnostics.framePlanShortlistDebounceBlockedToggleCount)}/>
      <DebugRow label={t('shell.variantB.debug.framePlanShortlistToggleRate', 'Shortlist Toggle / Min')} value={shortlistTogglePerMinute.toFixed(2)}/>
      <DebugRow label={t('shell.variantB.debug.framePlanShortlistDebounceBlockedRate', 'Shortlist Debounce Blocked Rate')} value={`${shortlistDebounceBlockedRatePercent.toFixed(1)}%`}/>
      <DebugRow label={t('shell.variantB.debug.framePlanShortlistDistanceToEnter', 'Shortlist Distance To Enter')} value={`${shortlistDistanceToEnterPercent.toFixed(1)}%`}/>
      <DebugRow label={t('shell.variantB.debug.framePlanShortlistDistanceToLeave', 'Shortlist Distance To Leave')} value={`${shortlistDistanceToLeavePercent.toFixed(1)}%`}/>
      <div className={'flex items-center justify-between rounded bg-white px-2 py-1.5 text-xs text-slate-800 dark:bg-slate-900 dark:text-slate-100'}>
        <span className={'text-slate-500 dark:text-slate-400'}>{t('shell.variantB.debug.framePlanShortlistStabilityStatus', 'Shortlist Stability')}</span>
        <span className={`font-mono ${shortlistStabilityClassName}`}>{shortlistStabilityStatus}</span>
      </div>
      <DebugRow label={t('shell.variantB.debug.framePlanShortlistCoverage', 'Shortlist Coverage')} value={`${framePlanShortlistCoveragePercent.toFixed(1)}%`}/>
      <DebugRow label={t('shell.variantB.debug.framePlanShortlistGap', 'Shortlist Gap')} value={`${framePlanShortlistGapPercent.toFixed(1)}%`}/>
      <div className={'flex items-center justify-between rounded bg-white px-2 py-1.5 text-xs text-slate-800 dark:bg-slate-900 dark:text-slate-100'}>
        <span className={'text-slate-500 dark:text-slate-400'}>{t('shell.variantB.debug.framePlanShortlistThresholdZone', 'Shortlist Threshold Zone')}</span>
        <span className={`font-mono ${shortlistThresholdZoneClassName}`}>{shortlistThresholdZoneLabel}</span>
      </div>
      <DebugRow label={t('shell.variantB.debug.framePlanShortlistEnterRatioThreshold', 'Shortlist Enter Threshold')} value={`${framePlanShortlistEnterRatioThresholdPercent.toFixed(1)}%`}/>
      <DebugRow label={t('shell.variantB.debug.framePlanShortlistLeaveRatioThreshold', 'Shortlist Leave Threshold')} value={`${framePlanShortlistLeaveRatioThresholdPercent.toFixed(1)}%`}/>
      <DebugRow label={t('shell.variantB.debug.framePlanShortlistStableFrameCount', 'Shortlist Stable Frames')} value={String(diagnostics.framePlanShortlistStableFrameCount)}/>
      <DebugRow label={t('shell.variantB.debug.hitPlanVersion', 'Hit Plan Version')} value={String(diagnostics.hitPlanVersion)}/>
      <DebugRow label={t('shell.variantB.debug.hitPlanCandidateCount', 'Hit Candidates')} value={String(diagnostics.hitPlanCandidateCount)}/>
      <DebugRow label={t('shell.variantB.debug.hitPlanHitCount', 'Hit Count')} value={String(diagnostics.hitPlanHitCount)}/>
      <DebugRow label={t('shell.variantB.debug.hitPlanExactCheckCount', 'Hit Exact Checks')} value={String(diagnostics.hitPlanExactCheckCount)}/>
      <DebugRow label={t('shell.variantB.debug.hitPlanExactRatio', 'Hit Exact Ratio')} value={`${hitExactRatioPercent.toFixed(1)}%`}/>
      <DebugRow label={t('shell.variantB.debug.renderPrepDirtyCandidateCount', 'Dirty In Candidates')} value={String(diagnostics.renderPrepDirtyCandidateCount)}/>
      <DebugRow label={t('shell.variantB.debug.renderPrepDirtyOffscreenCount', 'Dirty Outside Candidates')} value={String(diagnostics.renderPrepDirtyOffscreenCount)}/>
      <DebugRow label={t('shell.variantB.debug.offscreenSceneDirtySkipConsecutiveCount', 'Offscreen Dirty Skip (Consecutive)')} value={String(diagnostics.offscreenSceneDirtySkipConsecutiveCount)}/>
      <DebugRow label={t('shell.variantB.debug.offscreenSceneDirtySkipConsecutiveMaxCount', 'Offscreen Dirty Skip (Max)')} value={String(diagnostics.offscreenSceneDirtySkipConsecutiveMaxCount)}/>
      <DebugRow label={t('shell.variantB.debug.offscreenSceneDirtyForceRenderFrameThreshold', 'Offscreen Force Threshold (Frames)')} value={String(diagnostics.offscreenSceneDirtyForceRenderFrameThreshold)}/>
      <DebugRow label={t('shell.variantB.debug.offscreenSceneDirtyForceWindowRemainingFrames', 'Offscreen Force Window Remaining')} value={String(sceneDirtyForceWindowRemainingFrames)}/>
      <DebugRow label={t('shell.variantB.debug.sceneDirtyTrendWindowFrames', 'Scene Dirty Trend Window (Frames)')} value={String(trendWindowFrames)}/>
      <DebugRow label={t('shell.variantB.debug.offscreenSceneDirtyRiskWatchSkipRateThreshold', 'Risk Watch Skip Threshold')} value={`${diagnostics.offscreenSceneDirtyRiskWatchSkipRateThreshold.toFixed(1)}%`}/>
      <DebugRow label={t('shell.variantB.debug.offscreenSceneDirtyRiskHighSkipRateThreshold', 'Risk High Skip Threshold')} value={`${diagnostics.offscreenSceneDirtyRiskHighSkipRateThreshold.toFixed(1)}%`}/>
      <DebugRow label={t('shell.variantB.debug.offscreenSceneDirtyRiskHighForcedPerSecondThreshold', 'Risk High Forced / s Threshold')} value={diagnostics.offscreenSceneDirtyRiskHighForcedPerSecondThreshold.toFixed(2)}/>
      <DebugRow label={t('shell.variantB.debug.sceneDirtyProlongedHighRiskSecondsThreshold', 'Prolonged High Risk Threshold (s)')} value={prolongedHighRiskSecondsThreshold.toFixed(1)}/>
      <DebugRow label={t('shell.variantB.debug.sceneDirtyTransitionRateWatchThreshold', 'Transition Watch Threshold (/min)')} value={transitionRateWatchThreshold.toFixed(2)}/>
      <DebugRow label={t('shell.variantB.debug.offscreenSceneDirtyForcedSpikePerSecondThreshold', 'Forced Spike / s Threshold')} value={forcedSpikePerSecondThreshold.toFixed(2)}/>
      <DebugRow label={t('shell.variantB.debug.offscreenSceneDirtySkipSpikePerSecondThreshold', 'Skip Spike / s Threshold')} value={skipSpikePerSecondThreshold.toFixed(2)}/>
      <DebugRow label={t('shell.variantB.debug.sceneDirtyRiskScoreHighThreshold', 'Risk Score High Threshold')} value={riskScoreHighThreshold.toFixed(1)}/>
      <DebugRow label={t('shell.variantB.debug.dirtyBoundsSmallAreaThreshold', 'Dirty Small Area Threshold')} value={String(diagnostics.dirtyBoundsSmallAreaThreshold)}/>
      <DebugRow label={t('shell.variantB.debug.dirtyBoundsMediumAreaThreshold', 'Dirty Medium Area Threshold')} value={String(diagnostics.dirtyBoundsMediumAreaThreshold)}/>
      <DebugRow label={t('shell.variantB.debug.dirtyBoundsMarkCount', 'Dirty Bounds Marks')} value={String(diagnostics.dirtyBoundsMarkCount)}/>
      <DebugRow label={t('shell.variantB.debug.dirtyBoundsMarkArea', 'Dirty Bounds Area')} value={diagnostics.dirtyBoundsMarkArea.toFixed(1)}/>
      <DebugRow label={t('shell.variantB.debug.dirtyBoundsMarkSmallAreaCount', 'Dirty Marks Small Area')} value={String(diagnostics.dirtyBoundsMarkSmallAreaCount)}/>
      <DebugRow label={t('shell.variantB.debug.dirtyBoundsMarkSmallAreaRate', 'Dirty Marks Small Rate')} value={`${dirtyBoundsSmallBucketRatePercent.toFixed(1)}%`}/>
      <DebugRow label={t('shell.variantB.debug.dirtyBoundsMarkMediumAreaCount', 'Dirty Marks Medium Area')} value={String(diagnostics.dirtyBoundsMarkMediumAreaCount)}/>
      <DebugRow label={t('shell.variantB.debug.dirtyBoundsMarkMediumAreaRate', 'Dirty Marks Medium Rate')} value={`${dirtyBoundsMediumBucketRatePercent.toFixed(1)}%`}/>
      <DebugRow label={t('shell.variantB.debug.dirtyBoundsMarkLargeAreaCount', 'Dirty Marks Large Area')} value={String(diagnostics.dirtyBoundsMarkLargeAreaCount)}/>
      <DebugRow label={t('shell.variantB.debug.dirtyBoundsMarkLargeAreaRate', 'Dirty Marks Large Rate')} value={`${dirtyBoundsLargeBucketRatePercent.toFixed(1)}%`}/>
      <DebugRow label={t('shell.variantB.debug.offscreenSceneDirtySkipTrend', 'Offscreen Dirty Skip / s (Recent)')} value={sceneDirtyTrend.offscreenSkipsPerSecond.toFixed(2)}/>
      <DebugRow label={t('shell.variantB.debug.offscreenSceneDirtySkipDirection', 'Offscreen Dirty Skip Direction')} value={sceneDirtyTrendDirection.offscreenSkipsDirection}/>
      <DebugRow label={t('shell.variantB.debug.forcedSceneDirtyTrend', 'Forced Scene Dirty / s (Recent)')} value={sceneDirtyTrend.forcedSceneDirtyPerSecond.toFixed(2)}/>
      <DebugRow label={t('shell.variantB.debug.forcedSceneDirtyDirection', 'Forced Scene Dirty Direction')} value={sceneDirtyTrendDirection.forcedSceneDirtyDirection}/>
      <DebugRow label={t('shell.variantB.debug.dirtyBoundsMarkTrend', 'Dirty Bounds Marks / s (Recent)')} value={sceneDirtyTrend.dirtyBoundsMarksPerSecond.toFixed(2)}/>
      <DebugRow label={t('shell.variantB.debug.dirtyBoundsMarkDirection', 'Dirty Bounds Mark Direction')} value={sceneDirtyTrendDirection.dirtyBoundsMarksDirection}/>
      <DebugRow label={t('shell.variantB.debug.sceneDirtyTrendPressure', 'Scene Dirty Trend Pressure')} value={sceneDirtyTrendPressure}/>
      <DebugRow label={t('shell.variantB.debug.sceneDirtySpikeSignal', 'Scene Dirty Spike Signal')} value={sceneDirtySpikeSignal}/>
      <DebugRow label={t('shell.variantB.debug.sceneDirtyRiskScore', 'Scene Dirty Risk Score')} value={sceneDirtyRiskScore.toFixed(1)}/>
      <DebugRow label={t('shell.variantB.debug.sceneDirtyRiskScoreBand', 'Scene Dirty Risk Score Band')} value={sceneDirtyRiskScoreBand}/>
      <DebugRow label={t('shell.variantB.debug.sceneDirtyRiskScoreSkipContribution', 'Risk Score Skip Contribution')} value={sceneDirtySkipRiskContribution.toFixed(1)}/>
      <DebugRow label={t('shell.variantB.debug.sceneDirtyRiskScoreSkipContributionPercent', 'Risk Score Skip Contribution %')} value={`${sceneDirtySkipRiskContributionPercent.toFixed(1)}%`}/>
      <DebugRow label={t('shell.variantB.debug.sceneDirtyRiskScoreForcedContribution', 'Risk Score Forced Contribution')} value={sceneDirtyForcedRiskContribution.toFixed(1)}/>
      <DebugRow label={t('shell.variantB.debug.sceneDirtyRiskScoreForcedContributionPercent', 'Risk Score Forced Contribution %')} value={`${sceneDirtyForcedRiskContributionPercent.toFixed(1)}%`}/>
      <DebugRow label={t('shell.variantB.debug.sceneDirtyRiskScoreStreakContribution', 'Risk Score Streak Contribution')} value={sceneDirtyStreakRiskContribution.toFixed(1)}/>
      <DebugRow label={t('shell.variantB.debug.sceneDirtyRiskScoreStreakContributionPercent', 'Risk Score Streak Contribution %')} value={`${sceneDirtyStreakRiskContributionPercent.toFixed(1)}%`}/>
      <DebugRow label={t('shell.variantB.debug.sceneDirtyRiskTransitionCount', 'Scene Dirty Risk Transitions')} value={String(sceneDirtyRiskTransitionCount)}/>
      <DebugRow label={t('shell.variantB.debug.sceneDirtyRiskTransitionsPerMinute', 'Scene Dirty Risk Transitions / Min')} value={sceneDirtyRiskTransitionsPerMinute.toFixed(2)}/>
      <div className={'flex items-center justify-between rounded bg-white px-2 py-1.5 text-xs text-slate-800 dark:bg-slate-900 dark:text-slate-100'}>
        <span className={'text-slate-500 dark:text-slate-400'}>{t('shell.variantB.debug.sceneDirtyTransitionRateStatus', 'Scene Dirty Transition Rate Status')}</span>
        <span className={`font-mono ${sceneDirtyTransitionRateStatusClassName}`}>{sceneDirtyTransitionRateStatus}</span>
      </div>
      <DebugRow label={t('shell.variantB.debug.sceneDirtyRiskLastTransitionReason', 'Scene Dirty Last Transition Reason')} value={sceneDirtyRiskLastTransitionReason}/>
      <DebugRow label={t('shell.variantB.debug.sceneDirtyRiskSecondsSinceTransition', 'Scene Dirty Risk Seconds In State')} value={sceneDirtyRiskSecondsSinceTransition.toFixed(2)}/>
      <DebugRow label={t('shell.variantB.debug.sceneDirtyHighRiskSustained', 'Scene Dirty High Risk Sustained')} value={sceneDirtyHighRiskSustained ? 'yes' : 'no'}/>
      <div className={'flex items-center justify-between rounded bg-white px-2 py-1.5 text-xs text-slate-800 dark:bg-slate-900 dark:text-slate-100'}>
        <span className={'text-slate-500 dark:text-slate-400'}>{t('shell.variantB.debug.sceneDirtyRiskStatus', 'Scene Dirty Risk Status')}</span>
        <span className={`font-mono ${sceneDirtyRiskStatusClassName}`}>{sceneDirtyRiskStatus}</span>
      </div>
      <div className={'flex items-center justify-between rounded bg-white px-2 py-1.5 text-xs text-slate-800 dark:bg-slate-900 dark:text-slate-100'}>
        <span className={'text-slate-500 dark:text-slate-400'}>{t('shell.variantB.debug.exportDiagnosticsSnapshot', 'Export Diagnostics Snapshot')}</span>
        <button
          type={'button'}
          onClick={handleCopyDiagnosticsSnapshot}
          className={'rounded border border-slate-300 bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700'}
        >
          {t('shell.variantB.debug.copySnapshot', 'Copy JSON')}
        </button>
      </div>
      <DebugRow label={t('shell.variantB.debug.exportDiagnosticsSnapshotStatus', 'Diagnostics Export Status')} value={copyDiagnosticsStateLabel}/>
      <DebugRow label={t('shell.variantB.debug.cacheHitEstimate', 'Cache Hit')} value={String(diagnostics.cacheHitCount)}/>
      <DebugRow label={t('shell.variantB.debug.cacheMissEstimate', 'Cache Miss')} value={String(diagnostics.cacheMissCount)}/>
      <DebugRow label={t('shell.variantB.debug.cacheHitRate', 'Cache Hit Rate')} value={`${cacheHitRate.toFixed(1)}%`}/>
      <DebugRow label={t('shell.variantB.debug.frameReuseHitCount', 'Frame Reuse Hit')} value={String(diagnostics.frameReuseHitCount)}/>
      <DebugRow label={t('shell.variantB.debug.frameReuseMissCount', 'Frame Reuse Miss')} value={String(diagnostics.frameReuseMissCount)}/>
      <DebugRow label={t('shell.variantB.debug.cacheMode', 'Cache Mode')} value={diagnostics.cacheMode}/>
      <DebugRow label={t('shell.variantB.debug.webglRenderPath', 'WebGL Render Path')} value={diagnostics.webglRenderPath}/>
      <DebugRow label={t('shell.variantB.debug.webglInteractiveTextFallbackCount', 'WebGL Text Fallback')} value={String(diagnostics.webglInteractiveTextFallbackCount)}/>
      <DebugRow label={t('shell.variantB.debug.webglImageTextureUploadCount', 'WebGL Image Upload Count')} value={String(diagnostics.webglImageTextureUploadCount)}/>
      <DebugRow label={t('shell.variantB.debug.webglImageTextureUploadBytes', 'WebGL Image Upload Bytes')} value={formatDiagnosticBytes(diagnostics.webglImageTextureUploadBytes)}/>
      <DebugRow label={t('shell.variantB.debug.webglImageDownsampledUploadCount', 'WebGL Image Downsampled Uploads')} value={String(diagnostics.webglImageDownsampledUploadCount)}/>
      <DebugRow label={t('shell.variantB.debug.webglImageDownsampledUploadBytesSaved', 'WebGL Image Bytes Saved')} value={formatDiagnosticBytes(diagnostics.webglImageDownsampledUploadBytesSaved)}/>
      <DebugRow label={t('shell.variantB.debug.webglDeferredImageTextureCount', 'WebGL Deferred Image Uploads')} value={String(diagnostics.webglDeferredImageTextureCount)}/>
      <DebugRow label={t('shell.variantB.debug.webglTextTextureUploadCount', 'WebGL Text Upload Count')} value={String(diagnostics.webglTextTextureUploadCount)}/>
      <DebugRow label={t('shell.variantB.debug.webglTextTextureUploadBytes', 'WebGL Text Upload Bytes')} value={formatDiagnosticBytes(diagnostics.webglTextTextureUploadBytes)}/>
      <DebugRow label={t('shell.variantB.debug.webglTextCacheHitCount', 'WebGL Text Cache Hit')} value={String(diagnostics.webglTextCacheHitCount)}/>
      <DebugRow label={t('shell.variantB.debug.webglCompositeUploadBytes', 'WebGL Composite Upload Bytes')} value={formatDiagnosticBytes(diagnostics.webglCompositeUploadBytes)}/>
      <DebugRow label={t('shell.variantB.debug.l0PreviewHitCount', 'L0 Preview Hits')} value={String(diagnostics.l0PreviewHitCount)}/>
      <DebugRow label={t('shell.variantB.debug.l0PreviewMissCount', 'L0 Preview Misses')} value={String(diagnostics.l0PreviewMissCount)}/>
      <DebugRow label={t('shell.variantB.debug.l1CompositeHitCount', 'L1 Composite Hits')} value={String(diagnostics.l1CompositeHitCount)}/>
      <DebugRow label={t('shell.variantB.debug.l1CompositeMissCount', 'L1 Composite Misses')} value={String(diagnostics.l1CompositeMissCount)}/>
      <DebugRow label={t('shell.variantB.debug.l2TileHitCount', 'L2 Tile Hits')} value={String(diagnostics.l2TileHitCount)}/>
      <DebugRow label={t('shell.variantB.debug.l2TileMissCount', 'L2 Tile Misses')} value={String(diagnostics.l2TileMissCount)}/>
      <DebugRow label={t('shell.variantB.debug.cacheFallbackReason', 'Cache Fallback Reason')} value={diagnostics.cacheFallbackReason}/>
      <DebugRow label={t('shell.variantB.debug.lastRenderRequestReason', 'Last Render Request')} value={diagnostics.lastRenderRequestReason}/>
      <DebugRow label={t('shell.variantB.debug.sceneDirtyRequestCount', 'Scene Dirty Requests')} value={String(diagnostics.sceneDirtyRequestCount)}/>
      <DebugRow label={t('shell.variantB.debug.sceneDirtyRequestRate', 'Scene Dirty Request Rate')} value={`${sceneDirtyRequestRatePercent.toFixed(1)}%`}/>
      <DebugRow label={t('shell.variantB.debug.offscreenSceneDirtySkipRequestCount', 'Offscreen Dirty Skip Decisions')} value={String(diagnostics.offscreenSceneDirtySkipRequestCount)}/>
      <DebugRow label={t('shell.variantB.debug.offscreenSceneDirtySkipRate', 'Offscreen Dirty Skip Rate')} value={`${offscreenSceneDirtySkipRatePercent.toFixed(1)}%`}/>
      <DebugRow label={t('shell.variantB.debug.forcedSceneDirtyRequestCount', 'Forced Scene Dirty Requests')} value={String(diagnostics.forcedSceneDirtyRequestCount)}/>
      <DebugRow label={t('shell.variantB.debug.forcedSceneDirtyRenderRate', 'Forced Scene Dirty Rate')} value={`${forcedSceneDirtyRenderRatePercent.toFixed(1)}%`}/>
      <DebugRow label={t('shell.variantB.debug.deferredImageDrainRequestCount', 'Deferred Image Requests')} value={String(diagnostics.deferredImageDrainRequestCount)}/>
      <DebugRow label={t('shell.variantB.debug.deferredImageDrainRequestRate', 'Deferred Image Request Rate')} value={`${deferredImageRequestRatePercent.toFixed(1)}%`}/>
      <DebugRow label={t('shell.variantB.debug.idleRedrawRequestCount', 'Idle Redraw Requests')} value={String(diagnostics.idleRedrawRequestCount)}/>
      <DebugRow label={t('shell.variantB.debug.idleRedrawRequestRate', 'Idle Redraw Request Rate')} value={`${idleRedrawRequestRatePercent.toFixed(1)}%`}/>
      <DebugRow label={t('shell.variantB.debug.interactiveRequestCount', 'Interactive Requests')} value={String(diagnostics.interactiveRequestCount)}/>
      <DebugRow label={t('shell.variantB.debug.interactiveRequestRate', 'Interactive Request Rate')} value={`${interactiveRequestRatePercent.toFixed(1)}%`}/>
    </section>
  )
}
