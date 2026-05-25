import assert from 'node:assert/strict'
import {mkdir, mkdtemp, readFile, rm, writeFile} from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'

import {
  createUnknownRateCliSummaryLogLines,
  createResourceUnknownRateViolationSummaryLogLines,
  createStageUnknownRateViolationSummaryLogLines,
  createNextReplayHistory,
  createRollingFrameStageSceneApplyModeCounter,
  createRollingFrameStageSchedulerModeCounter,
  createRollingRuntimeResourceCompressionCodecCounter,
  createRollingRuntimeResourceDecodeStatusCounter,
  createReplayGateArtifact,
  createRollingTrendCounter,
  runRenderParityRuntimeReplayHistoryGate,
  type RenderParityReplayBatchDashboardArtifact,
  type RenderParityReplayHistoryArtifact,
} from '../../../../scripts/render-parity-runtime-replay-history-gate.ts'

/**
 * Builds one deterministic replay dashboard fixture for history/gate contracts.
 * @param overrides Partial dashboard overrides.
 */
function createDashboardFixture(
  overrides: Partial<RenderParityReplayBatchDashboardArtifact> = {},
): RenderParityReplayBatchDashboardArtifact {
  return {
    generatedAt: '2026-05-24T00:00:00.000Z',
    outputDir: '/tmp/output',
    processedCount: 2,
    trendCounter: {
      improved: 0,
      regressed: 0,
      mixed: 0,
      unchanged: 2,
      unknown: 0,
    },
    featureCapabilityGateCounter: {
      webglKnownRejected: 0,
      webglUnknownRejected: 0,
      webgpuKnownRejected: 0,
      webgpuUnknownRejected: 0,
    },
    frameStageSchedulerModeCounter: {
      interactive: 0,
      normal: 0,
      unknown: 0,
    },
    frameStageSceneApplyModeCounter: {
      none: 0,
      fullLoad: 0,
      previewLoad: 0,
      incrementalPatch: 0,
      unknown: 0,
    },
    runtimeResourceDecodeStatusCounter: {
      queued: 0,
      decoding: 0,
      ready: 0,
      failed: 0,
      unknown: 0,
    },
    runtimeResourceCompressionCodecCounter: {
      none: 0,
      brotli: 0,
      gzip: 0,
      zstd: 0,
      lz4: 0,
      unknown: 0,
    },
    ...overrides,
  }
}

/**
 * Creates one empty history seed fixture with fixed window size.
 * @param windowSize History retention window size.
 */
