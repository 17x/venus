import {mkdir, readFile, readdir, writeFile} from 'node:fs/promises'
import path from 'node:path'
import {pathToFileURL} from 'node:url'

import {
  runRenderParityRuntimeAutoReport,
  type RenderParityRuntimeAutoRunResult,
} from './render-parity-runtime-auto-report.ts'
import {
  createFrameStageCounterSetFromRecords,
  createFrameStageSceneApplyModeAggregateCounter,
  createFrameStageSchedulerModeAggregateCounter,
  type RenderParityFrameStageCounterSet,
  type RenderParityFrameStageSceneApplyModeCounter,
  type RenderParityFrameStageSchedulerModeCounter,
} from './render-parity-runtime-replay-batch-frame-stage-counters.ts'
import {
  createRuntimeResourceCompressionCodecAggregateCounter,
  createRuntimeResourceCounterSetFromRecords,
  createRuntimeResourceDecodeStatusAggregateCounter,
  type RenderParityRuntimeResourceCompressionCodecCounter,
  type RenderParityRuntimeResourceCounterSet,
  type RenderParityRuntimeResourceDecodeStatusCounter,
} from './render-parity-runtime-replay-batch-resource-counters.ts'

/**
 * Declares CLI options for batched replay execution.
 */
interface RenderParityRuntimeReplayBatchCliOptions {
  /** Stores directory that contains runtime diagnostics export JSON files. */
  inputDir: string
  /** Stores output directory for generated report artifacts. */
  outputDir: string
  /** Stores label prefix used for per-input replay runs. */
  labelPrefix: string
  /** Stores output dashboard JSON path. */
  dashboardOutputPath: string
}

/**
 * Declares one batched replay row in dashboard output.
 */
interface RenderParityRuntimeReplayBatchRow {
  /** Stores source runtime diagnostics input path. */
  inputPath: string
  /** Stores effective replay label used by auto-report run. */
  label: string
  /** Stores generated report timestamp. */
  generatedAt: string
  /** Stores sample count for this replay run. */
  sampleCount: number
  /** Stores path to generated summary artifact. */
  summaryPath: string
  /** Stores path to generated diff artifact, if available. */
  diffPath: string | null
  /** Stores path to generated trend artifact, if available. */
  trendPath: string | null
  /** Stores replay baseline path for this replay label. */
  replayBaselinePath: string | null
  /** Marks whether this run bootstrapped replay baseline. */
  replayBaselineBootstrapped: boolean
  /** Stores overall trend signal when diff exists. */
  overallTrend: string | null
  /** Stores dominant WebGL feature capability gate reason for this run. */
  webglDominantFeatureCapabilityGate: string | null
  /** Stores dominant WebGPU feature capability gate reason for this run. */
  webgpuDominantFeatureCapabilityGate: string | null
  /** Stores known WebGL feature capability gate reject count for this run. */
  webglFeatureCapabilityKnownRejectedCount: number
  /** Stores unknown WebGL feature capability gate reject count for this run. */
  webglFeatureCapabilityUnknownRejectedCount: number
  /** Stores known WebGPU feature capability gate reject count for this run. */
  webgpuFeatureCapabilityKnownRejectedCount: number
  /** Stores unknown WebGPU feature capability gate reject count for this run. */
  webgpuFeatureCapabilityUnknownRejectedCount: number
  /** Stores frame-stage scheduler mode distribution for this run. */
  frameStageSchedulerModeCounter: RenderParityFrameStageSchedulerModeCounter
  /** Stores frame-stage scene-apply mode distribution for this run. */
  frameStageSceneApplyModeCounter: RenderParityFrameStageSceneApplyModeCounter
  /** Stores runtime resource decode-status distribution for this run. */
  runtimeResourceDecodeStatusCounter: RenderParityRuntimeResourceDecodeStatusCounter
  /** Stores runtime resource compression-codec distribution for this run. */
  runtimeResourceCompressionCodecCounter: RenderParityRuntimeResourceCompressionCodecCounter
}

/**
 * Declares one aggregate feature-capability gate counter payload for replay batch dashboard.
 */
interface RenderParityFeatureCapabilityGateCounter {
  /** Stores known WebGL feature capability gate reject total across rows. */
  webglKnownRejected: number
  /** Stores unknown WebGL feature capability gate reject total across rows. */
  webglUnknownRejected: number
  /** Stores known WebGPU feature capability gate reject total across rows. */
  webgpuKnownRejected: number
  /** Stores unknown WebGPU feature capability gate reject total across rows. */
  webgpuUnknownRejected: number
}

