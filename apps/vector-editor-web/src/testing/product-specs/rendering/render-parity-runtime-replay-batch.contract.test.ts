import assert from 'node:assert/strict'
import {mkdir, mkdtemp, readFile, rm, writeFile} from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'

import {
  createReplayLabel,
  createTrendCounter,
  runRenderParityRuntimeReplayBatch,
} from '../../../../scripts/render-parity-runtime-replay-batch.ts'

/**
 * Creates one temporary directory for replay batch contract tests.
 */
async function createTempDirectory(): Promise<string> {
  return mkdtemp(path.join(os.tmpdir(), 'venus-render-parity-batch-'))
}

/**
 * Copies stable runtime diagnostics fixture into one target path.
 * @param targetPath Destination diagnostics JSON path.
 */
async function seedRuntimeDiagnosticsFixture(targetPath: string): Promise<void> {
  const fixturePath = path.resolve(process.cwd(), 'scripts/runtime-diagnostics-sample-export.json')
  const fixture = await readFile(fixturePath, 'utf8')
  await writeFile(targetPath, fixture, 'utf8')
}

/**
 * Verifies replay label creation strips trailing json suffix and preserves prefix.
 */
test('render parity replay batch creates deterministic replay labels', () => {
  assert.equal(
    createReplayLabel('runtime-replay', 'sample-a.runtime-diagnostics.json'),
    'runtime-replay-sample-a.runtime-diagnostics',
  )
  assert.equal(
    createReplayLabel('runtime-replay', 'sample-b.runtime-diagnostics'),
    'runtime-replay-sample-b.runtime-diagnostics',
  )
})

/**
 * Verifies trend counter tracks unknown rows when overall trend is absent.
 */
test('render parity replay batch trend counter includes unknown rows', () => {
  const counter = createTrendCounter([
    {
      inputPath: '/tmp/a.json',
      label: 'replay-a',
      generatedAt: '2026-05-24T00:00:00.000Z',
      sampleCount: 6,
      summaryPath: '/tmp/a.summary.json',
      diffPath: null,
      trendPath: null,
      replayBaselinePath: '/tmp/replay-a.baseline.summary.json',
      replayBaselineBootstrapped: true,
      overallTrend: null,
      webglDominantFeatureCapabilityGate: null,
      webgpuDominantFeatureCapabilityGate: null,
      webglFeatureCapabilityKnownRejectedCount: 0,
      webglFeatureCapabilityUnknownRejectedCount: 0,
      webgpuFeatureCapabilityKnownRejectedCount: 0,
      webgpuFeatureCapabilityUnknownRejectedCount: 0,
      frameStageSchedulerModeCounter: {
        interactive: 0,
        normal: 0,
        unknown: 1,
      },
      frameStageSceneApplyModeCounter: {
        none: 0,
        fullLoad: 0,
        previewLoad: 0,
        incrementalPatch: 0,
        unknown: 1,
      },
      runtimeResourceDecodeStatusCounter: {
        queued: 0,
        decoding: 0,
        ready: 0,
        failed: 0,
        unknown: 1,
      },
      runtimeResourceCompressionCodecCounter: {
        none: 0,
        brotli: 0,
        gzip: 0,
        zstd: 0,
        lz4: 0,
        unknown: 1,
      },
    },
  ])

  assert.equal(counter.improved, 0)
  assert.equal(counter.regressed, 0)
  assert.equal(counter.mixed, 0)
  assert.equal(counter.unchanged, 0)
  assert.equal(counter.unknown, 1)
})

/**
 * Verifies batch runner fails fast when diagnostics directory is empty.
 */
test('render parity replay batch rejects empty diagnostics directory', async () => {
  const tempRoot = await createTempDirectory()
  const inputDir = path.join(tempRoot, 'inputs')
  const outputDir = path.join(tempRoot, 'outputs')

  try {
    await mkdir(inputDir, {recursive: true})
    await mkdir(outputDir, {recursive: true})

    await assert.rejects(
      runRenderParityRuntimeReplayBatch({
        inputDir,
        outputDir,
        labelPrefix: 'replay-empty',
        dashboardOutputPath: path.join(outputDir, 'dashboard.json'),
      }),
      /No JSON diagnostics files found/,
    )
  } finally {
    await rm(tempRoot, {recursive: true, force: true})
  }
})

/**
 * Verifies batch runner surfaces JSON parse failures for invalid diagnostics files.
 */
test('render parity replay batch rejects invalid diagnostics payload', async () => {
  const tempRoot = await createTempDirectory()
  const inputDir = path.join(tempRoot, 'inputs')
  const outputDir = path.join(tempRoot, 'outputs')

  try {
    await mkdir(inputDir, {recursive: true})
    await mkdir(outputDir, {recursive: true})
    await writeFile(path.join(inputDir, 'invalid.runtime-diagnostics.json'), '{bad-json', 'utf8')

    await assert.rejects(
      runRenderParityRuntimeReplayBatch({
        inputDir,
        outputDir,
        labelPrefix: 'replay-invalid',
        dashboardOutputPath: path.join(outputDir, 'dashboard.json'),
      }),
    )
  } finally {
    await rm(tempRoot, {recursive: true, force: true})
  }
})