function createHistorySeed(windowSize = 3): RenderParityReplayHistoryArtifact {
  return {
    updatedAt: '2026-05-24T00:00:00.000Z',
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

/**
 * Verifies rolling trend counter sums all snapshot counters.
 */
test('render parity replay history rolling counter aggregates snapshot totals', () => {
  const counter = createRollingTrendCounter([
    {
      generatedAt: '2026-05-24T00:00:00.000Z',
      dashboardPath: '/tmp/a.json',
      processedCount: 2,
      trendCounter: {improved: 1, regressed: 0, mixed: 0, unchanged: 1, unknown: 0},
      featureCapabilityGateCounter: {
        webglKnownRejected: 0,
        webglUnknownRejected: 0,
        webgpuKnownRejected: 0,
        webgpuUnknownRejected: 0,
      },
      frameStageSchedulerModeCounter: {
        interactive: 2,
        normal: 0,
        unknown: 0,
      },
      frameStageSceneApplyModeCounter: {
        none: 1,
        fullLoad: 0,
        previewLoad: 0,
        incrementalPatch: 1,
        unknown: 0,
      },
    },
    {
      generatedAt: '2026-05-24T01:00:00.000Z',
      dashboardPath: '/tmp/b.json',
      processedCount: 2,
      trendCounter: {improved: 0, regressed: 1, mixed: 0, unchanged: 1, unknown: 0},
      featureCapabilityGateCounter: {
        webglKnownRejected: 0,
        webglUnknownRejected: 0,
        webgpuKnownRejected: 0,
        webgpuUnknownRejected: 0,
      },
      frameStageSchedulerModeCounter: {
        interactive: 0,
        normal: 2,
        unknown: 0,
      },
      frameStageSceneApplyModeCounter: {
        none: 0,
        fullLoad: 1,
        previewLoad: 0,
        incrementalPatch: 1,
        unknown: 0,
      },
    },
  ])

  assert.equal(counter.improved, 1)
  assert.equal(counter.regressed, 1)
  assert.equal(counter.mixed, 0)
  assert.equal(counter.unchanged, 2)
  assert.equal(counter.unknown, 0)
})

/**
 * Verifies rolling frame-stage scheduler and scene-apply counters sum snapshot totals.
 */
test('render parity replay history rolling frame-stage counters aggregate snapshot totals', () => {
  const snapshots = [
    {
      generatedAt: '2026-05-24T00:00:00.000Z',
      dashboardPath: '/tmp/a.json',
      processedCount: 2,
      trendCounter: {improved: 0, regressed: 0, mixed: 0, unchanged: 2, unknown: 0},
      featureCapabilityGateCounter: {
        webglKnownRejected: 0,
        webglUnknownRejected: 0,
        webgpuKnownRejected: 0,
        webgpuUnknownRejected: 0,
      },
      frameStageSchedulerModeCounter: {
        interactive: 1,
        normal: 1,
        unknown: 0,
      },
      frameStageSceneApplyModeCounter: {
        none: 1,
        fullLoad: 0,
        previewLoad: 0,
        incrementalPatch: 1,
        unknown: 0,
      },
    },
    {
      generatedAt: '2026-05-24T01:00:00.000Z',
      dashboardPath: '/tmp/b.json',
      processedCount: 3,
      trendCounter: {improved: 0, regressed: 0, mixed: 0, unchanged: 3, unknown: 0},
      featureCapabilityGateCounter: {
        webglKnownRejected: 0,
        webglUnknownRejected: 0,
        webgpuKnownRejected: 0,
        webgpuUnknownRejected: 0,
      },
      frameStageSchedulerModeCounter: {
        interactive: 0,
        normal: 2,
        unknown: 1,
      },
      frameStageSceneApplyModeCounter: {
        none: 0,
        fullLoad: 1,
        previewLoad: 1,
        incrementalPatch: 0,
        unknown: 1,
      },
    },
  ]

  const schedulerCounter = createRollingFrameStageSchedulerModeCounter(snapshots)
  const sceneApplyCounter = createRollingFrameStageSceneApplyModeCounter(snapshots)

  assert.equal(schedulerCounter.interactive, 1)
  assert.equal(schedulerCounter.normal, 3)
  assert.equal(schedulerCounter.unknown, 1)
  assert.equal(sceneApplyCounter.none, 1)
  assert.equal(sceneApplyCounter.fullLoad, 1)
  assert.equal(sceneApplyCounter.previewLoad, 1)
  assert.equal(sceneApplyCounter.incrementalPatch, 1)
  assert.equal(sceneApplyCounter.unknown, 1)
})

/**
 * Verifies rolling runtime resource counters aggregate snapshot totals and keep legacy snapshots compatible.
 */
test('render parity replay history rolling runtime resource counters aggregate snapshot totals', () => {
  const snapshots = [
    {
      generatedAt: '2026-05-24T00:00:00.000Z',
      dashboardPath: '/tmp/a.json',
      processedCount: 2,
      trendCounter: {improved: 0, regressed: 0, mixed: 0, unchanged: 2, unknown: 0},
      featureCapabilityGateCounter: {
        webglKnownRejected: 0,
        webglUnknownRejected: 0,
        webgpuKnownRejected: 0,
        webgpuUnknownRejected: 0,
      },
      frameStageSchedulerModeCounter: {
        interactive: 0,
        normal: 2,
        unknown: 0,
      },
      frameStageSceneApplyModeCounter: {
        none: 0,
        fullLoad: 1,
        previewLoad: 1,
        incrementalPatch: 0,
        unknown: 0,
      },
      runtimeResourceDecodeStatusCounter: {
        queued: 1,
        decoding: 0,
        ready: 1,
        failed: 0,
        unknown: 0,
      },
      runtimeResourceCompressionCodecCounter: {
        none: 1,
        brotli: 1,
        gzip: 0,
        zstd: 0,
        lz4: 0,
        unknown: 0,
      },
    },
    {
      generatedAt: '2026-05-24T01:00:00.000Z',
      dashboardPath: '/tmp/b.json',
      processedCount: 3,
      trendCounter: {improved: 0, regressed: 0, mixed: 0, unchanged: 3, unknown: 0},
      featureCapabilityGateCounter: {
        webglKnownRejected: 0,
        webglUnknownRejected: 0,
        webgpuKnownRejected: 0,
        webgpuUnknownRejected: 0,
      },
      frameStageSchedulerModeCounter: {
        interactive: 1,
        normal: 2,
        unknown: 0,
      },
      frameStageSceneApplyModeCounter: {
        none: 1,
        fullLoad: 0,
        previewLoad: 0,
        incrementalPatch: 2,
        unknown: 0,
      },
      // Legacy snapshot shape without runtime resource counters should remain non-throwing and treated as zero.
    },
  ]

  const decodeStatusCounter = createRollingRuntimeResourceDecodeStatusCounter(snapshots)
  const compressionCodecCounter = createRollingRuntimeResourceCompressionCodecCounter(snapshots)

  assert.equal(decodeStatusCounter.queued, 1)
  assert.equal(decodeStatusCounter.decoding, 0)
  assert.equal(decodeStatusCounter.ready, 1)
  assert.equal(decodeStatusCounter.failed, 0)
  assert.equal(decodeStatusCounter.unknown, 0)
  assert.equal(compressionCodecCounter.none, 1)
  assert.equal(compressionCodecCounter.brotli, 1)
  assert.equal(compressionCodecCounter.gzip, 0)
  assert.equal(compressionCodecCounter.zstd, 0)
  assert.equal(compressionCodecCounter.lz4, 0)
  assert.equal(compressionCodecCounter.unknown, 0)
})

/**
 * Verifies history retention keeps only the latest snapshots under window limit.
 */
test('render parity replay history trims snapshots to window size', () => {
  const previous = createHistorySeed(2)
  const nextA = createNextReplayHistory(previous, '/tmp/a.dashboard.json', createDashboardFixture())
  const nextB = createNextReplayHistory(
    nextA,
    '/tmp/b.dashboard.json',
    createDashboardFixture({generatedAt: '2026-05-24T01:00:00.000Z'}),
  )
  const nextC = createNextReplayHistory(
    nextB,
    '/tmp/c.dashboard.json',
    createDashboardFixture({generatedAt: '2026-05-24T02:00:00.000Z'}),
  )

  assert.equal(nextC.totalSnapshots, 2)
  assert.equal(nextC.snapshots[0]?.generatedAt, '2026-05-24T01:00:00.000Z')
  assert.equal(nextC.snapshots[1]?.generatedAt, '2026-05-24T02:00:00.000Z')
})

/**
 * Verifies gate artifact fails when latest snapshot breaches configured thresholds.
 */
test('render parity replay gate artifact fails on threshold breach', () => {
  const gate = createReplayGateArtifact(
    '/tmp/runtime-replay.batch.dashboard.json',
    {
      maxRegressed: 0,
      maxMixed: 0,
      maxUnknown: 0,
      minProcessedCount: 2,
      maxRollingRegressed: 2,
      maxRollingMixed: 0,
      maxRollingUnknown: 0,
    },
    {
      generatedAt: '2026-05-24T00:00:00.000Z',
      dashboardPath: '/tmp/runtime-replay.batch.dashboard.json',
      processedCount: 1,
      trendCounter: {
        improved: 0,
        regressed: 1,
        mixed: 0,
        unchanged: 0,
        unknown: 0,
      },
    },
    {
      improved: 0,
      regressed: 1,
      mixed: 0,
      unchanged: 0,
      unknown: 0,
    },
    {
      webglKnownRejected: 0,
      webglUnknownRejected: 0,
      webgpuKnownRejected: 0,
      webgpuUnknownRejected: 0,
    },
    {
      interactive: 0,
      normal: 0,
      unknown: 0,
    },
    {
      none: 0,
      fullLoad: 0,
      previewLoad: 0,
      incrementalPatch: 0,
      unknown: 0,
    },
  )

  assert.equal(gate.status, 'fail')
  assert.equal(gate.reasons.length, 2)
  assert.equal(gate.failures.length, 2)
  assert.equal(gate.failures[0]?.code, 'RP_GATE_LATEST_PROCESSED_COUNT')
  assert.equal(gate.failures[1]?.code, 'RP_GATE_LATEST_REGRESSED')
})

/**
 * Verifies gate artifact fails when rolling counters exceed configured rolling thresholds.
 */
test('render parity replay gate artifact fails on rolling threshold breach', () => {
  const gate = createReplayGateArtifact(
    '/tmp/runtime-replay.batch.dashboard.json',
    {
      maxRegressed: 0,
      maxMixed: 0,
      maxUnknown: 0,
      minProcessedCount: 1,
      maxRollingRegressed: 0,
      maxRollingMixed: 0,
      maxRollingUnknown: 0,
    },
    {
      generatedAt: '2026-05-24T00:00:00.000Z',
      dashboardPath: '/tmp/runtime-replay.batch.dashboard.json',
      processedCount: 2,
      trendCounter: {
        improved: 0,
        regressed: 0,
        mixed: 0,
        unchanged: 2,
        unknown: 0,
      },
      featureCapabilityGateCounter: {
        webglKnownRejected: 0,
        webglUnknownRejected: 0,
        webgpuKnownRejected: 0,
        webgpuUnknownRejected: 0,
      },
    },
    {
      improved: 0,
      regressed: 1,
      mixed: 0,
      unchanged: 2,
      unknown: 0,
    },
    {
      webglKnownRejected: 0,
      webglUnknownRejected: 0,
      webgpuKnownRejected: 0,
      webgpuUnknownRejected: 0,
    },
    {
      interactive: 0,
      normal: 0,
      unknown: 0,
    },
    {
      none: 0,
      fullLoad: 0,
      previewLoad: 0,
      incrementalPatch: 0,
      unknown: 0,
    },
  )

  assert.equal(gate.status, 'fail')
  assert.equal(gate.reasons.length, 1)
  assert.match(gate.reasons[0] ?? '', /rolling regressed/)
  assert.equal(gate.failures.length, 1)
  assert.equal(gate.failures[0]?.code, 'RP_GATE_ROLLING_REGRESSED')
})

/**
 * Verifies gate artifact emits dedicated feature-capability unknown failure codes when configured thresholds are exceeded.
 */
test('render parity replay gate artifact fails on feature capability unknown thresholds', () => {
  const gate = createReplayGateArtifact(
    '/tmp/runtime-replay.batch.dashboard.json',
    {
      maxRegressed: 0,
      maxMixed: 0,
      maxUnknown: 0,
      minProcessedCount: 1,
      maxWebglFeatureUnknown: 0,
      maxRollingWebgpuFeatureUnknown: 0,
    },
    {
      generatedAt: '2026-05-24T00:00:00.000Z',
      dashboardPath: '/tmp/runtime-replay.batch.dashboard.json',
      processedCount: 2,
      trendCounter: {
        improved: 0,
        regressed: 0,
        mixed: 0,
        unchanged: 2,
        unknown: 0,
      },
      featureCapabilityGateCounter: {
        webglKnownRejected: 0,
        webglUnknownRejected: 2,
        webgpuKnownRejected: 0,
        webgpuUnknownRejected: 0,
      },
    },
    {
      improved: 0,
      regressed: 0,
      mixed: 0,
      unchanged: 2,
      unknown: 0,
    },
    {
      webglKnownRejected: 0,
      webglUnknownRejected: 0,
      webgpuKnownRejected: 0,
      webgpuUnknownRejected: 1,
    },
    {
      interactive: 0,
      normal: 0,
      unknown: 0,
    },
    {
      none: 0,
      fullLoad: 0,
      previewLoad: 0,
      incrementalPatch: 0,
      unknown: 0,
    },
  )

  assert.equal(gate.status, 'fail')
  assert.equal(gate.failures.length, 2)
  assert.equal(gate.failures[0]?.code, 'RP_GATE_LATEST_WEBGL_FEATURE_UNKNOWN')
  assert.equal(gate.failures[1]?.code, 'RP_GATE_ROLLING_WEBGPU_FEATURE_UNKNOWN')
})

/**
 * Verifies gate artifact emits dedicated runtime resource unknown failure codes when configured thresholds are exceeded.
 */
test('render parity replay gate artifact fails on runtime resource unknown thresholds', () => {
  const gate = createReplayGateArtifact(
    '/tmp/runtime-replay.batch.dashboard.json',
    {
      maxRegressed: 0,
      maxMixed: 0,
      maxUnknown: 0,
      minProcessedCount: 1,
      maxResourceDecodeUnknown: 0,
      maxResourceCompressionUnknown: 0,
      maxRollingResourceDecodeUnknown: 0,
      maxRollingResourceCompressionUnknown: 0,
    },
    {
      generatedAt: '2026-05-24T00:00:00.000Z',
      dashboardPath: '/tmp/runtime-replay.batch.dashboard.json',
      processedCount: 2,
      trendCounter: {
        improved: 0,
        regressed: 0,
        mixed: 0,
        unchanged: 2,
        unknown: 0,
      },
      featureCapabilityGateCounter: {
        webglKnownRejected: 0,
        webglUnknownRejected: 0,
        webgpuKnownRejected: 0,
        webgpuUnknownRejected: 0,
      },
      frameStageSchedulerModeCounter: {
        interactive: 0,
        normal: 2,
        unknown: 0,
      },
      frameStageSceneApplyModeCounter: {
        none: 0,
        fullLoad: 1,
        previewLoad: 1,
        incrementalPatch: 0,
        unknown: 0,
      },
      runtimeResourceDecodeStatusCounter: {
        queued: 0,
        decoding: 0,
        ready: 1,
        failed: 0,
        unknown: 1,
      },
      runtimeResourceCompressionCodecCounter: {
        none: 1,
        brotli: 0,
        gzip: 0,
        zstd: 0,
        lz4: 0,
        unknown: 1,
      },
    },
    {
      improved: 0,
      regressed: 0,
      mixed: 0,
      unchanged: 2,
      unknown: 0,
    },
    {
      webglKnownRejected: 0,
      webglUnknownRejected: 0,
      webgpuKnownRejected: 0,
      webgpuUnknownRejected: 0,
    },
    {
      interactive: 0,
      normal: 2,
      unknown: 0,
    },
    {
      none: 0,
      fullLoad: 1,
      previewLoad: 1,
      incrementalPatch: 0,
      unknown: 0,
    },
    {
      queued: 0,
      decoding: 0,
      ready: 1,
      failed: 0,
      unknown: 1,
    },
    {
      none: 1,
      brotli: 0,
      gzip: 0,
      zstd: 0,
      lz4: 0,
      unknown: 1,
    },
  )

  assert.equal(gate.status, 'fail')
  assert.equal(gate.failures.length, 4)
  assert.equal(gate.failures[0]?.code, 'RP_GATE_LATEST_RESOURCE_DECODE_UNKNOWN')
  assert.equal(gate.failures[1]?.code, 'RP_GATE_LATEST_RESOURCE_COMPRESSION_UNKNOWN')
  assert.equal(gate.failures[2]?.code, 'RP_GATE_ROLLING_RESOURCE_DECODE_UNKNOWN')
  assert.equal(gate.failures[3]?.code, 'RP_GATE_ROLLING_RESOURCE_COMPRESSION_UNKNOWN')
})

/**
 * Verifies runtime resource unknown checks remain disabled when no resource thresholds are provided.
 */
test('render parity replay gate artifact keeps runtime resource unknown branches optional', () => {
  const gate = createReplayGateArtifact(
    '/tmp/runtime-replay.batch.dashboard.json',
    {
      maxRegressed: 0,
      maxMixed: 0,
      maxUnknown: 0,
      minProcessedCount: 1,
    },
    {
      generatedAt: '2026-05-24T00:00:00.000Z',
      dashboardPath: '/tmp/runtime-replay.batch.dashboard.json',
      processedCount: 2,
      trendCounter: {
        improved: 0,
        regressed: 0,
        mixed: 0,
        unchanged: 2,
        unknown: 0,
      },
      featureCapabilityGateCounter: {
        webglKnownRejected: 0,
        webglUnknownRejected: 0,
        webgpuKnownRejected: 0,
        webgpuUnknownRejected: 0,
      },
      frameStageSchedulerModeCounter: {
        interactive: 0,
        normal: 2,
        unknown: 0,
      },
      frameStageSceneApplyModeCounter: {
        none: 0,
        fullLoad: 1,
        previewLoad: 1,
        incrementalPatch: 0,
        unknown: 0,
      },
      runtimeResourceDecodeStatusCounter: {
        queued: 0,
        decoding: 0,
        ready: 1,
        failed: 0,
        unknown: 1,
      },
      runtimeResourceCompressionCodecCounter: {
        none: 1,
        brotli: 0,
        gzip: 0,
        zstd: 0,
        lz4: 0,
        unknown: 1,
      },
    },
    {
      improved: 0,
      regressed: 0,
      mixed: 0,
      unchanged: 2,
      unknown: 0,
    },
    {
      webglKnownRejected: 0,
      webglUnknownRejected: 0,
      webgpuKnownRejected: 0,
      webgpuUnknownRejected: 0,
    },
    {
      interactive: 0,
      normal: 2,
      unknown: 0,
    },
    {
      none: 0,
      fullLoad: 1,
      previewLoad: 1,
      incrementalPatch: 0,
      unknown: 0,
    },
    {
      queued: 0,
      decoding: 0,
      ready: 1,
      failed: 0,
      unknown: 1,
    },
    {
      none: 1,
      brotli: 0,
      gzip: 0,
      zstd: 0,
      lz4: 0,
      unknown: 1,
    },
  )

  assert.equal(gate.status, 'pass')
  assert.equal(
    gate.failures.some((failure) => failure.code.includes('RESOURCE') && failure.code.endsWith('_UNKNOWN')),
    false,
  )
})

/**
 * Verifies gate artifact emits dedicated runtime resource unknown-rate failure codes when configured thresholds are exceeded.
 */
test('render parity replay gate artifact fails on runtime resource unknown rate thresholds', () => {
  const gate = createReplayGateArtifact(
    '/tmp/runtime-replay.batch.dashboard.json',
    {
      maxRegressed: 0,
      maxMixed: 0,
      maxUnknown: 0,
      minProcessedCount: 1,
      maxResourceDecodeUnknownRatePercent: 40,
      maxResourceCompressionUnknownRatePercent: 40,
      maxRollingResourceDecodeUnknownRatePercent: 40,
      maxRollingResourceCompressionUnknownRatePercent: 40,
    },
    {
      generatedAt: '2026-05-24T00:00:00.000Z',
      dashboardPath: '/tmp/runtime-replay.batch.dashboard.json',
      processedCount: 2,
      trendCounter: {
        improved: 0,
        regressed: 0,
        mixed: 0,
        unchanged: 2,
        unknown: 0,
      },
      featureCapabilityGateCounter: {
        webglKnownRejected: 0,
        webglUnknownRejected: 0,
        webgpuKnownRejected: 0,
        webgpuUnknownRejected: 0,
      },
      frameStageSchedulerModeCounter: {
        interactive: 0,
        normal: 2,
        unknown: 0,
      },
      frameStageSceneApplyModeCounter: {
        none: 0,
        fullLoad: 1,
        previewLoad: 1,
        incrementalPatch: 0,
        unknown: 0,
      },
      runtimeResourceDecodeStatusCounter: {
        queued: 0,
        decoding: 0,
        ready: 1,
        failed: 0,
        unknown: 1,
      },
      runtimeResourceCompressionCodecCounter: {
        none: 1,
        brotli: 0,
        gzip: 0,
        zstd: 0,
        lz4: 0,
        unknown: 1,
      },
    },
    {
      improved: 0,
      regressed: 0,
      mixed: 0,
      unchanged: 2,
      unknown: 0,
    },
    {
      webglKnownRejected: 0,
      webglUnknownRejected: 0,
      webgpuKnownRejected: 0,
      webgpuUnknownRejected: 0,
    },
    {
      interactive: 0,
      normal: 2,
      unknown: 0,
    },
    {
      none: 0,
      fullLoad: 1,
      previewLoad: 1,
      incrementalPatch: 0,
      unknown: 0,
    },
    {
      queued: 0,
      decoding: 0,
      ready: 1,
      failed: 0,
      unknown: 1,
    },
    {
      none: 1,
      brotli: 0,
      gzip: 0,
      zstd: 0,
      lz4: 0,
      unknown: 1,
    },
  )

  assert.equal(gate.status, 'fail')
  assert.equal(gate.failures.length, 4)
  assert.equal(gate.failures[0]?.code, 'RP_GATE_LATEST_RESOURCE_DECODE_UNKNOWN_RATE')
  assert.equal(gate.failures[1]?.code, 'RP_GATE_LATEST_RESOURCE_COMPRESSION_UNKNOWN_RATE')
  assert.equal(gate.failures[2]?.code, 'RP_GATE_ROLLING_RESOURCE_DECODE_UNKNOWN_RATE')
  assert.equal(gate.failures[3]?.code, 'RP_GATE_ROLLING_RESOURCE_COMPRESSION_UNKNOWN_RATE')
  assert.equal(gate.resourceUnknownRateViolationSummary.exceededCount, 4)
  assert.equal(gate.resourceUnknownRateViolationSummary.latestResourceDecode.thresholdRatePercent, 40)
  assert.equal(gate.resourceUnknownRateViolationSummary.latestResourceCompression.thresholdRatePercent, 40)
  assert.equal(gate.resourceUnknownRateViolationSummary.rollingResourceDecode.thresholdRatePercent, 40)
  assert.equal(gate.resourceUnknownRateViolationSummary.rollingResourceCompression.thresholdRatePercent, 40)
})

/**
 * Verifies runtime resource unknown-rate checks remain disabled when no resource rate thresholds are provided.
 */
test('render parity replay gate artifact keeps runtime resource unknown-rate branches optional', () => {
  const gate = createReplayGateArtifact(
    '/tmp/runtime-replay.batch.dashboard.json',
    {
      maxRegressed: 0,
      maxMixed: 0,
      maxUnknown: 0,
      minProcessedCount: 1,
    },
    {
      generatedAt: '2026-05-24T00:00:00.000Z',
      dashboardPath: '/tmp/runtime-replay.batch.dashboard.json',
      processedCount: 2,
      trendCounter: {
        improved: 0,
        regressed: 0,
        mixed: 0,
        unchanged: 2,
        unknown: 0,
      },
      featureCapabilityGateCounter: {
        webglKnownRejected: 0,
        webglUnknownRejected: 0,
        webgpuKnownRejected: 0,
        webgpuUnknownRejected: 0,
      },
      frameStageSchedulerModeCounter: {
        interactive: 0,
        normal: 2,
        unknown: 0,
      },
      frameStageSceneApplyModeCounter: {
        none: 0,
        fullLoad: 1,
        previewLoad: 1,
        incrementalPatch: 0,
        unknown: 0,
      },
      runtimeResourceDecodeStatusCounter: {
        queued: 0,
        decoding: 0,
        ready: 1,
        failed: 0,
        unknown: 1,
      },
      runtimeResourceCompressionCodecCounter: {
        none: 1,
        brotli: 0,
        gzip: 0,
        zstd: 0,
        lz4: 0,
        unknown: 1,
      },
    },
    {
      improved: 0,
      regressed: 0,
      mixed: 0,
      unchanged: 2,
      unknown: 0,
    },
    {
      webglKnownRejected: 0,
      webglUnknownRejected: 0,
      webgpuKnownRejected: 0,
      webgpuUnknownRejected: 0,
    },
    {
      interactive: 0,
      normal: 2,
      unknown: 0,
    },
    {
      none: 0,
      fullLoad: 1,
      previewLoad: 1,
      incrementalPatch: 0,
      unknown: 0,
    },
    {
      queued: 0,
      decoding: 0,
      ready: 1,
      failed: 0,
      unknown: 1,
    },
    {
      none: 1,
      brotli: 0,
      gzip: 0,
      zstd: 0,
      lz4: 0,
      unknown: 1,
    },
  )

  assert.equal(gate.status, 'pass')
  assert.equal(
    gate.failures.some((failure) => failure.code.includes('RESOURCE') && failure.code.endsWith('_UNKNOWN_RATE')),
    false,
  )
  assert.equal(gate.resourceUnknownRateViolationSummary.exceededCount, 0)
  assert.equal(gate.resourceUnknownRateViolationSummary.latestResourceDecode.thresholdRatePercent, null)
  assert.equal(gate.resourceUnknownRateViolationSummary.latestResourceCompression.thresholdRatePercent, null)
  assert.equal(gate.resourceUnknownRateViolationSummary.rollingResourceDecode.thresholdRatePercent, null)
  assert.equal(gate.resourceUnknownRateViolationSummary.rollingResourceCompression.thresholdRatePercent, null)
})

/**
 * Verifies exceeded runtime resource unknown-rate dimensions produce deterministic violation summary log lines.
 */
test('render parity replay gate artifact formats exceeded runtime resource unknown-rate violation logs', () => {
  const gate = createReplayGateArtifact(
    '/tmp/runtime-replay.batch.dashboard.json',
    {
      maxRegressed: 0,
      maxMixed: 0,
      maxUnknown: 0,
      minProcessedCount: 1,
      maxResourceDecodeUnknownRatePercent: 40,
      maxRollingResourceCompressionUnknownRatePercent: 10,
    },
    {
      generatedAt: '2026-05-24T00:00:00.000Z',
      dashboardPath: '/tmp/runtime-replay.batch.dashboard.json',
      processedCount: 2,
      trendCounter: {
        improved: 0,
        regressed: 0,
        mixed: 0,
        unchanged: 2,
        unknown: 0,
      },
      featureCapabilityGateCounter: {
        webglKnownRejected: 0,
        webglUnknownRejected: 0,
        webgpuKnownRejected: 0,
        webgpuUnknownRejected: 0,
      },
      frameStageSchedulerModeCounter: {
        interactive: 0,
        normal: 2,
        unknown: 0,
      },
      frameStageSceneApplyModeCounter: {
        none: 0,
        fullLoad: 1,
        previewLoad: 1,
        incrementalPatch: 0,
        unknown: 0,
      },
      runtimeResourceDecodeStatusCounter: {
        queued: 0,
        decoding: 0,
        ready: 1,
        failed: 0,
        unknown: 2,
      },
      runtimeResourceCompressionCodecCounter: {
        none: 1,
        brotli: 1,
        gzip: 0,
        zstd: 0,
        lz4: 0,
        unknown: 0,
      },
    },
    {
      improved: 0,
      regressed: 0,
      mixed: 0,
      unchanged: 2,
      unknown: 0,
    },
    {
      webglKnownRejected: 0,
      webglUnknownRejected: 0,
      webgpuKnownRejected: 0,
      webgpuUnknownRejected: 0,
    },
    {
      interactive: 0,
      normal: 2,
      unknown: 0,
    },
    {
      none: 0,
      fullLoad: 1,
      previewLoad: 1,
      incrementalPatch: 0,
      unknown: 0,
    },
    {
      queued: 0,
      decoding: 0,
      ready: 2,
      failed: 0,
      unknown: 0,
    },
    {
      none: 1,
      brotli: 1,
      gzip: 0,
      zstd: 0,
      lz4: 0,
      unknown: 1,
    },
  )

  const lines = createResourceUnknownRateViolationSummaryLogLines(
    gate.resourceUnknownRateViolationSummary,
  )

  assert.equal(lines.length, 2)
  assert.match(lines[0]?.text ?? '', /RP_GATE_LATEST_RESOURCE_DECODE_UNKNOWN_RATE/)
  assert.match(lines[1]?.text ?? '', /RP_GATE_ROLLING_RESOURCE_COMPRESSION_UNKNOWN_RATE/)
})

/**
 * Verifies runtime resource unknown-rate exceededCount stays consistent with emitted *_RESOURCE_*_UNKNOWN_RATE gate failures.
 */
test('render parity replay gate artifact keeps runtime resource unknown-rate exceededCount aligned with failure rows', () => {
  const failingGate = createReplayGateArtifact(
    '/tmp/runtime-replay.batch.dashboard.json',
    {
      maxRegressed: 0,
      maxMixed: 0,
      maxUnknown: 0,
      minProcessedCount: 1,
      maxResourceDecodeUnknownRatePercent: 40,
      maxRollingResourceCompressionUnknownRatePercent: 10,
    },
    {
      generatedAt: '2026-05-24T00:00:00.000Z',
      dashboardPath: '/tmp/runtime-replay.batch.dashboard.json',
      processedCount: 2,
      trendCounter: {
        improved: 0,
        regressed: 0,
        mixed: 0,
        unchanged: 2,
        unknown: 0,
      },
      featureCapabilityGateCounter: {
        webglKnownRejected: 0,
        webglUnknownRejected: 0,
        webgpuKnownRejected: 0,
        webgpuUnknownRejected: 0,
      },
      frameStageSchedulerModeCounter: {
        interactive: 0,
        normal: 2,
        unknown: 0,
      },
      frameStageSceneApplyModeCounter: {
        none: 0,
        fullLoad: 1,
        previewLoad: 1,
        incrementalPatch: 0,
        unknown: 0,
      },
      runtimeResourceDecodeStatusCounter: {
        queued: 0,
        decoding: 0,
        ready: 1,
        failed: 0,
        unknown: 2,
      },
      runtimeResourceCompressionCodecCounter: {
        none: 1,
        brotli: 1,
        gzip: 0,
        zstd: 0,
        lz4: 0,
        unknown: 0,
      },
    },
    {
      improved: 0,
      regressed: 0,
      mixed: 0,
      unchanged: 2,
      unknown: 0,
    },
    {
      webglKnownRejected: 0,
      webglUnknownRejected: 0,
      webgpuKnownRejected: 0,
      webgpuUnknownRejected: 0,
    },
    {
      interactive: 0,
      normal: 2,
      unknown: 0,
    },
    {
      none: 0,
      fullLoad: 1,
      previewLoad: 1,
      incrementalPatch: 0,
      unknown: 0,
    },
    {
      queued: 0,
      decoding: 0,
      ready: 2,
      failed: 0,
      unknown: 0,
    },
    {
      none: 1,
      brotli: 1,
      gzip: 0,
      zstd: 0,
      lz4: 0,
      unknown: 1,
    },
  )
  const passingGate = createReplayGateArtifact(
    '/tmp/runtime-replay.batch.dashboard.json',
    {
      maxRegressed: 0,
      maxMixed: 0,
      maxUnknown: 0,
      minProcessedCount: 1,
      maxResourceDecodeUnknownRatePercent: 100,
      maxRollingResourceCompressionUnknownRatePercent: 100,
    },
    {
      generatedAt: '2026-05-24T00:00:00.000Z',
      dashboardPath: '/tmp/runtime-replay.batch.dashboard.json',
      processedCount: 2,
      trendCounter: {
        improved: 0,
        regressed: 0,
        mixed: 0,
        unchanged: 2,
        unknown: 0,
      },
      featureCapabilityGateCounter: {
        webglKnownRejected: 0,
        webglUnknownRejected: 0,
        webgpuKnownRejected: 0,
        webgpuUnknownRejected: 0,
      },
      frameStageSchedulerModeCounter: {
        interactive: 0,
        normal: 2,
        unknown: 0,
      },
      frameStageSceneApplyModeCounter: {
        none: 0,
        fullLoad: 1,
        previewLoad: 1,
        incrementalPatch: 0,
        unknown: 0,
      },
      runtimeResourceDecodeStatusCounter: {
        queued: 0,
        decoding: 0,
        ready: 1,
        failed: 0,
        unknown: 2,
      },
      runtimeResourceCompressionCodecCounter: {
        none: 1,
        brotli: 1,
        gzip: 0,
        zstd: 0,
        lz4: 0,
        unknown: 0,
      },
    },
    {
      improved: 0,
      regressed: 0,
      mixed: 0,
      unchanged: 2,
      unknown: 0,
    },
    {
      webglKnownRejected: 0,
      webglUnknownRejected: 0,
      webgpuKnownRejected: 0,
      webgpuUnknownRejected: 0,
    },
    {
      interactive: 0,
      normal: 2,
      unknown: 0,
    },
    {
      none: 0,
      fullLoad: 1,
      previewLoad: 1,
      incrementalPatch: 0,
      unknown: 0,
    },
    {
      queued: 0,
      decoding: 0,
      ready: 2,
      failed: 0,
      unknown: 0,
    },
    {
      none: 1,
      brotli: 1,
      gzip: 0,
      zstd: 0,
      lz4: 0,
      unknown: 1,
    },
  )

  const failingUnknownRateFailureCount = failingGate.failures.filter((failure) =>
    failure.code.includes('RESOURCE') && failure.code.endsWith('_UNKNOWN_RATE')).length
  const passingUnknownRateFailureCount = passingGate.failures.filter((failure) =>
    failure.code.includes('RESOURCE') && failure.code.endsWith('_UNKNOWN_RATE')).length

  assert.equal(
    failingGate.resourceUnknownRateViolationSummary.exceededCount,
    failingUnknownRateFailureCount,
  )
  assert.equal(
    passingGate.resourceUnknownRateViolationSummary.exceededCount,
    passingUnknownRateFailureCount,
  )
})

/**
 * Verifies unified unknown-rate CLI summary includes resource and stage sections in deterministic order.
 */
test('render parity replay gate artifact formats unified unknown-rate CLI summary logs', () => {
  const gate = createReplayGateArtifact(
    '/tmp/runtime-replay.batch.dashboard.json',
    {
      maxRegressed: 0,
      maxMixed: 0,
      maxUnknown: 0,
      minProcessedCount: 1,
      maxResourceDecodeUnknownRatePercent: 40,
      maxRollingResourceCompressionUnknownRatePercent: 10,
      maxStageSchedulerUnknownRatePercent: 40,
      maxRollingStageSceneApplyUnknownRatePercent: 10,
    },
    {
      generatedAt: '2026-05-24T00:00:00.000Z',
      dashboardPath: '/tmp/runtime-replay.batch.dashboard.json',
      processedCount: 2,
      trendCounter: {
        improved: 0,
        regressed: 0,
        mixed: 0,
        unchanged: 2,
        unknown: 0,
      },
      featureCapabilityGateCounter: {
        webglKnownRejected: 0,
        webglUnknownRejected: 0,
        webgpuKnownRejected: 0,
        webgpuUnknownRejected: 0,
      },
      frameStageSchedulerModeCounter: {
        interactive: 0,
        normal: 1,
        unknown: 2,
      },
      frameStageSceneApplyModeCounter: {
        none: 1,
        fullLoad: 1,
        previewLoad: 0,
        incrementalPatch: 1,
        unknown: 0,
      },
      runtimeResourceDecodeStatusCounter: {
        queued: 0,
        decoding: 0,
        ready: 1,
        failed: 0,
        unknown: 2,
      },
      runtimeResourceCompressionCodecCounter: {
        none: 1,
        brotli: 1,
        gzip: 0,
        zstd: 0,
        lz4: 0,
        unknown: 0,
      },
    },
    {
      improved: 0,
      regressed: 0,
      mixed: 0,
      unchanged: 2,
      unknown: 0,
    },
    {
      webglKnownRejected: 0,
      webglUnknownRejected: 0,
      webgpuKnownRejected: 0,
      webgpuUnknownRejected: 0,
    },
    {
      interactive: 2,
      normal: 2,
      unknown: 0,
    },
    {
      none: 1,
      fullLoad: 1,
      previewLoad: 0,
      incrementalPatch: 1,
      unknown: 1,
    },
    {
      queued: 0,
      decoding: 0,
      ready: 2,
      failed: 0,
      unknown: 0,
    },
    {
      none: 1,
      brotli: 1,
      gzip: 0,
      zstd: 0,
      lz4: 0,
      unknown: 1,
    },
  )

  const lines = createUnknownRateCliSummaryLogLines(gate)
  const textLines = lines.map((line) => line.text)

  assert.ok(textLines[0]?.startsWith('resource-rate-exceeded:'))
  assert.match(textLines[1] ?? '', /RP_GATE_LATEST_RESOURCE_DECODE_UNKNOWN_RATE/)
  assert.match(textLines[2] ?? '', /RP_GATE_ROLLING_RESOURCE_COMPRESSION_UNKNOWN_RATE/)
  assert.ok(textLines[3]?.startsWith('stage-rate-exceeded:'))
  assert.match(textLines[4] ?? '', /RP_GATE_LATEST_STAGE_SCHEDULER_UNKNOWN_RATE/)
  assert.match(textLines[5] ?? '', /RP_GATE_ROLLING_STAGE_SCENE_APPLY_UNKNOWN_RATE/)
})

/**
 * Verifies gate artifact emits dedicated stage unknown failure codes when configured thresholds are exceeded.
 */
test('render parity replay gate artifact fails on stage unknown thresholds', () => {
  const gate = createReplayGateArtifact(
    '/tmp/runtime-replay.batch.dashboard.json',
    {
      maxRegressed: 0,
      maxMixed: 0,
      maxUnknown: 0,
      minProcessedCount: 1,
      maxStageSchedulerUnknown: 0,
      maxRollingStageSceneApplyUnknown: 0,
    },
    {
      generatedAt: '2026-05-24T00:00:00.000Z',
      dashboardPath: '/tmp/runtime-replay.batch.dashboard.json',
      processedCount: 2,
      trendCounter: {
        improved: 0,
        regressed: 0,
        mixed: 0,
        unchanged: 2,
        unknown: 0,
      },
      featureCapabilityGateCounter: {
        webglKnownRejected: 0,
        webglUnknownRejected: 0,
        webgpuKnownRejected: 0,
        webgpuUnknownRejected: 0,
      },
      frameStageSchedulerModeCounter: {
        interactive: 0,
        normal: 0,
        unknown: 2,
      },
      frameStageSceneApplyModeCounter: {
        none: 0,
        fullLoad: 0,
        previewLoad: 0,
        incrementalPatch: 0,
        unknown: 0,
      },
    },
    {
      improved: 0,
      regressed: 0,
      mixed: 0,
      unchanged: 2,
      unknown: 0,
    },
    {
      webglKnownRejected: 0,
      webglUnknownRejected: 0,
      webgpuKnownRejected: 0,
      webgpuUnknownRejected: 0,
    },
    {
      interactive: 0,
      normal: 1,
      unknown: 0,
    },
    {
      none: 0,
      fullLoad: 0,
      previewLoad: 0,
      incrementalPatch: 0,
      unknown: 1,
    },
  )

  assert.equal(gate.status, 'fail')
  assert.equal(gate.failures.length, 2)
  assert.equal(gate.failures[0]?.code, 'RP_GATE_LATEST_STAGE_SCHEDULER_UNKNOWN')
  assert.equal(gate.failures[1]?.code, 'RP_GATE_ROLLING_STAGE_SCENE_APPLY_UNKNOWN')
})

/**
 * Verifies gate artifact emits dedicated stage unknown-rate failure codes when configured thresholds are exceeded.
 */
test('render parity replay gate artifact fails on stage unknown rate thresholds', () => {
  const gate = createReplayGateArtifact(
    '/tmp/runtime-replay.batch.dashboard.json',
    {
      maxRegressed: 0,
      maxMixed: 0,
      maxUnknown: 0,
      minProcessedCount: 1,
      maxStageSchedulerUnknownRatePercent: 40,
      maxRollingStageSceneApplyUnknownRatePercent: 10,
    },
    {
      generatedAt: '2026-05-24T00:00:00.000Z',
      dashboardPath: '/tmp/runtime-replay.batch.dashboard.json',
      processedCount: 2,
      trendCounter: {
        improved: 0,
        regressed: 0,
        mixed: 0,
        unchanged: 2,
        unknown: 0,
      },
      featureCapabilityGateCounter: {
        webglKnownRejected: 0,
        webglUnknownRejected: 0,
        webgpuKnownRejected: 0,
        webgpuUnknownRejected: 0,
      },
      frameStageSchedulerModeCounter: {
        interactive: 0,
        normal: 1,
        unknown: 2,
      },
      frameStageSceneApplyModeCounter: {
        none: 1,
        fullLoad: 1,
        previewLoad: 0,
        incrementalPatch: 1,
        unknown: 0,
      },
    },
    {
      improved: 0,
      regressed: 0,
      mixed: 0,
      unchanged: 2,
      unknown: 0,
    },
    {
      webglKnownRejected: 0,
      webglUnknownRejected: 0,
      webgpuKnownRejected: 0,
      webgpuUnknownRejected: 0,
    },
    {
      interactive: 2,
      normal: 2,
      unknown: 0,
    },
    {
      none: 1,
      fullLoad: 1,
      previewLoad: 0,
      incrementalPatch: 1,
      unknown: 1,
    },
  )

  assert.equal(gate.status, 'fail')
  assert.equal(gate.failures.length, 2)
  assert.equal(gate.failures[0]?.code, 'RP_GATE_LATEST_STAGE_SCHEDULER_UNKNOWN_RATE')
  assert.equal(gate.failures[1]?.code, 'RP_GATE_ROLLING_STAGE_SCENE_APPLY_UNKNOWN_RATE')
  assert.ok(
    Math.abs(gate.stageUnknownRatePercentSummary.latestStageSchedulerUnknownRatePercent - 66.66666666666666)
      < 0.000001,
  )
  assert.ok(
    Math.abs(gate.stageUnknownRatePercentSummary.rollingStageSceneApplyUnknownRatePercent - 25)
      < 0.000001,
  )
  assert.equal(gate.stageUnknownRateViolationSummary.exceededCount, 2)
  assert.equal(gate.stageUnknownRateViolationSummary.latestStageScheduler.exceeded, true)
  assert.equal(gate.stageUnknownRateViolationSummary.latestStageScheduler.thresholdRatePercent, 40)
  assert.equal(gate.stageUnknownRateViolationSummary.rollingStageSceneApply.exceeded, true)
  assert.equal(gate.stageUnknownRateViolationSummary.rollingStageSceneApply.thresholdRatePercent, 10)
})

/**
 * Verifies stage unknown-rate checks remain disabled when no rate thresholds are provided.
 */
test('render parity replay gate artifact keeps rate branches optional', () => {
  const gate = createReplayGateArtifact(
    '/tmp/runtime-replay.batch.dashboard.json',
    {
      maxRegressed: 0,
      maxMixed: 0,
      maxUnknown: 0,
      minProcessedCount: 1,
    },
    {
      generatedAt: '2026-05-24T00:00:00.000Z',
      dashboardPath: '/tmp/runtime-replay.batch.dashboard.json',
      processedCount: 2,
      trendCounter: {
        improved: 0,
        regressed: 0,
        mixed: 0,
        unchanged: 2,
        unknown: 0,
      },
      featureCapabilityGateCounter: {
        webglKnownRejected: 0,
        webglUnknownRejected: 0,
        webgpuKnownRejected: 0,
        webgpuUnknownRejected: 0,
      },
      frameStageSchedulerModeCounter: {
        interactive: 0,
        normal: 0,
        unknown: 2,
      },
      frameStageSceneApplyModeCounter: {
        none: 0,
        fullLoad: 0,
        previewLoad: 0,
        incrementalPatch: 0,
        unknown: 2,
      },
    },
    {
      improved: 0,
      regressed: 0,
      mixed: 0,
      unchanged: 2,
      unknown: 0,
    },
    {
      webglKnownRejected: 0,
      webglUnknownRejected: 0,
      webgpuKnownRejected: 0,
      webgpuUnknownRejected: 0,
    },
    {
      interactive: 0,
      normal: 0,
      unknown: 2,
    },
    {
      none: 0,
      fullLoad: 0,
      previewLoad: 0,
      incrementalPatch: 0,
      unknown: 2,
    },
  )

  assert.equal(gate.status, 'pass')
  assert.equal(
    gate.failures.some((failure) => failure.code.endsWith('_UNKNOWN_RATE')),
    false,
  )
  assert.equal(gate.stageUnknownRatePercentSummary.latestStageSchedulerUnknownRatePercent, 100)
  assert.equal(gate.stageUnknownRatePercentSummary.latestStageSceneApplyUnknownRatePercent, 100)
  assert.equal(gate.stageUnknownRateViolationSummary.exceededCount, 0)
  assert.equal(gate.stageUnknownRateViolationSummary.latestStageScheduler.thresholdRatePercent, null)
  assert.equal(gate.stageUnknownRateViolationSummary.latestStageSceneApply.thresholdRatePercent, null)
  assert.equal(gate.stageUnknownRateViolationSummary.rollingStageScheduler.thresholdRatePercent, null)
  assert.equal(gate.stageUnknownRateViolationSummary.rollingStageSceneApply.thresholdRatePercent, null)
})

/**
 * Verifies exceeded stage unknown-rate dimensions produce deterministic violation summary log lines.
 */
test('render parity replay gate artifact formats exceeded stage unknown-rate violation logs', () => {
  const gate = createReplayGateArtifact(
    '/tmp/runtime-replay.batch.dashboard.json',
    {
      maxRegressed: 0,
      maxMixed: 0,
      maxUnknown: 0,
      minProcessedCount: 1,
      maxStageSchedulerUnknownRatePercent: 40,
      maxRollingStageSceneApplyUnknownRatePercent: 10,
    },
    {
      generatedAt: '2026-05-24T00:00:00.000Z',
      dashboardPath: '/tmp/runtime-replay.batch.dashboard.json',
      processedCount: 2,
      trendCounter: {
        improved: 0,
        regressed: 0,
        mixed: 0,
        unchanged: 2,
        unknown: 0,
      },
      featureCapabilityGateCounter: {
        webglKnownRejected: 0,
        webglUnknownRejected: 0,
        webgpuKnownRejected: 0,
        webgpuUnknownRejected: 0,
      },
      frameStageSchedulerModeCounter: {
        interactive: 0,
        normal: 1,
        unknown: 2,
      },
      frameStageSceneApplyModeCounter: {
        none: 1,
        fullLoad: 1,
        previewLoad: 0,
        incrementalPatch: 1,
        unknown: 0,
      },
    },
    {
      improved: 0,
      regressed: 0,
      mixed: 0,
      unchanged: 2,
      unknown: 0,
    },
    {
      webglKnownRejected: 0,
      webglUnknownRejected: 0,
      webgpuKnownRejected: 0,
      webgpuUnknownRejected: 0,
    },
    {
      interactive: 2,
      normal: 2,
      unknown: 0,
    },
    {
      none: 1,
      fullLoad: 1,
      previewLoad: 0,
      incrementalPatch: 1,
      unknown: 1,
    },
  )

  const lines = createStageUnknownRateViolationSummaryLogLines(gate.stageUnknownRateViolationSummary)

  assert.equal(lines.length, 2)
  assert.match(lines[0]?.text ?? '', /RP_GATE_LATEST_STAGE_SCHEDULER_UNKNOWN_RATE/)
  assert.match(lines[1]?.text ?? '', /RP_GATE_ROLLING_STAGE_SCENE_APPLY_UNKNOWN_RATE/)
})

/**
 * Verifies stage unknown-rate exceededCount stays consistent with emitted *_UNKNOWN_RATE gate failures.
 */
test('render parity replay gate artifact keeps stage unknown-rate exceededCount aligned with failure rows', () => {
  const failingGate = createReplayGateArtifact(
    '/tmp/runtime-replay.batch.dashboard.json',
    {
      maxRegressed: 0,
      maxMixed: 0,
      maxUnknown: 0,
      minProcessedCount: 1,
      maxStageSchedulerUnknownRatePercent: 40,
      maxRollingStageSceneApplyUnknownRatePercent: 10,
    },
    {
      generatedAt: '2026-05-24T00:00:00.000Z',
      dashboardPath: '/tmp/runtime-replay.batch.dashboard.json',
      processedCount: 2,
      trendCounter: {
        improved: 0,
        regressed: 0,
        mixed: 0,
        unchanged: 2,
        unknown: 0,
      },
      featureCapabilityGateCounter: {
        webglKnownRejected: 0,
        webglUnknownRejected: 0,
        webgpuKnownRejected: 0,
        webgpuUnknownRejected: 0,
      },
      frameStageSchedulerModeCounter: {
        interactive: 0,
        normal: 1,
        unknown: 2,
      },
      frameStageSceneApplyModeCounter: {
        none: 1,
        fullLoad: 1,
        previewLoad: 0,
        incrementalPatch: 1,
        unknown: 0,
      },
    },
    {
      improved: 0,
      regressed: 0,
      mixed: 0,
      unchanged: 2,
      unknown: 0,
    },
    {
      webglKnownRejected: 0,
      webglUnknownRejected: 0,
      webgpuKnownRejected: 0,
      webgpuUnknownRejected: 0,
    },
    {
      interactive: 2,
      normal: 2,
      unknown: 0,
    },
    {
      none: 1,
      fullLoad: 1,
      previewLoad: 0,
      incrementalPatch: 1,
      unknown: 1,
    },
  )
  const passingGate = createReplayGateArtifact(
    '/tmp/runtime-replay.batch.dashboard.json',
    {
      maxRegressed: 0,
      maxMixed: 0,
      maxUnknown: 0,
      minProcessedCount: 1,
      maxStageSchedulerUnknownRatePercent: 100,
      maxRollingStageSceneApplyUnknownRatePercent: 100,
    },
    {
      generatedAt: '2026-05-24T00:00:00.000Z',
      dashboardPath: '/tmp/runtime-replay.batch.dashboard.json',
      processedCount: 2,
      trendCounter: {
        improved: 0,
        regressed: 0,
        mixed: 0,
        unchanged: 2,
        unknown: 0,
      },
      featureCapabilityGateCounter: {
        webglKnownRejected: 0,
        webglUnknownRejected: 0,
        webgpuKnownRejected: 0,
        webgpuUnknownRejected: 0,
      },
      frameStageSchedulerModeCounter: {
        interactive: 0,
        normal: 1,
        unknown: 2,
      },
      frameStageSceneApplyModeCounter: {
        none: 1,
        fullLoad: 1,
        previewLoad: 0,
        incrementalPatch: 1,
        unknown: 0,
      },
    },
    {
      improved: 0,
      regressed: 0,
      mixed: 0,
      unchanged: 2,
      unknown: 0,
    },
    {
      webglKnownRejected: 0,
      webglUnknownRejected: 0,
      webgpuKnownRejected: 0,
      webgpuUnknownRejected: 0,
    },
    {
      interactive: 2,
      normal: 2,
      unknown: 0,
    },
    {
      none: 1,
      fullLoad: 1,
      previewLoad: 0,
      incrementalPatch: 1,
      unknown: 1,
    },
  )

  const failingUnknownRateFailureCount = failingGate.failures.filter((failure) =>
    failure.code.endsWith('_UNKNOWN_RATE')).length
  const passingUnknownRateFailureCount = passingGate.failures.filter((failure) =>
    failure.code.endsWith('_UNKNOWN_RATE')).length

  assert.equal(
    failingGate.stageUnknownRateViolationSummary.exceededCount,
    failingUnknownRateFailureCount,
  )
  assert.equal(
    passingGate.stageUnknownRateViolationSummary.exceededCount,
    passingUnknownRateFailureCount,
  )
})

/**
 * Verifies end-to-end history + gate run writes artifacts and returns pass for healthy dashboard.
 */
test('render parity replay history gate run persists history and pass gate', async () => {
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), 'venus-replay-history-gate-'))
  const outputDir = path.join(tempRoot, 'reports')
  const dashboardPath = path.join(outputDir, 'runtime-replay.batch.dashboard.json')
  const historyPath = path.join(outputDir, 'runtime-replay.batch.history.json')
  const gatePath = path.join(outputDir, 'runtime-replay.batch.gate.json')

  try {
    await mkdir(outputDir, {recursive: true})
    await writeFile(
      dashboardPath,
      `${JSON.stringify(
        createDashboardFixture({generatedAt: '2026-05-24T03:00:00.000Z'}),
        null,
        2,
      )}\n`,
      'utf8',
    )

    const runResult = await runRenderParityRuntimeReplayHistoryGate({
      dashboardPath,
      historyFilePath: historyPath,
      gateOutputPath: gatePath,
      windowSize: 5,
      thresholds: {
        maxRegressed: 0,
        maxMixed: 0,
        maxUnknown: 0,
        minProcessedCount: 1,
      },
    })

    assert.equal(runResult.historyArtifact.totalSnapshots, 1)
    assert.equal(runResult.gateArtifact.status, 'pass')
    assert.equal(runResult.gateArtifact.reasons.length, 0)
    assert.equal(runResult.gateArtifact.failures.length, 0)
    assert.equal(runResult.historyArtifact.rollingFrameStageSchedulerModeCounter.unknown, 0)
    assert.equal(runResult.historyArtifact.rollingFrameStageSceneApplyModeCounter.unknown, 0)
    assert.equal(runResult.historyArtifact.rollingRuntimeResourceDecodeStatusCounter.unknown, 0)
    assert.equal(runResult.historyArtifact.rollingRuntimeResourceCompressionCodecCounter.unknown, 0)
    assert.equal(runResult.gateArtifact.rollingRuntimeResourceDecodeStatusCounter.unknown, 0)
    assert.equal(runResult.gateArtifact.rollingRuntimeResourceCompressionCodecCounter.unknown, 0)
  } finally {
    await rm(tempRoot, {recursive: true, force: true})
  }
})

