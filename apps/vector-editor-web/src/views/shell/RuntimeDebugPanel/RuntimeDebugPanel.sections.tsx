import type {TFunction} from 'i18next'
import type {
  RuntimeMigrationSnapshot,
  RuntimeRenderDiagnostics,
} from '../../../runtime/events/index/index.ts'
import {DebugRow, DebugSection, formatDiagnosticBytes} from './RuntimeDebugPanel.shared.tsx'
import type {useRuntimeDebugSceneDirtyModel} from './RuntimeDebugPanel.sceneDirtyModel.ts'

type RuntimeDiagnosticsTimingStats = NonNullable<
  NonNullable<RuntimeRenderDiagnostics['stats']>['performance']['timing']
>

type RuntimeDiagnosticsLodStats = NonNullable<
  NonNullable<RuntimeRenderDiagnostics['stats']>['performance']['lod']
>

/**
 * Renders migration diagnostics rows reused by compact and verbose variants.
 * @param props Runtime migration values and style hints.
 */
export function RuntimeV2DebugSection(props: {
  t: TFunction
  runtimeMigrationSnapshot: RuntimeMigrationSnapshot
  runtimeV2MismatchRatePercent: number
  runtimeV2FrameBoundaryMismatchRatePercent: number
  runtimeV2AlertClassName: string
  runtimeV2AlertLevel: 'stable' | 'watch' | 'high'
}) {
  const {
    t,
    runtimeMigrationSnapshot,
    runtimeV2MismatchRatePercent,
    runtimeV2FrameBoundaryMismatchRatePercent,
    runtimeV2AlertClassName,
    runtimeV2AlertLevel,
  } = props

  return (
    <DebugSection title={t('shell.variantB.debug.sectionRuntimeV2', 'Runtime V2 Migration')}>
      <DebugRow label={t('shell.variantB.debug.runtimeV2Checks', 'Dual-Write Checks')} value={String(runtimeMigrationSnapshot.runtimeV2.checks)}/>
      <DebugRow label={t('shell.variantB.debug.runtimeV2Mismatches', 'Dual-Write Mismatches')} value={String(runtimeMigrationSnapshot.runtimeV2.mismatches)}/>
      <DebugRow label={t('shell.variantB.debug.runtimeV2MismatchRate', 'Dual-Write Mismatch Rate')} value={`${runtimeV2MismatchRatePercent.toFixed(1)}%`}/>
      <DebugRow label={t('shell.variantB.debug.runtimeV2FrameBoundaryChecks', 'Frame-Boundary Checks')} value={String(runtimeMigrationSnapshot.runtimeV2.frameBoundaryChecks)}/>
      <DebugRow label={t('shell.variantB.debug.runtimeV2FrameBoundaryMismatches', 'Frame-Boundary Mismatches')} value={String(runtimeMigrationSnapshot.runtimeV2.frameBoundaryMismatches)}/>
      <DebugRow label={t('shell.variantB.debug.runtimeV2FrameBoundaryMismatchRate', 'Frame-Boundary Mismatch Rate')} value={`${runtimeV2FrameBoundaryMismatchRatePercent.toFixed(1)}%`}/>
      <DebugRow
        label={t('shell.variantB.debug.runtimeV2GroupConsistencyValid', 'Group Quick-Check Valid')}
        value={runtimeMigrationSnapshot.runtimeV2.groupConsistencyQuickCheck.valid ? 'yes' : 'no'}
      />
      <DebugRow
        label={t('shell.variantB.debug.runtimeV2GroupConsistencyDiagnosticCount', 'Group Quick-Check Diagnostic Count')}
        value={String(runtimeMigrationSnapshot.runtimeV2.groupConsistencyQuickCheck.diagnosticCount)}
      />
      <DebugRow
        label={t('shell.variantB.debug.runtimeV2GroupConsistencyCodes', 'Group Quick-Check Codes')}
        value={runtimeMigrationSnapshot.runtimeV2.groupConsistencyQuickCheck.codes.length > 0
          ? runtimeMigrationSnapshot.runtimeV2.groupConsistencyQuickCheck.codes.join(', ')
          : 'none'}
      />
      <DebugRow
        label={t('shell.variantB.debug.runtimeV2AdapterGovernanceAvailable', 'Adapter Snapshot Governance Available')}
        value={runtimeMigrationSnapshot.runtimeV2.adapterSnapshotGovernance.available ? 'yes' : 'no'}
      />
      <DebugRow
        label={t('shell.variantB.debug.runtimeV2AdapterGovernanceConsistent', 'Adapter Snapshot Governance Consistent')}
        value={runtimeMigrationSnapshot.runtimeV2.adapterSnapshotGovernance.consistent ? 'yes' : 'no'}
      />
      <DebugRow
        label={t('shell.variantB.debug.runtimeV2AdapterGovernanceMismatchCount', 'Adapter Snapshot Governance Mismatch Count')}
        value={String(runtimeMigrationSnapshot.runtimeV2.adapterSnapshotGovernance.mismatchCount)}
      />
      <DebugRow
        label={t('shell.variantB.debug.runtimeV2AdapterGovernanceRiskLevel', 'Adapter Snapshot Governance Risk Level')}
        value={runtimeMigrationSnapshot.runtimeV2.adapterSnapshotGovernance.riskLevel}
      />
      <DebugRow
        label={t('shell.variantB.debug.runtimeV2AdapterNormalizeElementCount', 'Adapter Normalize Element Count')}
        value={String(runtimeMigrationSnapshot.runtimeV2.adapterSnapshotGovernance.normalizeElementCount)}
      />
      <DebugRow
        label={t('shell.variantB.debug.runtimeV2AdapterFileDocumentShapeCount', 'Adapter FileDocument Shape Count')}
        value={String(runtimeMigrationSnapshot.runtimeV2.adapterSnapshotGovernance.fileDocumentShapeCount)}
      />
      <DebugRow
        label={t('shell.variantB.debug.runtimeV2AdapterSceneRootCount', 'Adapter Scene Root Count')}
        value={String(runtimeMigrationSnapshot.runtimeV2.adapterSnapshotGovernance.fileFormatSceneRootCount)}
      />
      <DebugRow
        label={t('shell.variantB.debug.runtimeV2AdapterRoundTripElementCount', 'Adapter Round-Trip Element Count')}
        value={String(runtimeMigrationSnapshot.runtimeV2.adapterSnapshotGovernance.roundTripElementCount)}
      />
      <DebugRow
        label={t('shell.variantB.debug.runtimeV2AdapterGovernanceFieldDiffs', 'Adapter Snapshot Governance Field Diffs')}
        value={runtimeMigrationSnapshot.runtimeV2.adapterSnapshotGovernance.fieldDiffs.length > 0
          ? runtimeMigrationSnapshot.runtimeV2.adapterSnapshotGovernance.fieldDiffs
            .map((diffRow) => `${diffRow.field}:${diffRow.baseline}->${diffRow.observed}(delta=${diffRow.delta},match=${diffRow.matches ? 'yes' : 'no'})`)
            .join(' | ')
          : 'none'}
      />
      <DebugRow
        label={t('shell.variantB.debug.runtimeV2AdapterGovernanceIssues', 'Adapter Snapshot Governance Issues')}
        value={runtimeMigrationSnapshot.runtimeV2.adapterSnapshotGovernance.issues.length > 0
          ? runtimeMigrationSnapshot.runtimeV2.adapterSnapshotGovernance.issues.join(', ')
          : 'none'}
      />
      <div className={'flex items-center justify-between rounded bg-white px-2 py-1.5 text-xs text-slate-800 dark:bg-slate-900 dark:text-slate-100'}>
        <span className={'text-slate-500 dark:text-slate-400'}>{t('shell.variantB.debug.runtimeV2AlertLevel', 'Migration Alert Level')}</span>
        <span className={`font-mono ${runtimeV2AlertClassName}`}>{runtimeV2AlertLevel}</span>
      </div>
      <DebugRow label={t('shell.variantB.debug.runtimeV2LastCommand', 'Last Mismatch Command')} value={runtimeMigrationSnapshot.runtimeV2.lastCommandType ?? 'none'}/>
      <DebugRow label={t('shell.variantB.debug.runtimeV2StrictMode', 'Strict Mode Enabled')} value={runtimeMigrationSnapshot.runtimeV2.strictModeEnabled ? 'yes' : 'no'}/>
    </DebugSection>
  )
}

