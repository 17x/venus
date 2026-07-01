import {readFile, readdir, writeFile} from 'node:fs/promises'
import path from 'node:path'

import {
  createRenderParityCaptureReleaseGateStabilityReport,
  type RenderParityCaptureReleaseGateSummaryInput,
} from '../src/runtime/engine-bridge/renderParityCaptureReleaseGateStability.ts'

interface CaptureReleaseGateStabilityCliOptions {
  inputDir: string
  outputPath?: string
  minRunCount?: number
  maxFailureCount?: number
  maxDurationMs?: number
  maxFrameArtifactIssueCount?: number
  failOnKeepManual: boolean
}

function resolveFlagValue(argv: readonly string[], flagName: string): string | undefined {
  const index = argv.indexOf(flagName)
  return index >= 0 ? argv[index + 1] : undefined
}

function resolveRequiredFlag(argv: readonly string[], flagName: string): string {
  const value = resolveFlagValue(argv, flagName)
  if (!value) {
    throw new Error(`Missing required ${flagName} <value> argument.`)
  }
  return value
}

function resolveNumberFlag(argv: readonly string[], flagName: string): number | undefined {
  const raw = resolveFlagValue(argv, flagName)
  if (!raw) {
    return undefined
  }
  const parsed = Number(raw)
  if (!Number.isFinite(parsed)) {
    throw new Error(`Invalid numeric value for ${flagName}: ${raw}`)
  }
  return parsed
}

function parseCliOptions(argv: readonly string[]): CaptureReleaseGateStabilityCliOptions {
  return {
    inputDir: resolveRequiredFlag(argv, '--input-dir'),
    outputPath: resolveFlagValue(argv, '--output'),
    minRunCount: resolveNumberFlag(argv, '--min-run-count'),
    maxFailureCount: resolveNumberFlag(argv, '--max-failure-count'),
    maxDurationMs: resolveNumberFlag(argv, '--max-duration-ms'),
    maxFrameArtifactIssueCount: resolveNumberFlag(argv, '--max-frame-artifact-issue-count'),
    failOnKeepManual: argv.includes('--fail-on-keep-manual'),
  }
}

async function resolveReleaseGateSummaryPaths(inputDir: string): Promise<string[]> {
  const entries = await readdir(inputDir, {withFileTypes: true})
  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith('.capture-release-gate.json'))
    .map((entry) => path.resolve(inputDir, entry.name))
    .sort((left, right) => left.localeCompare(right))
}

async function readReleaseGateSummaries(
  inputDir: string,
): Promise<RenderParityCaptureReleaseGateSummaryInput[]> {
  const paths = await resolveReleaseGateSummaryPaths(inputDir)
  const summaries: RenderParityCaptureReleaseGateSummaryInput[] = []
  for (const summaryPath of paths) {
    const raw = await readFile(summaryPath, 'utf8')
    const parsed = JSON.parse(raw) as unknown
    if (!parsed || typeof parsed !== 'object') {
      throw new Error(`Capture release gate summary at ${summaryPath} must be an object.`)
    }
    summaries.push(parsed as RenderParityCaptureReleaseGateSummaryInput)
  }
  return summaries
}

async function main() {
  const options = parseCliOptions(process.argv.slice(2))
  const summaries = await readReleaseGateSummaries(options.inputDir)
  const report = createRenderParityCaptureReleaseGateStabilityReport(summaries, {
    minRunCount: options.minRunCount,
    maxFailureCount: options.maxFailureCount,
    maxDurationMs: options.maxDurationMs,
    maxFrameArtifactIssueCount: options.maxFrameArtifactIssueCount,
  })

  if (options.outputPath) {
    await writeFile(path.resolve(options.outputPath), `${JSON.stringify(report, null, 2)}\n`, 'utf8')
  }

  console.log('[render-parity] capture release gate stability report')
  console.log(`inputDir: ${path.resolve(options.inputDir)}`)
  console.log(`runCount: ${report.runCount}`)
  console.log(`passRatePercent: ${report.passRatePercent}`)
  console.log(`maxDurationMs: ${report.maxDurationMs}`)
  console.log(`frameArtifactIssueCount: ${report.frameArtifactIssueCount}`)
  console.log(`promotionRecommendation: ${report.promotionRecommendation}`)
  console.log(`promotionGateStatus: ${report.promotionGateStatus}`)
  console.log(`prRequiredRolloutRecommendation: ${report.prRequiredRolloutRecommendation}`)
  if (report.reasons.length > 0) {
    console.log(`reasons: ${report.reasons.join(' | ')}`)
  }
  if (report.prRequiredRolloutReasons.length > 0) {
    console.log(`prRequiredRolloutReasons: ${report.prRequiredRolloutReasons.join(' | ')}`)
  }
  if (options.outputPath) {
    console.log(`output: ${path.resolve(options.outputPath)}`)
  }
  if (options.failOnKeepManual && report.promotionGateStatus !== 'pass') {
    process.exitCode = 1
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error('[render-parity] capture release gate stability report failed')
    console.error(error instanceof Error ? error.stack : String(error))
    process.exitCode = 1
  })
}
