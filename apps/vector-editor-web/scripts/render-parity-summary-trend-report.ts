import {readdir, readFile, writeFile} from 'node:fs/promises'
import path from 'node:path'

import {
  createRenderParitySummaryTrendReport,
  type RenderParitySummaryTrendReport,
} from '../src/runtime/engine-bridge/renderParitySummaryTrend.ts'
import {
  type RenderParityRuntimeSummaryArtifact,
} from '../src/runtime/engine-bridge/renderParitySummaryDiff.ts'

/**
 * Declares CLI options for parity summary trend report script.
 */
interface RenderParitySummaryTrendCliOptions {
  /** Stores baseline summary artifact path. */
  baselinePath: string
  /** Stores directory containing summary artifacts to compare against baseline. */
  summariesDir: string
  /** Stores optional output path for persisted trend report JSON. */
  outputPath?: string
}

/**
 * Parses CLI args into summary-trend options.
 * @param argv Process argument array.
 */
function parseCliOptions(argv: readonly string[]): RenderParitySummaryTrendCliOptions {
  const baselineFlagIndex = argv.indexOf('--baseline')
  const dirFlagIndex = argv.indexOf('--dir')
  const outputFlagIndex = argv.indexOf('--output')

  if (baselineFlagIndex < 0 || !argv[baselineFlagIndex + 1]) {
    throw new Error('Missing required --baseline <summary-json-path> argument.')
  }

  return {
    baselinePath: argv[baselineFlagIndex + 1],
    summariesDir:
      dirFlagIndex >= 0 && argv[dirFlagIndex + 1]
        ? argv[dirFlagIndex + 1]
        : './docs/product-requirements/render-parity-reports',
    outputPath:
      outputFlagIndex >= 0 && argv[outputFlagIndex + 1]
        ? argv[outputFlagIndex + 1]
        : undefined,
  }
}

/**
 * Reads and validates one runtime parity summary artifact payload.
 * @param filePath Summary artifact path.
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
 * Resolves summary artifact paths in one directory excluding baseline and non-summary files.
 * @param summariesDir Directory containing summary artifacts.
 * @param baselinePath Absolute baseline summary path.
 */
async function resolveCurrentSummaryPaths(
  summariesDir: string,
  baselinePath: string,
): Promise<string[]> {
  const directoryEntries = await readdir(summariesDir)
  const normalizedBaselinePath = path.resolve(baselinePath)

  return directoryEntries
    .filter((entry) => entry.endsWith('.summary.json'))
    .map((entry) => path.resolve(summariesDir, entry))
    .filter((entryPath) => entryPath !== normalizedBaselinePath)
}

/**
 * Writes one optional trend artifact and returns resolved output path.
 * @param outputPath Optional output path.
 * @param report Trend report payload.
 */
async function writeOptionalOutput(
  outputPath: string | undefined,
  report: RenderParitySummaryTrendReport,
): Promise<string | null> {
  if (!outputPath) {
    return null
  }

  const absoluteOutputPath = path.resolve(outputPath)
  await writeFile(absoluteOutputPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8')
  return absoluteOutputPath
}

/**
 * Executes summary trend report generation for baseline against all directory summaries.
 */
async function main() {
  const options = parseCliOptions(process.argv.slice(2))
  const baselinePath = path.resolve(options.baselinePath)
  const summariesDir = path.resolve(options.summariesDir)

  const baselineSummary = await readSummaryArtifact(baselinePath)
  const currentSummaryPaths = await resolveCurrentSummaryPaths(summariesDir, baselinePath)
  const currentSummaries = await Promise.all(
    currentSummaryPaths.map((entryPath) => readSummaryArtifact(entryPath)),
  )

  const trendReport = createRenderParitySummaryTrendReport(baselineSummary, currentSummaries)
  const outputPath = await writeOptionalOutput(options.outputPath, trendReport)

  console.log('[render-parity] summary trend report')
  console.log(`baseline: ${baselinePath}`)
  console.log(`dir: ${summariesDir}`)
  console.log(`comparedCount: ${trendReport.comparedCount}`)
  console.log(
    `trendCounter: improved=${trendReport.trendCounter.improved}, regressed=${trendReport.trendCounter.regressed}, mixed=${trendReport.trendCounter.mixed}, unchanged=${trendReport.trendCounter.unchanged}`,
  )

  if (outputPath) {
    console.log(`output: ${outputPath}`)
    return
  }

  console.log(JSON.stringify(trendReport, null, 2))
}

main().catch((error) => {
  console.error('[render-parity] summary trend report failed')
  console.error(error)
  process.exitCode = 1
})
