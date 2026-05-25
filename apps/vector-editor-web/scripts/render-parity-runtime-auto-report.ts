import {mkdir, readFile, readdir, writeFile} from 'node:fs/promises'
import path from 'node:path'
import {pathToFileURL} from 'node:url'

import {
  createRenderParityChecklistReportFromDiagnostics,
  type RenderParityDiagnosticsSample,
  type RenderParityEvaluationThresholds,
} from '../src/runtime/engine-bridge/renderParityChecklist.ts'
import {
  createParitySamplesFromRuntimeDiagnostics,
  extractRuntimeDiagnosticsRecords,
} from '../src/runtime/engine-bridge/renderParitySampleExtraction.ts'
import {
  createRenderParityReasonSummary,
} from '../src/runtime/engine-bridge/renderParityReasonSummary.ts'
import {
  createRenderParitySummaryDiffReport,
  type RenderParityRuntimeSummaryArtifact,
} from '../src/runtime/engine-bridge/renderParitySummaryDiff.ts'
import {
  createRenderParitySummaryTrendReport,
} from '../src/runtime/engine-bridge/renderParitySummaryTrend.ts'

/**
 * Declares runtime auto-report execution options.
 */
export interface RenderParityRuntimeAutoRunOptions {
  /** Stores required runtime diagnostics export input file path. */
  inputPath: string
  /** Stores output directory for generated sample/report artifacts. */
  outputDir: string
  /** Stores optional label prefix for generated files. */
  label: string
  /** Stores optional minimum sample count threshold override. */
  minSamples?: number
  /** Stores optional max text fallback threshold override. */
  maxTextFallbackCount?: number
  /** Stores optional max deferred image texture threshold override. */
  maxDeferredImageTextureCount?: number
  /** Stores optional max deferred text texture threshold override. */
  maxDeferredTextTextureCount?: number
  /** Stores optional baseline summary artifact path for one-shot diff generation. */
  baselineSummaryPath?: string
  /** Stores optional directory used for baseline-vs-many trend ledger generation. */
  trendDir?: string
  /** Enables fixed baseline replay mode with auto baseline path and trend directory defaults. */
  replayBaseline: boolean
}

/**
 * Declares one execution result for runtime parity auto-report run.
 */
export interface RenderParityRuntimeAutoRunResult {
  /** Stores generated report timestamp in ISO format. */
  generatedAt: string
  /** Stores sample row count used by this run. */
  sampleCount: number
  /** Stores written samples artifact path. */
  samplesPath: string
  /** Stores written report artifact path. */
  reportPath: string
  /** Stores written summary artifact path. */
  summaryPath: string
  /** Stores optional written diff artifact path. */
  diffPath: string | null
  /** Stores optional written trend artifact path. */
  trendPath: string | null
  /** Stores optional replay baseline anchor path. */
  replayBaselinePath: string | null
  /** Marks whether replay mode bootstrapped baseline in this run. */
  replayBaselineBootstrapped: boolean
  /** Stores resolved dominant webgl fallback reason. */
  webglDominantFallback: string | null
  /** Stores resolved dominant webgpu rejection reason. */
  webgpuDominantReject: string | null
  /** Stores resolved dominant WebGL feature capability gate reason. */
  webglDominantFeatureCapabilityGate: string | null
  /** Stores resolved dominant WebGPU feature capability gate reason. */
  webgpuDominantFeatureCapabilityGate: string | null
  /** Stores known WebGL feature capability gate reject count. */
  webglFeatureCapabilityKnownRejectedCount: number
  /** Stores unknown WebGL feature capability gate reject count. */
  webglFeatureCapabilityUnknownRejectedCount: number
  /** Stores known WebGPU feature capability gate reject count. */
  webgpuFeatureCapabilityKnownRejectedCount: number
  /** Stores unknown WebGPU feature capability gate reject count. */
  webgpuFeatureCapabilityUnknownRejectedCount: number
  /** Stores optional overall trend signal for diff/trend mode. */
  overallTrend: string | null
  /** Stores optional dominant webgl reason-change signal. */
  webglDominantChanged: boolean | null
  /** Stores optional dominant webgpu reason-change signal. */
  webgpuDominantChanged: boolean | null
  /** Stores optional trend counter line for human-readable console output. */
  trendCounterLine: string | null
}

