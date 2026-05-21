// Module responsibility: settings-level runtime budget structure contract.
// Non-responsibility: per-frame budget decision state machine.

/**
 * Describes static runtime budget settings grouped by budget domains.
 */
export interface EngineRuntimeBudgetSettings {
  /** Draw submission budget in milliseconds. */
  drawBudgetMs: number
  /** Upload budget in bytes. */
  uploadBudgetBytes: number
  /** Cache budget in bytes. */
  cacheBudgetBytes: number
  /** Tile budget in count. */
  tileBudgetCount: number
  /** Worker budget in count. */
  workerBudgetCount: number
  /** Total frame budget in milliseconds. */
  frameBudgetMs: number
}

/**
 * Defines canonical defaults for runtime budget settings.
 */
export const DEFAULT_ENGINE_RUNTIME_BUDGET_SETTINGS: EngineRuntimeBudgetSettings = {
  drawBudgetMs: 6,
  uploadBudgetBytes: 1_500_000,
  cacheBudgetBytes: 200_000_000,
  tileBudgetCount: 64,
  workerBudgetCount: 4,
  frameBudgetMs: 16,
}
