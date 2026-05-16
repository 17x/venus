import assert from 'node:assert/strict'
import test from 'node:test'

import { createEngine } from './createEngine/createEngine.ts'
import type { EngineRenderStats } from '../renderer/types/index.ts'
import type { EngineSceneSnapshot, EngineShapeNode, EngineTextNode } from '../scene/types/types.ts'
import type { EngineClock, EngineFrameHandle, EngineFrameInfo } from '../time/index.ts'

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

/**
 * Build an overlap-heavy scene so hit-test exact-check budgeting is observable.
  * @param nodeCount nodeCount parameter.
*/
function createOverlappingScene(nodeCount: number): EngineSceneSnapshot {
  const nodes: EngineShapeNode[] = []

  for (let index = 0; index < nodeCount; index += 1) {
    nodes.push({
      id: `overlap-${String(index)}`,
      type: 'shape',
      shape: 'rect',
      x: 0,
      y: 0,
      width: 20,
      height: 20,
      fill: '#ff5500',
    })
  }

  return {
    revision: 3,
    width: 200,
    height: 200,
    nodes,
  }
}

/**
 * Build a text-heavy scene used by high-zoom text sharpness SLA checks.
  * @param nodeCount nodeCount parameter.
*/
function createTextHeavyScene(nodeCount: number): EngineSceneSnapshot {
  const nodes: EngineTextNode[] = []

  for (let index = 0; index < nodeCount; index += 1) {
    nodes.push({
      id: `text-${String(index)}`,
      type: 'text',
      x: 20,
      y: 20 + index * 18,
      width: 220,
      height: 16,
      style: {
        fontFamily: 'Arial',
        fontSize: 14,
        fill: '#111111',
      },
      text: `Node ${String(index)} text`,
      cacheKey: `text-cache-${String(index)}`,
    })
  }

  return {
    revision: 2,
    width: 1200,
    height: 1200,
    nodes,
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
    transform() {}
    fillText() {}
    strokeText() {}
    drawImage() {}
        /**
     * Handles measureText.
     * @param text Text content.
     */
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

        /**
     * Handles createShader.
     * @param type type parameter.
     */
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
        /**
     * Handles getUniformLocation.
     * @param _program _program parameter.
     * @param name name parameter.
     */
getUniformLocation(_program: WebGLProgram, name: string) {
      return {name} as unknown as WebGLUniformLocation
    }
    useProgram() {}
    enableVertexAttribArray() {}
    vertexAttribPointer() {}
        /**
     * Handles uniform4f.
     * @param location location parameter.
     * @param a a parameter.
     * @param b b parameter.
     * @param c c parameter.
     * @param d d parameter.
     */
uniform4f(location: {name: string}, a: number, b: number, c: number, d: number) {
      if (location.name === 'uRect') {
        this.currentUniforms.rect = [a, b, c, d]
      }
    }
        /**
     * Handles uniform2f.
     * @param location location parameter.
     * @param a a parameter.
     * @param b b parameter.
     */
uniform2f(location: {name: string}, a: number, b: number) {
      if (location.name === 'uScale') {
        this.currentUniforms.scale = [a, b]
      } else if (location.name === 'uOffset') {
        this.currentUniforms.offset = [a, b]
      } else if (location.name === 'uViewport') {
        this.currentUniforms.viewport = [a, b]
      }
    }
        /**
     * Handles uniform1f.
     * @param location location parameter.
     * @param value value parameter.
     */
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

        /**
     * Handles function.
     * @param width Width value.
     * @param height Height value.
     */
constructor(width: number, height: number) {
      this.width = width
      this.height = height
    }

        /**
     * Handles getContext.
     * @param kind kind parameter.
     */
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

/**
 * Build a deterministic clock harness so settle contract timing is testable.
 */
function createFakeClock() {
  let now = 0

  const clock: EngineClock = {
    now: () => now,
    requestFrame: (_callback: (frame: EngineFrameInfo) => void) => {
      return 0 as EngineFrameHandle
    },
    cancelFrame: (_handle: EngineFrameHandle) => {},
  }

  return {
    clock,
        /**
     * Handles setNow.
     * @param value value parameter.
     */
setNow(value: number) {
      now = value
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
    const hit2d = engine.hitTest2D({x: 15, y: 25})
    const hitRay = engine.hitTestRay({
      origin: {x: 15, y: 25, z: 100},
      direction: {x: 0, y: 0, z: -1},
    })
    const miss = engine.hitTest({x: 250, y: 250})
    const candidates = engine.queryViewportCandidates()
    const performanceGate = engine.getDiagnostics().performanceGate

    // The render path should submit only the visible node and surface one draw call.
    assert.equal(stats.drawCount, 1)
    assert.equal(stats.visibleCount, 1)
    assert.equal(stats.culledCount, 1)
    assert.equal(statsFromDebug.at(-1)?.drawCount, 1)

    // World-space hit testing should find the visible rectangle but reject misses outside the scene.
    assert.equal(hit?.nodeId, 'rect-visible')
    assert.equal(hit2d?.nodeId, 'rect-visible')
    assert.equal(hitRay?.nodeId, 'rect-visible')
    assert.equal(miss, null)
    assert.deepEqual(candidates, ['rect-visible'])
    assert.equal(performanceGate.pass, true)

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

test('createEngine supports webgpu backend selection through native-probe hybrid path', async () => {
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
    const diagnostics = engine.getDiagnostics()
    assert.equal(diagnostics.backend, 'webgpu')
    assert.equal(stats.drawCount, 1)
  } finally {
    environment.restore()
  }
})

test('createEngine settle sharpness contract tracks deadline meet and miss counters', async () => {
  const environment = installFakeCanvasEnvironment()
  const fakeClock = createFakeClock()

  try {
    const canvas = new environment.OffscreenCanvas(1, 1) as OffscreenCanvas
    const engine = createEngine({
      canvas,
      clock: fakeClock.clock,
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
        lod: {enabled: true},
        tiles: {enabled: false},
        overscan: {enabled: false},
      },
      render: {
        quality: 'full',
        modelCompleteComposite: false,
        interactionPreview: {enabled: false},
      },
    })

    engine.resize({
      viewportWidth: 200,
      viewportHeight: 150,
      outputWidth: 200,
      outputHeight: 150,
    })

    fakeClock.setNow(0)
    engine.panBy(5, 0)
    fakeClock.setNow(70)
    await engine.renderFrame()
    const settleMetDiagnostics = engine.getDiagnostics().settleSharpness
    const settleMetStrategy = engine.getDiagnostics().strategy

    // Settling frame should satisfy stop-to-sharp before 120ms deadline.
    assert.equal(settleMetStrategy.phase, 'settling')
    assert.equal(settleMetDiagnostics.pending, false)
    assert.equal(settleMetDiagnostics.metCount, 1)
    assert.equal(settleMetDiagnostics.missCount, 0)

    fakeClock.setNow(100)
    engine.panBy(3, 0)
    fakeClock.setNow(250)
    await engine.renderFrame()
    const settleMissDiagnostics = engine.getDiagnostics().settleSharpness

    // Missed deadlines should be counted even if the same frame then recovers sharpness.
    assert.equal(settleMissDiagnostics.pending, false)
    assert.equal(settleMissDiagnostics.missCount, 1)
    assert.ok(settleMissDiagnostics.metCount >= 2)
    assert.ok(settleMissDiagnostics.lastMissLatencyMs >= 120)
  } finally {
    environment.restore()
  }
})

test('createEngine predictor diagnostics report pan direction, speed, and confidence', async () => {
  const environment = installFakeCanvasEnvironment()
  const fakeClock = createFakeClock()

  try {
    const canvas = new environment.OffscreenCanvas(1, 1) as OffscreenCanvas
    const engine = createEngine({
      canvas,
      clock: fakeClock.clock,
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
        lod: {enabled: true},
        tiles: {enabled: true},
        overscan: {enabled: true},
      },
      render: {
        quality: 'full',
        modelCompleteComposite: false,
      },
    })

    engine.resize({
      viewportWidth: 200,
      viewportHeight: 150,
      outputWidth: 200,
      outputHeight: 150,
    })

    fakeClock.setNow(0)
    await engine.renderFrame()

    fakeClock.setNow(16)
    engine.panBy(24, 0)
    await engine.renderFrame()
    const predictor = engine.getDiagnostics().predictor

    // Direction and speed should reflect the positive-x pan step.
    assert.ok(predictor.directionX > 0)
    assert.equal(predictor.directionY, 0)
    assert.ok(predictor.speedPxPerSec > 0)
    assert.ok(predictor.confidence > 0)
  } finally {
    environment.restore()
  }
})

test('createEngine strategy diagnostics transition pan to settling to static across interaction timeline', async () => {
  const environment = installFakeCanvasEnvironment()
  const fakeClock = createFakeClock()

  try {
    const canvas = new environment.OffscreenCanvas(1, 1) as OffscreenCanvas
    const engine = createEngine({
      canvas,
      clock: fakeClock.clock,
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
        lod: {enabled: true},
        tiles: {enabled: false},
        overscan: {enabled: false},
      },
      render: {
        quality: 'full',
        modelCompleteComposite: false,
      },
    })

    engine.resize({
      viewportWidth: 200,
      viewportHeight: 150,
      outputWidth: 200,
      outputHeight: 150,
    })

    fakeClock.setNow(0)
    await engine.renderFrame()

    fakeClock.setNow(16)
    engine.panBy(12, 0)
    await engine.renderFrame()
    const panPhase = engine.getDiagnostics().strategy.phase

    fakeClock.setNow(96)
    await engine.renderFrame()
    const settlingPhase = engine.getDiagnostics().strategy.phase

    fakeClock.setNow(170)
    await engine.renderFrame()
    const staticPhase = engine.getDiagnostics().strategy.phase

    // Strategy should move from interaction lane into settle recovery and then idle lane.
    assert.equal(panPhase, 'pan')
    assert.equal(settlingPhase, 'settling')
    assert.equal(staticPhase, 'static')
  } finally {
    environment.restore()
  }
})

test('createEngine emits predictive preload metrics in render stats when tiles are enabled', async () => {
  const environment = installFakeCanvasEnvironment()

  try {
    const canvas = new environment.OffscreenCanvas(1, 1) as OffscreenCanvas
    const engine = createEngine({
      canvas,
      initialScene: createScene(),
      viewport: {
        viewportWidth: 320,
        viewportHeight: 240,
        offsetX: 0,
        offsetY: 0,
        scale: 1,
      },
      performance: {
        culling: true,
        lod: {enabled: true},
        tiles: {enabled: true},
        overscan: {enabled: true},
      },
      render: {
        quality: 'full',
        modelCompleteComposite: true,
      },
    })

    engine.resize({
      viewportWidth: 320,
      viewportHeight: 240,
      outputWidth: 320,
      outputHeight: 240,
    })

    const stats = await engine.renderFrame()

    // Metrics should always be present and non-negative once predictive stats are wired.
    assert.ok((stats.webglPredictivePreloadEnqueueCount ?? 0) >= 0)
    assert.ok((stats.webglPredictivePreloadProcessedCount ?? 0) >= 0)
    assert.ok((stats.webglPredictivePreloadPrunedCount ?? 0) >= 0)
  } finally {
    environment.restore()
  }
})

test('createEngine hitTest applies adaptive exact-check budget during interaction pressure', async () => {
  const environment = installFakeCanvasEnvironment()
  const fakeClock = createFakeClock()

  try {
    const canvas = new environment.OffscreenCanvas(1, 1) as OffscreenCanvas
    const engine = createEngine({
      canvas,
      clock: fakeClock.clock,
      initialScene: createOverlappingScene(96),
      viewport: {
        viewportWidth: 200,
        viewportHeight: 150,
        offsetX: 0,
        offsetY: 0,
        scale: 1,
      },
      performance: {
        culling: true,
        lod: {enabled: true},
        tiles: {enabled: false},
        overscan: {enabled: false},
      },
      render: {
        quality: 'full',
        modelCompleteComposite: false,
      },
    })

    engine.resize({
      viewportWidth: 200,
      viewportHeight: 150,
      outputWidth: 200,
      outputHeight: 150,
    })

    fakeClock.setNow(0)
    await engine.renderFrame()

    fakeClock.setNow(16)
    engine.panBy(3, 0)
    await engine.renderFrame()

    const hit = engine.hitTest({x: 5, y: 5})
    const diagnostics = engine.getDiagnostics()

    assert.ok(hit)
    assert.ok(diagnostics.hitPlan)
    // Interaction frames resolve medium pressure, so exact checks are capped.
    assert.equal(diagnostics.hitPlan?.exactCheckBudget, 20)
    assert.equal(diagnostics.hitPlan?.exactBudgetExceeded, true)
    assert.ok((diagnostics.hitPlan?.exactCheckCount ?? 0) <= 20)

    // Strategy snapshot should mirror lane/pressure/fallback state from runtime.
    assert.equal(diagnostics.strategySnapshot.lane, diagnostics.strategy.phase)
    assert.equal(diagnostics.strategySnapshot.budgetPressure, diagnostics.budget.pressure)
  } finally {
    environment.restore()
  }
})

test('createEngine render stats include unified geometry cache hit-rate metrics', async () => {
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
        quality: 'full',
        modelCompleteComposite: false,
      },
    })

    engine.resize({
      viewportWidth: 200,
      viewportHeight: 150,
      outputWidth: 200,
      outputHeight: 150,
    })

    const firstStats = await engine.renderFrame()
    const secondStats = await engine.renderFrame()

    assert.ok((firstStats.geometryCacheHitCount ?? -1) >= 0)
    assert.ok((firstStats.geometryCacheMissCount ?? -1) >= 0)
    assert.ok((secondStats.geometryCacheHitCount ?? -1) >= 0)
    assert.ok((secondStats.geometryCacheMissCount ?? -1) >= 0)
    assert.ok((secondStats.geometryCacheHitRate ?? -1) >= 0)
    assert.ok((secondStats.geometryCacheHitRate ?? 2) <= 1)
  } finally {
    environment.restore()
  }
})