/**
 * Verifies end-to-end history + gate run passes with stage unknown thresholds when dashboard stage counters are known.
 */
test('render parity replay history gate run passes with stage strict thresholds', async () => {
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), 'venus-replay-history-gate-stage-strict-'))
  const outputDir = path.join(tempRoot, 'reports')
  const dashboardPath = path.join(outputDir, 'runtime-replay.batch.dashboard.json')
  const historyPath = path.join(outputDir, 'runtime-replay.batch.history.json')
  const gatePath = path.join(outputDir, 'runtime-replay.batch.gate.json')

  try {
    await mkdir(outputDir, {recursive: true})
    await writeFile(
      dashboardPath,
      `${JSON.stringify(
        createDashboardFixture({
          generatedAt: '2026-05-24T04:00:00.000Z',
          frameStageSchedulerModeCounter: {
            interactive: 1,
            normal: 1,
            unknown: 0,
          },
          frameStageSceneApplyModeCounter: {
            none: 1,
            fullLoad: 0,
            previewLoad: 0,
            incrementalPatch: 1,
            unknown: 0,
          },
        }),
        null,
        2,
      )}\n`,
      'utf8',
    )

    const runResult = await runRenderParityRuntimeReplayHistoryGate({
      dashboardPath,
      historyFilePath: historyPath,
      gateOutputPath: gatePath,
      windowSize: 5,
      thresholds: {
        maxRegressed: 0,
        maxMixed: 0,
        maxUnknown: 0,
        minProcessedCount: 1,
        maxStageSchedulerUnknown: 0,
        maxStageSceneApplyUnknown: 0,
        maxRollingStageSchedulerUnknown: 0,
        maxRollingStageSceneApplyUnknown: 0,
      },
    })

    assert.equal(runResult.gateArtifact.status, 'pass')
    assert.equal(runResult.gateArtifact.failures.length, 0)
    assert.equal(runResult.historyFilePath, path.resolve(historyPath))
    assert.equal(runResult.gateOutputPath, path.resolve(gatePath))
    assert.equal(runResult.historyArtifact.rollingFrameStageSchedulerModeCounter.unknown, 0)
    assert.equal(runResult.historyArtifact.rollingFrameStageSceneApplyModeCounter.unknown, 0)
  } finally {
    await rm(tempRoot, {recursive: true, force: true})
  }
})

