import assert from 'node:assert/strict'
import test from 'node:test'

import {
  createRenderParitySummaryDiffReport,
  type RenderParityRuntimeSummaryArtifact,
} from '../../../runtime/engine-bridge/renderParitySummaryDiff.ts'

/**
 * Builds one summary artifact fixture with deterministic defaults for summary-diff contracts.
 * @param overrides Partial artifact overrides.
 */
function createSummaryArtifact(
  overrides: Partial<RenderParityRuntimeSummaryArtifact> = {},
): RenderParityRuntimeSummaryArtifact {
  return {
    generatedAt: '2026-05-24T00:00:00.000Z',
    sampleCount: 6,
    verdictSummary: {
      pass: {webgl: 2, webgpu: 4},
      degraded: {webgl: 4, webgpu: 2},
      fail: {webgl: 0, webgpu: 0},
      unknown: {webgl: 0, webgpu: 0},
    },
    reasonSummary: {
      webglCacheFallback: {
        knownRejectedCount: 3,
        unknownRejectedCount: 0,
        dominantKnownReason: 'l1-disabled',
      },
      webgpuRectBatchReject: {
        knownRejectedCount: 4,
        unknownRejectedCount: 0,
        dominantKnownReason: 'non-rect-shape-unsupported',
      },
      webglFeatureCapabilityGate: {
        knownRejectedCount: 0,
        unknownRejectedCount: 0,
        dominantKnownReason: null,
      },
      webgpuFeatureCapabilityGate: {
        knownRejectedCount: 0,
        unknownRejectedCount: 0,
        dominantKnownReason: null,
      },
    },
    ...overrides,
  }
}

/**
 * Verifies summary diff report flags improved trend when both reason buckets reduce rejection counts.
 */
test('render parity summary diff reports improved trend for reduced rejection counts', () => {
  const baseline = createSummaryArtifact()
  const current = createSummaryArtifact({
    generatedAt: '2026-05-24T01:00:00.000Z',
    reasonSummary: {
      webglCacheFallback: {
        knownRejectedCount: 1,
        unknownRejectedCount: 0,
        dominantKnownReason: 'l0-preview-miss',
      },
      webgpuRectBatchReject: {
        knownRejectedCount: 2,
        unknownRejectedCount: 0,
        dominantKnownReason: 'shape-style-unsupported',
      },
      webglFeatureCapabilityGate: {
        knownRejectedCount: 0,
        unknownRejectedCount: 0,
        dominantKnownReason: null,
      },
      webgpuFeatureCapabilityGate: {
        knownRejectedCount: 0,
        unknownRejectedCount: 0,
        dominantKnownReason: null,
      },
    },
  })

  const diff = createRenderParitySummaryDiffReport(baseline, current)
  assert.equal(diff.overallTrend, 'improved')
  assert.equal(diff.reasonDiff.webglCacheFallback.knownRejectedDelta, -2)
  assert.equal(diff.reasonDiff.webgpuRectBatchReject.knownRejectedDelta, -2)
  assert.equal(diff.reasonDiff.webglCacheFallback.dominantKnownReasonChanged, true)
})

/**
 * Verifies summary diff report flags regressed trend when rejection counts increase.
 */
test('render parity summary diff reports regressed trend for increased rejection counts', () => {
  const baseline = createSummaryArtifact()
  const current = createSummaryArtifact({
    generatedAt: '2026-05-24T01:00:00.000Z',
    reasonSummary: {
      webglCacheFallback: {
        knownRejectedCount: 5,
        unknownRejectedCount: 1,
        dominantKnownReason: 'l1-disabled',
      },
      webgpuRectBatchReject: {
        knownRejectedCount: 6,
        unknownRejectedCount: 2,
        dominantKnownReason: 'non-rect-shape-unsupported',
      },
      webglFeatureCapabilityGate: {
        knownRejectedCount: 0,
        unknownRejectedCount: 0,
        dominantKnownReason: null,
      },
      webgpuFeatureCapabilityGate: {
        knownRejectedCount: 0,
        unknownRejectedCount: 0,
        dominantKnownReason: null,
      },
    },
  })

  const diff = createRenderParitySummaryDiffReport(baseline, current)
  assert.equal(diff.overallTrend, 'regressed')
  assert.equal(diff.reasonDiff.webglCacheFallback.unknownRejectedDelta, 1)
  assert.equal(diff.reasonDiff.webgpuRectBatchReject.unknownRejectedDelta, 2)
})
