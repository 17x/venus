import {readFile, writeFile} from 'node:fs/promises'
import path from 'node:path'
import {pathToFileURL} from 'node:url'

/**
 * Declares trend counter contract reused by replay dashboards and gate outputs.
 */
export interface RenderParityTrendCounter {
  /** Stores improved trend count. */
  improved: number
  /** Stores regressed trend count. */
  regressed: number
  /** Stores mixed trend count. */
  mixed: number
  /** Stores unchanged trend count. */
  unchanged: number
  /** Stores unknown trend count. */
  unknown: number
}

/**
 * Declares one aggregate feature-capability gate counter payload.
 */
export interface RenderParityFeatureCapabilityGateCounter {
  /** Stores known WebGL feature capability gate reject total. */
  webglKnownRejected: number
  /** Stores unknown WebGL feature capability gate reject total. */
  webglUnknownRejected: number
  /** Stores known WebGPU feature capability gate reject total. */
  webgpuKnownRejected: number
  /** Stores unknown WebGPU feature capability gate reject total. */
  webgpuUnknownRejected: number
}

/**
 * Declares frame-stage scheduler mode counter payload.
 */
export interface RenderParityFrameStageSchedulerModeCounter {
  /** Stores interactive scheduler mode count. */
  interactive: number
  /** Stores normal scheduler mode count. */
  normal: number
  /** Stores unknown scheduler mode count. */
  unknown: number
}

/**
 * Declares frame-stage scene-apply mode counter payload.
 */
export interface RenderParityFrameStageSceneApplyModeCounter {
  /** Stores none scene-apply mode count. */
  none: number
  /** Stores full-load scene-apply mode count. */
  fullLoad: number
  /** Stores preview-load scene-apply mode count. */
  previewLoad: number
  /** Stores incremental-patch scene-apply mode count. */
  incrementalPatch: number
  /** Stores unknown scene-apply mode count. */
  unknown: number
}

/**
 * Declares runtime resource decode-status counter payload.
 */
export interface RenderParityRuntimeResourceDecodeStatusCounter {
  /** Stores queued decode status count. */
  queued: number
  /** Stores decoding decode status count. */
  decoding: number
  /** Stores ready decode status count. */
  ready: number
  /** Stores failed decode status count. */
  failed: number
  /** Stores unknown decode status count. */
  unknown: number
}

/**
 * Declares runtime resource compression-codec counter payload.
 */
export interface RenderParityRuntimeResourceCompressionCodecCounter {
  /** Stores explicit none/uncompressed codec count. */
  none: number
  /** Stores Brotli codec count. */
  brotli: number
  /** Stores Gzip codec count. */
  gzip: number
  /** Stores Zstd codec count. */
  zstd: number
  /** Stores Lz4 codec count. */
  lz4: number
  /** Stores unknown codec count. */
  unknown: number
}

/**
 * Declares minimal replay batch dashboard payload consumed by history/gate pipeline.
 */
export interface RenderParityReplayBatchDashboardArtifact {
  /** Stores dashboard generation timestamp. */
  generatedAt: string
  /** Stores absolute output directory path for artifacts. */
  outputDir: string
  /** Stores processed input row count. */
  processedCount: number
  /** Stores dashboard-level trend counter. */
  trendCounter: RenderParityTrendCounter
  /** Stores dashboard-level feature capability gate reject counter. */
  featureCapabilityGateCounter: RenderParityFeatureCapabilityGateCounter
  /** Stores dashboard-level frame-stage scheduler mode counter. */
  frameStageSchedulerModeCounter: RenderParityFrameStageSchedulerModeCounter
  /** Stores dashboard-level frame-stage scene-apply mode counter. */
  frameStageSceneApplyModeCounter: RenderParityFrameStageSceneApplyModeCounter
  /** Stores dashboard-level runtime resource decode-status counter. */
  runtimeResourceDecodeStatusCounter: RenderParityRuntimeResourceDecodeStatusCounter
  /** Stores dashboard-level runtime resource compression-codec counter. */
  runtimeResourceCompressionCodecCounter: RenderParityRuntimeResourceCompressionCodecCounter
}

/**
 * Declares one persisted snapshot row in replay history.
 */
export interface RenderParityReplayHistorySnapshot {
  /** Stores source dashboard generation timestamp. */
  generatedAt: string
  /** Stores source dashboard path. */
  dashboardPath: string
  /** Stores processed row count for this snapshot. */
  processedCount: number
  /** Stores trend counter for this snapshot. */
  trendCounter: RenderParityTrendCounter
  /** Stores feature capability gate reject counter for this snapshot. */
  featureCapabilityGateCounter: RenderParityFeatureCapabilityGateCounter
  /** Stores frame-stage scheduler mode counter for this snapshot. */
  frameStageSchedulerModeCounter: RenderParityFrameStageSchedulerModeCounter
  /** Stores frame-stage scene-apply mode counter for this snapshot. */
  frameStageSceneApplyModeCounter: RenderParityFrameStageSceneApplyModeCounter
  /** Stores runtime resource decode-status counter for this snapshot. */
  runtimeResourceDecodeStatusCounter?: RenderParityRuntimeResourceDecodeStatusCounter
  /** Stores runtime resource compression-codec counter for this snapshot. */
  runtimeResourceCompressionCodecCounter?: RenderParityRuntimeResourceCompressionCodecCounter
}

/**
 * Declares replay history artifact payload.
 */
export interface RenderParityReplayHistoryArtifact {
  /** Stores history artifact update timestamp. */
  updatedAt: string
  /** Stores history retention window size. */
  windowSize: number
  /** Stores total retained snapshots. */
  totalSnapshots: number
  /** Stores rolling aggregated trend counter for retained snapshots. */
  rollingTrendCounter: RenderParityTrendCounter
  /** Stores rolling aggregated feature capability gate reject counter for retained snapshots. */
  rollingFeatureCapabilityGateCounter: RenderParityFeatureCapabilityGateCounter
  /** Stores rolling aggregated frame-stage scheduler mode counter for retained snapshots. */
  rollingFrameStageSchedulerModeCounter: RenderParityFrameStageSchedulerModeCounter
  /** Stores rolling aggregated frame-stage scene-apply mode counter for retained snapshots. */
  rollingFrameStageSceneApplyModeCounter: RenderParityFrameStageSceneApplyModeCounter
  /** Stores rolling aggregated runtime resource decode-status counter for retained snapshots. */
  rollingRuntimeResourceDecodeStatusCounter: RenderParityRuntimeResourceDecodeStatusCounter
  /** Stores rolling aggregated runtime resource compression-codec counter for retained snapshots. */
  rollingRuntimeResourceCompressionCodecCounter: RenderParityRuntimeResourceCompressionCodecCounter
  /** Stores retained snapshot rows in ascending generatedAt order. */
  snapshots: RenderParityReplayHistorySnapshot[]
}

/**
 * Declares gate thresholds for replay dashboard quality checks.
 */
export interface RenderParityReplayGateThresholds {
  /** Stores maximum allowed regressed trends in latest snapshot. */
  maxRegressed: number
  /** Stores maximum allowed mixed trends in latest snapshot. */
  maxMixed: number
  /** Stores maximum allowed unknown trends in latest snapshot. */
  maxUnknown: number
  /** Stores minimum required processed count in latest snapshot. */
  minProcessedCount: number
  /** Stores optional maximum allowed rolling regressed count across retained snapshots. */
  maxRollingRegressed?: number
  /** Stores optional maximum allowed rolling mixed count across retained snapshots. */
  maxRollingMixed?: number
  /** Stores optional maximum allowed rolling unknown count across retained snapshots. */
  maxRollingUnknown?: number
  /** Stores optional maximum allowed WebGL feature-capability unknown rejects in latest snapshot. */
  maxWebglFeatureUnknown?: number
  /** Stores optional maximum allowed WebGPU feature-capability unknown rejects in latest snapshot. */
  maxWebgpuFeatureUnknown?: number
  /** Stores optional maximum allowed rolling WebGL feature-capability unknown rejects. */
  maxRollingWebglFeatureUnknown?: number
  /** Stores optional maximum allowed rolling WebGPU feature-capability unknown rejects. */
  maxRollingWebgpuFeatureUnknown?: number
  /** Stores optional maximum allowed runtime resource decode-status unknown count in latest snapshot. */
  maxResourceDecodeUnknown?: number
  /** Stores optional maximum allowed runtime resource compression-codec unknown count in latest snapshot. */
  maxResourceCompressionUnknown?: number
  /** Stores optional maximum allowed rolling runtime resource decode-status unknown count. */
  maxRollingResourceDecodeUnknown?: number
  /** Stores optional maximum allowed rolling runtime resource compression-codec unknown count. */
  maxRollingResourceCompressionUnknown?: number
  /** Stores optional maximum allowed runtime resource decode-status unknown rate (%) in latest snapshot. */
  maxResourceDecodeUnknownRatePercent?: number
  /** Stores optional maximum allowed runtime resource compression-codec unknown rate (%) in latest snapshot. */
  maxResourceCompressionUnknownRatePercent?: number
  /** Stores optional maximum allowed rolling runtime resource decode-status unknown rate (%). */
  maxRollingResourceDecodeUnknownRatePercent?: number
  /** Stores optional maximum allowed rolling runtime resource compression-codec unknown rate (%). */
  maxRollingResourceCompressionUnknownRatePercent?: number
  /** Stores optional maximum allowed frame-stage scheduler unknown count in latest snapshot. */
  maxStageSchedulerUnknown?: number
  /** Stores optional maximum allowed frame-stage scene-apply unknown count in latest snapshot. */
  maxStageSceneApplyUnknown?: number
  /** Stores optional maximum allowed rolling frame-stage scheduler unknown count. */
  maxRollingStageSchedulerUnknown?: number
  /** Stores optional maximum allowed rolling frame-stage scene-apply unknown count. */
  maxRollingStageSceneApplyUnknown?: number
  /** Stores optional maximum allowed frame-stage scheduler unknown rate (%) in latest snapshot. */
  maxStageSchedulerUnknownRatePercent?: number
  /** Stores optional maximum allowed frame-stage scene-apply unknown rate (%) in latest snapshot. */
  maxStageSceneApplyUnknownRatePercent?: number
  /** Stores optional maximum allowed rolling frame-stage scheduler unknown rate (%). */
  maxRollingStageSchedulerUnknownRatePercent?: number
  /** Stores optional maximum allowed rolling frame-stage scene-apply unknown rate (%). */
  maxRollingStageSceneApplyUnknownRatePercent?: number
}

/**
 * Declares stable machine-readable failure code taxonomy for replay gate checks.
 */
