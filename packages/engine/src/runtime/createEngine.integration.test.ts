import assert from 'node:assert/strict'
import test from 'node:test'

import { createEngine } from './createEngine.ts'
import type { EngineRenderStats } from '../renderer/types.ts'
import type { EngineSceneSnapshot, EngineShapeNode } from '../scene/types.ts'

interface RecordedDrawCall {
  rect: [number, number, number, number]
  scale: [number, number]
  offset: [number, number]
  viewport: [number, number]
  useTexture: number
  flipTextureY: number
  screenRect: {
    x: number
    y: number
    width: number
    height: number
  }
}

function createScene(): EngineSceneSnapshot {
  const visibleRect: EngineShapeNode = {
    id: 'rect-visible',
    type: 'shape',
    shape: 'rect',
    x: 10,
    y: 20,
    width: 30,
    height: 40,
    fill: '#ff0000',
  }
  const culledRect: EngineShapeNode = {
    id: 'rect-culled',
    type: 'shape',
    shape: 'rect',
    x: 400,
    y: 400,
    width: 20,
    height: 20,
    fill: '#00ff00',
  }

  return {
    revision: 1,
    width: 800,
    height: 600,
    nodes: [visibleRect, culledRect],
  }
}

function installFakeCanvasEnvironment() {
  const originalOffscreenCanvas = (globalThis as typeof globalThis & {OffscreenCanvas?: unknown}).OffscreenCanvas
  const recordedDrawCalls: RecordedDrawCall[] = []

  class Fake2DContext {
    imageSmoothingEnabled = true
    imageSmoothingQuality: ImageSmoothingQuality = 'high'
    clearRect() {}
    setTransform() {}
    save() {}
    restore() {}
    beginPath() {}
    rect() {}
    roundRect() {}
    ellipse() {}
    moveTo() {}
    lineTo() {}
    bezierCurveTo() {}
    closePath() {}
    clip() {}
    fill() {}
    stroke() {}
    translate() {}
    rotate() {}
    scale() {}
    fillText() {}
    strokeText() {}
    drawImage() {}
    measureText(text: string) {
      return {
        width: text.length * 10,
        actualBoundingBoxAscent: 8,
        actualBoundingBoxDescent: 2,
      }
    }
  }

  class FakeWebGLContext {
    VERTEX_SHADER = 0x8b31
    FRAGMENT_SHADER = 0x8b30
    COMPILE_STATUS = 0x8b81
    LINK_STATUS = 0x8b82
    ARRAY_BUFFER = 0x8892
    STATIC_DRAW = 0x88e4
    FLOAT = 0x1406
    TEXTURE0 = 0x84c0
    TEXTURE_2D = 0x0de1
    TRIANGLE_STRIP = 0x0005
    RGBA = 0x1908
    UNSIGNED_BYTE = 0x1401
    COLOR_BUFFER_BIT = 0x4000
    BLEND = 0x0be2
    ONE = 1
    ONE_MINUS_SRC_ALPHA = 0x0303
    TEXTURE_MIN_FILTER = 0x2801
    TEXTURE_MAG_FILTER = 0x2800
    LINEAR = 0x2601
    TEXTURE_WRAP_S = 0x2802
    TEXTURE_WRAP_T = 0x2803
    CLAMP_TO_EDGE = 0x812f
    UNPACK_PREMULTIPLY_ALPHA_WEBGL = 0x9241

    private currentUniforms = {
      rect: [0, 0, 0, 0] as [number, number, number, number],
      scale: [0, 0] as [number, number],
      offset: [0, 0] as [number, number],
      viewport: [0, 0] as [number, number],
      useTexture: 0,
      flipTextureY: 0,
    }

    createShader(type: number) {
      return {type} as WebGLShader
    }
    shaderSource() {}
    compileShader() {}
    getShaderParameter() {
      return true
    }
    getShaderInfoLog() {
      return null
    }
    deleteShader() {}
    createProgram() {
      return {} as WebGLProgram
    }
    attachShader() {}
    linkProgram() {}
    getProgramParameter() {
      return true
    }
    getProgramInfoLog() {
      return null
    }
    deleteProgram() {}
    createBuffer() {
      return {} as WebGLBuffer
    }
    bindBuffer() {}
    bufferData() {}
    deleteBuffer() {}
    getAttribLocation() {
      return 0
    }
    getUniformLocation(_program: WebGLProgram, name: string) {
      return {name} as unknown as WebGLUniformLocation
    }
    useProgram() {}
    enableVertexAttribArray() {}
    vertexAttribPointer() {}
    uniform4f(location: {name: string}, a: number, b: number, c: number, d: number) {
      if (location.name === 'uRect') {
        this.currentUniforms.rect = [a, b, c, d]
      }
    }
    uniform2f(location: {name: string}, a: number, b: number) {
      if (location.name === 'uScale') {
        this.currentUniforms.scale = [a, b]
      } else if (location.name === 'uOffset') {
        this.currentUniforms.offset = [a, b]
      } else if (location.name === 'uViewport') {
        this.currentUniforms.viewport = [a, b]
      }
    }
    uniform1f(location: {name: string}, value: number) {
      if (location.name === 'uUseTexture') {
        this.currentUniforms.useTexture = value
      } else if (location.name === 'uFlipTextureY') {
        this.currentUniforms.flipTextureY = value
      }
    }
    uniform1i() {}
    activeTexture() {}
    bindTexture() {}
    createTexture() {
      return {} as WebGLTexture
    }
    deleteTexture() {}
    texParameteri() {}
    pixelStorei() {}
    texImage2D() {}
    copyTexImage2D() {}
    viewport() {}
    enable() {}
    blendFunc() {}
    clearColor() {}
    clear() {}
    drawArrays() {
      const rect = this.currentUniforms.rect
      const scale = this.currentUniforms.scale
      const offset = this.currentUniforms.offset
      recordedDrawCalls.push({
        rect,
        scale,
        offset,
        viewport: this.currentUniforms.viewport,
        useTexture: this.currentUniforms.useTexture,
        flipTextureY: this.currentUniforms.flipTextureY,
        // Derive the submitted screen-space rectangle from the recorded uniforms.
        screenRect: {
          x: rect[0] * scale[0] + offset[0],
          y: rect[1] * scale[1] + offset[1],
          width: rect[2] * scale[0],
          height: rect[3] * scale[1],
        },
      })
    }
  }

  class FakeOffscreenCanvas {
    width: number
    height: number
    private webglContext = new FakeWebGLContext()
    private context2d = new Fake2DContext()

    constructor(width: number, height: number) {
      this.width = width
      this.height = height
    }

    getContext(kind: string) {
      if (kind === 'webgl2' || kind === 'webgl') {
        return this.webglContext
      }
      if (kind === '2d') {
        return this.context2d
      }
      return null
    }
  }

  Object.defineProperty(globalThis, 'OffscreenCanvas', {
    configurable: true,
    value: FakeOffscreenCanvas,
  })

  return {
    OffscreenCanvas: FakeOffscreenCanvas,
    recordedDrawCalls,
    restore() {
      if (originalOffscreenCanvas === undefined) {
        Reflect.deleteProperty(globalThis, 'OffscreenCanvas')
      } else {
        Object.defineProperty(globalThis, 'OffscreenCanvas', {
          configurable: true,
          value: originalOffscreenCanvas,
        })
      }
    },
  }
}