/**
 * Verifies latest scene-apply unknown-rate gate fails when the latest snapshot crosses configured latest rate threshold.
 */
test('render parity replay history gate run fails on latest stage scene-apply unknown rate threshold', async () => {
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), 'venus-replay-history-gate-scene-apply-rate-latest-'))
  const outputDir = path.join(tempRoot, 'reports')
  const dashboardPath = path.join(outputDir, 'runtime-replay.batch.dashboard.json')
  const historyPath = path.join(outputDir, 'runtime-replay.batch.history.json')
  const gatePath = path.join(outputDir, 'runtime-replay.batch.gate.json')

  try {
    await mkdir(outputDir, {recursive: true})
    await writeFile(
      dashboardPath,
      `${JSON.stringify(
        createDashboardFixture({
          generatedAt: '2026-05-24T06:30:00.000Z',
          frameStageSchedulerModeCounter: {
            interactive: 2,
            normal: 0,
            unknown: 0,
          },
          frameStageSceneApplyModeCounter: {
            none: 0,
            fullLoad: 0,
            previewLoad: 0,
            incrementalPatch: 0,
            unknown: 2,
          },
        }),
        null,
        2,
      )}\n`,
      'utf8',
    )

    const runResult = await runRenderParityRuntimeReplayHistoryGate({
      dashboardPath,
      historyFilePath: historyPath,
      gateOutputPath: gatePath,
      windowSize: 5,
      thresholds: {
        maxRegressed: 0,
        maxMixed: 0,
        maxUnknown: 0,
        minProcessedCount: 1,
        maxStageSceneApplyUnknownRatePercent: 40,
      },
    })

    assert.equal(runResult.gateArtifact.status, 'fail')
    assert.equal(runResult.gateArtifact.failures.length, 1)
    assert.equal(
      runResult.gateArtifact.failures[0]?.code,
      'RP_GATE_LATEST_STAGE_SCENE_APPLY_UNKNOWN_RATE',
    )
    assert.equal(
      runResult.gateArtifact.stageUnknownRatePercentSummary.latestStageSceneApplyUnknownRatePercent,
      100,
    )
  } finally {
    await rm(tempRoot, {recursive: true, force: true})
  }
})

