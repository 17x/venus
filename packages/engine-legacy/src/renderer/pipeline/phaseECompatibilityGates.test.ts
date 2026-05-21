import assert from 'node:assert/strict'
import test from 'node:test'

import { passEngineBackendCompatibilityGate } from './backendCompatibilityGate.ts'

test('backend compatibility gate blocks unsupported feature requirements', () => {
  assert.equal(passEngineBackendCompatibilityGate('webgl', [
    { feature: 'f1', supportedBackends: ['webgl', 'webgpu'] },
    { feature: 'f2', supportedBackends: ['webgpu'] },
  ]), false)

  assert.equal(passEngineBackendCompatibilityGate('webgpu', [
    { feature: 'f1', supportedBackends: ['webgl', 'webgpu'] },
  ]), true)
})
