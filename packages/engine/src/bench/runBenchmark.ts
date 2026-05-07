import { createEngine } from '../runtime/createEngine/createEngine.ts'
import type { EngineRenderStats } from '../renderer/types/index.ts'
import type { EngineClock, EngineFrameHandle, EngineFrameInfo } from '../time/index.ts'
import { createEngineBenchmarkScenario } from './scenario.ts'

interface BenchmarkSummary {
  scenario: string
  frameCount: number
  avgFrameMs: number
  p50FrameMs: number
  p95FrameMs: number
  avgDrawCount: number
  avgVisibleCount: number
  avgTileQueuePending: number
  totalPredictivePreloadEnqueue: number
  totalPredictivePreloadProcessed: number
  totalPredictivePreloadPruned: number
  totalHighZoomTextSlaViolation: number
}

const BENCHMARK_TEXT_MEASURE_WIDTH_PER_CHAR = 10
const BENCHMARK_TEXT_MEASURE_ASCENT = 8
const BENCHMARK_TEXT_MEASURE_DESCENT = 2
const PERCENTILE_MAX = 100
const PERCENTILE_P50 = 50
const PERCENTILE_P95 = 95
const BENCHMARK_FRAME_INTERVAL_MS = 16
const BENCHMARK_JSON_INDENT_SPACES = 2

/**
 * Minimal fake 2D context for benchmark-only engine execution in Node.
 */
class BenchmarkFake2DContext {
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
      width: text.length * BENCHMARK_TEXT_MEASURE_WIDTH_PER_CHAR,
      actualBoundingBoxAscent: BENCHMARK_TEXT_MEASURE_ASCENT,
      actualBoundingBoxDescent: BENCHMARK_TEXT_MEASURE_DESCENT,
    }
  }
}

/**
 * Minimal fake WebGL context for deterministic benchmark execution in Node.
 */
class BenchmarkFakeWebGLContext {
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
  uniform4f() {}
  uniform2f() {}
  uniform1f() {}
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
  drawArrays() {}
}

/**
 * Fake OffscreenCanvas implementation for Node-based benchmark execution.
 */
