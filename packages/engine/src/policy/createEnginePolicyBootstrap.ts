import type { CreateEngineOptions } from "../api/createEngineContracts";

/**
 * Supported policy profiles for canonical staging bootstrap.
 */
export type EnginePolicyProfile = "editor" | "game" | "animation" | "hybrid";

/**
 * Supported quality preset identifiers for canonical staging bootstrap.
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
  options: Pick<CreateEngineOptions, "debug">,
): CreateEnginePolicyBootstrap {
  const profile: EnginePolicyProfile = "editor";
  const preset: EngineQualityPreset = options.debug ? "balanced" : "high";

  const budget: EngineRuntimeBudgetSettings = {
    drawBudgetMs: preset === "high" ? 6 : 4,
    uploadBudgetBytes: preset === "high" ? 3_000_000 : 2_000_000,
    frameBudgetMs: 16,
  };

  return {
    profile,
    preset,
    budget,
  };
}
