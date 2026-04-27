import assert from 'node:assert/strict'
import test from 'node:test'

import {
  captureCompositeSnapshotFromCurrentFramebuffer,
  drawCompositeTextureFrame,
  resolveCompositeSnapshotPixelRatio,
  resolveCompositeTexturePresentationFlipY,
} from './webglComposite.ts'
import type { EngineRenderFrame } from './types.ts'

function createFrame(overrides?: Partial<EngineRenderFrame>): EngineRenderFrame {
  return {
    scene: {
      revision: 3,
      width: 100,
      height: 100,
      nodes: [],
    },
    viewport: {
      viewportWidth: 200,
      viewportHeight: 100,
      scale: 1,
      offsetX: 0,
      offsetY: 0,
      matrix: [1, 0, 0, 0, 1, 0, 0, 0, 1],
    },
    context: {
      quality: 'full',
      outputPixelRatio: 2,
      pixelRatio: 1,
    },
    ...overrides,
  }
}

test('webglComposite resolves main-output snapshot DPR and stable flip convention', () => {
  // Shared composite semantics should always prefer the main output DPR lane.
  assert.equal(resolveCompositeSnapshotPixelRatio(createFrame()), 2)
  assert.equal(resolveCompositeTexturePresentationFlipY('framebuffer-copy'), true)
  assert.equal(resolveCompositeTexturePresentationFlipY('canvas-upload'), false)
})

test('webglComposite captures snapshot metadata from the current framebuffer', () => {
  const calls: Array<unknown[]> = []
  const fakeContext = {
    TEXTURE_2D: 3553,
    RGBA: 6408,
    bindTexture: (...args: unknown[]) => calls.push(args),
    copyTexImage2D: (...args: unknown[]) => calls.push(args),
  } as unknown as WebGLRenderingContext

  const snapshot = captureCompositeSnapshotFromCurrentFramebuffer({
    context: fakeContext,
    texture: {} as WebGLTexture,
    frame: createFrame(),
    visibleCount: 7,
    culledCount: 2,
  })

  assert.deepEqual(snapshot, {
    revision: 3,
    scale: 1,
    offsetX: 0,
    offsetY: 0,
    viewportWidth: 200,
    viewportHeight: 100,
    pixelRatio: 2,
    visibleCount: 7,
    culledCount: 2,
    textureSource: 'framebuffer-copy',
  })
  assert.equal(calls.length, 2)
})

test('webglComposite draw helper forwards a flipped textured quad draw', () => {
  const uniform1fCalls: number[] = []
  const fakeContext = {
    FLOAT: 5126,
    ARRAY_BUFFER: 34962,
    TEXTURE0: 33984,
    TEXTURE_2D: 3553,
    TRIANGLE_STRIP: 5,
    useProgram() {},
    bindBuffer() {},
    enableVertexAttribArray() {},
    vertexAttribPointer() {},
    uniform4f() {},
    uniform2f() {},
    uniform1f: (_location: unknown, value: number) => {
      uniform1fCalls.push(value)
    },
    activeTexture() {},
    bindTexture() {},
    uniform1i() {},
    drawArrays() {},
  } as unknown as WebGLRenderingContext

  drawCompositeTextureFrame({
    context: fakeContext,
    pipeline: {
      program: {} as WebGLProgram,
      positionBuffer: {} as WebGLBuffer,
      attributePosition: 0,
      uniformRect: {} as WebGLUniformLocation,
      uniformScale: {} as WebGLUniformLocation,
      uniformOffset: {} as WebGLUniformLocation,
      uniformViewport: {} as WebGLUniformLocation,
      uniformColor: {} as WebGLUniformLocation,
      uniformUseTexture: {} as WebGLUniformLocation,
      uniformFlipTextureY: {} as WebGLUniformLocation,
      uniformSampler: {} as WebGLUniformLocation,
    },
    frame: createFrame(),
    texture: {} as WebGLTexture,
    viewportWidth: 200,
    viewportHeight: 100,
    textureSource: 'framebuffer-copy',
  })

  // Framebuffer-backed composite presentation must enable the shared Y-flip flag.
  assert.equal(uniform1fCalls.includes(1), true)
})

test('webglComposite draw helper keeps canvas-upload composites unflipped', () => {
  const uniform1fCalls: number[] = []
  const fakeContext = {
    FLOAT: 5126,
    ARRAY_BUFFER: 34962,
    TEXTURE0: 33984,
    TEXTURE_2D: 3553,
    TRIANGLE_STRIP: 5,
    useProgram() {},
    bindBuffer() {},
    enableVertexAttribArray() {},
    vertexAttribPointer() {},
    uniform4f() {},
    uniform2f() {},
    uniform1f: (_location: unknown, value: number) => {
      uniform1fCalls.push(value)
    },
    activeTexture() {},
    bindTexture() {},
    uniform1i() {},
    drawArrays() {},
  } as unknown as WebGLRenderingContext

  drawCompositeTextureFrame({
    context: fakeContext,
    pipeline: {
      program: {} as WebGLProgram,
      positionBuffer: {} as WebGLBuffer,
      attributePosition: 0,
      uniformRect: {} as WebGLUniformLocation,
      uniformScale: {} as WebGLUniformLocation,
      uniformOffset: {} as WebGLUniformLocation,
      uniformViewport: {} as WebGLUniformLocation,
      uniformColor: {} as WebGLUniformLocation,
      uniformUseTexture: {} as WebGLUniformLocation,
      uniformFlipTextureY: {} as WebGLUniformLocation,
      uniformSampler: {} as WebGLUniformLocation,
    },
    frame: createFrame(),
    texture: {} as WebGLTexture,
    viewportWidth: 200,
    viewportHeight: 100,
    textureSource: 'canvas-upload',
  })

  // Canvas-upload composites already match top-left screen space, so they must stay unflipped.
  assert.equal(uniform1fCalls.includes(0), true)
})