/**
 * Verifies first batch replay run bootstraps baselines and reports unknown trend rows.
 */
test('render parity replay batch first run reports unknown trend rows', async () => {
  const tempRoot = await createTempDirectory()
  const inputDir = path.join(tempRoot, 'inputs')
  const outputDir = path.join(tempRoot, 'outputs')
  const dashboardPath = path.join(outputDir, 'dashboard.json')

  try {
    await mkdir(inputDir, {recursive: true})
    await mkdir(outputDir, {recursive: true})
    await seedRuntimeDiagnosticsFixture(path.join(inputDir, 'sample-a.runtime-diagnostics.json'))
    await seedRuntimeDiagnosticsFixture(path.join(inputDir, 'sample-b.runtime-diagnostics.json'))

    const runResult = await runRenderParityRuntimeReplayBatch({
      inputDir,
      outputDir,
      labelPrefix: 'replay-first-run',
      dashboardOutputPath: dashboardPath,
    })

    assert.equal(runResult.dashboard.processedCount, 2)
    assert.equal(runResult.dashboard.trendCounter.unknown, 2)
    assert.equal(runResult.dashboard.trendCounter.unchanged, 0)
    assert.equal(runResult.dashboard.featureCapabilityGateCounter.webglKnownRejected, 2)
    assert.equal(runResult.dashboard.featureCapabilityGateCounter.webglUnknownRejected, 0)
    assert.equal(runResult.dashboard.featureCapabilityGateCounter.webgpuKnownRejected, 4)
    assert.equal(runResult.dashboard.featureCapabilityGateCounter.webgpuUnknownRejected, 2)
    assert.equal(runResult.dashboard.frameStageSchedulerModeCounter.interactive, 0)
    assert.equal(runResult.dashboard.frameStageSchedulerModeCounter.normal, 0)
    assert.equal(runResult.dashboard.frameStageSchedulerModeCounter.unknown, 12)
    assert.equal(runResult.dashboard.frameStageSceneApplyModeCounter.none, 0)
    assert.equal(runResult.dashboard.frameStageSceneApplyModeCounter.fullLoad, 0)
    assert.equal(runResult.dashboard.frameStageSceneApplyModeCounter.previewLoad, 0)
    assert.equal(runResult.dashboard.frameStageSceneApplyModeCounter.incrementalPatch, 0)
    assert.equal(runResult.dashboard.frameStageSceneApplyModeCounter.unknown, 12)
    assert.equal(runResult.dashboard.runtimeResourceDecodeStatusCounter.queued, 0)
    assert.equal(runResult.dashboard.runtimeResourceDecodeStatusCounter.decoding, 0)
    assert.equal(runResult.dashboard.runtimeResourceDecodeStatusCounter.ready, 0)
    assert.equal(runResult.dashboard.runtimeResourceDecodeStatusCounter.failed, 0)
    assert.equal(runResult.dashboard.runtimeResourceDecodeStatusCounter.unknown, 12)
    assert.equal(runResult.dashboard.runtimeResourceCompressionCodecCounter.none, 0)
    assert.equal(runResult.dashboard.runtimeResourceCompressionCodecCounter.brotli, 0)
    assert.equal(runResult.dashboard.runtimeResourceCompressionCodecCounter.gzip, 0)
    assert.equal(runResult.dashboard.runtimeResourceCompressionCodecCounter.zstd, 0)
    assert.equal(runResult.dashboard.runtimeResourceCompressionCodecCounter.lz4, 0)
    assert.equal(runResult.dashboard.runtimeResourceCompressionCodecCounter.unknown, 12)
    assert.ok(runResult.dashboard.rows.every((row) => row.replayBaselineBootstrapped))
    assert.ok(runResult.dashboard.rows.every((row) => row.diffPath === null))
    assert.ok(runResult.dashboard.rows.every((row) => row.webglDominantFeatureCapabilityGate === 'text-style-unsupported'))
    assert.ok(runResult.dashboard.rows.every((row) => row.frameStageSchedulerModeCounter.unknown === 6))
    assert.ok(runResult.dashboard.rows.every((row) => row.frameStageSceneApplyModeCounter.unknown === 6))
    assert.ok(runResult.dashboard.rows.every((row) => row.runtimeResourceDecodeStatusCounter.unknown === 6))
    assert.ok(runResult.dashboard.rows.every((row) => row.runtimeResourceCompressionCodecCounter.unknown === 6))
  } finally {
    await rm(tempRoot, {recursive: true, force: true})
  }
})
