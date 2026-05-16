import { createEngine } from '../runtime/createEngine/createEngine.ts'
import type { EngineRenderStats } from '../renderer/types/index.ts'
import type { EngineClock, EngineFrameHandle, EngineFrameInfo } from '../time/index.ts'
import type { EngineRuntimeDiagnostics } from '../runtime/createEngine/createEngine.ts'
import { createEngineBenchmarkScenario } from './scenario.ts'
import { buildEngineBaselineReport } from './baselineReport/baselineReport.ts'
import fs from 'node:fs'

const BENCHMARK_TEXT_MEASURE_WIDTH_PER_CHAR = 10
const BENCHMARK_TEXT_MEASURE_ASCENT = 8
const BENCHMARK_TEXT_MEASURE_DESCENT = 2
const BENCHMARK_FRAME_INTERVAL_MS = 16
const BENCHMARK_JSON_INDENT_SPACES = 2

/**
 * Minimal fake 2D context for baseline benchmark execution in Node.
 */
class BaselineFake2DContext {
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
   * Intent: return deterministic text metrics for benchmark-only rendering.
   * @param text Text content.
   * @returns Deterministic fake text metrics.
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
class BaselineFakeWebGLContext {
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
   * Intent: return fake shader handle for deterministic benchmark execution.
   * @param type Shader type constant.
   * @returns Fake WebGL shader handle.
   */
  createShader(type: number) {
    return { type } as WebGLShader
  }
  shaderSource() {}
  compileShader() {}
  getShaderParameter() { return true }
  getShaderInfoLog() { return null }
  deleteShader() {}
  createProgram() { return {} as WebGLProgram }
  attachShader() {}
  linkProgram() {}
  getProgramParameter() { return true }
  getProgramInfoLog() { return null }
  deleteProgram() {}
  createBuffer() { return {} as WebGLBuffer }
  bindBuffer() {}
  bufferData() {}
  deleteBuffer() {}
  getAttribLocation() { return 0 }
  /**
   * Intent: return fake uniform location handle for benchmark-only rendering.
   * @param _program Program handle.
   * @param name Uniform name.
   * @returns Fake uniform location handle.
   */
  getUniformLocation(_program: WebGLProgram, name: string) { return { name } as unknown as WebGLUniformLocation }
  useProgram() {}
  enableVertexAttribArray() {}
  vertexAttribPointer() {}
  uniform4f() {}
  uniform2f() {}
  uniform1f() {}
  uniform1i() {}
  activeTexture() {}
  bindTexture() {}
  createTexture() { return {} as WebGLTexture }
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
class BaselineFakeOffscreenCanvas {
  width: number
  height: number

  private webglContext = new BaselineFakeWebGLContext()
  private context2d = new BaselineFake2DContext()

  /**
   * Intent: create deterministic fake canvas dimensions.
   * @param width Canvas width.
   * @param height Canvas height.
   */
  constructor(width: number, height: number) {
    this.width = width
    this.height = height
  }

  /**
   * Intent: provide fake canvas context instances for benchmark runtime.
   * @param kind Canvas context type.
   * @returns Matching fake context or null when unsupported.
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
 * Intent: install fake canvas globals for Node benchmark execution.
 * @returns Environment object with restore hook.
 */
function installFakeCanvasEnvironment() {
  const originalOffscreenCanvas = (globalThis as typeof globalThis & { OffscreenCanvas?: unknown }).OffscreenCanvas
  Object.defineProperty(globalThis, 'OffscreenCanvas', {
    configurable: true,
    value: BaselineFakeOffscreenCanvas,
  })

  return {
    OffscreenCanvas: BaselineFakeOffscreenCanvas,
    restore() {
      if (originalOffscreenCanvas === undefined) {
        Reflect.deleteProperty(globalThis, 'OffscreenCanvas')
        return
      }

      Object.defineProperty(globalThis, 'OffscreenCanvas', {
        configurable: true,
        value: originalOffscreenCanvas,
      })
    },
  }
}

/**
 * Intent: build deterministic fake clock so benchmark timing is stable.
 * @returns Fake clock API and mutation hook.
 */
function createFakeClock() {
  let nowMs = 0
  const clock: EngineClock = {
    now: () => nowMs,
    requestFrame: (_callback: (frame: EngineFrameInfo) => void) => 0 as EngineFrameHandle,
    cancelFrame: (_handle: EngineFrameHandle) => {},
  }

  return {
    clock,
    setNow(nextNowMs: number) {
      nowMs = nextNowMs
    },
  }
}

/**
 * Intent: resolve optional git commit hash for report reproducibility metadata.
 * @returns Commit hash string when available.
 */
function resolveGitCommit(): string | undefined {
  const fromEnvironment = process.env.GITHUB_SHA ?? process.env.VERCEL_GIT_COMMIT_SHA
  if (fromEnvironment && fromEnvironment.trim().length > 0) {
    return fromEnvironment.trim()
  }

  return undefined
}

/**
 * Intent: resolve optional CLI flag value from --name=value arguments.
 * @param name Flag name without prefix.
 * @returns Flag value or undefined when omitted.
 */
function resolveFlag(name: string): string | undefined {
  const prefix = `--${name}=`
  const match = process.argv.find((argument) => argument.startsWith(prefix))
  return match ? match.slice(prefix.length) : undefined
}

/**
 * Intent: run baseline benchmark scenario and emit full baseline report JSON.
 */
async function runBaselineBenchmark() {
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
        lod: { enabled: true },
        tiles: { enabled: true },
        overscan: { enabled: true },
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
    const diagnosticsList: EngineRuntimeDiagnostics[] = []

    for (let frameIndex = 0; frameIndex < scenario.frameCount; frameIndex += 1) {
      const nowMs = frameIndex * BENCHMARK_FRAME_INTERVAL_MS
      fakeClock.setNow(nowMs)
      engine.panBy(scenario.panDeltaX, scenario.panDeltaY)
      const stats = await engine.renderFrame()
      statsList.push(stats)
      diagnosticsList.push(engine.getDiagnostics())
    }

    const report = buildEngineBaselineReport(
      {
        scenario: scenario.name,
        timestampIso: new Date().toISOString(),
        gitCommit: resolveGitCommit(),
        backend: engine.getDiagnostics().backend,
      },
      statsList,
      diagnosticsList,
    )
    const reportJson = JSON.stringify(report, null, BENCHMARK_JSON_INDENT_SPACES)
    const outputPath = resolveFlag('out')
    if (outputPath) {
      fs.writeFileSync(outputPath, `${reportJson}\n`, 'utf8')
      console.log(`[bench:baseline] wrote report: ${outputPath}`)
      return
    }

    console.log(reportJson)
  } finally {
    environment.restore()
  }
}

void runBaselineBenchmark()