/**
 * Verifies latest scheduler unknown-rate gate fails when the latest snapshot crosses configured latest rate threshold.
 */
test('render parity replay history gate run fails on latest stage scheduler unknown rate threshold', async () => {
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), 'venus-replay-history-gate-scheduler-rate-latest-'))
  const outputDir = path.join(tempRoot, 'reports')
  const dashboardPath = path.join(outputDir, 'runtime-replay.batch.dashboard.json')
  const historyPath = path.join(outputDir, 'runtime-replay.batch.history.json')
  const gatePath = path.join(outputDir, 'runtime-replay.batch.gate.json')

  try {
    await mkdir(outputDir, {recursive: true})
    await writeFile(
      dashboardPath,
      `${JSON.stringify(
        createDashboardFixture({
          generatedAt: '2026-05-24T06:45:00.000Z',
          frameStageSchedulerModeCounter: {
            interactive: 0,
            normal: 0,
            unknown: 2,
          },
          frameStageSceneApplyModeCounter: {
            none: 1,
            fullLoad: 0,
            previewLoad: 0,
            incrementalPatch: 1,
            unknown: 0,
          },
        }),
        null,
        2,
      )}\n`,
      'utf8',
    )

    const runResult = await runRenderParityRuntimeReplayHistoryGate({
      dashboardPath,
      historyFilePath: historyPath,
      gateOutputPath: gatePath,
      windowSize: 5,
      thresholds: {
        maxRegressed: 0,
        maxMixed: 0,
        maxUnknown: 0,
        minProcessedCount: 1,
        maxStageSchedulerUnknownRatePercent: 40,
      },
    })

    assert.equal(runResult.gateArtifact.status, 'fail')
    assert.equal(runResult.gateArtifact.failures.length, 1)
    assert.equal(
      runResult.gateArtifact.failures[0]?.code,
      'RP_GATE_LATEST_STAGE_SCHEDULER_UNKNOWN_RATE',
    )
    assert.equal(
      runResult.gateArtifact.stageUnknownRatePercentSummary.latestStageSchedulerUnknownRatePercent,
      100,
    )
  } finally {
    await rm(tempRoot, {recursive: true, force: true})
  }
})