/**
 * Parses one optional numeric flag and validates finite number input.
 * @param argv Process argument array.
 * @param flagName CLI flag name.
 */
function resolveOptionalNumberFlag(argv: readonly string[], flagName: string): number | undefined {
  const flagIndex = argv.indexOf(flagName)
  if (flagIndex < 0 || !argv[flagIndex + 1]) {
    return undefined
  }
  const parsed = Number(argv[flagIndex + 1])
  if (!Number.isFinite(parsed)) {
    throw new Error(`Invalid numeric value for ${flagName}: ${argv[flagIndex + 1]}`)
  }
  return parsed
}

/**
 * Parses CLI arguments into runtime auto-report options.
 * @param argv Process argument array.
 */
function parseCliOptions(argv: readonly string[]): RenderParityRuntimeAutoRunOptions {
  const inputFlagIndex = argv.indexOf('--input')
  if (inputFlagIndex < 0 || !argv[inputFlagIndex + 1]) {
    throw new Error('Missing required --input <runtime-diagnostics-json> argument.')
  }

  const outputDirFlagIndex = argv.indexOf('--output-dir')
  const labelFlagIndex = argv.indexOf('--label')
  const baselineSummaryFlagIndex = argv.indexOf('--baseline-summary')
  const trendDirFlagIndex = argv.indexOf('--trend-dir')
  const replayBaseline = argv.includes('--replay-baseline')

  return {
    inputPath: argv[inputFlagIndex + 1],
    outputDir:
      outputDirFlagIndex >= 0 && argv[outputDirFlagIndex + 1]
        ? argv[outputDirFlagIndex + 1]
        : './docs/product-requirements/render-parity-reports',
    label:
      labelFlagIndex >= 0 && argv[labelFlagIndex + 1]
        ? argv[labelFlagIndex + 1]
        : 'runtime-session',
    minSamples: resolveOptionalNumberFlag(argv, '--min-samples'),
    maxTextFallbackCount: resolveOptionalNumberFlag(argv, '--max-text-fallback'),
    maxDeferredImageTextureCount: resolveOptionalNumberFlag(argv, '--max-deferred-image'),
    maxDeferredTextTextureCount: resolveOptionalNumberFlag(argv, '--max-deferred-text'),
    baselineSummaryPath:
      baselineSummaryFlagIndex >= 0 && argv[baselineSummaryFlagIndex + 1]
        ? argv[baselineSummaryFlagIndex + 1]
        : undefined,
    trendDir:
      trendDirFlagIndex >= 0 && argv[trendDirFlagIndex + 1]
        ? argv[trendDirFlagIndex + 1]
        : undefined,
    replayBaseline,
  }
}

/**
 * Resolves one fixed baseline path used by replay mode.
 * @param options Parsed runtime auto-report options.
 */
function resolveReplayBaselinePath(options: RenderParityRuntimeAutoRunOptions): string {
  return path.resolve(options.outputDir, `${options.label}.baseline.summary.json`)
}

/**
 * Resolves sampled evaluation threshold overrides from CLI options.
 * @param options Parsed runtime auto-report options.
 */
function resolveThresholdOverrides(
  options: RenderParityRuntimeAutoRunOptions,
): Partial<RenderParityEvaluationThresholds> {
  const overrides: Partial<RenderParityEvaluationThresholds> = {}

  if (typeof options.minSamples === 'number') {
    overrides.minSampleCountForAutomaticVerdict = options.minSamples
  }
  if (typeof options.maxTextFallbackCount === 'number') {
    overrides.maxAllowedTextFallbackCount = options.maxTextFallbackCount
  }
  if (typeof options.maxDeferredImageTextureCount === 'number') {
    overrides.maxAllowedDeferredImageTextureCount = options.maxDeferredImageTextureCount
  }
  if (typeof options.maxDeferredTextTextureCount === 'number') {
    overrides.maxAllowedDeferredTextTextureCount = options.maxDeferredTextTextureCount
  }

  return overrides
}

