import assert from 'node:assert/strict'
import test from 'node:test'

import {
  createStageUnknownRateViolationSummaryLogLines,
  createReplayGateArtifact,
} from '../../../../scripts/render-parity-runtime-replay-history-gate.ts'

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