/**
 * Verifies rolling stage unknown-rate gate fails when multi-snapshot history crosses configured rolling rate threshold.
 */
test('render parity replay history gate run fails on rolling stage unknown rate after fluctuation', async () => {
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), 'venus-replay-history-gate-stage-rate-rolling-'))
  const outputDir = path.join(tempRoot, 'reports')
  const dashboardPath = path.join(outputDir, 'runtime-replay.batch.dashboard.json')
  const historyPath = path.join(outputDir, 'runtime-replay.batch.history.json')
  const gatePath = path.join(outputDir, 'runtime-replay.batch.gate.json')

  try {
    await mkdir(outputDir, {recursive: true})
    await writeFile(
      dashboardPath,
      `${JSON.stringify(
        createDashboardFixture({
          generatedAt: '2026-05-24T05:00:00.000Z',
          frameStageSchedulerModeCounter: {
            interactive: 2,
            normal: 0,
            unknown: 0,
          },
          frameStageSceneApplyModeCounter: {
            none: 2,
            fullLoad: 0,
            previewLoad: 0,
            incrementalPatch: 0,
            unknown: 0,
          },
        }),
        null,
        2,
      )}\n`,
      'utf8',
    )

    const firstRunResult = await runRenderParityRuntimeReplayHistoryGate({
      dashboardPath,
      historyFilePath: historyPath,
      gateOutputPath: gatePath,
      windowSize: 5,
      thresholds: {
        maxRegressed: 0,
        maxMixed: 0,
        maxUnknown: 0,
        minProcessedCount: 1,
        maxRollingStageSchedulerUnknownRatePercent: 60,
      },
    })

    assert.equal(firstRunResult.gateArtifact.status, 'pass')

    await writeFile(
      dashboardPath,
      `${JSON.stringify(
        createDashboardFixture({
          generatedAt: '2026-05-24T06:00:00.000Z',
          frameStageSchedulerModeCounter: {
            interactive: 0,
            normal: 0,
            unknown: 2,
          },
          frameStageSceneApplyModeCounter: {
            none: 0,
            fullLoad: 0,
            previewLoad: 0,
            incrementalPatch: 0,
            unknown: 2,
          },
        }),
        null,
        2,
      )}\n`,
      'utf8',
    )

    const secondRunResult = await runRenderParityRuntimeReplayHistoryGate({
      dashboardPath,
      historyFilePath: historyPath,
      gateOutputPath: gatePath,
      windowSize: 5,
      thresholds: {
        maxRegressed: 0,
        maxMixed: 0,
        maxUnknown: 0,
        minProcessedCount: 1,
        maxRollingStageSchedulerUnknownRatePercent: 40,
      },
    })

    assert.equal(secondRunResult.gateArtifact.status, 'fail')
    assert.equal(secondRunResult.gateArtifact.failures.length, 1)
    assert.equal(
      secondRunResult.gateArtifact.failures[0]?.code,
      'RP_GATE_ROLLING_STAGE_SCHEDULER_UNKNOWN_RATE',
    )
    assert.equal(
      secondRunResult.gateArtifact.stageUnknownRatePercentSummary.rollingStageSchedulerUnknownRatePercent,
      50,
    )
  } finally {
    await rm(tempRoot, {recursive: true, force: true})
  }
})

