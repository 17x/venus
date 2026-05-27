const HIGH_QUALITY_DRAW_BUDGET_MS = 6;
const DEFAULT_DRAW_BUDGET_MS = 4;
const HIGH_QUALITY_UPLOAD_BUDGET_BYTES = 3_000_000;
const DEFAULT_UPLOAD_BUDGET_BYTES = 2_000_000;

/**
 * Input contract used by optimization policy bootstrap resolution.
 */
export interface EnginePolicyBootstrapOptions {
  /** Enables debug-oriented baseline policy tuning. */
  debug?: boolean;
}

/**
 * Supported policy profiles for canonical runtime bootstrap.
 */
export type EnginePolicyProfile = "interaction" | "throughput" | "latency" | "balanced";

/**
 * Supported quality preset identifiers for canonical runtime bootstrap.
 */
export type EngineQualityPreset = "low" | "balanced" | "high";

/**
 * Runtime budget snapshot consumed by planning and scheduling layers.
 */
export interface EngineRuntimeBudgetSettings {
  /** Draw submission budget in milliseconds. */
  drawBudgetMs: number;
  /** Upload byte budget per frame window. */
  uploadBudgetBytes: number;
  /** Total frame budget in milliseconds. */
  frameBudgetMs: number;
}

/**
 * Policy bootstrap output resolved once during engine initialization.
 */
export interface CreateEnginePolicyBootstrap {
  /** Selected policy profile. */
  profile: EnginePolicyProfile;
  /** Selected quality preset. */
  preset: EngineQualityPreset;
  /** Resolved runtime budget settings. */
  budget: EngineRuntimeBudgetSettings;
}

/**
 * Resolves policy bootstrap defaults for canonical runtime shell.
 * @param options Engine creation options used for profile and budget normalization.
 */
export function resolveCreateEnginePolicyBootstrap(
  options: EnginePolicyBootstrapOptions,
): CreateEnginePolicyBootstrap {
  const profile: EnginePolicyProfile = "interaction";
  const preset: EngineQualityPreset = options.debug ? "balanced" : "high";

  const budget: EngineRuntimeBudgetSettings = {
      drawBudgetMs: preset === "high" ? HIGH_QUALITY_DRAW_BUDGET_MS : DEFAULT_DRAW_BUDGET_MS,
      uploadBudgetBytes: preset === "high" ? HIGH_QUALITY_UPLOAD_BUDGET_BYTES : DEFAULT_UPLOAD_BUDGET_BYTES,
    frameBudgetMs: 16,
  };

  return {
    profile,
    preset,
    budget,
  };
}
