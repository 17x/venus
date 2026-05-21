import type { EngineRenderFrame } from '../types/index.ts'
import { drawWebGLPacket } from './core/index.ts'
import { drawEngineOverlayNodes, type EngineOverlayDrawNode } from '../../interaction/overlayCanvas.ts'
import { resolveWebGLFrameBudget } from './webglFramePolicy.ts'

/**
 * Overlay pass execution input contract.
 */
interface WebGLOverlayPassArgs {
  /** Current WebGL context for texture upload and packet draw calls. */
  context: WebGLRenderingContext
  /** Shared quad pipeline used by packet draw submissions. */
  pipeline: Parameters<typeof drawWebGLPacket>[1]
  /** Frame payload used to resolve overlay nodes and viewport transforms. */
  frame: EngineRenderFrame
  /** Scratch canvas surface that stores software-rendered overlay content. */
  overlaySurface: { canvas: HTMLCanvasElement | OffscreenCanvas } | null
  /** Target texture receiving uploaded overlay pixels. */
  overlayTexture: WebGLTexture | null
}

/**
 * Overlay pass execution result.
 */
interface WebGLOverlayPassResult {
  /** Number of overlay packet draws submitted for this frame. */
  drawCount: number
  /** Texture upload time spent by overlay pass in milliseconds. */
  textureUploadMs: number
  /** Whether overlay pass exceeded its budget for this frame. */
  budgetExceeded: boolean
}

/**
 * Draws overlay nodes via scratch canvas upload and one WebGL packet composite.
 * @param args Overlay pass dependencies and frame context.
 * @returns Overlay draw count plus budget/upload diagnostics for caller aggregation.
 */
export function drawWebGLOverlayPass(args: WebGLOverlayPassArgs): WebGLOverlayPassResult {
  const overlayNodes = (args.frame.context.overlayNodes ?? []) as readonly EngineOverlayDrawNode[]
  if (overlayNodes.length === 0 || !args.overlaySurface?.canvas || !args.overlayTexture) {
    return {
      drawCount: 0,
      textureUploadMs: 0,
      budgetExceeded: false,
    }
  }

  const overlayBudgetMs = resolveWebGLFrameBudget(args.frame).overlayPassBudgetMs
  if (overlayBudgetMs <= 0) {
    return {
      // Budget-broker may suppress overlay pass under heavy pressure.
      drawCount: 0,
      textureUploadMs: 0,
      budgetExceeded: true,
    }
  }

  const overlayPassStart = performance.now()
  const overlayPixelRatio = args.frame.context.outputPixelRatio ?? args.frame.context.pixelRatio ?? 1
  const overlayWidth = Math.max(1, Math.round(args.frame.viewport.viewportWidth * overlayPixelRatio))
  const overlayHeight = Math.max(1, Math.round(args.frame.viewport.viewportHeight * overlayPixelRatio))

  // Keep overlay scratch surface dimensions aligned with render target.
  if (args.overlaySurface.canvas.width !== overlayWidth || args.overlaySurface.canvas.height !== overlayHeight) {
    args.overlaySurface.canvas.width = overlayWidth
    args.overlaySurface.canvas.height = overlayHeight
  }

  const overlayContext = args.overlaySurface.canvas.getContext('2d') as CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null
  if (!overlayContext) {
    return {
      drawCount: 0,
      textureUploadMs: 0,
      budgetExceeded: false,
    }
  }

  overlayContext.setTransform(1, 0, 0, 1, 0, 0)
  overlayContext.clearRect(0, 0, overlayWidth, overlayHeight)
  overlayContext.scale(overlayPixelRatio, overlayPixelRatio)
  drawEngineOverlayNodes({
    context: overlayContext as unknown as CanvasRenderingContext2D,
    worldToScreen: [...args.frame.viewport.matrix],
    nodes: [...overlayNodes],
  })

  const overlayUploadStart = performance.now()
  args.context.bindTexture(args.context.TEXTURE_2D, args.overlayTexture)
  args.context.pixelStorei(args.context.UNPACK_PREMULTIPLY_ALPHA_WEBGL, 1)
  args.context.texImage2D(
    args.context.TEXTURE_2D,
    0,
    args.context.RGBA,
    args.context.RGBA,
    args.context.UNSIGNED_BYTE,
    args.overlaySurface.canvas as unknown as TexImageSource,
  )
  const textureUploadMs = performance.now() - overlayUploadStart

  const safeScale = Math.max(Number.EPSILON, Math.abs(args.frame.viewport.scale))
  const overlayWorldBounds = {
    x: -args.frame.viewport.offsetX / safeScale,
    y: -args.frame.viewport.offsetY / safeScale,
    width: args.frame.viewport.viewportWidth / safeScale,
    height: args.frame.viewport.viewportHeight / safeScale,
  }
  const drawCount = drawWebGLPacket(
    args.context,
    args.pipeline,
    args.frame,
    overlayWorldBounds,
    [1, 1, 1, 1],
    1,
    args.overlayTexture,
  )

  return {
    drawCount,
    textureUploadMs,
    budgetExceeded: performance.now() - overlayPassStart > overlayBudgetMs,
  }
}
