import assert from 'node:assert/strict'
import test from 'node:test'

import {
  createPerspectiveCameraProjection,
  resolveOrbitCameraSnapshot,
} from '../../../camera/camera3dControllers/camera3dControllers.ts'
import {
  resolveEngineWebGPUCameraUniformPlan,
} from '../webgpuCameraUniformPlan/webgpuCameraUniformPlan.ts'
import {
  resolveEngineWebGPU3DPassPlan,
} from '../webgpu3dPassPlan/webgpu3dPassPlan.ts'
import {
  resolveEngineWebGPU3DBindingPlan,
} from './webgpu3dBindingPlan.ts'

/**
 * Verifies binding planning aggregates material light camera and instance payload budgets.
 */
test('resolveEngineWebGPU3DBindingPlan estimates binding payload bytes', () => {
  const projection = createPerspectiveCameraProjection({
    fovYRadians: Math.PI / 3,
    aspectRatio: 1,
    near: 0.1,
    far: 100,
  })
  const cameraUniformPlan = resolveEngineWebGPUCameraUniformPlan(resolveOrbitCameraSnapshot({
    target: {x: 0, y: 0, z: 0},
    distance: 5,
    yawRadians: 0,
    pitchRadians: 0,
    projection,
  }))
  const passPlan = resolveEngineWebGPU3DPassPlan({
    materialRegistry: {
      materialsById: {
        litA: {id: 'litA', shadingModel: 'lit'},
      },
    },
    lightingRig: {
      lights: [
        {id: 'ambient', type: 'ambient'},
        {id: 'sun', type: 'directional', directionX: 0, directionY: -1, directionZ: 0},
      ],
    },
    candidates: [
      {nodeId: 'a', nodeType: 'shape', materialId: 'litA', geometryKey: 'cube', instanceId: 'i1'},
      {nodeId: 'b', nodeType: 'shape', materialId: 'litA', geometryKey: 'cube', instanceId: 'i2'},
    ],
  })

  const bindingPlan = resolveEngineWebGPU3DBindingPlan({passPlan, cameraUniformPlan})

  assert.equal(bindingPlan.summary.batchCount, 1)
  assert.equal(bindingPlan.summary.materialUniformCount, 1)
  assert.equal(bindingPlan.summary.materialUniformBytes, 32)
  assert.equal(bindingPlan.summary.lightUniformCount, 2)
  assert.equal(bindingPlan.summary.lightUniformBytes, 64)
  assert.equal(bindingPlan.summary.instanceUniformCount, 2)
  assert.equal(bindingPlan.summary.instanceUniformBytes, 128)
  assert.equal(bindingPlan.summary.cameraUniformBytes, 224)
  assert.equal(bindingPlan.summary.totalUniformBytes, 448)
})

/**
 * Verifies uninstanced batches reserve one default instance payload per batch.
 */
test('resolveEngineWebGPU3DBindingPlan reserves default instance payloads', () => {
  const passPlan = resolveEngineWebGPU3DPassPlan({
    candidates: [
      {nodeId: 'a', nodeType: 'shape', geometryKey: 'rect'},
      {nodeId: 'b', nodeType: 'image', geometryKey: 'image:asset'},
    ],
  })

  const bindingPlan = resolveEngineWebGPU3DBindingPlan({passPlan})

  assert.equal(bindingPlan.summary.batchCount, 2)
  assert.equal(bindingPlan.summary.materialUniformCount, 2)
  assert.equal(bindingPlan.summary.instanceUniformCount, 2)
  assert.equal(bindingPlan.summary.cameraUniformBytes, 0)
  assert.equal(bindingPlan.summary.totalUniformBytes, 192)
})
