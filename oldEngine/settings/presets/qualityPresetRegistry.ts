// Module responsibility: profile defaults and deterministic quality preset resolution.
// Non-responsibility: runtime phase-based policy overrides.

import type { EngineDeviceCapabilityProfile } from '../device/deviceCapabilityProfile.ts'

/**
 * Defines supported quality preset names.
 */
export type EngineQualityPresetName =
  | 'low'
  | 'medium'
  | 'high'
  | 'ultra'
  | 'balanced'
  | 'battery-saver'

/**
 * Defines supported runtime profile names.
 */
export type EngineProfileName =
  | 'editor'
  | 'game'
  | 'animation'
  | 'medical'
  | 'massive-data'
  | 'hybrid'

/**
 * Describes one profile-to-preset default registry.
 */
export type EnginePresetRegistry = Record<EngineProfileName, EngineQualityPresetName>

/**
 * Defines canonical profile defaults.
 */
export const DEFAULT_ENGINE_PRESET_REGISTRY: EnginePresetRegistry = {
  editor: 'balanced',
  game: 'high',
  animation: 'high',
  medical: 'ultra',
  'massive-data': 'medium',
  hybrid: 'balanced',
}

/**
 * Intent: resolve deterministic default preset for profile and capability tuple.
 * @param profile Runtime profile name.
 * @param capability Normalized capability profile.
 * @param registry Optional custom registry override.
 * @returns Resolved preset name.
 */
export function resolveEngineDefaultPreset(
  profile: EngineProfileName,
  capability: EngineDeviceCapabilityProfile,
  registry: EnginePresetRegistry = DEFAULT_ENGINE_PRESET_REGISTRY,
): EngineQualityPresetName {
  const basePreset = registry[profile]

  if (capability.gpuTier === 'low' || capability.memoryTier === 'low') {
    if (basePreset === 'ultra' || basePreset === 'high') {
      return 'medium'
    }

    return basePreset === 'balanced' ? 'battery-saver' : basePreset
  }

  if (capability.gpuTier === 'high' && capability.memoryTier === 'high' && basePreset === 'medium') {
    return 'high'
  }

  return basePreset
}
