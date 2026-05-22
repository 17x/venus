import assert from 'node:assert/strict'
import test from 'node:test'

import {
  RENDERER_BACKEND_CONTRACT_DESCRIPTORS,
  RENDERER_BACKEND_MODES,
  resolveRendererBackendContractDescriptor,
} from '../contracts/rendererBackendContract'

/**
 * Verifies descriptor map covers all shared backend modes with stable ordering.
 */
test('renderer shared contract descriptors cover all backend modes', () => {
  assert.deepEqual(RENDERER_BACKEND_MODES, ['canvas2d', 'webgl', 'webgpu'])

  RENDERER_BACKEND_MODES.forEach((mode) => {
    const descriptor = RENDERER_BACKEND_CONTRACT_DESCRIPTORS[mode]
    assert.equal(descriptor.mode, mode)
    assert.equal(descriptor.contractName.startsWith('renderer.backend.'), true)
  })
})

/**
 * Verifies descriptor resolver returns deterministic descriptor values per mode.
 */
test('resolveRendererBackendContractDescriptor returns deterministic descriptors', () => {
  const canvas2dDescriptor = resolveRendererBackendContractDescriptor('canvas2d')
  const webglDescriptor = resolveRendererBackendContractDescriptor('webgl')
  const webgpuDescriptor = resolveRendererBackendContractDescriptor('webgpu')

  assert.equal(canvas2dDescriptor.contractName, 'renderer.backend.canvas2d.execution')
  assert.equal(webglDescriptor.contractName, 'renderer.backend.webgl.execution')
  assert.equal(webgpuDescriptor.contractName, 'renderer.backend.webgpu.execution')
})
