import type { EngineRenderFrame } from './types.ts'
import { drawWebGLPacket, type WebGLQuadPipeline } from './webglPipeline.ts'

export type CompositeTextureSource = 'framebuffer-copy' | 'canvas-upload'

export interface InteractionCompositeSnapshot {
  revision: string | number
  scale: number
  offsetX: number
  offsetY: number
  viewportWidth: number
  viewportHeight: number
  pixelRatio: number
  visibleCount: number
  culledCount: number
  textureSource: CompositeTextureSource
}

export function resolveCompositeSnapshotPixelRatio(frame: EngineRenderFrame) {
  // Shared composite textures are presented back onto the app-owned main
  // canvas, so snapshot compatibility must follow the main output DPR lane.
  return frame.context.outputPixelRatio ?? frame.context.pixelRatio ?? 1
}

export function resolveCompositeTexturePresentationFlipY(textureSource: CompositeTextureSource) {
  // Framebuffer copies arrive in bottom-left texture space, while canvas
  // uploads already match the engine's top-left screen-space convention.
  return textureSource === 'framebuffer-copy'
}

export function drawCompositeTextureFrame(options: {
  context: WebGLRenderingContext | WebGL2RenderingContext
  pipeline: WebGLQuadPipeline
  frame: EngineRenderFrame
  texture: WebGLTexture
  viewportWidth: number
  viewportHeight: number
  textureSource: CompositeTextureSource
}) {
  // Keep all composite presentation draws on one helper so cache-hold,
  // interaction-preview, and settled composite paths cannot drift apart.
  return drawWebGLPacket(
    options.context,
    options.pipeline,
    options.frame,
    {
      x: 0,
      y: 0,
      width: options.viewportWidth,
      height: options.viewportHeight,
    },
    [1, 1, 1, 1],
    1,
    options.texture,
    resolveCompositeTexturePresentationFlipY(options.textureSource),
  )
}

export function captureCompositeSnapshotFromCurrentFramebuffer(options: {
  context: WebGLRenderingContext | WebGL2RenderingContext
  texture: WebGLTexture
  frame: EngineRenderFrame
  visibleCount: number
  culledCount: number
}): InteractionCompositeSnapshot | null {
  const pixelRatio = resolveCompositeSnapshotPixelRatio(options.frame)
  const width = Math.max(1, Math.round(options.frame.viewport.viewportWidth * pixelRatio))
  const height = Math.max(1, Math.round(options.frame.viewport.viewportHeight * pixelRatio))

  options.context.bindTexture(options.context.TEXTURE_2D, options.texture)
  try {
    options.context.copyTexImage2D(
      options.context.TEXTURE_2D,
      0,
      options.context.RGBA,
      0,
      0,
      width,
      height,
      0,
    )
  } catch {
    return null
  }

  return {
    revision: options.frame.scene.revision,
    scale: options.frame.viewport.scale,
    offsetX: options.frame.viewport.offsetX,
    offsetY: options.frame.viewport.offsetY,
    viewportWidth: options.frame.viewport.viewportWidth,
    viewportHeight: options.frame.viewport.viewportHeight,
    pixelRatio,
    visibleCount: options.visibleCount,
    culledCount: options.culledCount,
    textureSource: 'framebuffer-copy',
  }
}