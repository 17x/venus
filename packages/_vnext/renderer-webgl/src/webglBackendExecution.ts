import {
  createNoopRendererBackendExecution,
  type RendererBackendExecutionContract,
} from '../../renderer-shared/src/contracts/rendererBackendContract'

/**
 * Describes one canvas-like target required for WebGL capability probing.
 */
export interface WebGLBackendCanvasLike {
  /** Resolves one rendering context by requested context type token. */
  getContext: (type: 'webgl2' | 'webgl') => unknown
}

/**
 * Describes one probing surface payload used by WebGL backend staging.
 */
export interface WebGLBackendProbeSurface {
  /** Optional canvas-like host target for WebGL context probing. */
  canvas?: WebGLBackendCanvasLike | null
}

/**
 * Resolves whether one surface can provide a WebGL-compatible context.
 * @param surface Surface payload that may expose a canvas-like target.
 * @returns Whether webgl2 or webgl context can be resolved.
 */
export function canUseWebGLBackendExecution(surface: WebGLBackendProbeSurface): boolean {
  const canvas = surface.canvas
  if (!canvas || typeof canvas.getContext !== 'function') {
    return false
  }

  return Boolean(canvas.getContext('webgl2') ?? canvas.getContext('webgl'))
}

/**
 * Creates one deterministic WebGL backend execution stub for staging.
 * @returns WebGL backend execution contract with no-op packet execution path.
 */
export function createWebGLBackendExecution(): RendererBackendExecutionContract {
  return createNoopRendererBackendExecution('webgl')
}