/**
 * Verifies rolling scene-apply unknown-rate gate fails when multi-snapshot history crosses configured rolling rate threshold.
 */
test('render parity replay history gate run fails on rolling stage scene-apply unknown rate after fluctuation', async () => {
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), 'venus-replay-history-gate-scene-apply-rate-rolling-'))
  const outputDir = path.join(tempRoot, 'reports')
  const dashboardPath = path.join(outputDir, 'runtime-replay.batch.dashboard.json')
  const historyPath = path.join(outputDir, 'runtime-replay.batch.history.json')
  const gatePath = path.join(outputDir, 'runtime-replay.batch.gate.json')

  try {
    await mkdir(outputDir, {recursive: true})
    await writeFile(
      dashboardPath,
      `${JSON.stringify(
        createDashboardFixture({
          generatedAt: '2026-05-24T07:00:00.000Z',
          frameStageSchedulerModeCounter: {
            interactive: 2,
            normal: 0,
            unknown: 0,
          },
          frameStageSceneApplyModeCounter: {
            none: 2,
            fullLoad: 0,
            previewLoad: 0,
            incrementalPatch: 0,
            unknown: 0,
          },
        }),
        null,
        2,
      )}\n`,
      'utf8',
    )

    const firstRunResult = await runRenderParityRuntimeReplayHistoryGate({
      dashboardPath,
      historyFilePath: historyPath,
      gateOutputPath: gatePath,
      windowSize: 5,
      thresholds: {
        maxRegressed: 0,
        maxMixed: 0,
        maxUnknown: 0,
        minProcessedCount: 1,
        maxRollingStageSceneApplyUnknownRatePercent: 60,
      },
    })

    assert.equal(firstRunResult.gateArtifact.status, 'pass')

    await writeFile(
      dashboardPath,
      `${JSON.stringify(
        createDashboardFixture({
          generatedAt: '2026-05-24T08:00:00.000Z',
          frameStageSchedulerModeCounter: {
            interactive: 2,
            normal: 0,
            unknown: 0,
          },
          frameStageSceneApplyModeCounter: {
            none: 0,
            fullLoad: 0,
            previewLoad: 0,
            incrementalPatch: 0,
            unknown: 2,
          },
        }),
        null,
        2,
      )}\n`,
      'utf8',
    )

    const secondRunResult = await runRenderParityRuntimeReplayHistoryGate({
      dashboardPath,
      historyFilePath: historyPath,
      gateOutputPath: gatePath,
      windowSize: 5,
      thresholds: {
        maxRegressed: 0,
        maxMixed: 0,
        maxUnknown: 0,
        minProcessedCount: 1,
        maxRollingStageSceneApplyUnknownRatePercent: 40,
      },
    })

    assert.equal(secondRunResult.gateArtifact.status, 'fail')
    assert.equal(secondRunResult.gateArtifact.failures.length, 1)
    assert.equal(
      secondRunResult.gateArtifact.failures[0]?.code,
      'RP_GATE_ROLLING_STAGE_SCENE_APPLY_UNKNOWN_RATE',
    )
    assert.equal(
      secondRunResult.gateArtifact.stageUnknownRatePercentSummary.rollingStageSceneApplyUnknownRatePercent,
      50,
    )
  } finally {
    await rm(tempRoot, {recursive: true, force: true})
  }
})

