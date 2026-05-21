// Module responsibility: capability contract and deterministic normalization.
// Non-responsibility: dynamic runtime probing of host APIs.

/**
 * Defines capability tiers used by preset and policy resolvers.
 */
export type EngineCapabilityTier = 'low' | 'mid' | 'high'

/**
 * Describes normalized device capability profile used by policy selection.
 */
export interface EngineDeviceCapabilityProfile {
  /** GPU capability tier classification. */
  gpuTier: EngineCapabilityTier
  /** Memory capability tier classification. */
  memoryTier: EngineCapabilityTier
  /** Worker/thread capability tier classification. */
  workerTier: EngineCapabilityTier
  /** Indicates whether WebGPU backend path is available. */
  webgpuSupported: boolean
}

/**
 * Defines canonical defaults for capability profile when probe data is missing.
 */
export const DEFAULT_ENGINE_DEVICE_CAPABILITY_PROFILE: EngineDeviceCapabilityProfile = {
  gpuTier: 'mid',
  memoryTier: 'mid',
  workerTier: 'mid',
  webgpuSupported: false,
}

/**
 * Intent: normalize capability profile from partial probe outputs.
 * @param input Partial capability probe output.
 * @returns Fully-resolved capability profile.
 */
export function resolveEngineDeviceCapabilityProfile(
  input?: Partial<EngineDeviceCapabilityProfile>,
): EngineDeviceCapabilityProfile {
  return {
    gpuTier: input?.gpuTier ?? DEFAULT_ENGINE_DEVICE_CAPABILITY_PROFILE.gpuTier,
    memoryTier: input?.memoryTier ?? DEFAULT_ENGINE_DEVICE_CAPABILITY_PROFILE.memoryTier,
    workerTier: input?.workerTier ?? DEFAULT_ENGINE_DEVICE_CAPABILITY_PROFILE.workerTier,
    webgpuSupported: input?.webgpuSupported ?? DEFAULT_ENGINE_DEVICE_CAPABILITY_PROFILE.webgpuSupported,
  }
}
