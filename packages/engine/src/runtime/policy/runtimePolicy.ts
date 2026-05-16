// Module responsibility: normalize settings + preset + capability into runtime policy.
// Non-responsibility: renderer execution or mutable runtime state transitions.

import type {
  EngineDeviceCapabilityProfile,
  EngineGraphicsSettings,
  EnginePerformanceSettings,
  EngineProfileName,
  EngineQualityPresetName,
  EngineRuntimeBudgetSettings,
  EngineRuntimeSettings,
} from '../../settings/index.ts'

/**
 * Defines program-level phase names for policy override entries.
 */
export type EnginePolicyPhase = 'interactive' | 'settling' | 'static' | 'camera'

/**
 * Describes one phase-specific policy override record.
 */
export interface EngineRuntimePolicyPhaseOverride {
  /** Render scale to use in this phase. */
  renderScale: number
  /** Whether non-critical detail degradation is permitted in this phase. */
  allowNonCriticalDegrade: boolean
}

/**
 * Describes critical-layer policy guard mode.
 */
export interface EngineCriticalLayerPolicy {
  /** Whether critical layers must stay visible under all degradations. */
  visibilityGuaranteed: boolean
  /** Whether critical layers must stay full quality under all degradations. */
  qualityGuaranteed: boolean
}

/**
 * Describes normalized runtime policy used by strategy and budget systems.
 */
export interface EngineRuntimePolicy {
  /** Scenario profile used for policy selection. */
  profile: EngineProfileName
  /** Preset used to derive baseline quality behavior. */
  preset: EngineQualityPresetName
  /** Base graphics settings after normalization. */
  graphics: EngineGraphicsSettings
  /** Base performance settings after normalization. */
  performance: EnginePerformanceSettings
  /** Base runtime settings after normalization. */
  runtime: EngineRuntimeSettings
  /** Base runtime budget settings after normalization. */
  budget: EngineRuntimeBudgetSettings
  /** Phase-specific policy overrides. */
  phaseOverrides: Record<EnginePolicyPhase, EngineRuntimePolicyPhaseOverride>
  /** Critical-layer hard guard directives. */
  criticalLayer: EngineCriticalLayerPolicy
  /** Capability profile used by policy resolver. */
  capability: EngineDeviceCapabilityProfile
}

/**
 * Intent: resolve one baseline phase-override table from graphics and preset input.
 * @param graphics Resolved graphics settings.
 * @param preset Resolved quality preset.
 * @returns Phase override map.
 */
function resolvePhaseOverrides(
  graphics: EngineGraphicsSettings,
  preset: EngineQualityPresetName,
): Record<EnginePolicyPhase, EngineRuntimePolicyPhaseOverride> {
  const interactiveScale = preset === 'battery-saver'
    ? Math.max(0.75, graphics.renderScale * 0.8)
    : Math.max(0.85, graphics.renderScale * 0.9)

  return {
    interactive: {
      renderScale: interactiveScale,
      allowNonCriticalDegrade: true,
    },
    settling: {
      renderScale: graphics.renderScale,
      allowNonCriticalDegrade: true,
    },
    static: {
      renderScale: graphics.renderScale,
      allowNonCriticalDegrade: false,
    },
    camera: {
      renderScale: interactiveScale,
      allowNonCriticalDegrade: true,
    },
  }
}

/**
 * Intent: create one normalized runtime policy from resolved inputs.
 * @param profile Profile name.
 * @param preset Preset name.
 * @param graphics Resolved graphics settings.
 * @param performance Resolved performance settings.
 * @param runtime Resolved runtime settings.
 * @param budget Resolved runtime budget settings.
 * @param capability Resolved capability profile.
 * @returns Runtime policy object.
 */
export function createEngineRuntimePolicy(
  profile: EngineProfileName,
  preset: EngineQualityPresetName,
  graphics: EngineGraphicsSettings,
  performance: EnginePerformanceSettings,
  runtime: EngineRuntimeSettings,
  budget: EngineRuntimeBudgetSettings,
  capability: EngineDeviceCapabilityProfile,
): EngineRuntimePolicy {
  return {
    profile,
    preset,
    graphics,
    performance,
    runtime,
    budget,
    phaseOverrides: resolvePhaseOverrides(graphics, preset),
    criticalLayer: {
      visibilityGuaranteed: true,
      qualityGuaranteed: true,
    },
    capability,
  }
}

/**
 * Intent: apply capability-aware adjustments on top of baseline runtime policy.
 * @param policy Baseline runtime policy.
 * @returns Capability-adjusted runtime policy.
 */
export function resolveCapabilityAwareEngineRuntimePolicy(policy: EngineRuntimePolicy): EngineRuntimePolicy {
  if (policy.capability.gpuTier === 'low' || policy.capability.memoryTier === 'low') {
    return {
      ...policy,
      phaseOverrides: {
        ...policy.phaseOverrides,
        interactive: {
          ...policy.phaseOverrides.interactive,
          renderScale: Math.max(0.7, policy.phaseOverrides.interactive.renderScale * 0.9),
        },
      },
    }
  }

  if (policy.capability.gpuTier === 'high' && policy.capability.memoryTier === 'high') {
    return {
      ...policy,
      phaseOverrides: {
        ...policy.phaseOverrides,
        static: {
          ...policy.phaseOverrides.static,
          renderScale: Math.min(2, policy.phaseOverrides.static.renderScale * 1.05),
        },
      },
    }
  }

  return policy
}