/**
 * Renders the compact non-verbose debug panel variant.
 * @param props Runtime diagnostics and derived values for compact mode.
 */
export function CompactRuntimeDebugPanel(props: {
  t: TFunction
  diagnostics: RuntimeRenderDiagnostics
  cacheHitRate: number
  runtimeMigrationSnapshot: RuntimeMigrationSnapshot
  runtimeV2MismatchRatePercent: number
  runtimeV2FrameBoundaryMismatchRatePercent: number
  runtimeV2AlertClassName: string
  runtimeV2AlertLevel: 'stable' | 'watch' | 'high'
}) {
  const {
    t,
    diagnostics,
    cacheHitRate,
    runtimeMigrationSnapshot,
    runtimeV2MismatchRatePercent,
    runtimeV2FrameBoundaryMismatchRatePercent,
    runtimeV2AlertClassName,
    runtimeV2AlertLevel,
  } = props

  return (
    <section id={'variant-b-tabpanel-debug'} role={'tabpanel'} className={'scrollbar-custom flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto p-3'}>
      <DebugSection title={t('shell.variantB.debug.sectionEngineCore', 'Engine Core')}>
        <DebugRow label={t('shell.variantB.debug.drawMs', 'Draw Ms')} value={diagnostics.drawMs.toFixed(2)}/>
        <DebugRow label={t('shell.variantB.debug.fps', 'FPS (Smooth)')} value={diagnostics.fpsEstimate.toFixed(1)}/>
        <DebugRow label={t('shell.variantB.debug.fpsInstant', 'FPS (Instant)')} value={diagnostics.fpsInstantaneous.toFixed(1)}/>
        <DebugRow label={t('shell.variantB.debug.fpsPeak', 'FPS Peak (Instant)')} value={diagnostics.fpsPeak.toFixed(1)}/>
        <DebugRow label={t('shell.variantB.debug.fpsReached60', 'Reached 60 FPS')} value={diagnostics.fpsReached60 ? 'yes' : 'no'}/>
        <DebugRow label={t('shell.variantB.debug.fpsReached120', 'Reached 120 FPS')} value={diagnostics.fpsReached120 ? 'yes' : 'no'}/>
        <DebugRow label={t('shell.variantB.debug.renderPhase', 'Render Phase')} value={diagnostics.renderPhase}/>
        <DebugRow label={t('shell.variantB.debug.webglRenderPath', 'WebGL Render Path')} value={diagnostics.webglRenderPath}/>
      </DebugSection>

      <DebugSection title={t('shell.variantB.debug.sectionExportAndCache', 'Export / Cache / WebGL')}>
        <DebugRow label={t('shell.variantB.debug.cacheHitRate', 'Cache Hit Rate')} value={`${cacheHitRate.toFixed(1)}%`}/>
        <DebugRow label={t('shell.variantB.debug.tileCacheSize', 'Tile Cache Size')} value={String(diagnostics.tileCacheSize)}/>
        <DebugRow label={t('shell.variantB.debug.tileDirtyCount', 'Tile Dirty Count')} value={String(diagnostics.tileDirtyCount)}/>
        <DebugRow label={t('shell.variantB.debug.tileUploadCount', 'Tile Upload Count')} value={String(diagnostics.tileUploadCount)}/>
        <DebugRow label={t('shell.variantB.debug.tileRenderCount', 'Tile Render Count')} value={String(diagnostics.tileRenderCount)}/>
        <DebugRow label={t('shell.variantB.debug.visibleTileCount', 'Visible Tile Count')} value={String(diagnostics.visibleTileCount)}/>
        <DebugRow label={t('shell.variantB.debug.tileSchedulerPendingCount', 'Tile Scheduler Pending')} value={String(diagnostics.tileSchedulerPendingCount)}/>
        <DebugRow label={t('shell.variantB.debug.gpuTextureBytes', 'GPU Texture Bytes')} value={formatDiagnosticBytes(diagnostics.gpuTextureBytes)}/>
        <DebugRow label={t('shell.variantB.debug.imageTextureBytes', 'Image Texture Bytes')} value={formatDiagnosticBytes(diagnostics.imageTextureBytes)}/>
        <DebugRow label={t('shell.variantB.debug.cacheFallbackReason', 'Cache Fallback Reason')} value={diagnostics.cacheFallbackReason}/>
      </DebugSection>

      <RuntimeV2DebugSection
        t={t}
        runtimeMigrationSnapshot={runtimeMigrationSnapshot}
        runtimeV2MismatchRatePercent={runtimeV2MismatchRatePercent}
        runtimeV2FrameBoundaryMismatchRatePercent={runtimeV2FrameBoundaryMismatchRatePercent}
        runtimeV2AlertClassName={runtimeV2AlertClassName}
        runtimeV2AlertLevel={runtimeV2AlertLevel}
      />
    </section>
  )
}