export type RenderParityReplayGateFailureCode =
  | 'RP_GATE_LATEST_PROCESSED_COUNT'
  | 'RP_GATE_LATEST_REGRESSED'
  | 'RP_GATE_LATEST_MIXED'
  | 'RP_GATE_LATEST_UNKNOWN'
  | 'RP_GATE_ROLLING_REGRESSED'
  | 'RP_GATE_ROLLING_MIXED'
  | 'RP_GATE_ROLLING_UNKNOWN'
  | 'RP_GATE_LATEST_WEBGL_FEATURE_UNKNOWN'
  | 'RP_GATE_LATEST_WEBGPU_FEATURE_UNKNOWN'
  | 'RP_GATE_ROLLING_WEBGL_FEATURE_UNKNOWN'
  | 'RP_GATE_ROLLING_WEBGPU_FEATURE_UNKNOWN'
  | 'RP_GATE_LATEST_RESOURCE_DECODE_UNKNOWN'
  | 'RP_GATE_LATEST_RESOURCE_COMPRESSION_UNKNOWN'
  | 'RP_GATE_ROLLING_RESOURCE_DECODE_UNKNOWN'
  | 'RP_GATE_ROLLING_RESOURCE_COMPRESSION_UNKNOWN'
  | 'RP_GATE_LATEST_RESOURCE_DECODE_UNKNOWN_RATE'
  | 'RP_GATE_LATEST_RESOURCE_COMPRESSION_UNKNOWN_RATE'
  | 'RP_GATE_ROLLING_RESOURCE_DECODE_UNKNOWN_RATE'
  | 'RP_GATE_ROLLING_RESOURCE_COMPRESSION_UNKNOWN_RATE'
  | 'RP_GATE_LATEST_STAGE_SCHEDULER_UNKNOWN'
  | 'RP_GATE_LATEST_STAGE_SCENE_APPLY_UNKNOWN'
  | 'RP_GATE_ROLLING_STAGE_SCHEDULER_UNKNOWN'
  | 'RP_GATE_ROLLING_STAGE_SCENE_APPLY_UNKNOWN'
  | 'RP_GATE_LATEST_STAGE_SCHEDULER_UNKNOWN_RATE'
  | 'RP_GATE_LATEST_STAGE_SCENE_APPLY_UNKNOWN_RATE'
  | 'RP_GATE_ROLLING_STAGE_SCHEDULER_UNKNOWN_RATE'
  | 'RP_GATE_ROLLING_STAGE_SCENE_APPLY_UNKNOWN_RATE'

/**
 * Declares one gate failure row with stable code and human-readable message.
 */
export interface RenderParityReplayGateFailure {
  /** Stores stable machine-readable failure code. */
  code: RenderParityReplayGateFailureCode
  /** Stores human-readable failure description. */
  message: string
}

/**
 * Declares structured stage unknown-rate snapshot used by gate consumers.
 */
export interface RenderParityReplayStageUnknownRatePercentSummary {
  /** Stores latest scheduler unknown rate percent. */
  latestStageSchedulerUnknownRatePercent: number
  /** Stores latest scene-apply unknown rate percent. */
  latestStageSceneApplyUnknownRatePercent: number
  /** Stores rolling scheduler unknown rate percent. */
  rollingStageSchedulerUnknownRatePercent: number
  /** Stores rolling scene-apply unknown rate percent. */
  rollingStageSceneApplyUnknownRatePercent: number
}

/**
 * Declares structured runtime resource unknown-rate snapshot used by gate consumers.
 */
export interface RenderParityReplayResourceUnknownRatePercentSummary {
  /** Stores latest runtime resource decode unknown rate percent. */
  latestResourceDecodeUnknownRatePercent: number
  /** Stores latest runtime resource compression unknown rate percent. */
  latestResourceCompressionUnknownRatePercent: number
  /** Stores rolling runtime resource decode unknown rate percent. */
  rollingResourceDecodeUnknownRatePercent: number
  /** Stores rolling runtime resource compression unknown rate percent. */
  rollingResourceCompressionUnknownRatePercent: number
}

/**
 * Declares one runtime resource unknown-rate gate violation evaluation row.
 */
export interface RenderParityReplayResourceUnknownRateViolationEntry {
  /** Stores concrete machine-readable failure code for this rate dimension. */
  failureCode:
    | 'RP_GATE_LATEST_RESOURCE_DECODE_UNKNOWN_RATE'
    | 'RP_GATE_LATEST_RESOURCE_COMPRESSION_UNKNOWN_RATE'
    | 'RP_GATE_ROLLING_RESOURCE_DECODE_UNKNOWN_RATE'
    | 'RP_GATE_ROLLING_RESOURCE_COMPRESSION_UNKNOWN_RATE'
  /** Stores evaluated actual unknown rate percent in this dimension. */
  actualRatePercent: number
  /** Stores configured threshold percent; null means this optional threshold is disabled. */
  thresholdRatePercent: number | null
  /** Stores whether this dimension exceeded threshold and should emit gate failure. */
  exceeded: boolean
}

/**
 * Declares structured runtime resource unknown-rate violation summary for CI consumers.
 */
export interface RenderParityReplayResourceUnknownRateViolationSummary {
  /** Stores latest runtime resource decode unknown-rate violation evaluation row. */
  latestResourceDecode: RenderParityReplayResourceUnknownRateViolationEntry
  /** Stores latest runtime resource compression unknown-rate violation evaluation row. */
  latestResourceCompression: RenderParityReplayResourceUnknownRateViolationEntry
  /** Stores rolling runtime resource decode unknown-rate violation evaluation row. */
  rollingResourceDecode: RenderParityReplayResourceUnknownRateViolationEntry
  /** Stores rolling runtime resource compression unknown-rate violation evaluation row. */
  rollingResourceCompression: RenderParityReplayResourceUnknownRateViolationEntry
  /** Stores total exceeded runtime resource unknown-rate dimensions for this gate evaluation. */
  exceededCount: number
}

/**
 * Declares one human-readable runtime resource unknown-rate violation log row.
 */
export interface RenderParityReplayResourceUnknownRateViolationLogLine {
  /** Stores one concise log line for one exceeded resource rate dimension. */
  text: string
}

/**
 * Declares one unified unknown-rate CLI summary log row.
 */
export interface RenderParityReplayUnknownRateCliSummaryLogLine {
  /** Stores one concise CLI summary log line. */
  text: string
}

/**
 * Declares one stage unknown-rate gate violation evaluation row.
 */
export interface RenderParityReplayStageUnknownRateViolationEntry {
  /** Stores concrete machine-readable failure code for this rate dimension. */
  failureCode:
    | 'RP_GATE_LATEST_STAGE_SCHEDULER_UNKNOWN_RATE'
    | 'RP_GATE_LATEST_STAGE_SCENE_APPLY_UNKNOWN_RATE'
    | 'RP_GATE_ROLLING_STAGE_SCHEDULER_UNKNOWN_RATE'
    | 'RP_GATE_ROLLING_STAGE_SCENE_APPLY_UNKNOWN_RATE'
  /** Stores evaluated actual unknown rate percent in this dimension. */
  actualRatePercent: number
  /** Stores configured threshold percent; null means this optional threshold is disabled. */
  thresholdRatePercent: number | null
  /** Stores whether this dimension exceeded threshold and should emit gate failure. */
  exceeded: boolean
}

/**
 * Declares structured stage unknown-rate violation summary for CI consumers.
 */
export interface RenderParityReplayStageUnknownRateViolationSummary {
  /** Stores latest scheduler unknown-rate violation evaluation row. */
  latestStageScheduler: RenderParityReplayStageUnknownRateViolationEntry
  /** Stores latest scene-apply unknown-rate violation evaluation row. */
  latestStageSceneApply: RenderParityReplayStageUnknownRateViolationEntry
  /** Stores rolling scheduler unknown-rate violation evaluation row. */
  rollingStageScheduler: RenderParityReplayStageUnknownRateViolationEntry
  /** Stores rolling scene-apply unknown-rate violation evaluation row. */
  rollingStageSceneApply: RenderParityReplayStageUnknownRateViolationEntry
  /** Stores total exceeded stage unknown-rate dimensions for this gate evaluation. */
  exceededCount: number
}

/**
 * Declares one human-readable stage unknown-rate violation log row.
 */
export interface RenderParityReplayStageUnknownRateViolationLogLine {
  /** Stores one concise log line for one exceeded rate dimension. */
  text: string
}

/**
 * Declares gate artifact payload used by CI checks.
 */
export interface RenderParityReplayGateArtifact {
  /** Stores gate evaluation timestamp. */
  generatedAt: string
  /** Stores evaluated source dashboard path. */
  sourceDashboardPath: string
  /** Stores resolved gate status. */
  status: 'pass' | 'fail'
  /** Stores textual gate failure reasons. */
  reasons: string[]
  /** Stores machine-readable failure rows for CI/error routing. */
  failures: RenderParityReplayGateFailure[]
  /** Stores thresholds used for this evaluation. */
  thresholds: RenderParityReplayGateThresholds
  /** Stores latest snapshot data from current dashboard. */
  latestSnapshot: RenderParityReplayHistorySnapshot
  /** Stores rolling trend counter from retained history window. */
  rollingTrendCounter: RenderParityTrendCounter
  /** Stores rolling feature capability gate counter from retained history window. */
  rollingFeatureCapabilityGateCounter: RenderParityFeatureCapabilityGateCounter
  /** Stores rolling frame-stage scheduler mode counter from retained history window. */
  rollingFrameStageSchedulerModeCounter: RenderParityFrameStageSchedulerModeCounter
  /** Stores rolling frame-stage scene-apply mode counter from retained history window. */
  rollingFrameStageSceneApplyModeCounter: RenderParityFrameStageSceneApplyModeCounter
  /** Stores rolling runtime resource decode-status counter from retained history window. */
  rollingRuntimeResourceDecodeStatusCounter: RenderParityRuntimeResourceDecodeStatusCounter
  /** Stores rolling runtime resource compression-codec counter from retained history window. */
  rollingRuntimeResourceCompressionCodecCounter: RenderParityRuntimeResourceCompressionCodecCounter
  /** Stores structured stage unknown-rate percentages for latest and rolling scopes. */
  stageUnknownRatePercentSummary: RenderParityReplayStageUnknownRatePercentSummary
  /** Stores structured stage unknown-rate threshold evaluation rows for latest and rolling scopes. */
  stageUnknownRateViolationSummary: RenderParityReplayStageUnknownRateViolationSummary
  /** Stores structured runtime resource unknown-rate percentages for latest and rolling scopes. */
  resourceUnknownRatePercentSummary: RenderParityReplayResourceUnknownRatePercentSummary
  /** Stores structured runtime resource unknown-rate threshold evaluation rows for latest and rolling scopes. */
  resourceUnknownRateViolationSummary: RenderParityReplayResourceUnknownRateViolationSummary
}

/**
 * Declares CLI options for replay history + gate pipeline.
 */
interface RenderParityReplayHistoryGateCliOptions {
  /** Stores source replay batch dashboard path. */
  dashboardPath: string
  /** Stores destination history artifact path. */
  historyFilePath: string
  /** Stores destination gate artifact path. */
  gateOutputPath: string
  /** Stores retention window size for snapshots. */
  windowSize: number
  /** Stores resolved gate thresholds. */
  thresholds: RenderParityReplayGateThresholds
  /** Enables non-zero process exit when gate status is fail. */
  failOnStatus: boolean
}

/**
 * Declares one run result for replay history + gate pipeline.
 */
export interface RenderParityReplayHistoryGateRunResult {
  /** Stores written history artifact path. */
  historyFilePath: string
  /** Stores written gate artifact path. */
  gateOutputPath: string
  /** Stores generated history artifact payload. */
  historyArtifact: RenderParityReplayHistoryArtifact
  /** Stores generated gate artifact payload. */
  gateArtifact: RenderParityReplayGateArtifact
}

