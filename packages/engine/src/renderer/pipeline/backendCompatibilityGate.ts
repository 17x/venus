// Module responsibility: enforce backend compatibility gate against feature requirements.
// Non-responsibility: backend selection.

import type { EngineBackend } from '../types/index.ts'

/**
 * Describes required backend feature set.
 */
export interface EngineBackendFeatureRequirement {
  /** Feature id. */
  feature: string
  /** Backends that support the feature. */
  supportedBackends: EngineBackend[]
}

/**
 * Intent: resolve whether backend passes compatibility requirements.
 * @param backend Candidate backend.
 * @param requirements Feature requirements.
 * @returns True when backend satisfies every requirement.
 */
export function passEngineBackendCompatibilityGate(
  backend: EngineBackend,
  requirements: readonly EngineBackendFeatureRequirement[],
): boolean {
  for (const requirement of requirements) {
    if (!requirement.supportedBackends.includes(backend)) {
      return false
    }
  }

  return true
}
