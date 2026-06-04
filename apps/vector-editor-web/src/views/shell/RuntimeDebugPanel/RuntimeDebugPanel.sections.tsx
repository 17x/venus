import type {TFunction} from 'i18next'
import type {
  RuntimeMigrationSnapshot,
  RuntimeRenderDiagnostics,
} from '../../../runtime/events/index/index.ts'
import {DebugRow, DebugSection, formatDiagnosticBytes} from './RuntimeDebugPanel.shared.tsx'
import type {useRuntimeDebugSceneDirtyModel} from './RuntimeDebugPanel.sceneDirtyModel.ts'
import type {Vector2DStateMachineDiagnosticsSnapshot} from '../../../product/runtime/stateMachineContract.ts'

type RuntimeDiagnosticsTimingStats = NonNullable<
  NonNullable<RuntimeRenderDiagnostics['stats']>['performance']['timing']
>

type RuntimeDiagnosticsLodStats = NonNullable<
  NonNullable<RuntimeRenderDiagnostics['stats']>['performance']['lod']
>

type RuntimeDiagnosticsPanelDataSource = {
  cacheStats: {
    cacheHitCount: number
    cacheMissCount: number
    frameReuseHitCount: number
    frameReuseMissCount: number
    cacheFallbackReason: string
  }
  webglStats: {
    webglRenderPath: RuntimeRenderDiagnostics['webglRenderPath']
    webgpuRenderPath: RuntimeRenderDiagnostics['webgpuRenderPath']
    webglPreviewExecutionMode: RuntimeRenderDiagnostics['webglPreviewExecutionMode']
    webglPreviewExecutionSource: RuntimeRenderDiagnostics['webglPreviewExecutionSource']
    tileCacheSize: number
    tileDirtyCount: number
    tileUploadCount: number
    tileRenderCount: number
    visibleTileCount: number
    tileSchedulerPendingCount: number
    gpuTextureBytes: number
    imageTextureBytes: number
    webglBudgetPressure: RuntimeRenderDiagnostics['webglBudgetPressure']
    webglBudgetPressureReason: string
    webglBudgetPressureSource: RuntimeRenderDiagnostics['webglBudgetPressureSource']
    webglPredictorConfidence: number
    webglHighZoomTextSlaViolationCount: number
  }
  engineConfig: {
    // Runtime diagnostics snapshot frame serial number.
    snapshotFrameCount: number
    // Monotonic timestamp (performance.now) when diagnostics snapshot was published.
    snapshotUpdatedAtMs: number
    // Stage correlation token for this diagnostics snapshot.
    frameStageId: RuntimeRenderDiagnostics['frameStageId']
    // Monotonic sequence id for frame-stage ordering.
    frameStageSequence: RuntimeRenderDiagnostics['frameStageSequence']
    // Monotonic timestamp when frame-stage token was issued.
    frameStageIssuedAtMs: RuntimeRenderDiagnostics['frameStageIssuedAtMs']
    // Scheduler lane used when this frame-stage token was issued.
    frameStageSchedulerMode: RuntimeRenderDiagnostics['frameStageSchedulerMode']
    // Scene apply path correlated with this frame-stage token.
    frameStageSceneApplyMode: RuntimeRenderDiagnostics['frameStageSceneApplyMode']
    // Backend requested by runtime when creating engine instance.
    backendRequested: RuntimeRenderDiagnostics['engineBackendRequested']
    // Backend resolved by engine selector after capability probing.
    backendResolved: RuntimeRenderDiagnostics['engineBackendResolved']
    // Selector fallback reason when requested backend differs from resolved backend.
    backendFallbackReason: RuntimeRenderDiagnostics['engineBackendFallbackReason']
    // Active runtime profile identifier selected during engine bootstrap.
    runtimeProfileId: RuntimeRenderDiagnostics['engineRuntimeProfileId']
    // Active runtime capability count exposed by selected runtime profile.
    runtimeCapabilityCount: RuntimeRenderDiagnostics['engineRuntimeCapabilityCount']
    // Latest frame-budget pressure reason reported by engine scheduler diagnostics.
    framePressureReason: RuntimeRenderDiagnostics['engineFramePressureReason']
    // Latest frame-budget pressure tier reported by engine scheduler diagnostics.
    framePressure: RuntimeRenderDiagnostics['engineFramePressure']
    // Latest frame strategy phase resolved by engine scheduler diagnostics.
    framePhase: RuntimeRenderDiagnostics['engineFramePhase']
    // Latest QoS degradation level derived from engine diagnostics.
    qosDegradationLevel: RuntimeRenderDiagnostics['engineQosDegradationLevel']
    // Latest QoS fallback reason mirrored from cache fallback taxonomy.
    qosFallbackReason: RuntimeRenderDiagnostics['engineQosFallbackReason']
    // Latest QoS guard trigger tokens used for diagnostics triage.
    qosGuardTriggers: RuntimeRenderDiagnostics['engineQosGuardTriggers']
    // Latest QoS trace id used for frame-level diagnostics correlation.
    qosTrace: RuntimeRenderDiagnostics['engineQosTrace']
  }
  adapterReport: RuntimeRenderDiagnostics['engineSceneAdapterReport']
}

