import assert from 'node:assert/strict'
import test from 'node:test'

import {
  createResourceUnknownRateViolationSummaryLogLines,
  createReplayGateArtifact,
} from '../../../../scripts/render-parity-runtime-replay-history-gate.ts'

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