/**
 * Declares dashboard payload for batched replay execution.
 */
interface RenderParityRuntimeReplayBatchDashboard {
  /** Stores dashboard creation timestamp. */
  generatedAt: string
  /** Stores absolute input directory path used by this batch run. */
  inputDir: string
  /** Stores absolute output directory path used by this batch run. */
  outputDir: string
  /** Stores row count of processed diagnostics inputs. */
  processedCount: number
  /** Stores aggregate overall trend counters. */
  trendCounter: {
    /** Stores number of improved rows. */
    improved: number
    /** Stores number of regressed rows. */
    regressed: number
    /** Stores number of mixed rows. */
    mixed: number
    /** Stores number of unchanged rows. */
    unchanged: number
    /** Stores number of rows without diff signal (baseline bootstrap). */
    unknown: number
  }
  /** Stores aggregate feature-capability gate reject counters. */
  featureCapabilityGateCounter: RenderParityFeatureCapabilityGateCounter
  /** Stores aggregate frame-stage scheduler mode distribution. */
  frameStageSchedulerModeCounter: RenderParityFrameStageSchedulerModeCounter
  /** Stores aggregate frame-stage scene-apply mode distribution. */
  frameStageSceneApplyModeCounter: RenderParityFrameStageSceneApplyModeCounter
  /** Stores aggregate runtime resource decode-status distribution. */
  runtimeResourceDecodeStatusCounter: RenderParityRuntimeResourceDecodeStatusCounter
  /** Stores aggregate runtime resource compression-codec distribution. */
  runtimeResourceCompressionCodecCounter: RenderParityRuntimeResourceCompressionCodecCounter
  /** Stores one row per processed diagnostics input. */
  rows: RenderParityRuntimeReplayBatchRow[]
}

/**
 * Declares combined counter set resolved from one runtime diagnostics input file.
 */
interface RenderParityReplayInputCounterSet {
  /** Stores frame-stage counter set for this input. */
  frameStageCounterSet: RenderParityFrameStageCounterSet
  /** Stores runtime-resource counter set for this input. */
  runtimeResourceCounterSet: RenderParityRuntimeResourceCounterSet
}

/**
 * Declares replay batch execution result payload.
 */
export interface RenderParityRuntimeReplayBatchRunResult {
  /** Stores persisted dashboard output path. */
  dashboardOutputPath: string
  /** Stores dashboard payload written by this run. */
  dashboard: RenderParityRuntimeReplayBatchDashboard
}

/**
 * Parses one required string flag and validates presence.
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
 * Parses CLI arguments into batch replay options.
 * @param argv Process argument array.
 */
function parseCliOptions(argv: readonly string[]): RenderParityRuntimeReplayBatchCliOptions {
  const inputDir = resolveRequiredStringFlag(argv, '--input-dir')
  const outputDir =
    resolveOptionalStringFlag(argv, '--output-dir')
    ?? './docs/product-requirements/render-parity-reports'
  const labelPrefix = resolveOptionalStringFlag(argv, '--label-prefix') ?? 'runtime-replay'
  const dashboardOutputPath =
    resolveOptionalStringFlag(argv, '--dashboard-output')
    ?? path.resolve(outputDir, `${labelPrefix}.batch.dashboard.json`)

  return {
    inputDir,
    outputDir,
    labelPrefix,
    dashboardOutputPath,
  }
}

/**
 * Resolves deterministic replay label from one diagnostics file path.
 * @param labelPrefix Label prefix from CLI.
 * @param fileName Diagnostics file name.
 */
export function createReplayLabel(labelPrefix: string, fileName: string): string {
  const suffix = '.json'
  const stem = fileName.toLowerCase().endsWith(suffix)
    ? fileName.slice(0, fileName.length - suffix.length)
    : fileName
  return `${labelPrefix}-${stem}`
}

/**
 * Discovers runtime diagnostics JSON file paths in deterministic order.
 * @param inputDir Input directory path.
 */
export async function resolveRuntimeDiagnosticsPaths(inputDir: string): Promise<string[]> {
  const entries = await readdir(inputDir, {withFileTypes: true})
  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith('.json'))
    .map((entry) => path.resolve(inputDir, entry.name))
    .sort((left, right) => left.localeCompare(right))
}

