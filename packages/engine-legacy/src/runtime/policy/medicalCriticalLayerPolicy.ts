// Module responsibility: enforce medical critical-layer non-degradation policy.
// Non-responsibility: renderer packet emission.

/**
 * Describes one medical layer candidate.
 */
export interface EngineMedicalLayerCandidate {
  /** Layer id. */
  id: string
  /** Whether layer is marked critical. */
  critical: boolean
  /** Requested degradation level. */
  degradationLevel: 'none' | 'light' | 'heavy'
}

/**
 * Intent: force critical medical layers to no-degradation state.
 * @param layers Medical layer candidates.
 * @returns Normalized layer degradation map by layer id.
 */
export function resolveEngineMedicalCriticalLayerPolicy(
  layers: readonly EngineMedicalLayerCandidate[],
): Record<string, 'none' | 'light' | 'heavy'> {
  const result: Record<string, 'none' | 'light' | 'heavy'> = {}
  for (const layer of layers) {
    result[layer.id] = layer.critical ? 'none' : layer.degradationLevel
  }

  return result
}
