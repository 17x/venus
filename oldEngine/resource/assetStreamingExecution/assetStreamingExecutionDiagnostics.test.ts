import assert from 'node:assert/strict'
import test from 'node:test'

import {
  resolveEngineStreamingExecutionDiagnostics,
} from './assetStreamingExecutionDiagnostics.ts'

/**
 * Verifies missing execution summaries produce explicit unavailable diagnostics.
 */
test('resolveEngineStreamingExecutionDiagnostics reports unavailable defaults', () => {
  const diagnostics = resolveEngineStreamingExecutionDiagnostics(null)

  assert.deepEqual(diagnostics, {
    available: false,
    loadedCount: 0,
    loadedBytes: 0,
    cancelledCount: 0,
    evictedCount: 0,
    evictedBytes: 0,
    retainedBytes: 0,
    operationCount: 0,
  })
})

/**
 * Verifies execution summaries are normalized into compact diagnostics metrics.
 */
test('resolveEngineStreamingExecutionDiagnostics maps summary metrics', () => {
  const diagnostics = resolveEngineStreamingExecutionDiagnostics({
    loadedAssetIds: ['mesh-a', 'texture-a'],
    loadedCount: 2,
    loadedBytes: 128,
    cancelledAssetIds: ['stale'],
    cancelledCount: 1,
    evictedAssetIds: ['old'],
    evictedCount: 1,
    evictedBytes: 64,
    retainedBytes: 256,
  })

  assert.deepEqual(diagnostics, {
    available: true,
    loadedCount: 2,
    loadedBytes: 128,
    cancelledCount: 1,
    evictedCount: 1,
    evictedBytes: 64,
    retainedBytes: 256,
    operationCount: 4,
  })
})
