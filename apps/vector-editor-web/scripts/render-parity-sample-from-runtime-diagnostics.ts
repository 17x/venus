import {readFile, writeFile} from 'node:fs/promises'

import {
  createParitySamplesFromRuntimeDiagnostics,
  extractRuntimeDiagnosticsRecords,
} from '../src/runtime/engine-bridge/renderParitySampleExtraction.ts'

/**
 * Declares one CLI options payload for runtime diagnostics to parity-sample conversion.
 */
interface RuntimeDiagnosticsToParitySampleCliOptions {
  /** Stores required JSON input path containing runtime diagnostics export payload. */
  inputPath: string
  /** Stores optional output JSON path for generated parity samples array. */
  outputPath?: string
}

/**
 * Parses CLI arguments for runtime diagnostics conversion script.
 * @param argv Process argument array.
 */
function parseCliOptions(argv: readonly string[]): RuntimeDiagnosticsToParitySampleCliOptions {
  const inputFlagIndex = argv.indexOf('--input')
  if (inputFlagIndex < 0 || !argv[inputFlagIndex + 1]) {
    throw new Error('Missing required --input <runtime-diagnostics-json> argument.')
  }

  const outputFlagIndex = argv.indexOf('--output')

  return {
    inputPath: argv[inputFlagIndex + 1],
    outputPath:
      outputFlagIndex >= 0 && argv[outputFlagIndex + 1]
        ? argv[outputFlagIndex + 1]
        : undefined,
  }
}

/**
 * Converts one runtime diagnostics JSON payload into parity sample rows.
 */
async function main() {
  const options = parseCliOptions(process.argv.slice(2))
  const raw = await readFile(options.inputPath, 'utf8')
  const payload = JSON.parse(raw) as unknown
  const diagnosticsRecords = extractRuntimeDiagnosticsRecords(payload)
  const samples = createParitySamplesFromRuntimeDiagnostics(diagnosticsRecords)
  const outputJson = JSON.stringify(samples, null, 2)

  if (options.outputPath) {
    await writeFile(options.outputPath, `${outputJson}\n`, 'utf8')
    console.log('[render-parity] converted runtime diagnostics to parity samples')
    console.log(`input: ${options.inputPath}`)
    console.log(`output: ${options.outputPath}`)
    console.log(`sampleCount: ${samples.length}`)
    return
  }

  console.log('[render-parity] parity samples from runtime diagnostics')
  console.log(outputJson)
}

main().catch((error) => {
  console.error('[render-parity] runtime diagnostics conversion failed')
  console.error(error)
  process.exitCode = 1
})