/**
 * Builds one aggregate trend counter from processed batch rows.
 * @param rows Processed replay rows.
 */
export function createTrendCounter(rows: readonly RenderParityRuntimeReplayBatchRow[]): {
  improved: number
  regressed: number
  mixed: number
  unchanged: number
  unknown: number
} {
  const trendCounter = {
    improved: 0,
    regressed: 0,
    mixed: 0,
    unchanged: 0,
    unknown: 0,
  }

  for (const row of rows) {
    if (!row.overallTrend) {
      trendCounter.unknown += 1
      continue
    }
    trendCounter[row.overallTrend as keyof Omit<typeof trendCounter, 'unknown'>] += 1
  }

  return trendCounter
}

/**
 * Builds one aggregate feature-capability gate counter from processed batch rows.
 * @param rows Processed replay rows.
 */
function createFeatureCapabilityGateCounter(
  rows: readonly RenderParityRuntimeReplayBatchRow[],
): RenderParityFeatureCapabilityGateCounter {
  const counter: RenderParityFeatureCapabilityGateCounter = {
    webglKnownRejected: 0,
    webglUnknownRejected: 0,
    webgpuKnownRejected: 0,
    webgpuUnknownRejected: 0,
  }

  for (const row of rows) {
    counter.webglKnownRejected += row.webglFeatureCapabilityKnownRejectedCount
    counter.webglUnknownRejected += row.webglFeatureCapabilityUnknownRejectedCount
    counter.webgpuKnownRejected += row.webgpuFeatureCapabilityKnownRejectedCount
    counter.webgpuUnknownRejected += row.webgpuFeatureCapabilityUnknownRejectedCount
  }

  return counter
}

/**
 * Parses one JSON value into runtime diagnostics row array.
 * @param payload Parsed diagnostics JSON payload.
 */
function resolveDiagnosticsRecordsFromPayload(payload: unknown): unknown[] {
  if (Array.isArray(payload)) {
    return payload
  }
  if (payload && typeof payload === 'object') {
    const container = payload as {
      records?: unknown
      diagnostics?: unknown
    }
    if (Array.isArray(container.records)) {
      return container.records
    }
    if (Array.isArray(container.diagnostics)) {
      return container.diagnostics
    }
  }

  return []
}

/**
 * Loads one diagnostics JSON file and resolves frame-stage plus runtime-resource counters.
 * @param inputPath Source diagnostics input path.
 */
async function resolveReplayInputCounterSet(inputPath: string): Promise<RenderParityReplayInputCounterSet> {
  const raw = await readFile(inputPath, 'utf8')
  const payload = JSON.parse(raw) as unknown
  const records = resolveDiagnosticsRecordsFromPayload(payload)

  return {
    frameStageCounterSet: createFrameStageCounterSetFromRecords(records),
    runtimeResourceCounterSet: createRuntimeResourceCounterSetFromRecords(records),
  }
}

/**
 * Maps one auto-report run result into batch dashboard row.
 * @param inputPath Source diagnostics input path.
 * @param label Effective replay label.
 * @param result Auto-report execution result.
 */
function createDashboardRow(
  inputPath: string,
  label: string,
  result: RenderParityRuntimeAutoRunResult,
  frameStageCounterSet: RenderParityFrameStageCounterSet,
  runtimeResourceCounterSet: RenderParityRuntimeResourceCounterSet,
): RenderParityRuntimeReplayBatchRow {
  return {
    inputPath,
    label,
    generatedAt: result.generatedAt,
    sampleCount: result.sampleCount,
    summaryPath: result.summaryPath,
    diffPath: result.diffPath,
    trendPath: result.trendPath,
    replayBaselinePath: result.replayBaselinePath,
    replayBaselineBootstrapped: result.replayBaselineBootstrapped,
    overallTrend: result.overallTrend,
    webglDominantFeatureCapabilityGate: result.webglDominantFeatureCapabilityGate,
    webgpuDominantFeatureCapabilityGate: result.webgpuDominantFeatureCapabilityGate,
    webglFeatureCapabilityKnownRejectedCount: result.webglFeatureCapabilityKnownRejectedCount,
    webglFeatureCapabilityUnknownRejectedCount: result.webglFeatureCapabilityUnknownRejectedCount,
    webgpuFeatureCapabilityKnownRejectedCount: result.webgpuFeatureCapabilityKnownRejectedCount,
    webgpuFeatureCapabilityUnknownRejectedCount: result.webgpuFeatureCapabilityUnknownRejectedCount,
    frameStageSchedulerModeCounter: frameStageCounterSet.schedulerModeCounter,
    frameStageSceneApplyModeCounter: frameStageCounterSet.sceneApplyModeCounter,
    runtimeResourceDecodeStatusCounter: runtimeResourceCounterSet.decodeStatusCounter,
    runtimeResourceCompressionCodecCounter: runtimeResourceCounterSet.compressionCodecCounter,
  }
}

