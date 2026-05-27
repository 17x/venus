import assert from 'node:assert/strict'
import test from 'node:test'

import {
  createNextReplayHistory,
  createReplayGateArtifact,
  createRollingFrameStageSceneApplyModeCounter,
  createRollingFrameStageSchedulerModeCounter,
  createRollingRuntimeResourceCompressionCodecCounter,
  createRollingRuntimeResourceDecodeStatusCounter,
  createRollingTrendCounter,
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
