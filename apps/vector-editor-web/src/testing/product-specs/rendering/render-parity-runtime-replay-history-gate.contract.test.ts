import assert from 'node:assert/strict'
import test from 'node:test'

import {
  createReplayGateArtifact,
} from '../../../../scripts/render-parity-runtime-replay-history-gate.ts'

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