/**
 * Parses one required string flag and validates value presence.
 * @param argv Process argument array.
 * @param flagName CLI flag name.
 */
function resolveRequiredStringFlag(argv: readonly string[], flagName: string): string {
  const index = argv.indexOf(flagName)
  if (index < 0 || !argv[index + 1]) {
    throw new Error(`Missing required ${flagName} <value> argument.`)
  }
  return argv[index + 1]
}

/**
 * Parses one optional string flag.
 * @param argv Process argument array.
 * @param flagName CLI flag name.
 */
function resolveOptionalStringFlag(argv: readonly string[], flagName: string): string | undefined {
  const index = argv.indexOf(flagName)
  if (index < 0 || !argv[index + 1]) {
    return undefined
  }
  return argv[index + 1]
}

/**
 * Parses one optional numeric flag and validates finite number input.
 * @param argv Process argument array.
 * @param flagName CLI flag name.
 */
function resolveOptionalNumberFlag(argv: readonly string[], flagName: string): number | undefined {
  const index = argv.indexOf(flagName)
  if (index < 0 || !argv[index + 1]) {
    return undefined
  }
  const parsed = Number(argv[index + 1])
  if (!Number.isFinite(parsed)) {
    throw new Error(`Invalid numeric value for ${flagName}: ${argv[index + 1]}`)
  }
  return parsed
}

/**
 * Parses CLI options for replay history and gate generation.
 * @param argv Process argument array.
 */
function parseCliOptions(argv: readonly string[]): RenderParityReplayHistoryGateCliOptions {
  const dashboardPath = resolveRequiredStringFlag(argv, '--dashboard')
  const historyFilePath =
    resolveOptionalStringFlag(argv, '--history-file')
    ?? './docs/product-requirements/render-parity-reports/runtime-replay.batch.history.json'
  const gateOutputPath =
    resolveOptionalStringFlag(argv, '--gate-output')
    ?? './docs/product-requirements/render-parity-reports/runtime-replay.batch.gate.json'
  const windowSize = resolveOptionalNumberFlag(argv, '--window-size') ?? 20
  if (windowSize <= 0) {
    throw new Error(`--window-size must be greater than 0, received ${windowSize}.`)
  }

  return {
    dashboardPath,
    historyFilePath,
    gateOutputPath,
    windowSize,
    failOnStatus: argv.includes('--fail-on-status'),
    thresholds: {
      maxRegressed: resolveOptionalNumberFlag(argv, '--max-regressed') ?? 0,
      maxMixed: resolveOptionalNumberFlag(argv, '--max-mixed') ?? 0,
      maxUnknown: resolveOptionalNumberFlag(argv, '--max-unknown') ?? 0,
      minProcessedCount: resolveOptionalNumberFlag(argv, '--min-processed') ?? 1,
      maxRollingRegressed: resolveOptionalNumberFlag(argv, '--max-rolling-regressed'),
      maxRollingMixed: resolveOptionalNumberFlag(argv, '--max-rolling-mixed'),
      maxRollingUnknown: resolveOptionalNumberFlag(argv, '--max-rolling-unknown'),
      maxWebglFeatureUnknown: resolveOptionalNumberFlag(argv, '--max-webgl-feature-unknown'),
      maxWebgpuFeatureUnknown: resolveOptionalNumberFlag(argv, '--max-webgpu-feature-unknown'),
      maxRollingWebglFeatureUnknown:
        resolveOptionalNumberFlag(argv, '--max-rolling-webgl-feature-unknown'),
      maxRollingWebgpuFeatureUnknown:
        resolveOptionalNumberFlag(argv, '--max-rolling-webgpu-feature-unknown'),
      maxResourceDecodeUnknown:
        resolveOptionalNumberFlag(argv, '--max-resource-decode-unknown'),
      maxResourceCompressionUnknown:
        resolveOptionalNumberFlag(argv, '--max-resource-compression-unknown'),
      maxRollingResourceDecodeUnknown:
        resolveOptionalNumberFlag(argv, '--max-rolling-resource-decode-unknown'),
      maxRollingResourceCompressionUnknown:
        resolveOptionalNumberFlag(argv, '--max-rolling-resource-compression-unknown'),
      maxResourceDecodeUnknownRatePercent:
        resolveOptionalNumberFlag(argv, '--max-resource-decode-unknown-rate-percent'),
      maxResourceCompressionUnknownRatePercent:
        resolveOptionalNumberFlag(argv, '--max-resource-compression-unknown-rate-percent'),
      maxRollingResourceDecodeUnknownRatePercent:
        resolveOptionalNumberFlag(argv, '--max-rolling-resource-decode-unknown-rate-percent'),
      maxRollingResourceCompressionUnknownRatePercent:
        resolveOptionalNumberFlag(argv, '--max-rolling-resource-compression-unknown-rate-percent'),
      maxStageSchedulerUnknown:
        resolveOptionalNumberFlag(argv, '--max-stage-scheduler-unknown'),
      maxStageSceneApplyUnknown:
        resolveOptionalNumberFlag(argv, '--max-stage-scene-apply-unknown'),
      maxRollingStageSchedulerUnknown:
        resolveOptionalNumberFlag(argv, '--max-rolling-stage-scheduler-unknown'),
      maxRollingStageSceneApplyUnknown:
        resolveOptionalNumberFlag(argv, '--max-rolling-stage-scene-apply-unknown'),
      maxStageSchedulerUnknownRatePercent:
        resolveOptionalNumberFlag(argv, '--max-stage-scheduler-unknown-rate-percent'),
      maxStageSceneApplyUnknownRatePercent:
        resolveOptionalNumberFlag(argv, '--max-stage-scene-apply-unknown-rate-percent'),
      maxRollingStageSchedulerUnknownRatePercent:
        resolveOptionalNumberFlag(argv, '--max-rolling-stage-scheduler-unknown-rate-percent'),
      maxRollingStageSceneApplyUnknownRatePercent:
        resolveOptionalNumberFlag(argv, '--max-rolling-stage-scene-apply-unknown-rate-percent'),
    },
  }
}

/**
 * Resolves unknown rate percentage from one counter pair.
 * @param unknownCount Unknown bucket count.
 * @param totalCount Total bucket count.
 */
function resolveUnknownRatePercent(unknownCount: number, totalCount: number): number {
  if (!Number.isFinite(totalCount) || totalCount <= 0) {
    return 0
  }
  if (!Number.isFinite(unknownCount) || unknownCount <= 0) {
    return 0
  }
  return (unknownCount / totalCount) * 100
}

/**
 * Computes stage unknown-rate percentages from latest and rolling counters.
 * @param latestStageSchedulerModeCounter Latest scheduler mode counter.
 * @param latestStageSceneApplyModeCounter Latest scene-apply mode counter.
 * @param rollingFrameStageSchedulerModeCounter Rolling scheduler mode counter.
 * @param rollingFrameStageSceneApplyModeCounter Rolling scene-apply mode counter.
 */
function createStageUnknownRatePercentSummary(
  latestStageSchedulerModeCounter: RenderParityFrameStageSchedulerModeCounter,
  latestStageSceneApplyModeCounter: RenderParityFrameStageSceneApplyModeCounter,
  rollingFrameStageSchedulerModeCounter: RenderParityFrameStageSchedulerModeCounter,
  rollingFrameStageSceneApplyModeCounter: RenderParityFrameStageSceneApplyModeCounter,
): RenderParityReplayStageUnknownRatePercentSummary {
  const latestStageSchedulerTotal =
    latestStageSchedulerModeCounter.interactive
    + latestStageSchedulerModeCounter.normal
    + latestStageSchedulerModeCounter.unknown
  const latestStageSceneApplyTotal =
    latestStageSceneApplyModeCounter.none
    + latestStageSceneApplyModeCounter.fullLoad
    + latestStageSceneApplyModeCounter.previewLoad
    + latestStageSceneApplyModeCounter.incrementalPatch
    + latestStageSceneApplyModeCounter.unknown
  const rollingStageSchedulerTotal =
    rollingFrameStageSchedulerModeCounter.interactive
    + rollingFrameStageSchedulerModeCounter.normal
    + rollingFrameStageSchedulerModeCounter.unknown
  const rollingStageSceneApplyTotal =
    rollingFrameStageSceneApplyModeCounter.none
    + rollingFrameStageSceneApplyModeCounter.fullLoad
    + rollingFrameStageSceneApplyModeCounter.previewLoad
    + rollingFrameStageSceneApplyModeCounter.incrementalPatch
    + rollingFrameStageSceneApplyModeCounter.unknown

  return {
    latestStageSchedulerUnknownRatePercent: resolveUnknownRatePercent(
      latestStageSchedulerModeCounter.unknown,
      latestStageSchedulerTotal,
    ),
    latestStageSceneApplyUnknownRatePercent: resolveUnknownRatePercent(
      latestStageSceneApplyModeCounter.unknown,
      latestStageSceneApplyTotal,
    ),
    rollingStageSchedulerUnknownRatePercent: resolveUnknownRatePercent(
      rollingFrameStageSchedulerModeCounter.unknown,
      rollingStageSchedulerTotal,
    ),
    rollingStageSceneApplyUnknownRatePercent: resolveUnknownRatePercent(
      rollingFrameStageSceneApplyModeCounter.unknown,
      rollingStageSceneApplyTotal,
    ),
  }
}

/**
 * Computes one rate-threshold violation entry.
 * @param failureCode Failure code bound to this rate dimension.
 * @param actualRatePercent Actual stage unknown rate percent.
 * @param thresholdRatePercent Optional configured rate threshold.
 */
function createStageUnknownRateViolationEntry(
  failureCode: RenderParityReplayStageUnknownRateViolationEntry['failureCode'],
  actualRatePercent: number,
  thresholdRatePercent: number | undefined,
): RenderParityReplayStageUnknownRateViolationEntry {
  // Optional rate thresholds are disabled when omitted, so these dimensions stay observable but non-blocking.
  if (typeof thresholdRatePercent !== 'number') {
    return {
      failureCode,
      actualRatePercent,
      thresholdRatePercent: null,
      exceeded: false,
    }
  }

  return {
    failureCode,
    actualRatePercent,
    thresholdRatePercent,
    exceeded: actualRatePercent > thresholdRatePercent,
  }
}

/**
 * Computes structured stage unknown-rate threshold violation summary.
 * @param stageUnknownRatePercentSummary Stage unknown-rate percentages.
 * @param thresholds Gate thresholds.
 */
