import assert from 'node:assert/strict'
import test from 'node:test'

import {
  createUnknownRateCliSummaryLogLines,
  createReplayGateArtifact,
} from '../../../../scripts/render-parity-runtime-replay-history-gate.ts'

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
