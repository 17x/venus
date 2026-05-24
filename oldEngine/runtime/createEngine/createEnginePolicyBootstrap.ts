import {
  resolveEngineDefaultPreset,
  resolveEngineDeviceCapabilityProfile,
  resolveEngineGraphicsSettings,
  resolveEnginePerformanceSettings,
  resolveEngineRuntimeSettings,
  type EngineProfileName,
} from '../../settings/index.ts'
import {
  createEngineRuntimePolicy,
  resolveCapabilityAwareEngineRuntimePolicy,
  type EngineRuntimePolicy,
} from '../policy/runtimePolicy.ts'
import type {
  CreateEngineOptions,
} from './createEngineContracts.ts'

/**
 * Captures one normalized policy bootstrap snapshot for createEngine startup.
 */
export interface CreateEnginePolicyBootstrap {
  /** Scenario profile resolved from options or default profile. */
  resolvedSettingsProfile: EngineProfileName
  /** Device capability profile used by policy and preset resolvers. */
  resolvedCapabilityProfile: ReturnType<typeof resolveEngineDeviceCapabilityProfile>
  /** Normalized graphics settings baseline. */
  resolvedGraphicsSettings: ReturnType<typeof resolveEngineGraphicsSettings>
  /** Normalized performance settings baseline. */
  resolvedPerformanceSettings: ReturnType<typeof resolveEnginePerformanceSettings>
  /** Normalized runtime settings baseline. */
  resolvedRuntimeSettings: ReturnType<typeof resolveEngineRuntimeSettings>
  /** Runtime budget settings derived from performance settings. */
  resolvedRuntimeBudgetSettings: {
    /** Draw submission budget in milliseconds. */
    drawBudgetMs: number
    /** Upload budget in bytes per frame window. */
    uploadBudgetBytes: number
    /** Cache budget in bytes. */
    cacheBudgetBytes: number
    /** Tile budget count. */
    tileBudgetCount: number
    /** Worker budget count. */
    workerBudgetCount: number
    /** Frame budget in milliseconds. */
    frameBudgetMs: number
  }
  /** Preset selected from explicit option or capability-aware default. */
  resolvedPreset: ReturnType<typeof resolveEngineDefaultPreset>
  /** Capability-aware runtime policy baseline. */
  resolvedRuntimePolicy: EngineRuntimePolicy
}

const DEFAULT_POLICY_PROFILE: EngineProfileName = 'editor'

/**
 * Resolves startup policy inputs used by createEngine before runtime loop wiring.
 * @param options Engine creation options.
 * @returns Policy bootstrap snapshot.
 */
export function resolveCreateEnginePolicyBootstrap(
  options: CreateEngineOptions,
): CreateEnginePolicyBootstrap {
  const resolvedSettingsProfile = options.settings?.profile ?? DEFAULT_POLICY_PROFILE
  const resolvedCapabilityProfile = resolveEngineDeviceCapabilityProfile(options.settings?.capability)
  const resolvedGraphicsSettings = resolveEngineGraphicsSettings(options.settings?.graphics)
  const resolvedPerformanceSettings = resolveEnginePerformanceSettings(options.settings?.performance)
  const resolvedRuntimeSettings = resolveEngineRuntimeSettings(options.settings?.runtime)
  const resolvedRuntimeBudgetSettings = {
    drawBudgetMs: Math.max(1, resolvedPerformanceSettings.frameTimeBudgetMs * 0.4),
    uploadBudgetBytes: resolvedPerformanceSettings.uploadBudgetBytes,
    cacheBudgetBytes: 200_000_000,
    tileBudgetCount: 64,
    workerBudgetCount: resolvedPerformanceSettings.workerBudgetCount,
    frameBudgetMs: resolvedPerformanceSettings.frameTimeBudgetMs,
  }
  const resolvedPreset = options.settings?.preset
    ?? resolveEngineDefaultPreset(resolvedSettingsProfile, resolvedCapabilityProfile)
  const resolvedRuntimePolicy = resolveCapabilityAwareEngineRuntimePolicy(
    createEngineRuntimePolicy(
      resolvedSettingsProfile,
      resolvedPreset,
      resolvedGraphicsSettings,
      resolvedPerformanceSettings,
      resolvedRuntimeSettings,
      resolvedRuntimeBudgetSettings,
      resolvedCapabilityProfile,
    ),
  )

  return {
    resolvedSettingsProfile,
    resolvedCapabilityProfile,
    resolvedGraphicsSettings,
    resolvedPerformanceSettings,
    resolvedRuntimeSettings,
    resolvedRuntimeBudgetSettings,
    resolvedPreset,
    resolvedRuntimePolicy,
  }
}
