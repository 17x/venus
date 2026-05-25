import assert from 'node:assert/strict'
import test from 'node:test'

import {
  createRenderParitySummaryTrendReport,
} from '../../../runtime/engine-bridge/renderParitySummaryTrend.ts'
import type {
  RenderParityRuntimeSummaryArtifact,
} from '../../../runtime/engine-bridge/renderParitySummaryDiff.ts'

/**
 * Builds one summary artifact fixture with deterministic defaults for summary-trend contracts.
 * @param overrides Partial summary artifact overrides.
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
        knownRejectedCount: 2,
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
 * Verifies summary trend report sorts rows and aggregates per-trend counters.
 */
test('render parity summary trend report aggregates trend counters deterministically', () => {
  const baseline = createSummaryArtifact({
    generatedAt: '2026-05-24T00:00:00.000Z',
  })
  const currentA = createSummaryArtifact({
    generatedAt: '2026-05-24T02:00:00.000Z',
    reasonSummary: {
      webglCacheFallback: {
        knownRejectedCount: 1,
        unknownRejectedCount: 0,
        dominantKnownReason: 'l0-preview-miss',
      },
      webgpuRectBatchReject: {
        knownRejectedCount: 1,
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
  const currentB = createSummaryArtifact({
    generatedAt: '2026-05-24T01:00:00.000Z',
    reasonSummary: {
      webglCacheFallback: {
        knownRejectedCount: 5,
        unknownRejectedCount: 1,
        dominantKnownReason: 'l1-disabled',
      },
      webgpuRectBatchReject: {
        knownRejectedCount: 2,
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
  })

  const trendReport = createRenderParitySummaryTrendReport(baseline, [currentA, currentB])

  assert.equal(trendReport.comparedCount, 2)
  assert.equal(trendReport.rows[0]?.generatedAt, '2026-05-24T01:00:00.000Z')
  assert.equal(trendReport.rows[1]?.generatedAt, '2026-05-24T02:00:00.000Z')
  assert.equal(trendReport.trendCounter.improved, 1)
  assert.equal(trendReport.trendCounter.regressed, 1)
  assert.equal(trendReport.trendCounter.mixed, 0)
  assert.equal(trendReport.trendCounter.unchanged, 0)
})