function formatAdapterSupportSummary(report: RuntimeRenderDiagnostics['engineSceneAdapterReport']) {
  const statusCounts = report.supportMatrix.reduce<Record<string, number>>((counts, row) => {
    counts[row.status] = (counts[row.status] ?? 0) + 1
    return counts
  }, {})

  return ['projected', 'degraded', 'fallback']
    .map((status) => `${status}:${statusCounts[status] ?? 0}`)
    .join(', ')
}

function formatAdapterDiagnosticCodeCounts(report: RuntimeRenderDiagnostics['engineSceneAdapterReport']) {
  const entries = Object.entries(report.codeCounts)
  if (entries.length === 0) {
    return 'none'
  }
  return entries
    .map(([code, count]) => `${code}:${count}`)
    .join(', ')
}

/**
 * Renders product-owned vector-to-engine projection diagnostics.
 * @param props Adapter report and translator.
 */
export function VectorAdapterDebugSection(props: {
  t: TFunction
  report: RuntimeRenderDiagnostics['engineSceneAdapterReport']
}) {
  const {t, report} = props
  return (
    <DebugSection title={t('shell.variantB.debug.sectionVectorAdapter', 'Vector Adapter')}>
      <DebugRow label={t('shell.variantB.debug.vectorAdapterVersion', 'Adapter Version')} value={report.adapterVersion}/>
      <DebugRow label={t('shell.variantB.debug.vectorAdapterSchemaVersion', 'Report Schema')} value={String(report.schemaVersion)}/>
      <DebugRow label={t('shell.variantB.debug.vectorAdapterDiagnosticTotal', 'Diagnostic Total')} value={String(report.totalCount)}/>
      <DebugRow label={t('shell.variantB.debug.vectorAdapterWarnings', 'Warnings')} value={String(report.severityCounts.warning)}/>
      <DebugRow label={t('shell.variantB.debug.vectorAdapterInfo', 'Info')} value={String(report.severityCounts.info)}/>
      <DebugRow label={t('shell.variantB.debug.vectorAdapterAffectedNodes', 'Affected Nodes')} value={report.affectedNodeIds.length > 0 ? report.affectedNodeIds.join(', ') : 'none'}/>
      <DebugRow label={t('shell.variantB.debug.vectorAdapterCodeCounts', 'Code Counts')} value={formatAdapterDiagnosticCodeCounts(report)}/>
      <DebugRow label={t('shell.variantB.debug.vectorAdapterSupportSummary', 'Support Matrix')} value={formatAdapterSupportSummary(report)}/>
    </DebugSection>
  )
}

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
  diagnosticsDataSource: RuntimeDiagnosticsPanelDataSource
  cacheHitRate: number
  runtimeMigrationSnapshot: RuntimeMigrationSnapshot
  runtimeV2MismatchRatePercent: number
  runtimeV2FrameBoundaryMismatchRatePercent: number
  runtimeV2AlertClassName: string
  runtimeV2AlertLevel: 'stable' | 'watch' | 'high'
  sceneDirtyModel: ReturnType<typeof useRuntimeDebugSceneDirtyModel>
  stateMachines: Vector2DStateMachineDiagnosticsSnapshot
}) {
  const {
    t,
    diagnostics,
    diagnosticsDataSource,
    cacheHitRate,
    runtimeMigrationSnapshot,
    runtimeV2MismatchRatePercent,
    runtimeV2FrameBoundaryMismatchRatePercent,
    runtimeV2AlertClassName,
    runtimeV2AlertLevel,
    sceneDirtyModel,
    stateMachines,
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
        <DebugRow label={t('shell.variantB.debug.webglRenderPath', 'WebGL Render Path')} value={diagnosticsDataSource.webglStats.webglRenderPath}/>
        <DebugRow label={t('shell.variantB.debug.webgpuRenderPath', 'WebGPU Render Path')} value={diagnosticsDataSource.webglStats.webgpuRenderPath}/>
        <DebugRow label={t('shell.variantB.debug.activeOverlayRoutingSummary', 'Active/Overlay Routing')} value={sceneDirtyModel.activeOverlayRoutingSummary}/>
        <DebugRow label={t('shell.variantB.debug.activeOverlayRoutingAlertLevel', 'Routing Alert Level')} value={sceneDirtyModel.activeOverlayRoutingAlertLevel}/>
      </DebugSection>

      <DebugSection title={t('shell.variantB.debug.sectionStateMachines', 'Editor State Machines')}>
        <DebugRow label={'Document'} value={`${stateMachines.document.state} · ${stateMachines.document.reasonCode}`}/>
        <DebugRow label={'Tool'} value={`${stateMachines.tool.state} · ${stateMachines.tool.reasonCode}`}/>
        <DebugRow label={'Selection'} value={`${stateMachines.selection.state} · ${stateMachines.selection.reasonCode}`}/>
        <DebugRow label={'Transform'} value={`${stateMachines.transform.state} · ${stateMachines.transform.reasonCode}`}/>
      </DebugSection>

      <DebugSection title={t('shell.variantB.debug.sectionEngineConfig', 'Engine Config')}>
        <DebugRow label={t('shell.variantB.debug.engineSnapshotFrameCount', 'Snapshot Frame')} value={String(diagnosticsDataSource.engineConfig.snapshotFrameCount)}/>
        <DebugRow label={t('shell.variantB.debug.engineSnapshotUpdatedAtMs', 'Snapshot Updated At (ms)')} value={diagnosticsDataSource.engineConfig.snapshotUpdatedAtMs.toFixed(1)}/>
        <DebugRow label={t('shell.variantB.debug.frameStageId', 'Frame Stage Id')} value={diagnosticsDataSource.engineConfig.frameStageId}/>
        <DebugRow label={t('shell.variantB.debug.frameStageSequence', 'Frame Stage Sequence')} value={String(diagnosticsDataSource.engineConfig.frameStageSequence)}/>
        <DebugRow label={t('shell.variantB.debug.frameStageIssuedAtMs', 'Frame Stage Issued At (ms)')} value={diagnosticsDataSource.engineConfig.frameStageIssuedAtMs.toFixed(1)}/>
        <DebugRow label={t('shell.variantB.debug.frameStageSchedulerMode', 'Frame Stage Scheduler Mode')} value={diagnosticsDataSource.engineConfig.frameStageSchedulerMode}/>
        <DebugRow label={t('shell.variantB.debug.frameStageSceneApplyMode', 'Frame Stage Scene Apply Mode')} value={diagnosticsDataSource.engineConfig.frameStageSceneApplyMode}/>
        <DebugRow label={t('shell.variantB.debug.engineBackendRequested', 'Backend Requested')} value={diagnosticsDataSource.engineConfig.backendRequested}/>
        <DebugRow label={t('shell.variantB.debug.engineBackendResolved', 'Backend Resolved')} value={diagnosticsDataSource.engineConfig.backendResolved}/>
        <DebugRow label={t('shell.variantB.debug.engineBackendFallbackReason', 'Backend Fallback Reason')} value={diagnosticsDataSource.engineConfig.backendFallbackReason ?? 'none'}/>
        <DebugRow label={t('shell.variantB.debug.engineRuntimeProfileId', 'Runtime Profile')} value={diagnosticsDataSource.engineConfig.runtimeProfileId}/>
        <DebugRow label={t('shell.variantB.debug.engineRuntimeCapabilityCount', 'Runtime Capabilities')} value={String(diagnosticsDataSource.engineConfig.runtimeCapabilityCount)}/>
        <DebugRow label={t('shell.variantB.debug.engineFramePhase', 'Frame Phase')} value={diagnosticsDataSource.engineConfig.framePhase}/>
        <DebugRow label={t('shell.variantB.debug.engineFramePressure', 'Frame Pressure')} value={diagnosticsDataSource.engineConfig.framePressure}/>
        <DebugRow label={t('shell.variantB.debug.engineFramePressureReason', 'Frame Pressure Reason')} value={diagnosticsDataSource.engineConfig.framePressureReason}/>
        <DebugRow label={t('shell.variantB.debug.engineQosDegradationLevel', 'QoS Degradation Level')} value={diagnosticsDataSource.engineConfig.qosDegradationLevel}/>
        <DebugRow label={t('shell.variantB.debug.engineQosFallbackReason', 'QoS Fallback Reason')} value={diagnosticsDataSource.engineConfig.qosFallbackReason ?? 'none'}/>
        <DebugRow label={t('shell.variantB.debug.engineQosGuardTriggers', 'QoS Guard Triggers')} value={diagnosticsDataSource.engineConfig.qosGuardTriggers.length > 0 ? diagnosticsDataSource.engineConfig.qosGuardTriggers.join(', ') : 'none'}/>
        <DebugRow label={t('shell.variantB.debug.engineQosTrace', 'QoS Trace')} value={diagnosticsDataSource.engineConfig.qosTrace}/>
      </DebugSection>

      <VectorAdapterDebugSection
        t={t}
        report={diagnosticsDataSource.adapterReport}
      />

      <DebugSection title={t('shell.variantB.debug.sectionExportAndCache', 'Export / Cache / WebGL')}>
        <DebugRow label={t('shell.variantB.debug.cacheHitRate', 'Cache Hit Rate')} value={`${cacheHitRate.toFixed(1)}%`}/>
        <DebugRow label={t('shell.variantB.debug.tileCacheSize', 'Tile Cache Size')} value={String(diagnosticsDataSource.webglStats.tileCacheSize)}/>
        <DebugRow label={t('shell.variantB.debug.tileDirtyCount', 'Tile Dirty Count')} value={String(diagnosticsDataSource.webglStats.tileDirtyCount)}/>
        <DebugRow label={t('shell.variantB.debug.tileUploadCount', 'Tile Upload Count')} value={String(diagnosticsDataSource.webglStats.tileUploadCount)}/>
        <DebugRow label={t('shell.variantB.debug.tileRenderCount', 'Tile Render Count')} value={String(diagnosticsDataSource.webglStats.tileRenderCount)}/>
        <DebugRow label={t('shell.variantB.debug.visibleTileCount', 'Visible Tile Count')} value={String(diagnosticsDataSource.webglStats.visibleTileCount)}/>
        <DebugRow label={t('shell.variantB.debug.tileSchedulerPendingCount', 'Tile Scheduler Pending')} value={String(diagnosticsDataSource.webglStats.tileSchedulerPendingCount)}/>
        <DebugRow label={t('shell.variantB.debug.gpuTextureBytes', 'GPU Texture Bytes')} value={formatDiagnosticBytes(diagnosticsDataSource.webglStats.gpuTextureBytes)}/>
        <DebugRow label={t('shell.variantB.debug.imageTextureBytes', 'Image Texture Bytes')} value={formatDiagnosticBytes(diagnosticsDataSource.webglStats.imageTextureBytes)}/>
        <DebugRow label={t('shell.variantB.debug.cacheFallbackReason', 'Cache Fallback Reason')} value={diagnosticsDataSource.cacheStats.cacheFallbackReason}/>
        <DebugRow label={t('shell.variantB.debug.cacheHitRate', 'Frame Reuse Hit')} value={String(diagnosticsDataSource.cacheStats.frameReuseHitCount)}/>
        <DebugRow label={t('shell.variantB.debug.cacheHitRate', 'Frame Reuse Miss')} value={String(diagnosticsDataSource.cacheStats.frameReuseMissCount)}/>
        <DebugRow label={t('shell.variantB.debug.webglPreviewExecutionMode', 'Preview Execution Mode')} value={diagnosticsDataSource.webglStats.webglPreviewExecutionMode}/>
        <DebugRow label={t('shell.variantB.debug.webglPreviewExecutionSource', 'Preview Source')} value={diagnosticsDataSource.webglStats.webglPreviewExecutionSource}/>
        <DebugRow label={t('shell.variantB.debug.renderPolicyQuality', 'Budget Pressure')} value={diagnosticsDataSource.webglStats.webglBudgetPressure}/>
        <DebugRow label={t('shell.variantB.debug.renderPolicyQuality', 'Budget Pressure Reason')} value={diagnosticsDataSource.webglStats.webglBudgetPressureReason}/>
        <DebugRow label={t('shell.variantB.debug.webglBudgetPressureSource', 'Budget Pressure Source')} value={diagnosticsDataSource.webglStats.webglBudgetPressureSource}/>
        <DebugRow label={t('shell.variantB.debug.hitPlanExactRatio', 'Predictor Confidence')} value={diagnosticsDataSource.webglStats.webglPredictorConfidence.toFixed(2)}/>
        <DebugRow label={t('shell.variantB.debug.sceneDirtyRiskStatus', 'Text SLA Violations')} value={String(diagnosticsDataSource.webglStats.webglHighZoomTextSlaViolationCount)}/>
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
  diagnosticsDataSource: RuntimeDiagnosticsPanelDataSource
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
  stateMachines: Vector2DStateMachineDiagnosticsSnapshot
}) {
  const {
    t,
    diagnostics,
    diagnosticsDataSource,
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
    stateMachines,
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
        <DebugRow label={t('shell.variantB.debug.webglRenderPath', 'WebGL Render Path')} value={diagnosticsDataSource.webglStats.webglRenderPath}/>
        <DebugRow label={t('shell.variantB.debug.webgpuRenderPath', 'WebGPU Render Path')} value={diagnosticsDataSource.webglStats.webgpuRenderPath}/>
      </DebugSection>

      <DebugSection title={t('shell.variantB.debug.sectionStateMachines', 'Editor State Machines')}>
        <DebugRow label={'Document'} value={`${stateMachines.document.state} · ${stateMachines.document.reasonCode} · ${stateMachines.document.owner}`}/>
        <DebugRow label={'Tool'} value={`${stateMachines.tool.state} · ${stateMachines.tool.reasonCode} · ${stateMachines.tool.owner}`}/>
        <DebugRow label={'Selection'} value={`${stateMachines.selection.state} · ${stateMachines.selection.reasonCode} · ${stateMachines.selection.owner}`}/>
        <DebugRow label={'Transform'} value={`${stateMachines.transform.state} · ${stateMachines.transform.reasonCode} · ${stateMachines.transform.owner}`}/>
      </DebugSection>

      <DebugSection title={t('shell.variantB.debug.sectionEngineConfig', 'Engine Config')}>
        <DebugRow label={t('shell.variantB.debug.engineSnapshotFrameCount', 'Snapshot Frame')} value={String(diagnosticsDataSource.engineConfig.snapshotFrameCount)}/>
        <DebugRow label={t('shell.variantB.debug.engineSnapshotUpdatedAtMs', 'Snapshot Updated At (ms)')} value={diagnosticsDataSource.engineConfig.snapshotUpdatedAtMs.toFixed(1)}/>
        <DebugRow label={t('shell.variantB.debug.frameStageId', 'Frame Stage Id')} value={diagnosticsDataSource.engineConfig.frameStageId}/>
        <DebugRow label={t('shell.variantB.debug.frameStageSequence', 'Frame Stage Sequence')} value={String(diagnosticsDataSource.engineConfig.frameStageSequence)}/>
        <DebugRow label={t('shell.variantB.debug.frameStageIssuedAtMs', 'Frame Stage Issued At (ms)')} value={diagnosticsDataSource.engineConfig.frameStageIssuedAtMs.toFixed(1)}/>
        <DebugRow label={t('shell.variantB.debug.frameStageSchedulerMode', 'Frame Stage Scheduler Mode')} value={diagnosticsDataSource.engineConfig.frameStageSchedulerMode}/>
        <DebugRow label={t('shell.variantB.debug.frameStageSceneApplyMode', 'Frame Stage Scene Apply Mode')} value={diagnosticsDataSource.engineConfig.frameStageSceneApplyMode}/>
        <DebugRow label={t('shell.variantB.debug.engineBackendRequested', 'Backend Requested')} value={diagnosticsDataSource.engineConfig.backendRequested}/>
        <DebugRow label={t('shell.variantB.debug.engineBackendResolved', 'Backend Resolved')} value={diagnosticsDataSource.engineConfig.backendResolved}/>
        <DebugRow label={t('shell.variantB.debug.engineBackendFallbackReason', 'Backend Fallback Reason')} value={diagnosticsDataSource.engineConfig.backendFallbackReason ?? 'none'}/>
        <DebugRow label={t('shell.variantB.debug.engineRuntimeProfileId', 'Runtime Profile')} value={diagnosticsDataSource.engineConfig.runtimeProfileId}/>
        <DebugRow label={t('shell.variantB.debug.engineRuntimeCapabilityCount', 'Runtime Capabilities')} value={String(diagnosticsDataSource.engineConfig.runtimeCapabilityCount)}/>
        <DebugRow label={t('shell.variantB.debug.engineFramePhase', 'Frame Phase')} value={diagnosticsDataSource.engineConfig.framePhase}/>
        <DebugRow label={t('shell.variantB.debug.engineFramePressure', 'Frame Pressure')} value={diagnosticsDataSource.engineConfig.framePressure}/>
        <DebugRow label={t('shell.variantB.debug.engineFramePressureReason', 'Frame Pressure Reason')} value={diagnosticsDataSource.engineConfig.framePressureReason}/>
        <DebugRow label={t('shell.variantB.debug.engineQosDegradationLevel', 'QoS Degradation Level')} value={diagnosticsDataSource.engineConfig.qosDegradationLevel}/>
        <DebugRow label={t('shell.variantB.debug.engineQosFallbackReason', 'QoS Fallback Reason')} value={diagnosticsDataSource.engineConfig.qosFallbackReason ?? 'none'}/>
        <DebugRow label={t('shell.variantB.debug.engineQosGuardTriggers', 'QoS Guard Triggers')} value={diagnosticsDataSource.engineConfig.qosGuardTriggers.length > 0 ? diagnosticsDataSource.engineConfig.qosGuardTriggers.join(', ') : 'none'}/>
        <DebugRow label={t('shell.variantB.debug.engineQosTrace', 'QoS Trace')} value={diagnosticsDataSource.engineConfig.qosTrace}/>
      </DebugSection>

      <VectorAdapterDebugSection
        t={t}
        report={diagnosticsDataSource.adapterReport}
      />

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

      <DebugSection title={t('shell.variantB.debug.sectionActiveOverlayRouting', 'Active Layer / Overlay Routing')}>
        <DebugRow label={t('shell.variantB.debug.activeOverlayScenePlane', 'Scene Plane')} value={sceneDirtyModel.activeOverlayScenePlane}/>
        <DebugRow label={t('shell.variantB.debug.activeOverlayOverlayPlane', 'Overlay Plane')} value={sceneDirtyModel.activeOverlayOverlayPlane}/>
        <DebugRow label={t('shell.variantB.debug.activeOverlayUsesActivePlane', 'Uses Active Plane')} value={sceneDirtyModel.activeOverlayUsesActivePlane ? 'yes' : 'no'}/>
        <DebugRow label={t('shell.variantB.debug.activeOverlayProtectedNodeCount', 'Protected Node Count')} value={String(sceneDirtyModel.activeOverlayProtectedNodeCount)}/>
        <DebugRow label={t('shell.variantB.debug.activeOverlayInteractionActiveNodeCount', 'Interaction Active Node Count')} value={String(sceneDirtyModel.activeOverlayInteractionActiveNodeCount)}/>
        <DebugRow label={t('shell.variantB.debug.activeOverlayRoutingAlertLevel', 'Routing Alert Level')} value={sceneDirtyModel.activeOverlayRoutingAlertLevel}/>
        <DebugRow label={t('shell.variantB.debug.activeOverlayRoutingAlertReason', 'Routing Alert Reason')} value={sceneDirtyModel.activeOverlayRoutingAlertReason}/>
        <DebugRow
          label={t('shell.variantB.debug.activeOverlayRoutingThresholds', 'Routing Thresholds')}
          value={
            `active>=${sceneDirtyModel.activeOverlayMinActiveNodeCountWhenActivePlane}, ` +
            `protected>=${sceneDirtyModel.activeOverlayMinProtectedNodeCountWhenActivePlane}`
          }
        />
      </DebugSection>

      <DebugSection title={t('shell.variantB.debug.sectionExportAndCache', 'Export / Cache / WebGL')}>
        <DebugRow label={t('shell.variantB.debug.cacheHitRate', 'Cache Hit Rate')} value={`${cacheHitRate.toFixed(1)}%`}/>
        <DebugRow label={t('shell.variantB.debug.tileCacheSize', 'Tile Cache Size')} value={String(diagnosticsDataSource.webglStats.tileCacheSize)}/>
        <DebugRow label={t('shell.variantB.debug.tileDirtyCount', 'Tile Dirty Count')} value={String(diagnosticsDataSource.webglStats.tileDirtyCount)}/>
        <DebugRow label={t('shell.variantB.debug.tileUploadCount', 'Tile Upload Count')} value={String(diagnosticsDataSource.webglStats.tileUploadCount)}/>
        <DebugRow label={t('shell.variantB.debug.tileRenderCount', 'Tile Render Count')} value={String(diagnosticsDataSource.webglStats.tileRenderCount)}/>
        <DebugRow label={t('shell.variantB.debug.gpuTextureBytes', 'GPU Texture Bytes')} value={formatDiagnosticBytes(diagnosticsDataSource.webglStats.gpuTextureBytes)}/>
        <DebugRow label={t('shell.variantB.debug.imageTextureBytes', 'Image Texture Bytes')} value={formatDiagnosticBytes(diagnosticsDataSource.webglStats.imageTextureBytes)}/>
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
