import assert from 'node:assert/strict'
import test from 'node:test'

import {
  createReplayGateArtifact,
} from '../../../../scripts/render-parity-runtime-replay-history-gate.ts'

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
