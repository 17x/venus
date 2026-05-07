import {useSyncExternalStore} from 'react'
import {useTranslation} from 'react-i18next'
import {
  EMPTY_RUNTIME_MIGRATION_SNAPSHOT,
  EMPTY_RUNTIME_RENDER_DIAGNOSTICS,
  getRuntimeMigrationSnapshot,
  getRuntimeRenderDiagnosticsSnapshot,
  subscribeRuntimeMigrationSnapshot,
  subscribeRuntimeRenderDiagnostics,
} from '../../../runtime/events/index/index.ts'
import {
  CompactRuntimeDebugPanel,
  VerboseRuntimeDebugPanel,
} from './RuntimeDebugPanel.sections.tsx'
import {
  RUNTIME_V2_ALERT_HIGH_MISMATCH_RATE_PERCENT,
  RUNTIME_V2_ALERT_MIN_SAMPLE,
  RUNTIME_V2_ALERT_WATCH_MISMATCH_RATE_PERCENT,
  useRuntimeDebugSceneDirtyModel,
} from './RuntimeDebugPanel.sceneDirtyModel.ts'

// Keep compact mode as default while preserving verbose diagnostics as a switchable branch.
const SHOW_VERBOSE_DEBUG = false

/**
 * Renders runtime diagnostics panel in compact mode used by the current shell variant.
 */
