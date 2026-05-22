import {
  createNoopRendererBackendExecution,
  type RendererBackendExecutionContract,
} from '../../renderer-shared/src/contracts/rendererBackendContract'

/**
 * Describes one navigator-like object used by WebGPU capability probe.
 */
export interface WebGPUProbeNavigatorLike {
  /** Optional GPU object used to report WebGPU host support. */
  gpu?: unknown
}

/**
 * Resolves whether current host navigator reports WebGPU availability.
 * @param hostNavigator Optional navigator-like object from host boundary.
 * @returns Whether host exposes GPU capability for WebGPU backend.
 */
export function canUseWebGPUBackendExecution(hostNavigator?: WebGPUProbeNavigatorLike): boolean {
  if (!hostNavigator) {
    return false
  }
  return Boolean(hostNavigator.gpu)
}

/**
 * Creates one deterministic WebGPU backend execution stub for staging.
 * @returns WebGPU backend execution contract with no-op packet execution path.
 */
export function createWebGPUBackendExecution(): RendererBackendExecutionContract {
  return createNoopRendererBackendExecution('webgpu')
}
