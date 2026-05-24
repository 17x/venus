import type { EngineRenderFrame, EngineRenderer } from '../types/index.ts'
import { createViewportMatrixForRender } from './core/index.ts'
import { drawCompositeTextureFrame } from './preview/index.ts'

/**
 * Input contract for zero-draw model fallback recovery.
 */
interface WebGLZeroDrawFallbackArgs {
  /** Active WebGL rendering context. */
  context: WebGLRenderingContext
  /** Shared quad pipeline used for full-screen composite draw. */
  pipeline: Parameters<typeof drawCompositeTextureFrame>[0]['pipeline']
  /** Target composite texture receiving fallback upload. */
  compositeTexture: WebGLTexture
  /** Model surface rendered by Canvas2D backend. */
  modelSurfaceCanvas: HTMLCanvasElement | OffscreenCanvas
  /** Canvas2D renderer used to recover a guaranteed non-empty base frame. */
  modelRenderer: EngineRenderer
  /** Effective frame currently being rendered by WebGL backend. */
  effectiveFrame: EngineRenderFrame
}

/**
 * Runs full-quality model fallback when packet path produced zero draws.
 * @param args Inputs required to render and composite a model fallback frame.
 * @returns Draw count and model-render time delta contributed by fallback path.
 */
export async function applyWebGLZeroDrawModelFallback(
  args: WebGLZeroDrawFallbackArgs,
): Promise<{ drawCount: number; modelRenderMs: number }> {
  const modelSurfacePixelRatio = args.effectiveFrame.context.pixelRatio ?? args.effectiveFrame.context.outputPixelRatio ?? 1
  // Force full-quality model fallback so zero-draw recovery cannot inherit
  // interaction-tier culling/placeholder decisions that produced empty output.
  const modelFallbackFrame: EngineRenderFrame = {
    ...args.effectiveFrame,
    context: {
      ...args.effectiveFrame.context,
      quality: 'full',
      lodEnabled: false,
    },
  }

  args.modelRenderer.resize?.({
    viewportWidth: modelFallbackFrame.viewport.viewportWidth,
    viewportHeight: modelFallbackFrame.viewport.viewportHeight,
    outputWidth: Math.max(1, Math.round(modelFallbackFrame.viewport.viewportWidth * modelSurfacePixelRatio)),
    outputHeight: Math.max(1, Math.round(modelFallbackFrame.viewport.viewportHeight * modelSurfacePixelRatio)),
  })

  const modelFrameWithOutputRatio: EngineRenderFrame = {
    ...modelFallbackFrame,
    context: {
      ...modelFallbackFrame.context,
      outputPixelRatio: modelSurfacePixelRatio,
    },
  }
  const modelFallbackRenderStart = performance.now()
  await args.modelRenderer.render(modelFrameWithOutputRatio)
  const modelRenderMs = performance.now() - modelFallbackRenderStart

  args.context.bindTexture(args.context.TEXTURE_2D, args.compositeTexture)
  args.context.pixelStorei(args.context.UNPACK_PREMULTIPLY_ALPHA_WEBGL, 1)
  args.context.texImage2D(
    args.context.TEXTURE_2D,
    0,
    args.context.RGBA,
    args.context.RGBA,
    args.context.UNSIGNED_BYTE,
    args.modelSurfaceCanvas as unknown as TexImageSource,
  )

  const compositeFrame: EngineRenderFrame = {
    ...modelFallbackFrame,
    viewport: {
      ...modelFallbackFrame.viewport,
      matrix: createViewportMatrixForRender(1, 0, 0),
      scale: 1,
      offsetX: 0,
      offsetY: 0,
    },
  }
  drawCompositeTextureFrame({
    context: args.context,
    pipeline: args.pipeline,
    frame: compositeFrame,
    texture: args.compositeTexture,
    viewportWidth: args.effectiveFrame.viewport.viewportWidth,
    viewportHeight: args.effectiveFrame.viewport.viewportHeight,
    textureSource: 'canvas-upload',
  })

  return {
    drawCount: 1,
    modelRenderMs,
  }
}
