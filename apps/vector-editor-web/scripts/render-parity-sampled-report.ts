import {readFile} from 'node:fs/promises'

import {
  createRenderParityChecklistReportFromDiagnostics,
  type RenderParityDiagnosticsSample,
  type RenderParityEvaluationThresholds,
} from '../src/runtime/engine-bridge/renderParityChecklist.ts'

/**
 * Declares one CLI options payload for sampled parity report generation.
 */
interface RenderParitySampledCliOptions {
  /** Stores required JSON input path containing diagnostics sample array. */
  inputPath: string
  /** Stores optional minimum sample count override used by automatic verdicting. */
  minSamples?: number
  /** Stores optional max text fallback threshold override. */
  maxTextFallbackCount?: number
  /** Stores optional max deferred image texture threshold override. */
  maxDeferredImageTextureCount?: number
  /** Stores optional max deferred text texture threshold override. */
  maxDeferredTextTextureCount?: number
}

/**
 * Parses CLI arguments into sampled parity report options.
 * @param argv Process argument array.
 */
function parseCliOptions(argv: readonly string[]): RenderParitySampledCliOptions {
  const inputFlagIndex = argv.indexOf('--input')
  if (inputFlagIndex < 0 || !argv[inputFlagIndex + 1]) {
    throw new Error('Missing required --input <json-file-path> argument.')
  }

  const resolveNumberFlag = (flagName: string): number | undefined => {
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

  return {
    inputPath: argv[inputFlagIndex + 1],
    minSamples: resolveNumberFlag('--min-samples'),
    maxTextFallbackCount: resolveNumberFlag('--max-text-fallback'),
    maxDeferredImageTextureCount: resolveNumberFlag('--max-deferred-image'),
    maxDeferredTextTextureCount: resolveNumberFlag('--max-deferred-text'),
  }
}

/**
 * Resolves diagnostics sample array from one JSON file payload.
 * @param inputPath JSON path that stores diagnostics sample array.
 */
async function readDiagnosticsSamples(inputPath: string): Promise<RenderParityDiagnosticsSample[]> {
  const raw = await readFile(inputPath, 'utf8')
  const parsed = JSON.parse(raw) as unknown
  if (!Array.isArray(parsed)) {
    throw new Error('Input JSON must be an array of diagnostics sample objects.')
  }

  return parsed.map((row, index) => normalizeSampleRow(row, index))
}

/**
 * Normalizes one diagnostics sample row from unknown JSON payload.
 * @param row Unknown JSON row.
 * @param index Row index used for error diagnostics.
 */
function normalizeSampleRow(row: unknown, index: number): RenderParityDiagnosticsSample {
  if (!row || typeof row !== 'object') {
    throw new Error(`Sample row ${index} is not an object.`)
  }
  const record = row as Record<string, unknown>

  const readString = (fieldName: string): string => {
    const value = record[fieldName]
    if (typeof value !== 'string') {
      throw new Error(`Sample row ${index} field ${fieldName} must be a string.`)
    }
    return value
  }

  const readNumber = (fieldName: string): number => {
    const value = record[fieldName]
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      throw new Error(`Sample row ${index} field ${fieldName} must be a finite number.`)
    }
    return value
  }

  return {
    webglRenderPath: readString('webglRenderPath') as RenderParityDiagnosticsSample['webglRenderPath'],
    webgpuRenderPath: readString('webgpuRenderPath') as RenderParityDiagnosticsSample['webgpuRenderPath'],
    cacheFallbackReason: readString('cacheFallbackReason'),
    webglInteractiveTextFallbackCount: readNumber('webglInteractiveTextFallbackCount'),
    webglDeferredTextTextureCount: readNumber('webglDeferredTextTextureCount'),
    webglDeferredImageTextureCount: readNumber('webglDeferredImageTextureCount'),
    webglImageTextureUploadCount: readNumber('webglImageTextureUploadCount'),
    webglBudgetPressure: readString('webglBudgetPressure') as RenderParityDiagnosticsSample['webglBudgetPressure'],
    webgpuNativeRectBatchRejectedReason: readString('webgpuNativeRectBatchRejectedReason'),
    webglFeatureCapabilityGateReason:
      typeof record.webglFeatureCapabilityGateReason === 'string'
        ? record.webglFeatureCapabilityGateReason
        : 'none',
    webgpuFeatureCapabilityGateReason:
      typeof record.webgpuFeatureCapabilityGateReason === 'string'
        ? record.webgpuFeatureCapabilityGateReason
        : 'none',
    webgpuNativeSubmissionAttemptedCount: readNumber('webgpuNativeSubmissionAttemptedCount'),
  }
}

/**
 * Resolves threshold override payload from CLI options.
 * @param options Parsed CLI options.
 */
function resolveThresholdOverrides(
  options: RenderParitySampledCliOptions,
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
 * Generates one sampled render parity checklist report from diagnostics JSON input.
 */
async function main() {
  const options = parseCliOptions(process.argv.slice(2))
  const samples = await readDiagnosticsSamples(options.inputPath)
  const report = createRenderParityChecklistReportFromDiagnostics({
    samples,
    thresholds: resolveThresholdOverrides(options),
  })

  console.log('[render-parity] sampled checklist')
  console.log(JSON.stringify(report, null, 2))
}

main().catch((error) => {
  console.error('[render-parity] sampled checklist failed')
  console.error(error)
  process.exitCode = 1
})