function createStageUnknownRateViolationSummary(
  stageUnknownRatePercentSummary: RenderParityReplayStageUnknownRatePercentSummary,
  thresholds: RenderParityReplayGateThresholds,
): RenderParityReplayStageUnknownRateViolationSummary {
  const latestStageScheduler = createStageUnknownRateViolationEntry(
    'RP_GATE_LATEST_STAGE_SCHEDULER_UNKNOWN_RATE',
    stageUnknownRatePercentSummary.latestStageSchedulerUnknownRatePercent,
    thresholds.maxStageSchedulerUnknownRatePercent,
  )
  const latestStageSceneApply = createStageUnknownRateViolationEntry(
    'RP_GATE_LATEST_STAGE_SCENE_APPLY_UNKNOWN_RATE',
    stageUnknownRatePercentSummary.latestStageSceneApplyUnknownRatePercent,
    thresholds.maxStageSceneApplyUnknownRatePercent,
  )
  const rollingStageScheduler = createStageUnknownRateViolationEntry(
    'RP_GATE_ROLLING_STAGE_SCHEDULER_UNKNOWN_RATE',
    stageUnknownRatePercentSummary.rollingStageSchedulerUnknownRatePercent,
    thresholds.maxRollingStageSchedulerUnknownRatePercent,
  )
  const rollingStageSceneApply = createStageUnknownRateViolationEntry(
    'RP_GATE_ROLLING_STAGE_SCENE_APPLY_UNKNOWN_RATE',
    stageUnknownRatePercentSummary.rollingStageSceneApplyUnknownRatePercent,
    thresholds.maxRollingStageSceneApplyUnknownRatePercent,
  )

  const exceededCount = [
    latestStageScheduler,
    latestStageSceneApply,
    rollingStageScheduler,
    rollingStageSceneApply,
  ].filter((entry) => entry.exceeded).length

  return {
    latestStageScheduler,
    latestStageSceneApply,
    rollingStageScheduler,
    rollingStageSceneApply,
    exceededCount,
  }
}

/**
 * Computes runtime resource unknown-rate percentages from latest and rolling counters.
 * @param latestRuntimeResourceDecodeStatusCounter Latest runtime resource decode-status counter.
 * @param latestRuntimeResourceCompressionCodecCounter Latest runtime resource compression-codec counter.
 * @param rollingRuntimeResourceDecodeStatusCounter Rolling runtime resource decode-status counter.
 * @param rollingRuntimeResourceCompressionCodecCounter Rolling runtime resource compression-codec counter.
 */
function createResourceUnknownRatePercentSummary(
  latestRuntimeResourceDecodeStatusCounter: RenderParityRuntimeResourceDecodeStatusCounter,
  latestRuntimeResourceCompressionCodecCounter: RenderParityRuntimeResourceCompressionCodecCounter,
  rollingRuntimeResourceDecodeStatusCounter: RenderParityRuntimeResourceDecodeStatusCounter,
  rollingRuntimeResourceCompressionCodecCounter: RenderParityRuntimeResourceCompressionCodecCounter,
): RenderParityReplayResourceUnknownRatePercentSummary {
  const latestResourceDecodeTotal =
    latestRuntimeResourceDecodeStatusCounter.queued
    + latestRuntimeResourceDecodeStatusCounter.decoding
    + latestRuntimeResourceDecodeStatusCounter.ready
    + latestRuntimeResourceDecodeStatusCounter.failed
    + latestRuntimeResourceDecodeStatusCounter.unknown
  const latestResourceCompressionTotal =
    latestRuntimeResourceCompressionCodecCounter.none
    + latestRuntimeResourceCompressionCodecCounter.brotli
    + latestRuntimeResourceCompressionCodecCounter.gzip
    + latestRuntimeResourceCompressionCodecCounter.zstd
    + latestRuntimeResourceCompressionCodecCounter.lz4
    + latestRuntimeResourceCompressionCodecCounter.unknown
  const rollingResourceDecodeTotal =
    rollingRuntimeResourceDecodeStatusCounter.queued
    + rollingRuntimeResourceDecodeStatusCounter.decoding
    + rollingRuntimeResourceDecodeStatusCounter.ready
    + rollingRuntimeResourceDecodeStatusCounter.failed
    + rollingRuntimeResourceDecodeStatusCounter.unknown
  const rollingResourceCompressionTotal =
    rollingRuntimeResourceCompressionCodecCounter.none
    + rollingRuntimeResourceCompressionCodecCounter.brotli
    + rollingRuntimeResourceCompressionCodecCounter.gzip
    + rollingRuntimeResourceCompressionCodecCounter.zstd
    + rollingRuntimeResourceCompressionCodecCounter.lz4
    + rollingRuntimeResourceCompressionCodecCounter.unknown

  return {
    latestResourceDecodeUnknownRatePercent: resolveUnknownRatePercent(
      latestRuntimeResourceDecodeStatusCounter.unknown,
      latestResourceDecodeTotal,
    ),
    latestResourceCompressionUnknownRatePercent: resolveUnknownRatePercent(
      latestRuntimeResourceCompressionCodecCounter.unknown,
      latestResourceCompressionTotal,
    ),
    rollingResourceDecodeUnknownRatePercent: resolveUnknownRatePercent(
      rollingRuntimeResourceDecodeStatusCounter.unknown,
      rollingResourceDecodeTotal,
    ),
    rollingResourceCompressionUnknownRatePercent: resolveUnknownRatePercent(
      rollingRuntimeResourceCompressionCodecCounter.unknown,
      rollingResourceCompressionTotal,
    ),
  }
}

/**
 * Computes one runtime resource unknown-rate threshold violation entry.
 * @param failureCode Failure code bound to this rate dimension.
 * @param actualRatePercent Actual runtime resource unknown rate percent.
 * @param thresholdRatePercent Optional configured rate threshold.
 */
function createResourceUnknownRateViolationEntry(
  failureCode: RenderParityReplayResourceUnknownRateViolationEntry['failureCode'],
  actualRatePercent: number,
  thresholdRatePercent: number | undefined,
): RenderParityReplayResourceUnknownRateViolationEntry {
  // Optional rate thresholds are disabled when omitted, so these dimensions stay observable but non-blocking.
  if (typeof thresholdRatePercent !== 'number') {
    return {
      failureCode,
      actualRatePercent,
      thresholdRatePercent: null,
      exceeded: false,
    }
  }

  return {
    failureCode,
    actualRatePercent,
    thresholdRatePercent,
    exceeded: actualRatePercent > thresholdRatePercent,
  }
}

/**
 * Computes structured runtime resource unknown-rate threshold violation summary.
 * @param resourceUnknownRatePercentSummary Runtime resource unknown-rate percentages.
 * @param thresholds Gate thresholds.
 */
function createResourceUnknownRateViolationSummary(
  resourceUnknownRatePercentSummary: RenderParityReplayResourceUnknownRatePercentSummary,
  thresholds: RenderParityReplayGateThresholds,
): RenderParityReplayResourceUnknownRateViolationSummary {
  const latestResourceDecode = createResourceUnknownRateViolationEntry(
    'RP_GATE_LATEST_RESOURCE_DECODE_UNKNOWN_RATE',
    resourceUnknownRatePercentSummary.latestResourceDecodeUnknownRatePercent,
    thresholds.maxResourceDecodeUnknownRatePercent,
  )
  const latestResourceCompression = createResourceUnknownRateViolationEntry(
    'RP_GATE_LATEST_RESOURCE_COMPRESSION_UNKNOWN_RATE',
    resourceUnknownRatePercentSummary.latestResourceCompressionUnknownRatePercent,
    thresholds.maxResourceCompressionUnknownRatePercent,
  )
  const rollingResourceDecode = createResourceUnknownRateViolationEntry(
    'RP_GATE_ROLLING_RESOURCE_DECODE_UNKNOWN_RATE',
    resourceUnknownRatePercentSummary.rollingResourceDecodeUnknownRatePercent,
    thresholds.maxRollingResourceDecodeUnknownRatePercent,
  )
  const rollingResourceCompression = createResourceUnknownRateViolationEntry(
    'RP_GATE_ROLLING_RESOURCE_COMPRESSION_UNKNOWN_RATE',
    resourceUnknownRatePercentSummary.rollingResourceCompressionUnknownRatePercent,
    thresholds.maxRollingResourceCompressionUnknownRatePercent,
  )

  const exceededCount = [
    latestResourceDecode,
    latestResourceCompression,
    rollingResourceDecode,
    rollingResourceCompression,
  ].filter((entry) => entry.exceeded).length

  return {
    latestResourceDecode,
    latestResourceCompression,
    rollingResourceDecode,
    rollingResourceCompression,
    exceededCount,
  }
}

/**
 * Builds deterministic log lines for exceeded stage unknown-rate dimensions.
 * @param stageUnknownRateViolationSummary Structured rate violation summary.
 */
export function createStageUnknownRateViolationSummaryLogLines(
  stageUnknownRateViolationSummary: RenderParityReplayStageUnknownRateViolationSummary,
): RenderParityReplayStageUnknownRateViolationLogLine[] {
  const lines: RenderParityReplayStageUnknownRateViolationLogLine[] = []
  const entries = [
    stageUnknownRateViolationSummary.latestStageScheduler,
    stageUnknownRateViolationSummary.latestStageSceneApply,
    stageUnknownRateViolationSummary.rollingStageScheduler,
    stageUnknownRateViolationSummary.rollingStageSceneApply,
  ]

  for (const entry of entries) {
    // Only exceeded dimensions are printed to keep fail logs concise for CI triage.
    if (!entry.exceeded) {
      continue
    }
    lines.push({
      text:
        `${entry.failureCode}: actual=${entry.actualRatePercent.toFixed(2)} threshold=${entry.thresholdRatePercent}`,
    })
  }

  return lines
}

/**
 * Builds deterministic log lines for exceeded runtime resource unknown-rate dimensions.
 * @param resourceUnknownRateViolationSummary Structured rate violation summary.
 */
export function createResourceUnknownRateViolationSummaryLogLines(
  resourceUnknownRateViolationSummary: RenderParityReplayResourceUnknownRateViolationSummary,
): RenderParityReplayResourceUnknownRateViolationLogLine[] {
  const lines: RenderParityReplayResourceUnknownRateViolationLogLine[] = []
  const entries = [
    resourceUnknownRateViolationSummary.latestResourceDecode,
    resourceUnknownRateViolationSummary.latestResourceCompression,
    resourceUnknownRateViolationSummary.rollingResourceDecode,
    resourceUnknownRateViolationSummary.rollingResourceCompression,
  ]

  for (const entry of entries) {
    // Only exceeded dimensions are printed to keep fail logs concise for CI triage.
    if (!entry.exceeded) {
      continue
    }
    lines.push({
      text:
        `${entry.failureCode}: actual=${entry.actualRatePercent.toFixed(2)} threshold=${entry.thresholdRatePercent}`,
    })
  }

  return lines
}

/**
 * Builds deterministic unified CLI summary lines for resource/stage unknown-rate violations.
 * @param gateArtifact Replay gate artifact that contains unknown-rate violation summaries.
 */