class BenchmarkFakeOffscreenCanvas {
  width: number
  height: number
  private webglContext = new BenchmarkFakeWebGLContext()
  private context2d = new BenchmarkFake2DContext()

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

/**
 * Install fake canvas environment so benchmark can run in Node without DOM.
 */
function installFakeCanvasEnvironment() {
  const originalOffscreenCanvas = (globalThis as typeof globalThis & {OffscreenCanvas?: unknown}).OffscreenCanvas

  Object.defineProperty(globalThis, 'OffscreenCanvas', {
    configurable: true,
    value: BenchmarkFakeOffscreenCanvas,
  })

  return {
    OffscreenCanvas: BenchmarkFakeOffscreenCanvas,
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
 * Build deterministic fake clock to keep benchmark iteration timing stable.
 */
function createFakeClock() {
  let nowMs = 0
  const clock: EngineClock = {
    now: () => nowMs,
    requestFrame: (_callback: (frame: EngineFrameInfo) => void) => {
      return 0 as EngineFrameHandle
    },
    cancelFrame: (_handle: EngineFrameHandle) => {},
  }

  return {
    clock,
        /**
     * Handles setNow.
     * @param nextNowMs nextNowMs parameter.
     */
setNow(nextNowMs: number) {
      nowMs = nextNowMs
    },
  }
}

/**
 * Resolve one percentile value from a pre-sorted array.
  * @param sortedValues sortedValues parameter.
 * @param percentile percentile parameter.
*/
function resolvePercentile(sortedValues: number[], percentile: number) {
  if (sortedValues.length === 0) {
    return 0
  }

  const clampedPercentile = Math.min(PERCENTILE_MAX, Math.max(0, percentile))
  const index = Math.min(
    sortedValues.length - 1,
    Math.floor((clampedPercentile / PERCENTILE_MAX) * sortedValues.length),
  )
  return sortedValues[index] ?? 0
}

/**
 * Aggregate frame-level stats into one benchmark summary payload.
  * @param scenarioName scenarioName parameter.
 * @param statsList statsList parameter.
*/
function summarizeBenchmark(scenarioName: string, statsList: EngineRenderStats[]): BenchmarkSummary {
  const frameMsList = statsList.map((stats) => stats.frameMs)
  const sortedFrameMsList = [...frameMsList].sort((a, b) => a - b)
  const frameCount = statsList.length

  const avgFrameMs = frameCount > 0
    ? frameMsList.reduce((sum, value) => sum + value, 0) / frameCount
    : 0
  const avgDrawCount = frameCount > 0
    ? statsList.reduce((sum, stats) => sum + stats.drawCount, 0) / frameCount
    : 0
  const avgVisibleCount = frameCount > 0
    ? statsList.reduce((sum, stats) => sum + stats.visibleCount, 0) / frameCount
    : 0
  const avgTileQueuePending = frameCount > 0
    ? statsList.reduce((sum, stats) => sum + (stats.tileSchedulerPendingCount ?? 0), 0) / frameCount
    : 0

  return {
    scenario: scenarioName,
    frameCount,
    avgFrameMs,
    p50FrameMs: resolvePercentile(sortedFrameMsList, PERCENTILE_P50),
    p95FrameMs: resolvePercentile(sortedFrameMsList, PERCENTILE_P95),
    avgDrawCount,
    avgVisibleCount,
    avgTileQueuePending,
    totalPredictivePreloadEnqueue: statsList.reduce(
      (sum, stats) => sum + (stats.webglPredictivePreloadEnqueueCount ?? 0),
      0,
    ),
    totalPredictivePreloadProcessed: statsList.reduce(
      (sum, stats) => sum + (stats.webglPredictivePreloadProcessedCount ?? 0),
      0,
    ),
    totalPredictivePreloadPruned: statsList.reduce(
      (sum, stats) => sum + (stats.webglPredictivePreloadPrunedCount ?? 0),
      0,
    ),
    totalHighZoomTextSlaViolation: statsList.reduce(
      (sum, stats) => sum + (stats.webglHighZoomTextSlaViolationCount ?? 0),
      0,
    ),
  }
}

/**
 * Run the F-03 benchmark scenario and print machine-readable summary output.
 */
async function runBenchmark() {
  const environment = installFakeCanvasEnvironment()
  const fakeClock = createFakeClock()
  const scenario = createEngineBenchmarkScenario()

  try {
    const canvas = new environment.OffscreenCanvas(1, 1) as unknown as OffscreenCanvas
    const engine = createEngine({
      canvas,
      clock: fakeClock.clock,
      initialScene: scenario.scene,
      viewport: {
        viewportWidth: scenario.viewportWidth,
        viewportHeight: scenario.viewportHeight,
        offsetX: 0,
        offsetY: 0,
        scale: scenario.initialScale,
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
      viewportWidth: scenario.viewportWidth,
      viewportHeight: scenario.viewportHeight,
      outputWidth: scenario.viewportWidth,
      outputHeight: scenario.viewportHeight,
    })

    const statsList: EngineRenderStats[] = []

    for (let frameIndex = 0; frameIndex < scenario.frameCount; frameIndex += 1) {
      const nowMs = frameIndex * BENCHMARK_FRAME_INTERVAL_MS
      fakeClock.setNow(nowMs)
      engine.panBy(scenario.panDeltaX, scenario.panDeltaY)
      const stats = await engine.renderFrame()
      statsList.push(stats)
    }

    const summary = summarizeBenchmark(scenario.name, statsList)
    // Emit one concise JSON payload so CI and local scripts can parse benchmark output.
    console.log(JSON.stringify(summary, null, BENCHMARK_JSON_INDENT_SPACES))
  } finally {
    environment.restore()
  }
}

void runBenchmark()
