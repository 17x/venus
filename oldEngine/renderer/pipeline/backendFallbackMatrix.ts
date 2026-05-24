// Module responsibility: resolve backend fallback matrix routing.
// Non-responsibility: backend initialization.

import type { EngineBackend } from '../types/index.ts'

/**
 * Describes backend capability flags used by fallback matrix.
 */
export interface EngineBackendCapabilityFlags {
  /** Whether WebGPU path is available. */
  webgpu: boolean
  /** Whether WebGL path is available. */
  webgl: boolean
}

/**
 * Intent: resolve best available backend from capability matrix.
 * @param preferred Preferred backend requested by caller.
 * @param capability Capability flags.
 * @returns Effective backend selected by fallback matrix.
 */
export function resolveEngineBackendFallbackMatrix(
  preferred: EngineBackend,
  capability: EngineBackendCapabilityFlags,
): EngineBackend {
  if (preferred === 'webgpu' && capability.webgpu) {
    return 'webgpu'
  }

  if (preferred === 'webgl' && capability.webgl) {
    return 'webgl'
  }

  if (capability.webgpu) {
    return 'webgpu'
  }

  if (capability.webgl) {
    return 'webgl'
  }

  return 'canvas2d'
}