/**
 * Normalizes one timestamp into stable file-name segment format.
 * @param generatedAt ISO timestamp.
 */
function createTimestampLabel(generatedAt: string): string {
  return generatedAt.replace(/[:.]/g, '-').replace(/Z$/, 'z')
}

/**
 * Converts runtime diagnostics export payload into parity sample rows.
 * @param payload Unknown JSON payload parsed from runtime diagnostics export.
 */
function createParitySamplesFromRuntimePayload(payload: unknown): RenderParityDiagnosticsSample[] {
  const diagnosticsRecords = extractRuntimeDiagnosticsRecords(payload)
  return createParitySamplesFromRuntimeDiagnostics(diagnosticsRecords)
}

/**
 * Writes one JSON artifact to disk and returns absolute output path.
 * @param outputDir Output directory path.
 * @param fileName Artifact file name.
 * @param payload JSON payload.
 */
async function writeJsonArtifact(
  outputDir: string,
  fileName: string,
  payload: unknown,
): Promise<string> {
  const targetPath = path.resolve(outputDir, fileName)
  await writeFile(targetPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8')
  return targetPath
}

/**
 * Reads and validates one runtime parity summary artifact payload.
 * @param filePath Summary artifact path used as baseline diff input.
 */
async function readSummaryArtifact(filePath: string): Promise<RenderParityRuntimeSummaryArtifact> {
  const raw = await readFile(filePath, 'utf8')
  const parsed = JSON.parse(raw) as unknown
  if (!parsed || typeof parsed !== 'object') {
    throw new Error(`Summary JSON at ${filePath} must be an object.`)
  }
  const record = parsed as Record<string, unknown>
  if (typeof record.generatedAt !== 'string' || !record.generatedAt) {
    throw new Error(`Summary JSON at ${filePath} is missing generatedAt.`)
  }
  if (typeof record.sampleCount !== 'number' || !Number.isFinite(record.sampleCount)) {
    throw new Error(`Summary JSON at ${filePath} is missing finite sampleCount.`)
  }
  if (!record.verdictSummary || typeof record.verdictSummary !== 'object') {
    throw new Error(`Summary JSON at ${filePath} is missing verdictSummary object.`)
  }
  if (!record.reasonSummary || typeof record.reasonSummary !== 'object') {
    throw new Error(`Summary JSON at ${filePath} is missing reasonSummary object.`)
  }

  return parsed as RenderParityRuntimeSummaryArtifact
}

/**
 * Resolves summary artifact paths from one directory excluding baseline/current anchors.
 * @param summariesDir Directory that contains summary artifacts.
 * @param baselinePath Absolute baseline summary artifact path.
 * @param currentPath Absolute current summary artifact path.
 */
async function resolveTrendSummaryPaths(
  summariesDir: string,
  baselinePath: string,
  currentPath: string,
): Promise<string[]> {
  const entries = await readdir(summariesDir)
  return entries
    .filter((entry) => entry.endsWith('.summary.json'))
    .map((entry) => path.resolve(summariesDir, entry))
    .filter((entryPath) => entryPath !== baselinePath && entryPath !== currentPath)
}

/**
 * Executes one runtime diagnostics conversion and sampled report export run.
 * @param options Runtime auto-report execution options.
 */
export async function runRenderParityRuntimeAutoReport(
  options: RenderParityRuntimeAutoRunOptions,
): Promise<RenderParityRuntimeAutoRunResult> {
  const raw = await readFile(options.inputPath, 'utf8')
  const payload = JSON.parse(raw) as unknown
  const samples = createParitySamplesFromRuntimePayload(payload)
  const report = createRenderParityChecklistReportFromDiagnostics({
    samples,
    thresholds: resolveThresholdOverrides(options),
  })
  const reasonSummary = createRenderParityReasonSummary(samples)

  // Persist both intermediary samples and final report under one deterministic output directory.
  await mkdir(path.resolve(options.outputDir), {recursive: true})
  const timestampLabel = createTimestampLabel(report.generatedAt)
  const samplesPath = await writeJsonArtifact(
    options.outputDir,
    `${options.label}.${timestampLabel}.samples.json`,
    samples,
  )
  const reportPath = await writeJsonArtifact(
    options.outputDir,
    `${options.label}.${timestampLabel}.report.json`,
    report,
  )
  const summaryPath = await writeJsonArtifact(
    options.outputDir,
    `${options.label}.${timestampLabel}.summary.json`,
    {
      generatedAt: report.generatedAt,
      sampleCount: samples.length,
      verdictSummary: report.summary,
      reasonSummary,
    },
  )
  const summaryArtifact: RenderParityRuntimeSummaryArtifact = {
    generatedAt: report.generatedAt,
    sampleCount: samples.length,
    verdictSummary: report.summary,
    reasonSummary,
  }

  let diffPath: string | null = null
  let trendPath: string | null = null
  let overallTrend: string | null = null
  let webglDominantChanged: boolean | null = null
  let webgpuDominantChanged: boolean | null = null
  let trendCounterLine: string | null = null
  let replayBaselinePath: string | null = null
  let replayBaselineBootstrapped = false

  if (options.replayBaseline && options.baselineSummaryPath) {
    throw new Error('--replay-baseline cannot be combined with --baseline-summary.')
  }

  let baselineSummaryPath = options.baselineSummaryPath
  let trendDirPath = options.trendDir
  if (options.replayBaseline) {
    replayBaselinePath = resolveReplayBaselinePath(options)
    trendDirPath = trendDirPath ?? options.outputDir
    try {
      await readSummaryArtifact(replayBaselinePath)
      baselineSummaryPath = replayBaselinePath
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code
      if (code !== 'ENOENT') {
        throw error
      }
      // Bootstrap one stable baseline snapshot so future replay runs can produce deterministic diffs.
      await writeFile(replayBaselinePath, `${JSON.stringify(summaryArtifact, null, 2)}\n`, 'utf8')
      replayBaselineBootstrapped = true
      baselineSummaryPath = replayBaselinePath
    }
  }

  if (baselineSummaryPath && !replayBaselineBootstrapped) {
    const baselineSummary = await readSummaryArtifact(baselineSummaryPath)
    const diffReport = createRenderParitySummaryDiffReport(baselineSummary, summaryArtifact)
    diffPath = await writeJsonArtifact(
      options.outputDir,
      `${options.label}.${timestampLabel}.diff.json`,
      diffReport,
    )
    overallTrend = diffReport.overallTrend
    webglDominantChanged = diffReport.reasonDiff.webglCacheFallback.dominantKnownReasonChanged
    webgpuDominantChanged = diffReport.reasonDiff.webgpuRectBatchReject.dominantKnownReasonChanged

    if (trendDirPath) {
      const resolvedBaselinePath = path.resolve(baselineSummaryPath)
      const resolvedSummaryPath = path.resolve(summaryPath)
      const trendSummaryPaths = await resolveTrendSummaryPaths(
        path.resolve(trendDirPath),
        resolvedBaselinePath,
        resolvedSummaryPath,
      )
      const trendSummaries = await Promise.all(
        trendSummaryPaths.map((entryPath) => readSummaryArtifact(entryPath)),
      )
      const trendReport = createRenderParitySummaryTrendReport(baselineSummary, [
        ...trendSummaries,
        summaryArtifact,
      ])
      trendPath = await writeJsonArtifact(
        options.outputDir,
        `${options.label}.${timestampLabel}.trend.json`,
        trendReport,
      )
      trendCounterLine =
        `trendCounter: improved=${trendReport.trendCounter.improved}, regressed=${trendReport.trendCounter.regressed}, mixed=${trendReport.trendCounter.mixed}, unchanged=${trendReport.trendCounter.unchanged}`
    }
  }

  return {
    generatedAt: report.generatedAt,
    sampleCount: samples.length,
    samplesPath,
    reportPath,
    summaryPath,
    diffPath,
    trendPath,
    replayBaselinePath,
    replayBaselineBootstrapped,
    webglDominantFallback: reasonSummary.webglCacheFallback.dominantKnownReason,
    webgpuDominantReject: reasonSummary.webgpuRectBatchReject.dominantKnownReason,
    webglDominantFeatureCapabilityGate:
      reasonSummary.webglFeatureCapabilityGate.dominantKnownReason,
    webgpuDominantFeatureCapabilityGate:
      reasonSummary.webgpuFeatureCapabilityGate.dominantKnownReason,
    webglFeatureCapabilityKnownRejectedCount:
      reasonSummary.webglFeatureCapabilityGate.knownRejectedCount,
    webglFeatureCapabilityUnknownRejectedCount:
      reasonSummary.webglFeatureCapabilityGate.unknownRejectedCount,
    webgpuFeatureCapabilityKnownRejectedCount:
      reasonSummary.webgpuFeatureCapabilityGate.knownRejectedCount,
    webgpuFeatureCapabilityUnknownRejectedCount:
      reasonSummary.webgpuFeatureCapabilityGate.unknownRejectedCount,
    overallTrend,
    webglDominantChanged,
    webgpuDominantChanged,
    trendCounterLine,
  }
}

/**
 * Executes one-command runtime diagnostics conversion and sampled report export.
 */
async function main() {
  const options = parseCliOptions(process.argv.slice(2))
  const result = await runRenderParityRuntimeAutoReport(options)

  console.log('[render-parity] runtime auto report generated')
  console.log(`input: ${path.resolve(options.inputPath)}`)
  console.log(`outputDir: ${path.resolve(options.outputDir)}`)
  console.log(`sampleCount: ${result.sampleCount}`)
  console.log(`samples: ${result.samplesPath}`)
  console.log(`report: ${result.reportPath}`)
  console.log(`summary: ${result.summaryPath}`)
  if (result.diffPath) {
    console.log(`diff: ${result.diffPath}`)
  }
  if (result.trendPath) {
    console.log(`trend: ${result.trendPath}`)
  }
  if (result.replayBaselinePath) {
    console.log(`replayBaseline: ${result.replayBaselinePath}`)
    console.log(`replayBaselineBootstrapped: ${result.replayBaselineBootstrapped}`)
  }
  console.log(`webglDominantFallback: ${result.webglDominantFallback ?? 'none'}`)
  console.log(`webgpuDominantReject: ${result.webgpuDominantReject ?? 'none'}`)
  console.log(`webglDominantFeatureCapabilityGate: ${result.webglDominantFeatureCapabilityGate ?? 'none'}`)
  console.log(`webgpuDominantFeatureCapabilityGate: ${result.webgpuDominantFeatureCapabilityGate ?? 'none'}`)
  console.log(
    `webglFeatureCapabilityRejected: known=${result.webglFeatureCapabilityKnownRejectedCount}, unknown=${result.webglFeatureCapabilityUnknownRejectedCount}`,
  )
  console.log(
    `webgpuFeatureCapabilityRejected: known=${result.webgpuFeatureCapabilityKnownRejectedCount}, unknown=${result.webgpuFeatureCapabilityUnknownRejectedCount}`,
  )
  if (result.diffPath && result.overallTrend !== null) {
    console.log(`overallTrend: ${result.overallTrend}`)
    console.log(`webglDominantChanged: ${result.webglDominantChanged}`)
    console.log(`webgpuDominantChanged: ${result.webgpuDominantChanged}`)
  }
  if (result.trendCounterLine) {
    console.log(result.trendCounterLine)
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
    console.error('[render-parity] runtime auto report failed')
    console.error(error)
    process.exitCode = 1
  })
}
