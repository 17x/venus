import assert from 'node:assert/strict'
import test from 'node:test'

import {canUseWebGPUBackendExecution, createWebGPUBackendExecution} from '../webgpuBackendExecution'

/**
 * Verifies WebGPU probing and staging execution contract behavior.
 */
test('webgpu backend execution probe and contract are deterministic', () => {
  assert.equal(canUseWebGPUBackendExecution({gpu: {}}), true)
  assert.equal(canUseWebGPUBackendExecution(undefined), false)

  const backend = createWebGPUBackendExecution()
  const executedCount = backend.executePackets(1, [{id: 'x', kind: 'upload', payload: {}}])
  assert.equal(backend.mode, 'webgpu')
  assert.equal(executedCount, 1)
})
