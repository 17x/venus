import assert from 'node:assert/strict'
import {mkdir, mkdtemp, rm, writeFile} from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'

import {
  createUnknownRateCliSummaryLogLines,
  createResourceUnknownRateViolationSummaryLogLines,
  createStageUnknownRateViolationSummaryLogLines,
  createReplayGateArtifact,
  runRenderParityRuntimeReplayHistoryGate,
  type RenderParityReplayBatchDashboardArtifact,
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