export function createUnknownRateCliSummaryLogLines(
  gateArtifact: Pick<
    RenderParityReplayGateArtifact,
    'resourceUnknownRateViolationSummary' | 'stageUnknownRateViolationSummary'
  >,
): RenderParityReplayUnknownRateCliSummaryLogLine[] {
  const lines: RenderParityReplayUnknownRateCliSummaryLogLine[] = []

  if (gateArtifact.resourceUnknownRateViolationSummary.exceededCount > 0) {
    lines.push({
      text: `resource-rate-exceeded: ${gateArtifact.resourceUnknownRateViolationSummary.exceededCount}`,
    })
    const resourceLines = createResourceUnknownRateViolationSummaryLogLines(
      gateArtifact.resourceUnknownRateViolationSummary,
    )
    for (const line of resourceLines) {
      lines.push({
        text: `resource-rate: ${line.text}`,
      })
    }
  }

  if (gateArtifact.stageUnknownRateViolationSummary.exceededCount > 0) {
    lines.push({
      text: `stage-rate-exceeded: ${gateArtifact.stageUnknownRateViolationSummary.exceededCount}`,
    })
    const stageLines = createStageUnknownRateViolationSummaryLogLines(
      gateArtifact.stageUnknownRateViolationSummary,
    )
    for (const line of stageLines) {
      lines.push({
        text: `stage-rate: ${line.text}`,
      })
    }
  }

  return lines
}

/**
 * Resolves feature capability gate counter with legacy-safe fallbacks.
 * @param payload Unknown dashboard/history counter payload.
 */
function resolveFeatureCapabilityGateCounter(
  payload: unknown,
): RenderParityFeatureCapabilityGateCounter {
  if (!payload || typeof payload !== 'object') {
    return {
      webglKnownRejected: 0,
      webglUnknownRejected: 0,
      webgpuKnownRejected: 0,
      webgpuUnknownRejected: 0,
    }
  }

  const record = payload as Record<string, unknown>
  return {
    webglKnownRejected:
      typeof record.webglKnownRejected === 'number' && Number.isFinite(record.webglKnownRejected)
        ? record.webglKnownRejected
        : 0,
    webglUnknownRejected:
      typeof record.webglUnknownRejected === 'number' && Number.isFinite(record.webglUnknownRejected)
        ? record.webglUnknownRejected
        : 0,
    webgpuKnownRejected:
      typeof record.webgpuKnownRejected === 'number' && Number.isFinite(record.webgpuKnownRejected)
        ? record.webgpuKnownRejected
        : 0,
    webgpuUnknownRejected:
      typeof record.webgpuUnknownRejected === 'number' && Number.isFinite(record.webgpuUnknownRejected)
        ? record.webgpuUnknownRejected
        : 0,
  }
}

/**
 * Resolves frame-stage scheduler mode counter with legacy-safe fallbacks.
 * @param payload Unknown dashboard/history counter payload.
 */
function resolveFrameStageSchedulerModeCounter(
  payload: unknown,
): RenderParityFrameStageSchedulerModeCounter {
  if (!payload || typeof payload !== 'object') {
    return {
      interactive: 0,
      normal: 0,
      unknown: 0,
    }
  }

  const record = payload as Record<string, unknown>
  return {
    interactive:
      typeof record.interactive === 'number' && Number.isFinite(record.interactive)
        ? record.interactive
        : 0,
    normal:
      typeof record.normal === 'number' && Number.isFinite(record.normal)
        ? record.normal
        : 0,
    unknown:
      typeof record.unknown === 'number' && Number.isFinite(record.unknown)
        ? record.unknown
        : 0,
  }
}

/**
 * Resolves frame-stage scene-apply mode counter with legacy-safe fallbacks.
 * @param payload Unknown dashboard/history counter payload.
 */
function resolveFrameStageSceneApplyModeCounter(
  payload: unknown,
): RenderParityFrameStageSceneApplyModeCounter {
  if (!payload || typeof payload !== 'object') {
    return {
      none: 0,
      fullLoad: 0,
      previewLoad: 0,
      incrementalPatch: 0,
      unknown: 0,
    }
  }

  const record = payload as Record<string, unknown>
  return {
    none:
      typeof record.none === 'number' && Number.isFinite(record.none)
        ? record.none
        : 0,
    fullLoad:
      typeof record.fullLoad === 'number' && Number.isFinite(record.fullLoad)
        ? record.fullLoad
        : 0,
    previewLoad:
      typeof record.previewLoad === 'number' && Number.isFinite(record.previewLoad)
        ? record.previewLoad
        : 0,
    incrementalPatch:
      typeof record.incrementalPatch === 'number' && Number.isFinite(record.incrementalPatch)
        ? record.incrementalPatch
        : 0,
    unknown:
      typeof record.unknown === 'number' && Number.isFinite(record.unknown)
        ? record.unknown
        : 0,
  }
}

/**
 * Resolves runtime resource decode-status counter with legacy-safe fallbacks.
 * @param payload Unknown dashboard/history counter payload.
 */
function resolveRuntimeResourceDecodeStatusCounter(
  payload: unknown,
): RenderParityRuntimeResourceDecodeStatusCounter {
  if (!payload || typeof payload !== 'object') {
    return {
      queued: 0,
      decoding: 0,
      ready: 0,
      failed: 0,
      unknown: 0,
    }
  }

  const record = payload as Record<string, unknown>
  return {
    queued:
      typeof record.queued === 'number' && Number.isFinite(record.queued)
        ? record.queued
        : 0,
    decoding:
      typeof record.decoding === 'number' && Number.isFinite(record.decoding)
        ? record.decoding
        : 0,
    ready:
      typeof record.ready === 'number' && Number.isFinite(record.ready)
        ? record.ready
        : 0,
    failed:
      typeof record.failed === 'number' && Number.isFinite(record.failed)
        ? record.failed
        : 0,
    unknown:
      typeof record.unknown === 'number' && Number.isFinite(record.unknown)
        ? record.unknown
        : 0,
  }
}

/**
 * Resolves runtime resource compression-codec counter with legacy-safe fallbacks.
 * @param payload Unknown dashboard/history counter payload.
 */
function resolveRuntimeResourceCompressionCodecCounter(
  payload: unknown,
): RenderParityRuntimeResourceCompressionCodecCounter {
  if (!payload || typeof payload !== 'object') {
    return {
      none: 0,
      brotli: 0,
      gzip: 0,
      zstd: 0,
      lz4: 0,
      unknown: 0,
    }
  }

  const record = payload as Record<string, unknown>
  return {
    none:
      typeof record.none === 'number' && Number.isFinite(record.none)
        ? record.none
        : 0,
    brotli:
      typeof record.brotli === 'number' && Number.isFinite(record.brotli)
        ? record.brotli
        : 0,
    gzip:
      typeof record.gzip === 'number' && Number.isFinite(record.gzip)
        ? record.gzip
        : 0,
    zstd:
      typeof record.zstd === 'number' && Number.isFinite(record.zstd)
        ? record.zstd
        : 0,
    lz4:
      typeof record.lz4 === 'number' && Number.isFinite(record.lz4)
        ? record.lz4
        : 0,
    unknown:
      typeof record.unknown === 'number' && Number.isFinite(record.unknown)
        ? record.unknown
        : 0,
  }
}

/**
 * Reads and validates replay batch dashboard artifact.
 * @param dashboardPath Dashboard artifact path.
 */
export async function readReplayBatchDashboard(
  dashboardPath: string,
): Promise<RenderParityReplayBatchDashboardArtifact> {
  const raw = await readFile(dashboardPath, 'utf8')
  const parsed = JSON.parse(raw) as unknown
  if (!parsed || typeof parsed !== 'object') {
    throw new Error(`Dashboard JSON at ${dashboardPath} must be an object.`)
  }
  const record = parsed as Record<string, unknown>
  if (typeof record.generatedAt !== 'string' || !record.generatedAt) {
    throw new Error(`Dashboard JSON at ${dashboardPath} is missing generatedAt.`)
  }
  if (typeof record.outputDir !== 'string' || !record.outputDir) {
    throw new Error(`Dashboard JSON at ${dashboardPath} is missing outputDir.`)
  }
  if (typeof record.processedCount !== 'number' || !Number.isFinite(record.processedCount)) {
    throw new Error(`Dashboard JSON at ${dashboardPath} is missing finite processedCount.`)
  }
  const trendCounter = record.trendCounter
  if (!trendCounter || typeof trendCounter !== 'object') {
    throw new Error(`Dashboard JSON at ${dashboardPath} is missing trendCounter.`)
  }
  const trendRecord = trendCounter as Record<string, unknown>
  const keys: Array<keyof RenderParityTrendCounter> = [
    'improved',
    'regressed',
    'mixed',
    'unchanged',
    'unknown',
  ]
  for (const key of keys) {
    if (typeof trendRecord[key] !== 'number' || !Number.isFinite(trendRecord[key])) {
      throw new Error(`Dashboard JSON at ${dashboardPath} has invalid trendCounter.${key}.`)
    }
  }

  return {
    generatedAt: record.generatedAt,
    outputDir: record.outputDir,
    processedCount: record.processedCount,
    trendCounter: {
      improved: trendRecord.improved as number,
      regressed: trendRecord.regressed as number,
      mixed: trendRecord.mixed as number,
      unchanged: trendRecord.unchanged as number,
      unknown: trendRecord.unknown as number,
    },
    featureCapabilityGateCounter: resolveFeatureCapabilityGateCounter(
      record.featureCapabilityGateCounter,
    ),
    frameStageSchedulerModeCounter: resolveFrameStageSchedulerModeCounter(
      record.frameStageSchedulerModeCounter,
    ),
    frameStageSceneApplyModeCounter: resolveFrameStageSceneApplyModeCounter(
      record.frameStageSceneApplyModeCounter,
    ),
    runtimeResourceDecodeStatusCounter: resolveRuntimeResourceDecodeStatusCounter(
      record.runtimeResourceDecodeStatusCounter,
    ),
    runtimeResourceCompressionCodecCounter: resolveRuntimeResourceCompressionCodecCounter(
      record.runtimeResourceCompressionCodecCounter,
    ),
  }
}

/**
 * Reads replay history artifact when available, otherwise returns an empty seed payload.
 * @param historyFilePath History artifact path.
 * @param windowSize Window size for seed payload.
 */