/**
 * Verifies stage-strict package scripts remain isolated to dedicated stage history/gate artifacts.
 */
test('render parity stage-strict scripts keep dedicated history and gate paths', async () => {
  const packageJsonPath = path.resolve(process.cwd(), 'package.json')
  const raw = await readFile(packageJsonPath, 'utf8')
  const parsed = JSON.parse(raw) as {
    scripts?: Record<string, string>
  }

  const stageStrictHistoryScript = parsed.scripts?.['report:render-parity-runtime-replay-history-gate:strict:stage']
  const stageStrictBatchScript = parsed.scripts?.['report:render-parity-runtime-replay-batch-gate:strict:stage']
  const defaultStrictHistoryScript = parsed.scripts?.['report:render-parity-runtime-replay-history-gate:strict']

  assert.equal(typeof stageStrictHistoryScript, 'string')
  assert.equal(typeof stageStrictBatchScript, 'string')
  assert.equal(typeof defaultStrictHistoryScript, 'string')

  assert.match(stageStrictHistoryScript ?? '', /runtime-replay\.stage\.batch\.history\.json/)
  assert.match(stageStrictHistoryScript ?? '', /runtime-replay\.stage\.batch\.gate\.json/)
  assert.ok(!(stageStrictHistoryScript ?? '').includes('runtime-replay.batch.history.json'))
  assert.ok(!(stageStrictHistoryScript ?? '').includes('runtime-replay.batch.gate.json'))
  assert.match(stageStrictHistoryScript ?? '', /--max-stage-scheduler-unknown-rate-percent\s+0/)
  assert.match(stageStrictHistoryScript ?? '', /--max-stage-scene-apply-unknown-rate-percent\s+0/)
  assert.match(stageStrictHistoryScript ?? '', /--max-rolling-stage-scheduler-unknown-rate-percent\s+0/)
  assert.match(stageStrictHistoryScript ?? '', /--max-rolling-stage-scene-apply-unknown-rate-percent\s+0/)
  assert.match(stageStrictBatchScript ?? '', /report:render-parity-runtime-replay-history-gate:strict:stage/)
  assert.match(defaultStrictHistoryScript ?? '', /runtime-replay\.batch\.history\.json/)
})

/**
 * Verifies stage-strict script preserves dedicated artifact cleanup to avoid rolling-history contamination.
 */
test('render parity stage-strict script clears dedicated artifacts before running gate', async () => {
  const packageJsonPath = path.resolve(process.cwd(), 'package.json')
  const raw = await readFile(packageJsonPath, 'utf8')
  const parsed = JSON.parse(raw) as {
    scripts?: Record<string, string>
  }

  const stageStrictHistoryScript = parsed.scripts?.['report:render-parity-runtime-replay-history-gate:strict:stage']

  assert.equal(typeof stageStrictHistoryScript, 'string')
  assert.match(stageStrictHistoryScript ?? '', /^rm -f\s+/)
  assert.match(stageStrictHistoryScript ?? '', /runtime-replay\.stage\.batch\.history\.json/)
  assert.match(stageStrictHistoryScript ?? '', /runtime-replay\.stage\.batch\.gate\.json/)
  assert.match(stageStrictHistoryScript ?? '', /&&\s+pnpm\s+dlx\s+tsx\s+\.\/scripts\/render-parity-runtime-replay-history-gate\.ts/)
  assert.ok(!(stageStrictHistoryScript ?? '').includes('rm -f ./docs/product-requirements/render-parity-reports/runtime-replay.batch.history.json'))
})

/**
 * Verifies resource-rate strict package scripts remain isolated to dedicated resource-rate history/gate artifacts.
 */
test('render parity resource-rate strict scripts keep dedicated history and gate paths', async () => {
  const packageJsonPath = path.resolve(process.cwd(), 'package.json')
  const raw = await readFile(packageJsonPath, 'utf8')
  const parsed = JSON.parse(raw) as {
    scripts?: Record<string, string>
  }

  const resourceRateStrictHistoryScript =
    parsed.scripts?.['report:render-parity-runtime-replay-history-gate:strict:resource-rate']
  const resourceRateStrictBatchScript =
    parsed.scripts?.['report:render-parity-runtime-replay-batch-gate:strict:resource-rate']
  const defaultStrictHistoryScript = parsed.scripts?.['report:render-parity-runtime-replay-history-gate:strict']

  assert.equal(typeof resourceRateStrictHistoryScript, 'string')
  assert.equal(typeof resourceRateStrictBatchScript, 'string')
  assert.equal(typeof defaultStrictHistoryScript, 'string')

  assert.match(resourceRateStrictHistoryScript ?? '', /runtime-replay\.resource-rate\.batch\.history\.json/)
  assert.match(resourceRateStrictHistoryScript ?? '', /runtime-replay\.resource-rate\.batch\.gate\.json/)
  assert.ok(!(resourceRateStrictHistoryScript ?? '').includes('runtime-replay.batch.history.json'))
  assert.ok(!(resourceRateStrictHistoryScript ?? '').includes('runtime-replay.batch.gate.json'))
  assert.match(resourceRateStrictHistoryScript ?? '', /--max-resource-decode-unknown-rate-percent\s+0/)
  assert.match(resourceRateStrictHistoryScript ?? '', /--max-resource-compression-unknown-rate-percent\s+0/)
  assert.match(resourceRateStrictHistoryScript ?? '', /--max-rolling-resource-decode-unknown-rate-percent\s+0/)
  assert.match(resourceRateStrictHistoryScript ?? '', /--max-rolling-resource-compression-unknown-rate-percent\s+0/)
  assert.match(
    resourceRateStrictBatchScript ?? '',
    /report:render-parity-runtime-replay-history-gate:strict:resource-rate/,
  )
  assert.match(defaultStrictHistoryScript ?? '', /runtime-replay\.batch\.history\.json/)
})

/**
 * Verifies resource-rate strict script preserves dedicated artifact cleanup to avoid rolling-history contamination.
 */
test('render parity resource-rate strict script clears dedicated artifacts before running gate', async () => {
  const packageJsonPath = path.resolve(process.cwd(), 'package.json')
  const raw = await readFile(packageJsonPath, 'utf8')
  const parsed = JSON.parse(raw) as {
    scripts?: Record<string, string>
  }

  const resourceRateStrictHistoryScript =
    parsed.scripts?.['report:render-parity-runtime-replay-history-gate:strict:resource-rate']

  assert.equal(typeof resourceRateStrictHistoryScript, 'string')
  assert.match(resourceRateStrictHistoryScript ?? '', /^rm -f\s+/)
  assert.match(resourceRateStrictHistoryScript ?? '', /runtime-replay\.resource-rate\.batch\.history\.json/)
  assert.match(resourceRateStrictHistoryScript ?? '', /runtime-replay\.resource-rate\.batch\.gate\.json/)
  assert.match(resourceRateStrictHistoryScript ?? '', /&&\s+pnpm\s+dlx\s+tsx\s+\.\/scripts\/render-parity-runtime-replay-history-gate\.ts/)
  assert.ok(!(resourceRateStrictHistoryScript ?? '').includes('rm -f ./docs/product-requirements/render-parity-reports/runtime-replay.batch.history.json'))
})

/**
 * Verifies CI workflow keeps strict replay gate execution and code-based failure routing enabled.
 */
test('render parity strict gate workflow keeps PR strict command and code routing', async () => {
  const workflowPath = path.resolve(
    process.cwd(),
    '../../.github/workflows/render-parity-strict-gate.yml',
  )
  const workflow = await readFile(workflowPath, 'utf8')

  assert.match(workflow, /pull_request:/)
  assert.match(workflow, /report:render-parity-runtime-replay-batch-gate:strict/)
  assert.match(workflow, /runtime-replay\.batch\.gate\.json/)
  assert.match(workflow, /RenderParityGate/)
  assert.match(workflow, /RP_GATE_/)
})
