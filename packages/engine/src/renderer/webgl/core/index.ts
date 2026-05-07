/**
 * Renderer/WebGL core barrel.
 * Re-exports packet compilation and low-level pipeline primitives.
 */
export {
  compileEngineWebGLPacketPlan,
} from './packets.ts'

export {
  createViewportMatrixForRender,
  createWebGLQuadPipeline,
  disposeWebGLQuadPipeline,
  drawWebGLPacket,
  resolveWebGLContext,
} from './pipeline.ts'

export type {
  EngineWebGLRenderPacket,
  EngineWebGLPacketKind,
  EngineWebGLPacketPlan,
} from './packets.ts'

export type {
  WebGLQuadPipeline,
} from './pipeline.ts'