export async function readReplayHistoryArtifact(
  historyFilePath: string,
  windowSize: number,
): Promise<RenderParityReplayHistoryArtifact> {
  try {
    const raw = await readFile(historyFilePath, 'utf8')
    const parsed = JSON.parse(raw) as unknown
    if (!parsed || typeof parsed !== 'object') {
      throw new Error(`History JSON at ${historyFilePath} must be an object.`)
    }
    const record = parsed as Record<string, unknown>
    const snapshots = Array.isArray(record.snapshots)
      ? (record.snapshots as unknown[]).map((row) => {
          const snapshotRecord = row as Record<string, unknown>
          return {
            generatedAt:
              typeof snapshotRecord.generatedAt === 'string'
                ? snapshotRecord.generatedAt
                : new Date().toISOString(),
            dashboardPath:
              typeof snapshotRecord.dashboardPath === 'string'
                ? snapshotRecord.dashboardPath
                : '',
            processedCount:
              typeof snapshotRecord.processedCount === 'number'
                ? snapshotRecord.processedCount
                : 0,
            trendCounter:
              snapshotRecord.trendCounter && typeof snapshotRecord.trendCounter === 'object'
                ? {
                    improved: Number((snapshotRecord.trendCounter as Record<string, unknown>).improved ?? 0),
                    regressed: Number((snapshotRecord.trendCounter as Record<string, unknown>).regressed ?? 0),
                    mixed: Number((snapshotRecord.trendCounter as Record<string, unknown>).mixed ?? 0),
                    unchanged: Number((snapshotRecord.trendCounter as Record<string, unknown>).unchanged ?? 0),
                    unknown: Number((snapshotRecord.trendCounter as Record<string, unknown>).unknown ?? 0),
                  }
                : {
                    improved: 0,
                    regressed: 0,
                    mixed: 0,
                    unchanged: 0,
                    unknown: 0,
                  },
            featureCapabilityGateCounter: resolveFeatureCapabilityGateCounter(
              snapshotRecord.featureCapabilityGateCounter,
            ),
            frameStageSchedulerModeCounter: resolveFrameStageSchedulerModeCounter(
              snapshotRecord.frameStageSchedulerModeCounter,
            ),
            frameStageSceneApplyModeCounter: resolveFrameStageSceneApplyModeCounter(
              snapshotRecord.frameStageSceneApplyModeCounter,
            ),
            runtimeResourceDecodeStatusCounter: resolveRuntimeResourceDecodeStatusCounter(
              snapshotRecord.runtimeResourceDecodeStatusCounter,
            ),
            runtimeResourceCompressionCodecCounter: resolveRuntimeResourceCompressionCodecCounter(
              snapshotRecord.runtimeResourceCompressionCodecCounter,
            ),
          } satisfies RenderParityReplayHistorySnapshot
        })
      : []
    return {
      updatedAt: typeof record.updatedAt === 'string' ? record.updatedAt : new Date().toISOString(),
      windowSize,
      totalSnapshots: snapshots.length,
      rollingTrendCounter: createRollingTrendCounter(snapshots),
      rollingFeatureCapabilityGateCounter: {
        ...createRollingFeatureCapabilityGateCounter(snapshots),
      },
      rollingFrameStageSchedulerModeCounter: {
        ...createRollingFrameStageSchedulerModeCounter(snapshots),
      },
      rollingFrameStageSceneApplyModeCounter: {
        ...createRollingFrameStageSceneApplyModeCounter(snapshots),
      },
      rollingRuntimeResourceDecodeStatusCounter: {
        ...createRollingRuntimeResourceDecodeStatusCounter(snapshots),
      },
      rollingRuntimeResourceCompressionCodecCounter: {
        ...createRollingRuntimeResourceCompressionCodecCounter(snapshots),
      },
      snapshots,
    }
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code
    if (code !== 'ENOENT') {
      throw error
    }
    return {
      updatedAt: new Date().toISOString(),
      windowSize,
      totalSnapshots: 0,
      rollingTrendCounter: {
        improved: 0,
        regressed: 0,
        mixed: 0,
        unchanged: 0,
        unknown: 0,
      },
      rollingFeatureCapabilityGateCounter: {
        webglKnownRejected: 0,
        webglUnknownRejected: 0,
        webgpuKnownRejected: 0,
        webgpuUnknownRejected: 0,
      },
      rollingFrameStageSchedulerModeCounter: {
        interactive: 0,
        normal: 0,
        unknown: 0,
      },
      rollingFrameStageSceneApplyModeCounter: {
        none: 0,
        fullLoad: 0,
        previewLoad: 0,
        incrementalPatch: 0,
        unknown: 0,
      },
      rollingRuntimeResourceDecodeStatusCounter: {
        queued: 0,
        decoding: 0,
        ready: 0,
        failed: 0,
        unknown: 0,
      },
      rollingRuntimeResourceCompressionCodecCounter: {
        none: 0,
        brotli: 0,
        gzip: 0,
        zstd: 0,
        lz4: 0,
        unknown: 0,
      },
      snapshots: [],
    }
  }
}

/**
 * Creates one rolling runtime resource decode-status counter from snapshot list.
 * @param snapshots Snapshot list.
 */
export function createRollingRuntimeResourceDecodeStatusCounter(
  snapshots: readonly RenderParityReplayHistorySnapshot[],
): RenderParityRuntimeResourceDecodeStatusCounter {
  const counter: RenderParityRuntimeResourceDecodeStatusCounter = {
    queued: 0,
    decoding: 0,
    ready: 0,
    failed: 0,
    unknown: 0,
  }

  for (const snapshot of snapshots) {
    const runtimeResourceDecodeStatusCounter = resolveRuntimeResourceDecodeStatusCounter(
      snapshot.runtimeResourceDecodeStatusCounter,
    )
    counter.queued += runtimeResourceDecodeStatusCounter.queued
    counter.decoding += runtimeResourceDecodeStatusCounter.decoding
    counter.ready += runtimeResourceDecodeStatusCounter.ready
    counter.failed += runtimeResourceDecodeStatusCounter.failed
    counter.unknown += runtimeResourceDecodeStatusCounter.unknown
  }

  return counter
}

/**
 * Creates one rolling runtime resource compression-codec counter from snapshot list.
 * @param snapshots Snapshot list.
 */
export function createRollingRuntimeResourceCompressionCodecCounter(
  snapshots: readonly RenderParityReplayHistorySnapshot[],
): RenderParityRuntimeResourceCompressionCodecCounter {
  const counter: RenderParityRuntimeResourceCompressionCodecCounter = {
    none: 0,
    brotli: 0,
    gzip: 0,
    zstd: 0,
    lz4: 0,
    unknown: 0,
  }

  for (const snapshot of snapshots) {
    const runtimeResourceCompressionCodecCounter = resolveRuntimeResourceCompressionCodecCounter(
      snapshot.runtimeResourceCompressionCodecCounter,
    )
    counter.none += runtimeResourceCompressionCodecCounter.none
    counter.brotli += runtimeResourceCompressionCodecCounter.brotli
    counter.gzip += runtimeResourceCompressionCodecCounter.gzip
    counter.zstd += runtimeResourceCompressionCodecCounter.zstd
    counter.lz4 += runtimeResourceCompressionCodecCounter.lz4
    counter.unknown += runtimeResourceCompressionCodecCounter.unknown
  }

  return counter
}

/**
 * Creates one rolling frame-stage scheduler mode counter from snapshot list.
 * @param snapshots Snapshot list.
 */
export function createRollingFrameStageSchedulerModeCounter(
  snapshots: readonly RenderParityReplayHistorySnapshot[],
): RenderParityFrameStageSchedulerModeCounter {
  const counter: RenderParityFrameStageSchedulerModeCounter = {
    interactive: 0,
    normal: 0,
    unknown: 0,
  }

  for (const snapshot of snapshots) {
    counter.interactive += snapshot.frameStageSchedulerModeCounter.interactive
    counter.normal += snapshot.frameStageSchedulerModeCounter.normal
    counter.unknown += snapshot.frameStageSchedulerModeCounter.unknown
  }

  return counter
}

/**
 * Creates one rolling frame-stage scene-apply mode counter from snapshot list.
 * @param snapshots Snapshot list.
 */
export function createRollingFrameStageSceneApplyModeCounter(
  snapshots: readonly RenderParityReplayHistorySnapshot[],
): RenderParityFrameStageSceneApplyModeCounter {
  const counter: RenderParityFrameStageSceneApplyModeCounter = {
    none: 0,
    fullLoad: 0,
    previewLoad: 0,
    incrementalPatch: 0,
    unknown: 0,
  }

  for (const snapshot of snapshots) {
    counter.none += snapshot.frameStageSceneApplyModeCounter.none
    counter.fullLoad += snapshot.frameStageSceneApplyModeCounter.fullLoad
    counter.previewLoad += snapshot.frameStageSceneApplyModeCounter.previewLoad
    counter.incrementalPatch += snapshot.frameStageSceneApplyModeCounter.incrementalPatch
    counter.unknown += snapshot.frameStageSceneApplyModeCounter.unknown
  }

  return counter
}

/**
 * Creates one rolling feature-capability counter from snapshot list.
 * @param snapshots Snapshot list.
 */
export function createRollingFeatureCapabilityGateCounter(
  snapshots: readonly RenderParityReplayHistorySnapshot[],
): RenderParityFeatureCapabilityGateCounter {
  const counter: RenderParityFeatureCapabilityGateCounter = {
    webglKnownRejected: 0,
    webglUnknownRejected: 0,
    webgpuKnownRejected: 0,
    webgpuUnknownRejected: 0,
  }

  for (const snapshot of snapshots) {
    counter.webglKnownRejected += snapshot.featureCapabilityGateCounter.webglKnownRejected
    counter.webglUnknownRejected += snapshot.featureCapabilityGateCounter.webglUnknownRejected
    counter.webgpuKnownRejected += snapshot.featureCapabilityGateCounter.webgpuKnownRejected
    counter.webgpuUnknownRejected += snapshot.featureCapabilityGateCounter.webgpuUnknownRejected
  }

  return counter
}

/**
 * Creates one rolling trend counter from snapshot list.
 * @param snapshots Snapshot list.
 */
export function createRollingTrendCounter(
  snapshots: readonly RenderParityReplayHistorySnapshot[],
): RenderParityTrendCounter {
  const counter: RenderParityTrendCounter = {
    improved: 0,
    regressed: 0,
    mixed: 0,
    unchanged: 0,
    unknown: 0,
  }

  for (const snapshot of snapshots) {
    counter.improved += snapshot.trendCounter.improved
    counter.regressed += snapshot.trendCounter.regressed
    counter.mixed += snapshot.trendCounter.mixed
    counter.unchanged += snapshot.trendCounter.unchanged
    counter.unknown += snapshot.trendCounter.unknown
  }

  return counter
}

/**
 * Appends one latest dashboard snapshot and trims to retention window size.
 * @param previousHistory Previous history artifact.
 * @param dashboardPath Dashboard artifact path.
 * @param dashboard Latest dashboard payload.
 */
export function createNextReplayHistory(
  previousHistory: RenderParityReplayHistoryArtifact,
  dashboardPath: string,
  dashboard: RenderParityReplayBatchDashboardArtifact,
): RenderParityReplayHistoryArtifact {
  const snapshot: RenderParityReplayHistorySnapshot = {
    generatedAt: dashboard.generatedAt,
    dashboardPath: path.resolve(dashboardPath),
    processedCount: dashboard.processedCount,
    trendCounter: dashboard.trendCounter,
    featureCapabilityGateCounter: dashboard.featureCapabilityGateCounter,
    frameStageSchedulerModeCounter: dashboard.frameStageSchedulerModeCounter,
    frameStageSceneApplyModeCounter: dashboard.frameStageSceneApplyModeCounter,
    runtimeResourceDecodeStatusCounter: resolveRuntimeResourceDecodeStatusCounter(
      dashboard.runtimeResourceDecodeStatusCounter,
    ),
    runtimeResourceCompressionCodecCounter: resolveRuntimeResourceCompressionCodecCounter(
      dashboard.runtimeResourceCompressionCodecCounter,
    ),
  }

  // Keep only one snapshot per generatedAt key so repeated replay on same artifact remains deterministic.
  const merged = [...previousHistory.snapshots.filter((row) => row.generatedAt !== snapshot.generatedAt), snapshot]
    .sort((left, right) => left.generatedAt.localeCompare(right.generatedAt))
    .slice(-previousHistory.windowSize)

  return {
    updatedAt: new Date().toISOString(),
    windowSize: previousHistory.windowSize,
    totalSnapshots: merged.length,
    rollingTrendCounter: createRollingTrendCounter(merged),
    rollingFeatureCapabilityGateCounter: createRollingFeatureCapabilityGateCounter(merged),
    rollingFrameStageSchedulerModeCounter: createRollingFrameStageSchedulerModeCounter(merged),
    rollingFrameStageSceneApplyModeCounter: createRollingFrameStageSceneApplyModeCounter(merged),
    rollingRuntimeResourceDecodeStatusCounter: createRollingRuntimeResourceDecodeStatusCounter(merged),
    rollingRuntimeResourceCompressionCodecCounter: createRollingRuntimeResourceCompressionCodecCounter(merged),
    snapshots: merged,
  }
}

