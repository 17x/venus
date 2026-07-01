import assert from 'node:assert/strict'
import test from 'node:test'

import {
  createRenderParityCaptureReleaseGateStabilityReport,
} from '../../../runtime/engine-bridge/renderParityCaptureReleaseGateStability.ts'

test('render parity capture release stability recommends PR candidate for stable passing runs', () => {
  const report = createRenderParityCaptureReleaseGateStabilityReport([
    {
      status: 'pass',
      durationMs: 1000,
      captureDurationMs: 200,
      capturedCount: 1,
      failureCodes: [],
      frameArtifactStatusCounter: {pass: 1, degraded: 0, unknown: 0, missing: 0, invalid: 0},
    },
    {
      status: 'pass',
      durationMs: 1200,
      captureDurationMs: 250,
      capturedCount: 1,
      failureCodes: [],
      frameArtifactStatusCounter: {pass: 1, degraded: 0, unknown: 0, missing: 0, invalid: 0},
    },
    {
      status: 'pass',
      durationMs: 900,
      captureDurationMs: 180,
      capturedCount: 1,
      failureCodes: [],
      frameArtifactStatusCounter: {pass: 1, degraded: 0, unknown: 0, missing: 0, invalid: 0},
    },
  ])

  assert.equal(report.runCount, 3)
  assert.equal(report.passCount, 3)
  assert.equal(report.failCount, 0)
  assert.equal(report.passRatePercent, 100)
  assert.equal(report.maxDurationMs, 1200)
  assert.equal(report.averageDurationMs, 1033.33)
  assert.equal(report.frameArtifactIssueCount, 0)
  assert.equal(report.frameArtifactStatusCounter.pass, 3)
  assert.equal(report.totalCapturedCount, 3)
  assert.equal(report.promotionRecommendation, 'promote-to-pr-candidate')
  assert.equal(report.promotionGateStatus, 'pass')
  assert.deepEqual(report.reasons, [])
  assert.equal(report.prRequiredRolloutRecommendation, 'keep-manual-observation')
  assert.match(report.prRequiredRolloutReasons.join('\n'), /runCount 3 is below PR rollout minRunCount 5/)
})

test('render parity capture release stability keeps manual when failures or frame issues exist', () => {
  const report = createRenderParityCaptureReleaseGateStabilityReport([
    {
      status: 'pass',
      durationMs: 1000,
      captureDurationMs: 200,
      failureCodes: [],
      frameArtifactStatusCounter: {pass: 1, degraded: 0, unknown: 0, missing: 0, invalid: 0},
    },
    {
      status: 'fail',
      durationMs: 150000,
      captureDurationMs: 500,
      failureCodes: ['RP_GATE_LATEST_FRAME_ARTIFACT_UNKNOWN'],
      frameArtifactStatusCounter: {pass: 0, degraded: 0, unknown: 1, missing: 0, invalid: 0},
    },
  ], {
    minRunCount: 3,
    maxFailureCount: 0,
    maxDurationMs: 120000,
    maxFrameArtifactIssueCount: 0,
  })

  assert.equal(report.runCount, 2)
  assert.equal(report.failCount, 1)
  assert.equal(report.passRatePercent, 50)
  assert.equal(report.frameArtifactIssueCount, 1)
  assert.equal(report.failureCodeCounter.RP_GATE_LATEST_FRAME_ARTIFACT_UNKNOWN, 1)
  assert.equal(report.promotionRecommendation, 'keep-manual')
  assert.equal(report.promotionGateStatus, 'fail')
  assert.equal(report.prRequiredRolloutRecommendation, 'keep-manual-observation')
  assert.equal(report.reasons.length, 4)
  assert.ok(report.prRequiredRolloutReasons.length > 0)
})

test('render parity capture release stability preserves default thresholds when CLI passes undefined overrides', () => {
  const report = createRenderParityCaptureReleaseGateStabilityReport([
    {
      status: 'pass',
      durationMs: 1000,
      captureDurationMs: 200,
      capturedCount: 1,
      failureCodes: [],
      frameArtifactStatusCounter: {pass: 1, degraded: 0, unknown: 0, missing: 0, invalid: 0},
    },
  ], {
    minRunCount: undefined,
    maxFailureCount: undefined,
    maxDurationMs: undefined,
    maxFrameArtifactIssueCount: undefined,
  })

  assert.equal(report.thresholds.minRunCount, 3)
  assert.equal(report.thresholds.maxFailureCount, 0)
  assert.equal(report.thresholds.maxDurationMs, 120000)
  assert.equal(report.thresholds.maxFrameArtifactIssueCount, 0)
  assert.equal(report.promotionRecommendation, 'keep-manual')
  assert.equal(report.promotionGateStatus, 'fail')
  assert.equal(report.prRequiredRolloutPolicy.minRunCount, 5)
  assert.equal(report.prRequiredRolloutPolicy.maxDurationMs, 90000)
  assert.match(report.reasons.join('\n'), /runCount 1 is below minRunCount 3/)
})

test('render parity capture release stability recommends PR-required only after stricter rollout policy passes', () => {
  const summaries = Array.from({length: 5}, (_, index) => ({
    status: 'pass',
    durationMs: 80000 + index,
    captureDurationMs: 200,
    capturedCount: 1,
    failureCodes: [],
    frameArtifactStatusCounter: {pass: 1, degraded: 0, unknown: 0, missing: 0, invalid: 0},
  }))
  const report = createRenderParityCaptureReleaseGateStabilityReport(summaries)

  assert.equal(report.promotionGateStatus, 'pass')
  assert.equal(report.promotionRecommendation, 'promote-to-pr-candidate')
  assert.equal(report.prRequiredRolloutRecommendation, 'ready-for-pr-required')
  assert.deepEqual(report.prRequiredRolloutReasons, [])
})