/**
 * Renders the verbose debug panel variant with extended planner/dirty-region diagnostics.
 * @param props Runtime diagnostics and derived values for verbose mode.
 */
export function VerboseRuntimeDebugPanel(props: {
  t: TFunction
  diagnostics: RuntimeRenderDiagnostics
  performanceTimingStats?: RuntimeDiagnosticsTimingStats
  performanceLodStats?: RuntimeDiagnosticsLodStats
  cacheHitRate: number
  framePlanVisibleRatioPercent: number
  framePlanShortlistCandidateRatioPercent: number
  framePlanShortlistEnterRatioThresholdPercent: number
  framePlanShortlistLeaveRatioThresholdPercent: number
  offscreenSceneDirtySkipRatePercent: number
  forcedSceneDirtyRenderRatePercent: number
  runtimeMigrationSnapshot: RuntimeMigrationSnapshot
  runtimeV2MismatchRatePercent: number
  runtimeV2FrameBoundaryMismatchRatePercent: number
  runtimeV2AlertClassName: string
  runtimeV2AlertLevel: 'stable' | 'watch' | 'high'
  sceneDirtyModel: ReturnType<typeof useRuntimeDebugSceneDirtyModel>
}) {
  const {
    t,
    diagnostics,
    performanceTimingStats,
    performanceLodStats,
    cacheHitRate,
    framePlanVisibleRatioPercent,
    framePlanShortlistCandidateRatioPercent,
    framePlanShortlistEnterRatioThresholdPercent,
    framePlanShortlistLeaveRatioThresholdPercent,
    offscreenSceneDirtySkipRatePercent,
    forcedSceneDirtyRenderRatePercent,
    runtimeMigrationSnapshot,
    runtimeV2MismatchRatePercent,
    runtimeV2FrameBoundaryMismatchRatePercent,
    runtimeV2AlertClassName,
    runtimeV2AlertLevel,
    sceneDirtyModel,
  } = props

  return (
    <section id={'variant-b-tabpanel-debug'} role={'tabpanel'} className={'scrollbar-custom flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto p-3'}>
      <DebugSection title={t('shell.variantB.debug.sectionEngineCore', 'Engine Core')}>
        <DebugRow label={t('shell.variantB.debug.drawMs', 'Draw Ms')} value={diagnostics.drawMs.toFixed(2)}/>
        <DebugRow label={t('shell.variantB.debug.scenePrepareMs', 'Scene Prepare Ms')} value={(performanceTimingStats?.scenePrepareMs ?? diagnostics.scenePrepareMs).toFixed(2)}/>
        <DebugRow label={t('shell.variantB.debug.sceneApplyMs', 'Scene Apply Ms')} value={(performanceTimingStats?.sceneApplyMs ?? diagnostics.sceneApplyMs).toFixed(2)}/>
        <DebugRow label={t('shell.variantB.debug.viewportCommitMs', 'Viewport Commit Ms')} value={(performanceTimingStats?.viewportCommitMs ?? diagnostics.viewportCommitMs).toFixed(2)}/>
        <DebugRow label={t('shell.variantB.debug.fps', 'FPS (Smooth)')} value={diagnostics.fpsEstimate.toFixed(1)}/>
        <DebugRow label={t('shell.variantB.debug.fpsInstant', 'FPS (Instant)')} value={diagnostics.fpsInstantaneous.toFixed(1)}/>
        <DebugRow label={t('shell.variantB.debug.renderPhase', 'Render Phase')} value={performanceLodStats?.renderPhase ?? diagnostics.renderPhase}/>
        <DebugRow label={t('shell.variantB.debug.renderPolicyQuality', 'Render Policy Quality')} value={performanceLodStats?.renderPolicyQuality ?? diagnostics.renderPolicyQuality}/>
      </DebugSection>

      <DebugSection title={t('shell.variantB.debug.sectionPlanner', 'Planner / Frame / Hit')}>
        <DebugRow label={t('shell.variantB.debug.framePlanVersion', 'Frame Plan Version')} value={String(diagnostics.framePlanVersion)}/>
        <DebugRow label={t('shell.variantB.debug.framePlanCandidateCount', 'Frame Candidates')} value={String(diagnostics.framePlanCandidateCount)}/>
        <DebugRow label={t('shell.variantB.debug.framePlanSceneNodeCount', 'Scene Nodes')} value={String(diagnostics.framePlanSceneNodeCount)}/>
        <DebugRow label={t('shell.variantB.debug.framePlanVisibleRatio', 'Candidate Ratio')} value={`${framePlanVisibleRatioPercent.toFixed(1)}%`}/>
        <DebugRow label={t('shell.variantB.debug.framePlanShortlistCandidateRatio', 'Shortlist Ratio')} value={`${framePlanShortlistCandidateRatioPercent.toFixed(1)}%`}/>
        <DebugRow label={t('shell.variantB.debug.framePlanShortlistEnterRatioThreshold', 'Shortlist Enter Threshold')} value={`${framePlanShortlistEnterRatioThresholdPercent.toFixed(1)}%`}/>
        <DebugRow label={t('shell.variantB.debug.framePlanShortlistLeaveRatioThreshold', 'Shortlist Leave Threshold')} value={`${framePlanShortlistLeaveRatioThresholdPercent.toFixed(1)}%`}/>
        <DebugRow label={t('shell.variantB.debug.framePlanShortlistSummary', 'Shortlist Summary')} value={sceneDirtyModel.shortlistSummary}/>
        <DebugRow label={t('shell.variantB.debug.hitPlanExactRatio', 'Hit Exact Ratio')} value={`${sceneDirtyModel.hitExactRatioPercent.toFixed(1)}%`}/>
      </DebugSection>

      <DebugSection title={t('shell.variantB.debug.sectionDirtyRegion', 'Dirty Region / Risk')}>
        <DebugRow label={t('shell.variantB.debug.offscreenSceneDirtySkipRate', 'Offscreen Dirty Skip Rate')} value={`${offscreenSceneDirtySkipRatePercent.toFixed(1)}%`}/>
        <DebugRow label={t('shell.variantB.debug.forcedSceneDirtyRenderRate', 'Forced Scene Dirty Rate')} value={`${forcedSceneDirtyRenderRatePercent.toFixed(1)}%`}/>
        <DebugRow label={t('shell.variantB.debug.sceneDirtyTrendWindowFrames', 'Scene Dirty Trend Window (Frames)')} value={String(sceneDirtyModel.trendWindowFrames)}/>
        <DebugRow label={t('shell.variantB.debug.sceneDirtyTrendPressure', 'Scene Dirty Trend Pressure')} value={sceneDirtyModel.sceneDirtyTrendPressure}/>
        <DebugRow label={t('shell.variantB.debug.sceneDirtyRiskScore', 'Scene Dirty Risk Score')} value={sceneDirtyModel.sceneDirtyRiskScore.toFixed(1)}/>
        <DebugRow label={t('shell.variantB.debug.sceneDirtyRiskScoreBand', 'Scene Dirty Risk Score Band')} value={sceneDirtyModel.sceneDirtyRiskScoreBand}/>
        <DebugRow label={t('shell.variantB.debug.sceneDirtyRiskStatus', 'Scene Dirty Risk Status')} value={sceneDirtyModel.sceneDirtyRiskStatus}/>
        <DebugRow label={t('shell.variantB.debug.sceneDirtyRiskTransitionsPerMinute', 'Scene Dirty Risk Transitions / Min')} value={sceneDirtyModel.sceneDirtyRiskTransitionsPerMinute.toFixed(2)}/>
        <DebugRow label={t('shell.variantB.debug.sceneDirtyHighRiskSustained', 'Scene Dirty High Risk Sustained')} value={sceneDirtyModel.sceneDirtyHighRiskSustained ? 'yes' : 'no'}/>
      </DebugSection>

      <DebugSection title={t('shell.variantB.debug.sectionExportAndCache', 'Export / Cache / WebGL')}>
        <DebugRow label={t('shell.variantB.debug.cacheHitRate', 'Cache Hit Rate')} value={`${cacheHitRate.toFixed(1)}%`}/>
        <DebugRow label={t('shell.variantB.debug.tileCacheSize', 'Tile Cache Size')} value={String(diagnostics.tileCacheSize)}/>
        <DebugRow label={t('shell.variantB.debug.tileDirtyCount', 'Tile Dirty Count')} value={String(diagnostics.tileDirtyCount)}/>
        <DebugRow label={t('shell.variantB.debug.tileUploadCount', 'Tile Upload Count')} value={String(diagnostics.tileUploadCount)}/>
        <DebugRow label={t('shell.variantB.debug.tileRenderCount', 'Tile Render Count')} value={String(diagnostics.tileRenderCount)}/>
        <DebugRow label={t('shell.variantB.debug.gpuTextureBytes', 'GPU Texture Bytes')} value={formatDiagnosticBytes(diagnostics.gpuTextureBytes)}/>
        <DebugRow label={t('shell.variantB.debug.imageTextureBytes', 'Image Texture Bytes')} value={formatDiagnosticBytes(diagnostics.imageTextureBytes)}/>
      </DebugSection>

      <RuntimeV2DebugSection
        t={t}
        runtimeMigrationSnapshot={runtimeMigrationSnapshot}
        runtimeV2MismatchRatePercent={runtimeV2MismatchRatePercent}
        runtimeV2FrameBoundaryMismatchRatePercent={runtimeV2FrameBoundaryMismatchRatePercent}
        runtimeV2AlertClassName={runtimeV2AlertClassName}
        runtimeV2AlertLevel={runtimeV2AlertLevel}
      />
    </section>
  )
}