/**
 * Evaluates gate status from latest snapshot and configured thresholds.
 * @param sourceDashboardPath Source dashboard path.
 * @param thresholds Gate thresholds.
 * @param latestSnapshot Latest snapshot row.
 * @param rollingTrendCounter Rolling trend counter.
 * @param rollingFeatureCapabilityGateCounter Rolling feature-capability counter.
 * @param rollingFrameStageSchedulerModeCounter Rolling scheduler-mode counter.
 * @param rollingFrameStageSceneApplyModeCounter Rolling scene-apply-mode counter.
 * @param rollingRuntimeResourceDecodeStatusCounter Rolling runtime resource decode-status counter.
 * @param rollingRuntimeResourceCompressionCodecCounter Rolling runtime resource compression-codec counter.
 */
export function createReplayGateArtifact(
  sourceDashboardPath: string,
  thresholds: RenderParityReplayGateThresholds,
  latestSnapshot: RenderParityReplayHistorySnapshot,
  rollingTrendCounter: RenderParityTrendCounter,
  rollingFeatureCapabilityGateCounter: RenderParityFeatureCapabilityGateCounter,
  rollingFrameStageSchedulerModeCounter: RenderParityFrameStageSchedulerModeCounter,
  rollingFrameStageSceneApplyModeCounter: RenderParityFrameStageSceneApplyModeCounter,
  rollingRuntimeResourceDecodeStatusCounter: RenderParityRuntimeResourceDecodeStatusCounter = {
    queued: 0,
    decoding: 0,
    ready: 0,
    failed: 0,
    unknown: 0,
  },
  rollingRuntimeResourceCompressionCodecCounter: RenderParityRuntimeResourceCompressionCodecCounter = {
    none: 0,
    brotli: 0,
    gzip: 0,
    zstd: 0,
    lz4: 0,
    unknown: 0,
  },
): RenderParityReplayGateArtifact {
  const failures: RenderParityReplayGateFailure[] = []
  const latestRuntimeResourceDecodeStatusCounter = resolveRuntimeResourceDecodeStatusCounter(
    latestSnapshot.runtimeResourceDecodeStatusCounter,
  )
  const latestRuntimeResourceCompressionCodecCounter = resolveRuntimeResourceCompressionCodecCounter(
    latestSnapshot.runtimeResourceCompressionCodecCounter,
  )
  const latestStageSchedulerModeCounter = resolveFrameStageSchedulerModeCounter(
    latestSnapshot.frameStageSchedulerModeCounter,
  )
  const latestStageSceneApplyModeCounter = resolveFrameStageSceneApplyModeCounter(
    latestSnapshot.frameStageSceneApplyModeCounter,
  )
  const stageUnknownRatePercentSummary = createStageUnknownRatePercentSummary(
    latestStageSchedulerModeCounter,
    latestStageSceneApplyModeCounter,
    rollingFrameStageSchedulerModeCounter,
    rollingFrameStageSceneApplyModeCounter,
  )
  const stageUnknownRateViolationSummary = createStageUnknownRateViolationSummary(
    stageUnknownRatePercentSummary,
    thresholds,
  )
  const resourceUnknownRatePercentSummary = createResourceUnknownRatePercentSummary(
    latestRuntimeResourceDecodeStatusCounter,
    latestRuntimeResourceCompressionCodecCounter,
    rollingRuntimeResourceDecodeStatusCounter,
    rollingRuntimeResourceCompressionCodecCounter,
  )
  const resourceUnknownRateViolationSummary = createResourceUnknownRateViolationSummary(
    resourceUnknownRatePercentSummary,
    thresholds,
  )

  if (latestSnapshot.processedCount < thresholds.minProcessedCount) {
    failures.push({
      code: 'RP_GATE_LATEST_PROCESSED_COUNT',
      message:
        `processedCount ${latestSnapshot.processedCount} is below minProcessedCount ${thresholds.minProcessedCount}`,
    })
  }
  if (latestSnapshot.trendCounter.regressed > thresholds.maxRegressed) {
    failures.push({
      code: 'RP_GATE_LATEST_REGRESSED',
      message:
        `regressed ${latestSnapshot.trendCounter.regressed} exceeds maxRegressed ${thresholds.maxRegressed}`,
    })
  }
  if (latestSnapshot.trendCounter.mixed > thresholds.maxMixed) {
    failures.push({
      code: 'RP_GATE_LATEST_MIXED',
      message: `mixed ${latestSnapshot.trendCounter.mixed} exceeds maxMixed ${thresholds.maxMixed}`,
    })
  }
  if (latestSnapshot.trendCounter.unknown > thresholds.maxUnknown) {
    failures.push({
      code: 'RP_GATE_LATEST_UNKNOWN',
      message:
        `unknown ${latestSnapshot.trendCounter.unknown} exceeds maxUnknown ${thresholds.maxUnknown}`,
    })
  }
  if (
    typeof thresholds.maxRollingRegressed === 'number'
    && rollingTrendCounter.regressed > thresholds.maxRollingRegressed
  ) {
    failures.push({
      code: 'RP_GATE_ROLLING_REGRESSED',
      message:
        `rolling regressed ${rollingTrendCounter.regressed} exceeds maxRollingRegressed ${thresholds.maxRollingRegressed}`,
    })
  }
  if (
    typeof thresholds.maxRollingMixed === 'number'
    && rollingTrendCounter.mixed > thresholds.maxRollingMixed
  ) {
    failures.push({
      code: 'RP_GATE_ROLLING_MIXED',
      message:
        `rolling mixed ${rollingTrendCounter.mixed} exceeds maxRollingMixed ${thresholds.maxRollingMixed}`,
    })
  }
  if (
    typeof thresholds.maxRollingUnknown === 'number'
    && rollingTrendCounter.unknown > thresholds.maxRollingUnknown
  ) {
    failures.push({
      code: 'RP_GATE_ROLLING_UNKNOWN',
      message:
        `rolling unknown ${rollingTrendCounter.unknown} exceeds maxRollingUnknown ${thresholds.maxRollingUnknown}`,
    })
  }
  if (
    typeof thresholds.maxWebglFeatureUnknown === 'number'
    && latestSnapshot.featureCapabilityGateCounter.webglUnknownRejected > thresholds.maxWebglFeatureUnknown
  ) {
    failures.push({
      code: 'RP_GATE_LATEST_WEBGL_FEATURE_UNKNOWN',
      message:
        `latest webgl feature unknown ${latestSnapshot.featureCapabilityGateCounter.webglUnknownRejected} exceeds maxWebglFeatureUnknown ${thresholds.maxWebglFeatureUnknown}`,
    })
  }
  if (
    typeof thresholds.maxWebgpuFeatureUnknown === 'number'
    && latestSnapshot.featureCapabilityGateCounter.webgpuUnknownRejected > thresholds.maxWebgpuFeatureUnknown
  ) {
    failures.push({
      code: 'RP_GATE_LATEST_WEBGPU_FEATURE_UNKNOWN',
      message:
        `latest webgpu feature unknown ${latestSnapshot.featureCapabilityGateCounter.webgpuUnknownRejected} exceeds maxWebgpuFeatureUnknown ${thresholds.maxWebgpuFeatureUnknown}`,
    })
  }
  if (
    typeof thresholds.maxRollingWebglFeatureUnknown === 'number'
    && rollingFeatureCapabilityGateCounter.webglUnknownRejected > thresholds.maxRollingWebglFeatureUnknown
  ) {
    failures.push({
      code: 'RP_GATE_ROLLING_WEBGL_FEATURE_UNKNOWN',
      message:
        `rolling webgl feature unknown ${rollingFeatureCapabilityGateCounter.webglUnknownRejected} exceeds maxRollingWebglFeatureUnknown ${thresholds.maxRollingWebglFeatureUnknown}`,
    })
  }
  if (
    typeof thresholds.maxRollingWebgpuFeatureUnknown === 'number'
    && rollingFeatureCapabilityGateCounter.webgpuUnknownRejected > thresholds.maxRollingWebgpuFeatureUnknown
  ) {
    failures.push({
      code: 'RP_GATE_ROLLING_WEBGPU_FEATURE_UNKNOWN',
      message:
        `rolling webgpu feature unknown ${rollingFeatureCapabilityGateCounter.webgpuUnknownRejected} exceeds maxRollingWebgpuFeatureUnknown ${thresholds.maxRollingWebgpuFeatureUnknown}`,
    })
  }
  if (
    typeof thresholds.maxResourceDecodeUnknown === 'number'
    && latestRuntimeResourceDecodeStatusCounter.unknown > thresholds.maxResourceDecodeUnknown
  ) {
    failures.push({
      code: 'RP_GATE_LATEST_RESOURCE_DECODE_UNKNOWN',
      message:
        `latest runtime resource decode unknown ${latestRuntimeResourceDecodeStatusCounter.unknown} exceeds maxResourceDecodeUnknown ${thresholds.maxResourceDecodeUnknown}`,
    })
  }
  if (
    typeof thresholds.maxResourceCompressionUnknown === 'number'
    && latestRuntimeResourceCompressionCodecCounter.unknown > thresholds.maxResourceCompressionUnknown
  ) {
    failures.push({
      code: 'RP_GATE_LATEST_RESOURCE_COMPRESSION_UNKNOWN',
      message:
        `latest runtime resource compression unknown ${latestRuntimeResourceCompressionCodecCounter.unknown} exceeds maxResourceCompressionUnknown ${thresholds.maxResourceCompressionUnknown}`,
    })
  }
  if (
    typeof thresholds.maxRollingResourceDecodeUnknown === 'number'
    && rollingRuntimeResourceDecodeStatusCounter.unknown > thresholds.maxRollingResourceDecodeUnknown
  ) {
    failures.push({
      code: 'RP_GATE_ROLLING_RESOURCE_DECODE_UNKNOWN',
      message:
        `rolling runtime resource decode unknown ${rollingRuntimeResourceDecodeStatusCounter.unknown} exceeds maxRollingResourceDecodeUnknown ${thresholds.maxRollingResourceDecodeUnknown}`,
    })
  }
  if (
    typeof thresholds.maxRollingResourceCompressionUnknown === 'number'
    && rollingRuntimeResourceCompressionCodecCounter.unknown > thresholds.maxRollingResourceCompressionUnknown
  ) {
    failures.push({
      code: 'RP_GATE_ROLLING_RESOURCE_COMPRESSION_UNKNOWN',
      message:
        `rolling runtime resource compression unknown ${rollingRuntimeResourceCompressionCodecCounter.unknown} exceeds maxRollingResourceCompressionUnknown ${thresholds.maxRollingResourceCompressionUnknown}`,
    })
  }
  if (resourceUnknownRateViolationSummary.latestResourceDecode.exceeded) {
    failures.push({
      code: 'RP_GATE_LATEST_RESOURCE_DECODE_UNKNOWN_RATE',
      message:
        `latest runtime resource decode unknown rate ${resourceUnknownRateViolationSummary.latestResourceDecode.actualRatePercent.toFixed(2)} exceeds maxResourceDecodeUnknownRatePercent ${resourceUnknownRateViolationSummary.latestResourceDecode.thresholdRatePercent}`,
    })
  }
  if (resourceUnknownRateViolationSummary.latestResourceCompression.exceeded) {
    failures.push({
      code: 'RP_GATE_LATEST_RESOURCE_COMPRESSION_UNKNOWN_RATE',
      message:
        `latest runtime resource compression unknown rate ${resourceUnknownRateViolationSummary.latestResourceCompression.actualRatePercent.toFixed(2)} exceeds maxResourceCompressionUnknownRatePercent ${resourceUnknownRateViolationSummary.latestResourceCompression.thresholdRatePercent}`,
    })
  }
  if (resourceUnknownRateViolationSummary.rollingResourceDecode.exceeded) {
    failures.push({
      code: 'RP_GATE_ROLLING_RESOURCE_DECODE_UNKNOWN_RATE',
      message:
        `rolling runtime resource decode unknown rate ${resourceUnknownRateViolationSummary.rollingResourceDecode.actualRatePercent.toFixed(2)} exceeds maxRollingResourceDecodeUnknownRatePercent ${resourceUnknownRateViolationSummary.rollingResourceDecode.thresholdRatePercent}`,
    })
  }
  if (resourceUnknownRateViolationSummary.rollingResourceCompression.exceeded) {
    failures.push({
      code: 'RP_GATE_ROLLING_RESOURCE_COMPRESSION_UNKNOWN_RATE',
      message:
        `rolling runtime resource compression unknown rate ${resourceUnknownRateViolationSummary.rollingResourceCompression.actualRatePercent.toFixed(2)} exceeds maxRollingResourceCompressionUnknownRatePercent ${resourceUnknownRateViolationSummary.rollingResourceCompression.thresholdRatePercent}`,
    })
  }
  if (
    typeof thresholds.maxStageSchedulerUnknown === 'number'
    && latestStageSchedulerModeCounter.unknown > thresholds.maxStageSchedulerUnknown
  ) {
    failures.push({
      code: 'RP_GATE_LATEST_STAGE_SCHEDULER_UNKNOWN',
      message:
        `latest stage scheduler unknown ${latestStageSchedulerModeCounter.unknown} exceeds maxStageSchedulerUnknown ${thresholds.maxStageSchedulerUnknown}`,
    })
  }
  if (
    typeof thresholds.maxStageSceneApplyUnknown === 'number'
    && latestStageSceneApplyModeCounter.unknown > thresholds.maxStageSceneApplyUnknown
  ) {
    failures.push({
      code: 'RP_GATE_LATEST_STAGE_SCENE_APPLY_UNKNOWN',
      message:
        `latest stage scene-apply unknown ${latestStageSceneApplyModeCounter.unknown} exceeds maxStageSceneApplyUnknown ${thresholds.maxStageSceneApplyUnknown}`,
    })
  }
  if (
    typeof thresholds.maxRollingStageSchedulerUnknown === 'number'
    && rollingFrameStageSchedulerModeCounter.unknown > thresholds.maxRollingStageSchedulerUnknown
  ) {
    failures.push({
      code: 'RP_GATE_ROLLING_STAGE_SCHEDULER_UNKNOWN',
      message:
        `rolling stage scheduler unknown ${rollingFrameStageSchedulerModeCounter.unknown} exceeds maxRollingStageSchedulerUnknown ${thresholds.maxRollingStageSchedulerUnknown}`,
    })
  }
  if (
    typeof thresholds.maxRollingStageSceneApplyUnknown === 'number'
    && rollingFrameStageSceneApplyModeCounter.unknown > thresholds.maxRollingStageSceneApplyUnknown
  ) {
    failures.push({
      code: 'RP_GATE_ROLLING_STAGE_SCENE_APPLY_UNKNOWN',
      message:
        `rolling stage scene-apply unknown ${rollingFrameStageSceneApplyModeCounter.unknown} exceeds maxRollingStageSceneApplyUnknown ${thresholds.maxRollingStageSceneApplyUnknown}`,
    })
  }
  if (stageUnknownRateViolationSummary.latestStageScheduler.exceeded) {
    failures.push({
      code: 'RP_GATE_LATEST_STAGE_SCHEDULER_UNKNOWN_RATE',
      message:
        `latest stage scheduler unknown rate ${stageUnknownRateViolationSummary.latestStageScheduler.actualRatePercent.toFixed(2)} exceeds maxStageSchedulerUnknownRatePercent ${stageUnknownRateViolationSummary.latestStageScheduler.thresholdRatePercent}`,
    })
  }
  if (stageUnknownRateViolationSummary.latestStageSceneApply.exceeded) {
    failures.push({
      code: 'RP_GATE_LATEST_STAGE_SCENE_APPLY_UNKNOWN_RATE',
      message:
        `latest stage scene-apply unknown rate ${stageUnknownRateViolationSummary.latestStageSceneApply.actualRatePercent.toFixed(2)} exceeds maxStageSceneApplyUnknownRatePercent ${stageUnknownRateViolationSummary.latestStageSceneApply.thresholdRatePercent}`,
    })
  }
  if (stageUnknownRateViolationSummary.rollingStageScheduler.exceeded) {
    failures.push({
      code: 'RP_GATE_ROLLING_STAGE_SCHEDULER_UNKNOWN_RATE',
      message:
        `rolling stage scheduler unknown rate ${stageUnknownRateViolationSummary.rollingStageScheduler.actualRatePercent.toFixed(2)} exceeds maxRollingStageSchedulerUnknownRatePercent ${stageUnknownRateViolationSummary.rollingStageScheduler.thresholdRatePercent}`,
    })
  }
  if (stageUnknownRateViolationSummary.rollingStageSceneApply.exceeded) {
    failures.push({
      code: 'RP_GATE_ROLLING_STAGE_SCENE_APPLY_UNKNOWN_RATE',
      message:
        `rolling stage scene-apply unknown rate ${stageUnknownRateViolationSummary.rollingStageSceneApply.actualRatePercent.toFixed(2)} exceeds maxRollingStageSceneApplyUnknownRatePercent ${stageUnknownRateViolationSummary.rollingStageSceneApply.thresholdRatePercent}`,
    })
  }

  const reasons = failures.map((failure) => failure.message)

  return {
    generatedAt: new Date().toISOString(),
    sourceDashboardPath: path.resolve(sourceDashboardPath),
    status: failures.length > 0 ? 'fail' : 'pass',
    reasons,
    failures,
    thresholds,
    latestSnapshot,
    rollingTrendCounter,
    rollingFeatureCapabilityGateCounter,
    rollingFrameStageSchedulerModeCounter,
    rollingFrameStageSceneApplyModeCounter,
    rollingRuntimeResourceDecodeStatusCounter,
    rollingRuntimeResourceCompressionCodecCounter,
    stageUnknownRatePercentSummary,
    stageUnknownRateViolationSummary,
    resourceUnknownRatePercentSummary,
    resourceUnknownRateViolationSummary,
  }
}

