import assert from 'node:assert/strict'
import test from 'node:test'

import {
  createRenderParityChecklistReportFromDiagnostics,
  type RenderParityDiagnosticsSample,
} from '../../../runtime/engine-bridge/renderParityChecklist.ts'
import {
  createRenderParityReasonSummary,
} from '../../../runtime/engine-bridge/renderParityReasonSummary.ts'

/**
 * Builds one diagnostics sample helper with deterministic defaults.
 * @param overrides Partial diagnostics sample overrides.
 */
function createSample(
  overrides: Partial<RenderParityDiagnosticsSample> = {},
): RenderParityDiagnosticsSample {
  return {
    webglRenderPath: 'model-complete',
    webgpuRenderPath: 'native-model-complete',
    cacheFallbackReason: 'none',
    webglInteractiveTextFallbackCount: 0,
    webglDeferredTextTextureCount: 0,
    webglDeferredImageTextureCount: 0,
    webglImageTextureUploadCount: 2,
    webglBudgetPressure: 'low',
    webgpuNativeRectBatchRejectedReason: 'none',
    webglFeatureCapabilityGateReason: 'none',
    webgpuFeatureCapabilityGateReason: 'none',
    webgpuNativeSubmissionAttemptedCount: 1,
    ...overrides,
  }
}

/**
 * Verifies sampled parity report can resolve pass verdicts when diagnostics stay within thresholds.
 */
test('sampled parity checklist resolves pass verdicts for healthy diagnostics set', () => {
  const samples = Array.from({length: 6}, () => createSample())
  const report = createRenderParityChecklistReportFromDiagnostics({samples})

  assert.equal(report.summary.pass.webgl >= 4, true)
  assert.equal(report.summary.pass.webgpu >= 4, true)
  assert.equal(report.summary.fail.webgl, 0)
  assert.equal(report.summary.fail.webgpu, 0)
})

/**
 * Verifies sampled parity report degrades/fails when diagnostics show persistent fallback pressure.
 */
test('sampled parity checklist flags degraded and fail verdicts for fallback-heavy diagnostics set', () => {
  const samples = Array.from({length: 6}, () => createSample({
    webglRenderPath: 'packet',
    webgpuRenderPath: 'hybrid-webgl',
    webglInteractiveTextFallbackCount: 3,
    webglDeferredTextTextureCount: 2,
    webglDeferredImageTextureCount: 2,
    webglImageTextureUploadCount: 0,
    webglBudgetPressure: 'high',
    webgpuNativeSubmissionAttemptedCount: 0,
  }))
  const report = createRenderParityChecklistReportFromDiagnostics({samples})

  const geometryRow = report.rows.find((row) => row.id === 'line-path-polygon-bezier-parity')
  assert.equal(geometryRow?.webgl.status, 'degraded')
  assert.equal(geometryRow?.webgpu.status, 'fail')
  assert.equal(report.summary.degraded.webgl > 0, true)
})

/**
 * Verifies sampled parity report surfaces dominant WebGPU rect-batch rejection reason for native partial geometry routes.
 */
test('sampled parity checklist surfaces dominant webgpu rect-batch rejection reason', () => {
  const samples = Array.from({length: 6}, () => createSample({
    webglRenderPath: 'packet',
    webgpuRenderPath: 'native-clear-only',
    webgpuNativeRectBatchRejectedReason: 'non-rect-shape-unsupported',
    webgpuNativeSubmissionAttemptedCount: 1,
  }))

  const report = createRenderParityChecklistReportFromDiagnostics({samples})
  const geometryRow = report.rows.find((row) => row.id === 'line-path-polygon-bezier-parity')
  const fallbackRow = report.rows.find((row) => row.id === 'model-complete-failure-fallback-classification')

  assert.equal(geometryRow?.webgpu.status, 'degraded')
  assert.equal(geometryRow?.webgpu.reason.includes('non-rect-shape-unsupported'), true)
  assert.equal(fallbackRow?.webgpu.reason.includes('known=6'), true)
})

/**
 * Verifies parity reason summary resolves deterministic dominant known reasons for both backends.
 */
test('sampled parity reason summary resolves dominant known reasons', () => {
  const samples = [
    createSample({
      cacheFallbackReason: 'l1-disabled',
      webgpuNativeRectBatchRejectedReason: 'non-rect-shape-unsupported',
    }),
    createSample({
      cacheFallbackReason: 'l1-disabled',
      webgpuNativeRectBatchRejectedReason: 'shape-style-unsupported',
    }),
    createSample({
      cacheFallbackReason: 'l0-preview-miss',
      webgpuNativeRectBatchRejectedReason: 'non-rect-shape-unsupported',
    }),
  ]

  const reasonSummary = createRenderParityReasonSummary(samples)
  assert.equal(reasonSummary.webglCacheFallback.dominantKnownReason, 'l1-disabled')
  assert.equal(reasonSummary.webgpuRectBatchReject.dominantKnownReason, 'non-rect-shape-unsupported')
  assert.equal(reasonSummary.webglFeatureCapabilityGate.dominantKnownReason, null)
  assert.equal(reasonSummary.webgpuFeatureCapabilityGate.dominantKnownReason, null)
  assert.equal(reasonSummary.webglCacheFallback.knownRejectedCount, 3)
  assert.equal(reasonSummary.webgpuRectBatchReject.knownRejectedCount, 3)
})

/**
 * Verifies parity reason summary tracks backend feature capability gate reasons deterministically.
 */
test('sampled parity reason summary resolves dominant feature capability gate reasons', () => {
  const samples = [
    createSample({
      webglFeatureCapabilityGateReason: 'text-style-unsupported',
      webgpuFeatureCapabilityGateReason: 'text-style-unsupported',
    }),
    createSample({
      webglFeatureCapabilityGateReason: 'text-style-unsupported',
      webgpuFeatureCapabilityGateReason: 'image-node-unsupported',
    }),
    createSample({
      webglFeatureCapabilityGateReason: 'none',
      webgpuFeatureCapabilityGateReason: 'text-style-unsupported',
    }),
  ]

  const reasonSummary = createRenderParityReasonSummary(samples)
  assert.equal(reasonSummary.webglFeatureCapabilityGate.dominantKnownReason, 'text-style-unsupported')
  assert.equal(reasonSummary.webgpuFeatureCapabilityGate.dominantKnownReason, 'text-style-unsupported')
  assert.equal(reasonSummary.webglFeatureCapabilityGate.knownRejectedCount, 2)
  assert.equal(reasonSummary.webgpuFeatureCapabilityGate.knownRejectedCount, 3)
})

/**
 * Verifies sampled parity report returns unknown verdicts when sample count is below minimum threshold.
 */
test('sampled parity checklist returns unknown verdicts for insufficient sample count', () => {
  const report = createRenderParityChecklistReportFromDiagnostics({
    samples: [createSample(), createSample()],
    thresholds: {
      minSampleCountForAutomaticVerdict: 6,
    },
  })

  assert.equal(report.summary.unknown.webgl, report.rows.length)
  assert.equal(report.summary.unknown.webgpu, report.rows.length)
})
