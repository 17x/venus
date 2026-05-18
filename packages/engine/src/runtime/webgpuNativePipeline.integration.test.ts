import assert from 'node:assert/strict'
import test from 'node:test'

import { createEngine } from './createEngine/createEngine.ts'
import {
  createScene,
  installFakeCanvasEnvironment,
} from './createEngine.integrationTestHelpers.ts'

/**
 * Verifies staged native rect-batch path emits pipeline/buffer bindings and draw calls.
 */
test('webgpu native rect-batch emits staged pipeline bindings and draw calls', async () => {
  const environment = installFakeCanvasEnvironment()

  try {
    const canvas = new environment.OffscreenCanvas(1, 1) as OffscreenCanvas
    const engine = createEngine({
      canvas,
      initialScene: createScene(),
      viewport: {
        viewportWidth: 200,
        viewportHeight: 150,
        offsetX: 0,
        offsetY: 0,
        scale: 1,
      },
      performance: {
        culling: true,
        lod: {enabled: false},
        tiles: {enabled: false},
        overscan: {enabled: false},
      },
      render: {
        backend: 'webgpu',
        quality: 'full',
        modelCompleteComposite: false,
        interactionPreview: {enabled: false},
      },
    })

    engine.resize({
      viewportWidth: 200,
      viewportHeight: 150,
      outputWidth: 400,
      outputHeight: 300,
    })

    const stats = await engine.renderFrame()
    assert.equal(stats.webgpuRenderPath, 'native-rect-batch')
    const latestWebGPUCommand = environment.recordedWebGPUCommands[environment.recordedWebGPUCommands.length - 1]
    assert.ok(latestWebGPUCommand)
    assert.equal(latestWebGPUCommand.pipelineCreateCount, 1)
    assert.equal(latestWebGPUCommand.bufferCreateCount, 1)
    assert.equal(latestWebGPUCommand.setPipelineCount, 1)
    assert.equal(latestWebGPUCommand.setVertexBufferCount, 1)
    assert.equal(latestWebGPUCommand.drawCallCount, 1)
    assert.equal(latestWebGPUCommand.drawnVertexCount, 12)
  } finally {
    environment.restore()
  }
})

/**
 * Verifies native clear-only path skips staged pipeline/buffer bindings and draw calls.
 */
test('webgpu native clear-only skips staged pipeline bindings and draw calls', async () => {
  const environment = installFakeCanvasEnvironment()

  try {
    const canvas = new environment.OffscreenCanvas(1, 1) as OffscreenCanvas
    const engine = createEngine({
      canvas,
      initialScene: {
        revision: 0,
        width: 1,
        height: 1,
        nodes: [],
      },
      viewport: {
        viewportWidth: 200,
        viewportHeight: 150,
        offsetX: 0,
        offsetY: 0,
        scale: 1,
      },
      performance: {
        culling: true,
        lod: {enabled: false},
        tiles: {enabled: false},
        overscan: {enabled: false},
      },
      render: {
        backend: 'webgpu',
        quality: 'full',
        modelCompleteComposite: false,
        interactionPreview: {enabled: false},
      },
    })

    engine.resize({
      viewportWidth: 200,
      viewportHeight: 150,
      outputWidth: 400,
      outputHeight: 300,
    })

    const stats = await engine.renderFrame()
    assert.equal(stats.webgpuRenderPath, 'native-clear-only')
    const latestWebGPUCommand = environment.recordedWebGPUCommands[environment.recordedWebGPUCommands.length - 1]
    assert.ok(latestWebGPUCommand)
    assert.equal(latestWebGPUCommand.pipelineCreateCount, 0)
    assert.equal(latestWebGPUCommand.bufferCreateCount, 0)
    assert.equal(latestWebGPUCommand.setPipelineCount, 0)
    assert.equal(latestWebGPUCommand.setVertexBufferCount, 0)
    assert.equal(latestWebGPUCommand.drawCallCount, 0)
    assert.equal(latestWebGPUCommand.drawnVertexCount, 0)
  } finally {
    environment.restore()
  }
})