test('createEngine integrates scene load, render output, hitTest, and render positioning', async () => {
  const environment = installFakeCanvasEnvironment()

  try {
    const canvas = new environment.OffscreenCanvas(1, 1) as OffscreenCanvas
    const statsFromDebug: EngineRenderStats[] = []
    const engine = createEngine({
      canvas,
      initialScene: createScene(),
      viewport: {
        viewportWidth: 200,
        viewportHeight: 150,
        offsetX: 10,
        offsetY: 20,
        scale: 2,
      },
      performance: {
        culling: true,
        lod: {enabled: false},
        tiles: {enabled: false},
        overscan: {enabled: false},
      },
      render: {
        quality: 'full',
        modelCompleteComposite: false,
        interactionPreview: {enabled: false},
      },
      debug: {
        onStats: (stats) => {
          // Mirror renderFrame output through debug callback so the test covers the full engine event path.
          statsFromDebug.push(stats)
        },
      },
    })

    engine.resize({
      viewportWidth: 200,
      viewportHeight: 150,
      outputWidth: 400,
      outputHeight: 300,
    })

    const stats = await engine.renderFrame()
    const hit = engine.hitTest({x: 15, y: 25})
    const miss = engine.hitTest({x: 250, y: 250})
    const candidates = engine.queryViewportCandidates()

    // The render path should submit only the visible node and surface one draw call.
    assert.equal(stats.drawCount, 1)
    assert.equal(stats.visibleCount, 1)
    assert.equal(stats.culledCount, 1)
    assert.equal(statsFromDebug.at(-1)?.drawCount, 1)

    // World-space hit testing should find the visible rectangle but reject misses outside the scene.
    assert.equal(hit?.nodeId, 'rect-visible')
    assert.equal(miss, null)
    assert.deepEqual(candidates, ['rect-visible'])

    const drawCall = environment.recordedDrawCalls.at(-1)
    assert.ok(drawCall, 'expected one submitted WebGL draw call')
    assert.deepEqual(drawCall.rect, [10, 20, 30, 40])
    assert.deepEqual(drawCall.scale, [4, 4])
    assert.deepEqual(drawCall.offset, [20, 40])
    assert.deepEqual(drawCall.viewport, [400, 300])
    assert.deepEqual(drawCall.screenRect, {
      x: 60,
      y: 120,
      width: 120,
      height: 160,
    })
  } finally {
    environment.restore()
  }
})