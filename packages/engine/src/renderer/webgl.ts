import type {
  EngineRenderFrame,
  EngineRenderer,
} from './types.ts'
import { prepareEngineRenderPlan } from './plan.ts'
import { prepareEngineRenderInstanceView } from './instances.ts'

interface WebGLEngineRendererOptions {
  id?: string
  canvas: HTMLCanvasElement | OffscreenCanvas
  enableCulling?: boolean
  clearColor?: readonly [number, number, number, number]
  antialias?: boolean
}

/**
 * Built-in WebGL renderer entry for engine standalone/runtime integrations.
 *
 * Current stage keeps one shared plan+instance pipeline and a minimal clear
 * commit so Canvas2D/WebGL can evolve with the same front-half optimization
 * path before WebGL draw-program wiring lands.
 */
export function createWebGLEngineRenderer(
  options: WebGLEngineRendererOptions,
): EngineRenderer {
  const context = resolveWebGLContext(options.canvas, {
    antialias: options.antialias ?? true,
    alpha: true,
    premultipliedAlpha: true,
    powerPreference: 'high-performance',
  })
  if (!context) {
    throw new Error('webgl context is required for createWebGLEngineRenderer')
  }

  const clearColor = options.clearColor ?? [0, 0, 0, 0]
  const enableCulling = options.enableCulling ?? true

  return {
    id: options.id ?? 'engine.renderer.webgl',
    capabilities: {
      backend: 'webgl',
      textRuns: false,
      imageClip: false,
      culling: enableCulling,
      lod: false,
    },
    resize: (width, height) => {
      if ('width' in options.canvas) {
        options.canvas.width = width
      }
      if ('height' in options.canvas) {
        options.canvas.height = height
      }
      context.viewport(0, 0, width, height)
    },
    render: (frame: EngineRenderFrame) => {
      const startAt = performance.now()

      const plan = prepareEngineRenderPlan(frame)
      // Prepare typed-array instance payload once per frame so upcoming WebGL
      // draw pipelines can focus on upload/commit without repeating traversal.
      prepareEngineRenderInstanceView(frame, plan)

      context.clearColor(clearColor[0], clearColor[1], clearColor[2], clearColor[3])
      context.clear(context.COLOR_BUFFER_BIT)

      return {
        drawCount: 0,
        visibleCount: plan.stats.visibleCount,
        culledCount: plan.stats.culledCount,
        cacheHits: 0,
        cacheMisses: 0,
        frameReuseHits: 0,
        frameReuseMisses: 0,
        frameMs: performance.now() - startAt,
      }
    },
    dispose: () => {
      // WebGL context lifecycle is owned by the host canvas environment.
    },
  }
}

function resolveWebGLContext(
  canvas: HTMLCanvasElement | OffscreenCanvas,
  attributes: WebGLContextAttributes,
) {
  const webgl2 = canvas.getContext('webgl2', attributes) as WebGLRenderingContext | WebGL2RenderingContext | null
  if (webgl2) {
    return webgl2
  }

  return canvas.getContext('webgl', attributes) as WebGLRenderingContext | null
}