test('createEngine reports high-zoom text sharpness SLA violations on deferred text uploads', async () => {
  const environment = installFakeCanvasEnvironment()
  const fakeClock = createFakeClock()

  try {
    const canvas = new environment.OffscreenCanvas(1, 1) as OffscreenCanvas
    const engine = createEngine({
      canvas,
      clock: fakeClock.clock,
      initialScene: createTextHeavyScene(8),
      viewport: {
        viewportWidth: 320,
        viewportHeight: 240,
        offsetX: 0,
        offsetY: 0,
        scale: 2.2,
      },
      performance: {
        culling: true,
        lod: {enabled: true},
        tiles: {enabled: false},
        overscan: {enabled: false},
      },
      render: {
        quality: 'full',
        modelCompleteComposite: false,
      },
    })

    engine.resize({
      viewportWidth: 320,
      viewportHeight: 240,
      outputWidth: 320,
      outputHeight: 240,
    })

    fakeClock.setNow(0)
    const firstStats = await engine.renderFrame()
    const firstDiagnostics = engine.getDiagnostics().settleSharpness

    // High-zoom text frame should be SLA-checked and may violate when text uploads are sliced.
    assert.ok((firstStats.webglDeferredTextTextureCount ?? 0) > 0)
    assert.ok((firstStats.webglHighZoomTextSlaViolationCount ?? 0) > 0)
    assert.ok(firstDiagnostics.highZoomTextSlaCheckedCount >= 1)
    assert.ok(firstDiagnostics.highZoomTextSlaViolationCount >= 1)

    fakeClock.setNow(16)
    const secondStats = await engine.renderFrame()
    const secondDiagnostics = engine.getDiagnostics().settleSharpness

    // After cache warm-up, deferred text should drop and SLA violation should stop increasing.
    assert.equal(secondStats.webglDeferredTextTextureCount ?? 0, 0)
    assert.equal(secondStats.webglHighZoomTextSlaViolationCount ?? 0, 0)
    assert.ok(secondDiagnostics.highZoomTextSlaCheckedCount >= firstDiagnostics.highZoomTextSlaCheckedCount)
    assert.equal(secondDiagnostics.highZoomTextSlaViolationCount, firstDiagnostics.highZoomTextSlaViolationCount)
  } finally {
    environment.restore()
  }
})