/**
 * Executes batched replay runs from one diagnostics directory and writes dashboard output.
 * @param options Batch replay execution options.
 */
export async function runRenderParityRuntimeReplayBatch(
  options: RenderParityRuntimeReplayBatchCliOptions,
): Promise<RenderParityRuntimeReplayBatchRunResult> {
  const diagnosticsPaths = await resolveRuntimeDiagnosticsPaths(options.inputDir)
  if (diagnosticsPaths.length === 0) {
    throw new Error(`No JSON diagnostics files found in ${path.resolve(options.inputDir)}.`)
  }

  await mkdir(path.resolve(options.outputDir), {recursive: true})

  const rows: RenderParityRuntimeReplayBatchRow[] = []
  for (const diagnosticsPath of diagnosticsPaths) {
    const label = createReplayLabel(options.labelPrefix, path.basename(diagnosticsPath))
    const runResult = await runRenderParityRuntimeAutoReport({
      inputPath: diagnosticsPath,
      outputDir: options.outputDir,
      label,
      replayBaseline: true,
    })
    const replayInputCounterSet = await resolveReplayInputCounterSet(diagnosticsPath)
    rows.push(
      createDashboardRow(
        diagnosticsPath,
        label,
        runResult,
        replayInputCounterSet.frameStageCounterSet,
        replayInputCounterSet.runtimeResourceCounterSet,
      ),
    )
  }

  const dashboard: RenderParityRuntimeReplayBatchDashboard = {
    generatedAt: new Date().toISOString(),
    inputDir: path.resolve(options.inputDir),
    outputDir: path.resolve(options.outputDir),
    processedCount: rows.length,
    trendCounter: createTrendCounter(rows),
    featureCapabilityGateCounter: createFeatureCapabilityGateCounter(rows),
    frameStageSchedulerModeCounter: createFrameStageSchedulerModeAggregateCounter(
      rows.map((row) => row.frameStageSchedulerModeCounter),
    ),
    frameStageSceneApplyModeCounter: createFrameStageSceneApplyModeAggregateCounter(
      rows.map((row) => row.frameStageSceneApplyModeCounter),
    ),
    runtimeResourceDecodeStatusCounter: createRuntimeResourceDecodeStatusAggregateCounter(
      rows.map((row) => row.runtimeResourceDecodeStatusCounter),
    ),
    runtimeResourceCompressionCodecCounter: createRuntimeResourceCompressionCodecAggregateCounter(
      rows.map((row) => row.runtimeResourceCompressionCodecCounter),
    ),
    rows,
  }

  const dashboardOutputPath = path.resolve(options.dashboardOutputPath)
  await writeFile(dashboardOutputPath, `${JSON.stringify(dashboard, null, 2)}\n`, 'utf8')

  return {
    dashboardOutputPath,
    dashboard,
  }
}

/**
 * Executes CLI flow for batched replay runs.
 */
async function main() {
  const options = parseCliOptions(process.argv.slice(2))
  const result = await runRenderParityRuntimeReplayBatch(options)

  console.log('[render-parity] runtime replay batch generated')
  console.log(`inputDir: ${result.dashboard.inputDir}`)
  console.log(`outputDir: ${result.dashboard.outputDir}`)
  console.log(`processedCount: ${result.dashboard.processedCount}`)
  console.log(`dashboard: ${result.dashboardOutputPath}`)
  console.log(
    `trendCounter: improved=${result.dashboard.trendCounter.improved}, regressed=${result.dashboard.trendCounter.regressed}, mixed=${result.dashboard.trendCounter.mixed}, unchanged=${result.dashboard.trendCounter.unchanged}, unknown=${result.dashboard.trendCounter.unknown}`,
  )
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
    console.error('[render-parity] runtime replay batch failed')
    console.error(error)
    process.exitCode = 1
  })
}
