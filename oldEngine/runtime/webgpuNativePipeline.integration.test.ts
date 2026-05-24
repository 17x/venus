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
    assert.equal(stats.webgpuNativeSubmissionSuccessCount, 1)
    assert.equal(stats.webgpu3DPassCandidateCount, 2)
    assert.equal(stats.webgpu3DPassBatchCount, 1)
    assert.equal(stats.webgpu3DPassUnsupportedCount, 0)
    assert.equal(stats.webgpu3DPassNativeCoverageRatio, 1)
    assert.equal(stats.webgpu3DPassUnlitBatchCount, 1)
    assert.equal(stats.webgpu3DBindingMaterialUniformBytes, 32)
    assert.equal(stats.webgpu3DBindingLightUniformBytes, 0)
    assert.equal(stats.webgpu3DBindingInstanceUniformBytes, 64)
    assert.equal(stats.webgpu3DBindingTotalUniformBytes, 96)
    assert.equal(stats.webgpuGpuTimingSupported, true)
    assert.equal(stats.webgpuGpuTimingSampleState, 'supported-uninstrumented')
    assert.equal(stats.webgpuGpuTimingQueryPlanState, 'ready-unresolved')
    assert.equal(stats.webgpuGpuTimingQueryWriteCount, 2)
    assert.equal(stats.webgpuGpuTimingLastWriteCount, 2)
    assert.equal(stats.webgpuGpuTimingLastResolveCount, 1)
    assert.equal(stats.webgpuGpuTimingLastCopyCount, 1)
    assert.equal(stats.webgpuGpuTimingReadbackBufferBytes, 16)
    assert.equal(stats.webgpuGpuFrameMs, undefined)
    assert.equal(environment.recordedDrawCalls.length, 0)
    const latestWebGPUCommand = environment.recordedWebGPUCommands[environment.recordedWebGPUCommands.length - 1]
    assert.ok(latestWebGPUCommand)
    assert.equal(latestWebGPUCommand.pipelineCreateCount, 1)
    assert.equal(latestWebGPUCommand.bufferCreateCount, 4)
    assert.equal(latestWebGPUCommand.bufferDescriptors.length, 4)
    const firstBufferDescriptor = latestWebGPUCommand.bufferDescriptors[0] as {size?: number}
    const secondBufferDescriptor = latestWebGPUCommand.bufferDescriptors[1] as {size?: number}
    assert.equal(firstBufferDescriptor.size, 64)
    assert.equal(secondBufferDescriptor.size, 24)
    assert.equal(latestWebGPUCommand.writeBufferCallCount, 2)
    assert.equal(latestWebGPUCommand.uploadedBufferBytes, 88)
    assert.equal(latestWebGPUCommand.timestampWriteCount, 2)
    assert.equal(latestWebGPUCommand.timestampResolveCount, 1)
    assert.equal(latestWebGPUCommand.timestampCopyCount, 1)
    assert.equal(latestWebGPUCommand.setPipelineCount, 1)
    assert.equal(latestWebGPUCommand.setVertexBufferCount, 1)
    assert.equal(latestWebGPUCommand.setIndexBufferCount, 1)
    assert.equal(latestWebGPUCommand.drawCallCount, 0)
    assert.equal(latestWebGPUCommand.drawIndexedCallCount, 1)
    assert.equal(latestWebGPUCommand.drawnVertexCount, 0)
    assert.equal(latestWebGPUCommand.drawnIndexCount, 12)
    assert.equal(latestWebGPUCommand.pipelineDescriptors.length, 1)
    const firstPipelineDescriptor = latestWebGPUCommand.pipelineDescriptors[0]
    assert.equal(firstPipelineDescriptor.label, 'venus-staged-rect-pipeline')
    assert.equal(firstPipelineDescriptor.layout, 'auto')
    assert.deepEqual(
      firstPipelineDescriptor.primitive,
      {
        topology: 'triangle-list',
        frontFace: 'ccw',
        cullMode: 'none',
      },
    )
    const fragmentSection = firstPipelineDescriptor.fragment as {
      targets?: Array<{format?: string}>
    }
    assert.equal(fragmentSection.targets?.[0]?.format, 'bgra8unorm')
  } finally {
    environment.restore()
  }
})

/**
 * Verifies staged native rect pipeline is reused on subsequent compatible frames.
 */
