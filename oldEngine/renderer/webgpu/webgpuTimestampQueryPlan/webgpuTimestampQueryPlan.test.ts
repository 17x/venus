import assert from 'node:assert/strict'
import test from 'node:test'

import {
  resolveEngineWebGPUTimestampQueryPlan,
} from './webgpuTimestampQueryPlan.ts'

/**
 * Verifies unsupported adapters do not request timestamp writes or readback.
 */
test('resolveEngineWebGPUTimestampQueryPlan reports unsupported adapters', () => {
  const plan = resolveEngineWebGPUTimestampQueryPlan({
    supported: false,
    querySetAvailable: true,
  })

  assert.deepEqual(plan, {
    supported: false,
    querySetAvailable: false,
    state: 'unsupported',
    queryWriteCount: 0,
    readbackRequired: false,
  })
})

/**
 * Verifies supported devices without query-set APIs stay explicitly uninstrumented.
 */
test('resolveEngineWebGPUTimestampQueryPlan reports missing query-set support', () => {
  const plan = resolveEngineWebGPUTimestampQueryPlan({
    supported: true,
    querySetAvailable: false,
  })

  assert.deepEqual(plan, {
    supported: true,
    querySetAvailable: false,
    state: 'missing-query-set',
    queryWriteCount: 0,
    readbackRequired: true,
  })
})

/**
 * Verifies supported devices with query-set APIs report begin/end query readiness.
 */
test('resolveEngineWebGPUTimestampQueryPlan reports unresolved query readiness', () => {
  const plan = resolveEngineWebGPUTimestampQueryPlan({
    supported: true,
    querySetAvailable: true,
  })

  assert.deepEqual(plan, {
    supported: true,
    querySetAvailable: true,
    state: 'ready-unresolved',
    queryWriteCount: 2,
    readbackRequired: true,
  })
})