/**
 * Executes replay history and gate pipeline from one replay dashboard artifact.
 * @param options Replay history + gate execution options.
 */
export async function runRenderParityRuntimeReplayHistoryGate(
  options: RenderParityReplayHistoryGateCliOptions,
): Promise<RenderParityReplayHistoryGateRunResult> {
  const dashboard = await readReplayBatchDashboard(options.dashboardPath)
  const previousHistory = await readReplayHistoryArtifact(options.historyFilePath, options.windowSize)
  const nextHistory = createNextReplayHistory(previousHistory, options.dashboardPath, dashboard)
  const latestSnapshot = nextHistory.snapshots[nextHistory.snapshots.length - 1]
  if (!latestSnapshot) {
    throw new Error('Replay history must contain at least one snapshot after update.')
  }

  const gateArtifact = createReplayGateArtifact(
    options.dashboardPath,
    options.thresholds,
    latestSnapshot,
    nextHistory.rollingTrendCounter,
    nextHistory.rollingFeatureCapabilityGateCounter,
    nextHistory.rollingFrameStageSchedulerModeCounter,
    nextHistory.rollingFrameStageSceneApplyModeCounter,
    nextHistory.rollingRuntimeResourceDecodeStatusCounter,
    nextHistory.rollingRuntimeResourceCompressionCodecCounter,
  )

  const historyFilePath = path.resolve(options.historyFilePath)
  const gateOutputPath = path.resolve(options.gateOutputPath)
  await writeFile(historyFilePath, `${JSON.stringify(nextHistory, null, 2)}\n`, 'utf8')
  await writeFile(gateOutputPath, `${JSON.stringify(gateArtifact, null, 2)}\n`, 'utf8')

  return {
    historyFilePath,
    gateOutputPath,
    historyArtifact: nextHistory,
    gateArtifact,
  }
}

/**
 * Executes CLI flow for replay history and gate generation.
 */
async function main() {
  const options = parseCliOptions(process.argv.slice(2))
  const result = await runRenderParityRuntimeReplayHistoryGate(options)

  console.log('[render-parity] runtime replay history gate generated')
  console.log(`dashboard: ${path.resolve(options.dashboardPath)}`)
  console.log(`history: ${result.historyFilePath}`)
  console.log(`gate: ${result.gateOutputPath}`)
  console.log(`snapshots: ${result.historyArtifact.totalSnapshots}`)
  console.log(`status: ${result.gateArtifact.status}`)
  if (result.gateArtifact.reasons.length > 0) {
    console.log(`reasons: ${result.gateArtifact.reasons.join(' | ')}`)
    console.log(`codes: ${result.gateArtifact.failures.map((failure) => failure.code).join(',')}`)
  }
  if (result.gateArtifact.status === 'fail') {
    const unknownRateSummaryLines = createUnknownRateCliSummaryLogLines(result.gateArtifact)
    for (const line of unknownRateSummaryLines) {
      console.log(line.text)
    }
  }

  // Allow CI callers to fail fast on gate status without parsing JSON artifacts.
  if (options.failOnStatus && result.gateArtifact.status === 'fail') {
    process.exitCode = 1
  }
}

/**
 * Resolves whether this module was launched directly as the CLI entrypoint.
 * @param argvEntry First positional process argv entry.
 * @param moduleUrl Current module URL.
 */
function shouldExecuteCliMain(argvEntry: string | undefined, moduleUrl: string): boolean {
  if (!argvEntry) {
    return false
  }
  return pathToFileURL(argvEntry).href === moduleUrl
}

if (shouldExecuteCliMain(process.argv[1], import.meta.url)) {
  main().catch((error) => {
    console.error('[render-parity] runtime replay history gate failed')
    console.error(error)
    process.exitCode = 1
  })
}