test('webgpu native rect-batch reuses staged pipeline on consecutive frames', async () => {
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

    await engine.renderFrame()
    const firstFrameSummary = environment.recordedWebGPUCommands[environment.recordedWebGPUCommands.length - 1]
    assert.ok(firstFrameSummary)
    assert.equal(firstFrameSummary.pipelineCreateCount, 1)

    await engine.renderFrame()
    const secondFrameSummary = environment.recordedWebGPUCommands[environment.recordedWebGPUCommands.length - 1]
    assert.ok(secondFrameSummary)
    assert.equal(secondFrameSummary.pipelineCreateCount, 0)
    assert.equal(secondFrameSummary.bufferCreateCount, 4)
    assert.equal(secondFrameSummary.bufferDescriptors.length, 4)
    assert.equal(secondFrameSummary.writeBufferCallCount, 2)
    assert.equal(secondFrameSummary.uploadedBufferBytes, 88)
    assert.equal(secondFrameSummary.pipelineDescriptors.length, 0)
    assert.equal(secondFrameSummary.setPipelineCount, 1)
    assert.equal(secondFrameSummary.drawIndexedCallCount, 1)
    assert.equal(environment.recordedDrawCalls.length, 0)
  } finally {
    environment.restore()
  }
})

/**
 * Verifies ineligible scenes stay on hybrid-webgl path and record native probe failures.
 */
test('webgpu ineligible scene keeps hybrid-webgl fallback path', async () => {
  const environment = installFakeCanvasEnvironment()

  try {
    const canvas = new environment.OffscreenCanvas(1, 1) as OffscreenCanvas
    const engine = createEngine({
      canvas,
      initialScene: {
        revision: 0,
        width: 1,
        height: 1,
        nodes: [{
          id: 'shape-ellipse',
          type: 'shape',
          shape: 'ellipse',
          x: 0,
          y: 0,
          width: 40,
          height: 40,
          rotation: 0,
          fill: '#00ff00',
          opacity: 1,
          zIndex: 0,
        }],
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
    assert.equal(stats.webgpuRenderPath, 'hybrid-webgl')
    assert.equal(stats.webgpuNativeRectBatchRejectedReason, 'non-rect-shape-unsupported')
    assert.equal(stats.webgpuNativeSubmissionAttemptedCount, 1)
    assert.equal(stats.webgpu3DPassCandidateCount, 1)
    assert.equal(stats.webgpu3DPassUnsupportedCount, 0)
    assert.equal(stats.webgpu3DPassNativeCoverageRatio, 1)
    assert.equal(stats.webgpu3DBindingTotalUniformBytes, 96)
    assert.equal(stats.webgpuGpuTimingSupported, true)
    assert.equal(stats.webgpuGpuTimingSampleState, 'supported-uninstrumented')
    assert.equal(stats.webgpuGpuTimingQueryPlanState, 'ready-unresolved')
    assert.equal(stats.webgpuGpuTimingLastWriteCount, 2)
    assert.equal(stats.webgpuGpuTimingLastResolveCount, 1)
    assert.ok(environment.recordedDrawCalls.length > 0)
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
    assert.equal(stats.webgpu3DPassCandidateCount, 0)
    assert.equal(stats.webgpu3DPassBatchCount, 0)
    assert.equal(stats.webgpu3DPassNativeCoverageRatio, 1)
    assert.equal(stats.webgpu3DBindingTotalUniformBytes, 0)
    assert.equal(stats.webgpuGpuTimingSupported, true)
    assert.equal(stats.webgpuGpuTimingSampleState, 'supported-uninstrumented')
    assert.equal(stats.webgpuGpuTimingQueryPlanState, 'ready-unresolved')
    assert.equal(stats.webgpuGpuTimingLastWriteCount, 2)
    assert.equal(stats.webgpuGpuTimingLastResolveCount, 1)
    const latestWebGPUCommand = environment.recordedWebGPUCommands[environment.recordedWebGPUCommands.length - 1]
    assert.ok(latestWebGPUCommand)
    assert.equal(latestWebGPUCommand.pipelineCreateCount, 0)
    assert.equal(latestWebGPUCommand.bufferCreateCount, 2)
    assert.equal(latestWebGPUCommand.setPipelineCount, 0)
    assert.equal(latestWebGPUCommand.setVertexBufferCount, 0)
    assert.equal(latestWebGPUCommand.setIndexBufferCount, 0)
    assert.equal(latestWebGPUCommand.bufferDescriptors.length, 2)
    assert.equal(latestWebGPUCommand.writeBufferCallCount, 0)
    assert.equal(latestWebGPUCommand.uploadedBufferBytes, 0)
    assert.equal(latestWebGPUCommand.drawCallCount, 0)
    assert.equal(latestWebGPUCommand.drawIndexedCallCount, 0)
    assert.equal(latestWebGPUCommand.drawnVertexCount, 0)
    assert.equal(latestWebGPUCommand.drawnIndexCount, 0)
    assert.equal(latestWebGPUCommand.pipelineDescriptors.length, 0)
  } finally {
    environment.restore()
  }
})