export function RuntimeDebugPanel() {
  const {t} = useTranslation()
  const diagnostics = useSyncExternalStore(
    subscribeRuntimeRenderDiagnostics,
    getRuntimeRenderDiagnosticsSnapshot,
    () => EMPTY_RUNTIME_RENDER_DIAGNOSTICS,
  )
  const runtimeMigrationSnapshot = useSyncExternalStore(
    subscribeRuntimeMigrationSnapshot,
    getRuntimeMigrationSnapshot,
    () => EMPTY_RUNTIME_MIGRATION_SNAPSHOT,
  )

  // Keep mismatch rate explicit so migration risk can be tracked at a glance.
  const runtimeV2MismatchRatePercent = runtimeMigrationSnapshot.runtimeV2.checks > 0
    ? (runtimeMigrationSnapshot.runtimeV2.mismatches / runtimeMigrationSnapshot.runtimeV2.checks) * 100
    : 0
  // Keep frame-boundary mismatch rate separate so command checks and frame checks are distinguishable in rollout triage.
  const runtimeV2FrameBoundaryMismatchRatePercent = runtimeMigrationSnapshot.runtimeV2.frameBoundaryChecks > 0
    ? (runtimeMigrationSnapshot.runtimeV2.frameBoundaryMismatches / runtimeMigrationSnapshot.runtimeV2.frameBoundaryChecks) * 100
    : 0

  // Resolve migration alert level from the worst command/frame mismatch rate once enough samples exist.
  const runtimeV2AlertLevel: 'stable' | 'watch' | 'high' = (() => {
    const commandSampleReady = runtimeMigrationSnapshot.runtimeV2.checks >= RUNTIME_V2_ALERT_MIN_SAMPLE
    const frameSampleReady = runtimeMigrationSnapshot.runtimeV2.frameBoundaryChecks >= RUNTIME_V2_ALERT_MIN_SAMPLE
    if (!commandSampleReady && !frameSampleReady) {
      return 'stable'
    }

    const worstMismatchRatePercent = Math.max(
      commandSampleReady ? runtimeV2MismatchRatePercent : 0,
      frameSampleReady ? runtimeV2FrameBoundaryMismatchRatePercent : 0,
    )
    if (worstMismatchRatePercent >= RUNTIME_V2_ALERT_HIGH_MISMATCH_RATE_PERCENT) {
      return 'high'
    }
    if (worstMismatchRatePercent >= RUNTIME_V2_ALERT_WATCH_MISMATCH_RATE_PERCENT) {
      return 'watch'
    }
    return 'stable'
  })()

  const runtimeV2AlertClassName = runtimeV2AlertLevel === 'high'
    ? 'text-rose-600 dark:text-rose-400'
    : runtimeV2AlertLevel === 'watch'
      ? 'text-amber-600 dark:text-amber-400'
      : 'text-emerald-600 dark:text-emerald-400'

  const cacheTotal = diagnostics.cacheHitCount + diagnostics.cacheMissCount
  const cacheHitRate = cacheTotal > 0
    ? (diagnostics.cacheHitCount / cacheTotal) * 100
    : 0

  const performanceTimingStats = diagnostics.stats?.performance.timing
  const performanceLodStats = diagnostics.stats?.performance.lod
  const sceneDirtyModel = useRuntimeDebugSceneDirtyModel(diagnostics)

  const framePlanVisibleRatioPercent = diagnostics.framePlanVisibleRatio * 100
  const framePlanShortlistCandidateRatioPercent = diagnostics.framePlanShortlistCandidateRatio * 100
  const framePlanShortlistEnterRatioThresholdPercent = diagnostics.framePlanShortlistEnterRatioThreshold * 100
  const framePlanShortlistLeaveRatioThresholdPercent = diagnostics.framePlanShortlistLeaveRatioThreshold * 100
  const sceneDirtyDecisionTotal = diagnostics.sceneDirtyRequestCount + diagnostics.offscreenSceneDirtySkipRequestCount
  const offscreenSceneDirtySkipRatePercent = sceneDirtyDecisionTotal > 0
    ? (diagnostics.offscreenSceneDirtySkipRequestCount / sceneDirtyDecisionTotal) * 100
    : 0
  const forcedSceneDirtyRenderRatePercent = diagnostics.sceneDirtyRequestCount > 0
    ? (diagnostics.forcedSceneDirtyRequestCount / diagnostics.sceneDirtyRequestCount) * 100
    : 0

  if (SHOW_VERBOSE_DEBUG) {
    return (
      <VerboseRuntimeDebugPanel
        t={t}
        diagnostics={diagnostics}
        performanceTimingStats={performanceTimingStats}
        performanceLodStats={performanceLodStats}
        cacheHitRate={cacheHitRate}
        framePlanVisibleRatioPercent={framePlanVisibleRatioPercent}
        framePlanShortlistCandidateRatioPercent={framePlanShortlistCandidateRatioPercent}
        framePlanShortlistEnterRatioThresholdPercent={framePlanShortlistEnterRatioThresholdPercent}
        framePlanShortlistLeaveRatioThresholdPercent={framePlanShortlistLeaveRatioThresholdPercent}
        offscreenSceneDirtySkipRatePercent={offscreenSceneDirtySkipRatePercent}
        forcedSceneDirtyRenderRatePercent={forcedSceneDirtyRenderRatePercent}
        runtimeMigrationSnapshot={runtimeMigrationSnapshot}
        runtimeV2MismatchRatePercent={runtimeV2MismatchRatePercent}
        runtimeV2FrameBoundaryMismatchRatePercent={runtimeV2FrameBoundaryMismatchRatePercent}
        runtimeV2AlertClassName={runtimeV2AlertClassName}
        runtimeV2AlertLevel={runtimeV2AlertLevel}
        sceneDirtyModel={sceneDirtyModel}
      />
    )
  }

  return (
    <CompactRuntimeDebugPanel
      t={t}
      diagnostics={diagnostics}
      cacheHitRate={cacheHitRate}
      runtimeMigrationSnapshot={runtimeMigrationSnapshot}
      runtimeV2MismatchRatePercent={runtimeV2MismatchRatePercent}
      runtimeV2FrameBoundaryMismatchRatePercent={runtimeV2FrameBoundaryMismatchRatePercent}
      runtimeV2AlertClassName={runtimeV2AlertClassName}
      runtimeV2AlertLevel={runtimeV2AlertLevel}
    />
  )
}
