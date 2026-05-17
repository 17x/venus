import type { EngineRenderStats } from '../renderer/types/index.ts'
import type { EngineSceneSnapshot, EngineShapeNode, EngineTextNode } from '../scene/types/types.ts'
import type { EngineClock, EngineFrameHandle, EngineFrameInfo } from '../time/index.ts'

/**
 * Stores one captured draw payload from fake WebGL integration test context.
 */
export interface RecordedDrawCall {
  /** Stores submitted world rectangle uniform payload. */
  rect: [number, number, number, number]
  /** Stores submitted viewport scale uniform payload. */
  scale: [number, number]
  /** Stores submitted viewport offset uniform payload. */
  offset: [number, number]
  /** Stores submitted viewport pixel size uniform payload. */
  viewport: [number, number]
  /** Stores texture-use flag at draw submission time. */
  useTexture: number
  /** Stores Y-flip flag at draw submission time. */
  flipTextureY: number
  /** Stores derived screen-space rectangle from uniform payloads. */
  screenRect: {
    x: number
    y: number
    width: number
    height: number
  }
}

/**
 * Builds one baseline scene with one visible and one culled rectangle.
 */
export function createScene(): EngineSceneSnapshot {
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
 * Builds an overlap-heavy scene so hit-test exact-check budgeting is observable.
 * @param nodeCount Node count used to generate dense overlapping rectangles.
 */
export function createOverlappingScene(nodeCount: number): EngineSceneSnapshot {
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
 * Builds a text-heavy scene used by high-zoom text sharpness SLA checks.
 * @param nodeCount Node count used to generate text nodes.
 */
export function createTextHeavyScene(nodeCount: number): EngineSceneSnapshot {
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

/**
 * Stores fake-canvas environment handles for integration tests.
 */
export interface FakeCanvasEnvironment {
  /** Stores fake OffscreenCanvas constructor for tests. */
  OffscreenCanvas: typeof OffscreenCanvas
  /** Stores recorded draw calls captured by fake WebGL context. */
  recordedDrawCalls: RecordedDrawCall[]
  /** Restores original global OffscreenCanvas symbol. */
  restore(): void
}

/**
 * Installs deterministic fake OffscreenCanvas/WebGL/2D contexts for integration tests.
 */
export function installFakeCanvasEnvironment(): FakeCanvasEnvironment {
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
     * @param type Shader type.
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
     * @param _program Program handle.
     * @param name Uniform name.
     */
    getUniformLocation(_program: WebGLProgram, name: string) {
      return {name} as unknown as WebGLUniformLocation
    }
    useProgram() {}
    enableVertexAttribArray() {}
    vertexAttribPointer() {}

    /**
     * Handles uniform4f.
     * @param location Uniform location token.
     * @param a First component.
     * @param b Second component.
     * @param c Third component.
     * @param d Fourth component.
     */
    uniform4f(location: {name: string}, a: number, b: number, c: number, d: number) {
      if (location.name === 'uRect') {
        this.currentUniforms.rect = [a, b, c, d]
      }
    }

    /**
     * Handles uniform2f.
     * @param location Uniform location token.
     * @param a First component.
     * @param b Second component.
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
     * @param location Uniform location token.
     * @param value Scalar value.
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

    /**
     * Handles drawArrays.
     */
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
     * Creates fake offscreen canvas instance.
     * @param width Canvas width.
     * @param height Canvas height.
     */
    constructor(width: number, height: number) {
      this.width = width
      this.height = height
    }

    /**
     * Handles getContext.
     * @param kind Context kind.
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
    OffscreenCanvas: FakeOffscreenCanvas as unknown as typeof OffscreenCanvas,
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
 * Stores deterministic fake clock controls for integration tests.
 */
export interface FakeClockHarness {
  /** Stores deterministic clock used by createEngine options. */
  clock: EngineClock
  /** Sets fake clock current timestamp. */
  setNow(value: number): void
}

/**
 * Builds a deterministic clock harness so settle contract timing is testable.
 */
export function createFakeClock(): FakeClockHarness {
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
     * @param value Timestamp value.
     */
    setNow(value: number) {
      now = value
    },
  }
}

/**
 * Stores captured stats sequence used by debug callback assertions.
 */
export type RecordedStats = EngineRenderStats[]
