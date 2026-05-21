import assert from 'node:assert/strict'
import test from 'node:test'

import {
  createPerspectiveCameraProjection,
  resolveOrbitCameraSnapshot,
} from '../camera/camera3dControllers/camera3dControllers.ts'
import { createEngine } from './createEngine/createEngine.ts'
import {
  createScene,
  installFakeCanvasEnvironment,
} from './createEngine.integrationTestHelpers.ts'

/**
 * Verifies runtime 3D camera state is exposed through facade APIs and diagnostics.
 */
test('createEngine diagnostics expose staged 3D camera runtime state', async () => {
  const environment = installFakeCanvasEnvironment()

  try {
    const canvas = new environment.OffscreenCanvas(1, 1) as OffscreenCanvas
    const projection = createPerspectiveCameraProjection({
      fovYRadians: Math.PI / 3,
      aspectRatio: 1,
      near: 0.1,
      far: 100,
    })
    const snapshot = resolveOrbitCameraSnapshot({
      target: {x: 0, y: 0, z: 0},
      distance: 5,
      yawRadians: 0,
      pitchRadians: 0,
      projection,
    })
    const engine = createEngine({
      canvas,
      initialScene: createScene(),
      camera3d: {snapshot},
      render: {
        backend: 'webgpu',
      },
    })

    assert.equal(engine.getDiagnostics().camera3d.active, true)
    assert.equal(engine.getDiagnostics().camera3d.controller, 'orbit')
    assert.equal(engine.getDiagnostics().camera3d.projectionKind, 'perspective')
    assert.equal(engine.getCamera3DSnapshot()?.controller, 'orbit')

    engine.clearCamera3DSnapshot()
    assert.equal(engine.getDiagnostics().camera3d.active, false)

    engine.setCamera3DSnapshot(snapshot)
    assert.equal(engine.getDiagnostics().camera3d.position?.z, 5)

    const stats = await engine.renderFrame()
    assert.equal(stats.webgpuCamera3DActive, true)
    assert.equal(stats.webgpuCamera3DController, 'orbit')
    assert.equal(stats.webgpuCamera3DProjectionKind, 'perspective')
    assert.equal(stats.webgpuCamera3DUniformBytes, 224)
    assert.equal(stats.webgpuCamera3DUniformFloatCount, 56)
    const diagnostics = engine.getDiagnostics()
    assert.equal(diagnostics.webgpu.camera3d.active, true)
    assert.equal(diagnostics.webgpu.camera3d.controller, 'orbit')
    assert.equal(diagnostics.webgpu.camera3d.projectionKind, 'perspective')
    assert.equal(diagnostics.webgpu.camera3d.uniformBytes, 224)
    assert.equal(diagnostics.webgpu.camera3d.uniformFloatCount, 56)
  } finally {
    environment.restore()
  }
})
