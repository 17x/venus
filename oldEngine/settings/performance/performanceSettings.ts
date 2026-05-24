// Module responsibility: performance settings contract and budget input mapping.
// Non-responsibility: per-frame budget resolution logic.

/**
 * Describes user-facing performance settings that map to runtime budget inputs.
 */
export interface EnginePerformanceSettings {
  /** Frame-time budget target in milliseconds. */
  frameTimeBudgetMs: number
  /** Combined upload budget cap in bytes per frame. */
  uploadBudgetBytes: number
  /** Worker task budget cap in count per scheduling cycle. */
  workerBudgetCount: number
}

/**
 * Describes normalized runtime budget input produced from settings.
 */
export interface EnginePerformanceBudgetInput {
  /** Frame-time budget in milliseconds. */
  frameTimeBudgetMs: number
  /** Upload budget in bytes. */
  uploadBudgetBytes: number
  /** Worker budget in count. */
  workerBudgetCount: number
}

/**
 * Defines canonical defaults for performance settings.
 */
export const DEFAULT_ENGINE_PERFORMANCE_SETTINGS: EnginePerformanceSettings = {
  frameTimeBudgetMs: 16,
  uploadBudgetBytes: 1_500_000,
  workerBudgetCount: 4,
}

/**
 * Intent: normalize partial performance settings with deterministic defaults.
 * @param input Partial user settings input.
 * @returns Fully-resolved performance settings.
 */
export function resolveEnginePerformanceSettings(input?: Partial<EnginePerformanceSettings>): EnginePerformanceSettings {
  return {
    frameTimeBudgetMs: input?.frameTimeBudgetMs ?? DEFAULT_ENGINE_PERFORMANCE_SETTINGS.frameTimeBudgetMs,
    uploadBudgetBytes: input?.uploadBudgetBytes ?? DEFAULT_ENGINE_PERFORMANCE_SETTINGS.uploadBudgetBytes,
    workerBudgetCount: input?.workerBudgetCount ?? DEFAULT_ENGINE_PERFORMANCE_SETTINGS.workerBudgetCount,
  }
}

/**
 * Intent: map normalized performance settings to runtime budget input fields.
 * @param settings Resolved performance settings.
 * @returns Budget input object used by runtime budget resolver.
 */
export function mapEnginePerformanceSettingsToBudgetInput(
  settings: EnginePerformanceSettings,
): EnginePerformanceBudgetInput {
  return {
    frameTimeBudgetMs: settings.frameTimeBudgetMs,
    uploadBudgetBytes: settings.uploadBudgetBytes,
    workerBudgetCount: settings.workerBudgetCount,
  }
}