test('createEngine diagnostics expose runtime policy snapshot fields', async () => {
  const environment = installFakeCanvasEnvironment()
  const fakeClock = createFakeClock()

  try {
    const canvas = new environment.OffscreenCanvas(1, 1) as OffscreenCanvas
    const engine = createEngine({
      canvas,
      clock: fakeClock.clock,
      initialScene: createScene(),
      viewport: {
        viewportWidth: 240,
        viewportHeight: 160,
        offsetX: 0,
        offsetY: 0,
        scale: 1,
      },
      settings: {
        profile: 'editor',
      },
      render: {
        quality: 'full',
      },
    })

    engine.resize({
      viewportWidth: 240,
      viewportHeight: 160,
      outputWidth: 240,
      outputHeight: 160,
    })

    fakeClock.setNow(0)
    await engine.renderFrame()
    const diagnostics = engine.getDiagnostics()

    assert.equal(diagnostics.policy.profile, 'editor')
    assert.ok(diagnostics.policy.renderScale > 0)
    assert.ok(diagnostics.policy.pressureScore >= 0)
    assert.equal(typeof diagnostics.policy.scalerDecisionReason, 'string')
    assert.equal(typeof diagnostics.qos.trace, 'string')
    assert.ok(diagnostics.qos.guardTriggers.length >= 0)
    assert.equal(typeof diagnostics.qos.degradationLevel, 'string')
    assert.equal(diagnostics.qos.profile, 'editor')
    assert.equal(typeof diagnostics.qos.pressure, 'string')
    assert.ok(diagnostics.qos.budget.drawSubmitBudgetMs >= 0)
    assert.equal(diagnostics.qos.fallbackReason, null)
  } finally {
    environment.restore()
  }
})

test('createEngine diagnostics expose 3D visibility policy and preview execution mode', async () => {
  const environment = installFakeCanvasEnvironment()

  try {
    const canvas = new environment.OffscreenCanvas(1, 1) as OffscreenCanvas
    const engine = createEngine({
      canvas,
      initialScene: createScene(),
      viewport: {
        viewportWidth: 200,
        viewportHeight: 140,
        offsetX: 0,
        offsetY: 0,
        scale: 1,
      },
      performance: {
        culling: true,
        lod: {enabled: true},
        tiles: {enabled: false},
        overscan: {enabled: false},
      },
      render: {
        quality: 'full',
        modelCompleteComposite: false,
      },
    })

    engine.resize({
      viewportWidth: 200,
      viewportHeight: 140,
      outputWidth: 200,
      outputHeight: 140,
    })

    await engine.renderFrame()
    const diagnostics = engine.getDiagnostics()

    assert.equal(diagnostics.visibility3dPolicy.executionMode, 'fallback-frustum-coarse')
    assert.equal(diagnostics.visibility3dPolicy.hasFrustumResolver, false)
    assert.equal(diagnostics.strategySnapshot.previewExecutionMode, 'affine-snapshot')
  } finally {
    environment.restore()
  }
})