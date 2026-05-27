import assert from 'node:assert/strict'
import test from 'node:test'

import {
  createReplayGateArtifact,
} from '../../../../scripts/render-parity-runtime-replay-history-gate.ts'

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
