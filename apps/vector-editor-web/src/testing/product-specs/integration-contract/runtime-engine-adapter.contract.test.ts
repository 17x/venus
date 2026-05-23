import assert from 'node:assert/strict'
import test from 'node:test'

import {resolveRuntimeRenderPolicy} from '../../../runtime/engine-bridge/renderPolicy.ts'

test('runtime-engine policy contract keeps pan phase at full quality interaction mode', () => {
  const policy = resolveRuntimeRenderPolicy({
    phase: 'pan',
    lodLevel: 3,
    viewportScale: 1,
    deviceDpr: 2,
  })

  assert.equal(policy.quality, 'full')
  assert.equal(policy.interactionActive, true)
})

test('runtime-engine policy contract applies high-zoom sharpness guard', () => {
  const policy = resolveRuntimeRenderPolicy({
    phase: 'zoom',
    lodLevel: 3,
    viewportScale: 3,
    deviceDpr: 2,
  })

  assert.equal(typeof policy.dpr, 'number')
  assert.ok((policy.dpr as number) >= 2)
})
