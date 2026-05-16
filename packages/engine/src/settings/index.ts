export type {
  EngineAntiAliasingMode,
  EngineGraphicsSettings,
  EngineGraphicsSettingsValidationIssue,
} from './graphics/graphicsSettings.ts'
export {
  DEFAULT_ENGINE_GRAPHICS_SETTINGS,
  resolveEngineGraphicsSettings,
  validateEngineGraphicsSettings,
} from './graphics/graphicsSettings.ts'

export type {
  EnginePerformanceBudgetInput,
  EnginePerformanceSettings,
} from './performance/performanceSettings.ts'
export {
  DEFAULT_ENGINE_PERFORMANCE_SETTINGS,
  mapEnginePerformanceSettingsToBudgetInput,
  resolveEnginePerformanceSettings,
} from './performance/performanceSettings.ts'

export type {
  EngineLegacyRuntimeSettings,
  EngineRuntimeSettings,
} from './runtime/runtimeSettings.ts'
export {
  DEFAULT_ENGINE_RUNTIME_SETTINGS,
  resolveEngineRuntimeSettings,
} from './runtime/runtimeSettings.ts'

export type {
  EngineCapabilityTier,
  EngineDeviceCapabilityProfile,
} from './device/deviceCapabilityProfile.ts'
export {
  DEFAULT_ENGINE_DEVICE_CAPABILITY_PROFILE,
  resolveEngineDeviceCapabilityProfile,
} from './device/deviceCapabilityProfile.ts'

export type {
  EnginePresetRegistry,
  EngineProfileName,
  EngineQualityPresetName,
} from './presets/qualityPresetRegistry.ts'
export {
  DEFAULT_ENGINE_PRESET_REGISTRY,
  resolveEngineDefaultPreset,
} from './presets/qualityPresetRegistry.ts'

export type {
  EngineScalingSettings,
} from './scaling/scalingSettings.ts'
export {
  DEFAULT_ENGINE_SCALING_SETTINGS,
} from './scaling/scalingSettings.ts'

export type {
  EngineRuntimeBudgetSettings,
} from './budget/runtimeBudgetSettings.ts'
export {
  DEFAULT_ENGINE_RUNTIME_BUDGET_SETTINGS,
} from './budget/runtimeBudgetSettings.ts'

export type {
  EngineDiagnosticsSettings,
} from './diagnostics/diagnosticsSettings.ts'
export {
  DEFAULT_ENGINE_DIAGNOSTICS_SETTINGS,
} from './diagnostics/diagnosticsSettings.ts'

export type {
  EngineDebugSettings,
} from './debug/debugSettings.ts'
export {
  DEFAULT_ENGINE_DEBUG_SETTINGS,
} from './debug/debugSettings.ts'

export type {
  EngineCanonicalSettingsBundle,
  EngineLegacySettingsPayload,
  EngineSettingsMigrationResult,
} from './migrator/settingsMigrator.ts'
export {
  migrateEngineSettings,
} from './migrator/settingsMigrator.ts'
