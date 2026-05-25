import assert from 'node:assert/strict'
import test from 'node:test'

import {
  EMPTY_RUNTIME_RENDER_DIAGNOSTICS,
} from '../../../runtime/events/index/index.ts'
import {
  createParitySamplesFromRuntimeDiagnostics,
  extractRuntimeDiagnosticsRecords,
} from '../../../runtime/engine-bridge/renderParitySampleExtraction.ts'

/**
 * Verifies diagnostics extractor accepts envelope payload shape and keeps record count stable.
 */
test('render parity runtime diagnostics extractor resolves records from envelope payload', () => {
  const payload = {
    records: [
      {
        ...EMPTY_RUNTIME_RENDER_DIAGNOSTICS,
        webglRenderPath: 'packet',
      },
      {
        ...EMPTY_RUNTIME_RENDER_DIAGNOSTICS,
        webglRenderPath: 'model-complete',
      },
    ],
  }

  const records = extractRuntimeDiagnosticsRecords(payload)
  assert.equal(records.length, 2)
  assert.equal(records[0]?.webglRenderPath, 'packet')
  assert.equal(records[1]?.webglRenderPath, 'model-complete')
})

/**
 * Verifies diagnostics-to-sample conversion maps parity fields deterministically.
 */
test('render parity runtime diagnostics extractor maps parity sample fields', () => {
  const records = extractRuntimeDiagnosticsRecords([
    {
      ...EMPTY_RUNTIME_RENDER_DIAGNOSTICS,
      webglRenderPath: 'packet',
      webgpuRenderPath: 'hybrid-webgl',
      cacheFallbackReason: 'l1-disabled',
      webglInteractiveTextFallbackCount: 4,
      webglDeferredTextTextureCount: 2,
      webglDeferredImageTextureCount: 1,
      webglImageTextureUploadCount: 0,
      webglBudgetPressure: 'high',
      webgpuNativeRectBatchRejectedReason: 'non-rect-shape-unsupported',
      webglFeatureCapabilityGateReason: 'none',
      webgpuFeatureCapabilityGateReason: 'text-style-unsupported',
      webgpuNativeSubmissionAttemptedCount: 0,
    },
  ])

  const samples = createParitySamplesFromRuntimeDiagnostics(records)
  assert.equal(samples.length, 1)
  assert.deepEqual(samples[0], {
    webglRenderPath: 'packet',
    webgpuRenderPath: 'hybrid-webgl',
    cacheFallbackReason: 'l1-disabled',
    webglInteractiveTextFallbackCount: 4,
    webglDeferredTextTextureCount: 2,
    webglDeferredImageTextureCount: 1,
    webglImageTextureUploadCount: 0,
    webglBudgetPressure: 'high',
    webgpuNativeRectBatchRejectedReason: 'non-rect-shape-unsupported',
    webglFeatureCapabilityGateReason: 'none',
    webgpuFeatureCapabilityGateReason: 'text-style-unsupported',
    webgpuNativeSubmissionAttemptedCount: 0,
  })
})
