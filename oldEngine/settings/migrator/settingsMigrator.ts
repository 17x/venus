// Module responsibility: migrate legacy settings payloads into canonical contracts.
// Non-responsibility: runtime policy decisions.

import {
  resolveEngineGraphicsSettings,
  type EngineGraphicsSettings,
} from '../graphics/graphicsSettings.ts'
import {
  resolveEnginePerformanceSettings,
  type EnginePerformanceSettings,
} from '../performance/performanceSettings.ts'
import {
  resolveEngineRuntimeSettings,
  type EngineLegacyRuntimeSettings,
  type EngineRuntimeSettings,
} from '../runtime/runtimeSettings.ts'

/**
 * Describes one canonical settings bundle after migration.
 */
export interface EngineCanonicalSettingsBundle {
  /** Canonical graphics settings. */
  graphics: EngineGraphicsSettings
  /** Canonical performance settings. */
  performance: EnginePerformanceSettings
  /** Canonical runtime settings. */
  runtime: EngineRuntimeSettings
}

/**
 * Describes one legacy settings payload accepted by migrator.
 */
export interface EngineLegacySettingsPayload {
  /** Legacy scale alias for graphics render scale. */
  scale?: number
  /** Legacy fps cap alias for graphics max fps. */
  fpsCap?: number
  /** Legacy upload budget alias in bytes. */
  uploadBudget?: number
  /** Legacy runtime toggles. */
  runtime?: EngineLegacyRuntimeSettings
}

/**
 * Describes settings migration output payload.
 */
export interface EngineSettingsMigrationResult {
  /** Canonical migrated settings bundle. */
  settings: EngineCanonicalSettingsBundle
  /** Deprecated field warning list. */
  warnings: string[]
}

/**
 * Intent: migrate legacy settings fields into canonical settings contracts.
 * @param legacy Legacy settings payload.
 * @returns Canonical settings bundle and warning list.
 */
export function migrateEngineSettings(legacy?: EngineLegacySettingsPayload): EngineSettingsMigrationResult {
  const warnings: string[] = []

  if (legacy?.scale !== undefined) {
    warnings.push('legacy field "scale" is deprecated; use graphics.renderScale')
  }

  if (legacy?.fpsCap !== undefined) {
    warnings.push('legacy field "fpsCap" is deprecated; use graphics.maxFps')
  }

  if (legacy?.uploadBudget !== undefined) {
    warnings.push('legacy field "uploadBudget" is deprecated; use performance.uploadBudgetBytes')
  }

  const settings: EngineCanonicalSettingsBundle = {
    graphics: resolveEngineGraphicsSettings({
      renderScale: legacy?.scale,
      maxFps: legacy?.fpsCap,
    }),
    performance: resolveEnginePerformanceSettings({
      uploadBudgetBytes: legacy?.uploadBudget,
    }),
    runtime: resolveEngineRuntimeSettings(undefined, legacy?.runtime),
  }

  return { settings, warnings }
}
