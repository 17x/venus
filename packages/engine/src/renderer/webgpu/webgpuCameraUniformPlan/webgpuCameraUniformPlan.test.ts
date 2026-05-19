import assert from 'node:assert/strict'
import test from 'node:test'

import {
  createPerspectiveCameraProjection,
  resolveOrbitCameraSnapshot,
} from '../../../camera/camera3dControllers/camera3dControllers.ts'
import {
  resolveEngineWebGPUCameraUniformPlan,
} from './webgpuCameraUniformPlan.ts'

/**
 * Verifies camera matrices and vectors are packed into a stable WebGPU uniform payload.
 */
test('resolveEngineWebGPUCameraUniformPlan packs matrices position and target', () => {
  const projection = createPerspectiveCameraProjection({
    fovYRadians: Math.PI / 3,
    aspectRatio: 1,
    near: 0.1,
    far: 100,
  })
  const snapshot = resolveOrbitCameraSnapshot({
    target: {x: 1, y: 2, z: 3},
    distance: 5,
    yawRadians: 0,
    pitchRadians: 0,
    projection,
  })

  const plan = resolveEngineWebGPUCameraUniformPlan(snapshot)

  assert.equal(plan.controller, 'orbit')
  assert.equal(plan.projectionKind, 'perspective')
  assert.equal(plan.data.length, 56)
  assert.equal(plan.byteLength, 224)
  assert.deepEqual(Array.from(plan.data.slice(48, 52)), [1, 2, 8, 1])
  assert.deepEqual(Array.from(plan.data.slice(52, 56)), [1, 2, 3, 1])
})
