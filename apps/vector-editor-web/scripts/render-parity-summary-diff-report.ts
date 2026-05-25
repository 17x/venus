import {readFile, writeFile} from 'node:fs/promises'
import path from 'node:path'

import {
  createRenderParitySummaryDiffReport,
  type RenderParityRuntimeSummaryArtifact,
} from '../src/runtime/engine-bridge/renderParitySummaryDiff.ts'

/**
 * Declares CLI options for parity summary diff report script.
 */
interface RenderParitySummaryDiffCliOptions {
  /** Stores baseline summary artifact path. */
  baselinePath: string
  /** Stores current summary artifact path. */
  currentPath: string
  /** Stores optional output path for persisted diff report JSON. */
  outputPath?: string
}

/**
 * Parses CLI args into summary diff options.
 * @param argv Process argument array.
 */
function parseCliOptions(argv: readonly string[]): RenderParitySummaryDiffCliOptions {
  const baselineFlagIndex = argv.indexOf('--baseline')
  const currentFlagIndex = argv.indexOf('--current')
  const outputFlagIndex = argv.indexOf('--output')

  if (baselineFlagIndex < 0 || !argv[baselineFlagIndex + 1]) {
    throw new Error('Missing required --baseline <summary-json-path> argument.')
  }
  if (currentFlagIndex < 0 || !argv[currentFlagIndex + 1]) {
    throw new Error('Missing required --current <summary-json-path> argument.')
  }

  return {
    baselinePath: argv[baselineFlagIndex + 1],
    currentPath: argv[currentFlagIndex + 1],
    outputPath:
      outputFlagIndex >= 0 && argv[outputFlagIndex + 1]
        ? argv[outputFlagIndex + 1]
        : undefined,
  }
}

/**
 * Reads and validates one summary artifact payload from JSON file.
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
 * Executes parity summary diff comparison and optional output persistence.
 */
async function main() {
  const options = parseCliOptions(process.argv.slice(2))
  const baseline = await readSummaryArtifact(options.baselinePath)
  const current = await readSummaryArtifact(options.currentPath)
  const diffReport = createRenderParitySummaryDiffReport(baseline, current)

  console.log('[render-parity] summary diff report')
  console.log(`baseline: ${path.resolve(options.baselinePath)}`)
  console.log(`current: ${path.resolve(options.currentPath)}`)
  console.log(`overallTrend: ${diffReport.overallTrend}`)
  console.log(`webglDominantChanged: ${diffReport.reasonDiff.webglCacheFallback.dominantKnownReasonChanged}`)
  console.log(`webgpuDominantChanged: ${diffReport.reasonDiff.webgpuRectBatchReject.dominantKnownReasonChanged}`)

  if (options.outputPath) {
    const absoluteOutputPath = path.resolve(options.outputPath)
    await writeFile(absoluteOutputPath, `${JSON.stringify(diffReport, null, 2)}\n`, 'utf8')
    console.log(`output: ${absoluteOutputPath}`)
    return
  }

  console.log(JSON.stringify(diffReport, null, 2))
}

main().catch((error) => {
  console.error('[render-parity] summary diff report failed')
  console.error(error)
  process.exitCode = 1
})
