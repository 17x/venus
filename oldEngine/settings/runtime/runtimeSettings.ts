// Module responsibility: runtime behavior settings and legacy compatibility mapping.
// Non-responsibility: profile/preset or capability-aware policy decisions.

/**
 * Describes runtime behavior flags used by policy generation.
 */
export interface EngineRuntimeSettings {
  /** Enables retained rendering behavior when true. */
  retainedRendering: boolean
  /** Enables dirty-region partial redraw behavior when true. */
  partialRedraw: boolean
  /** Enables progressive rendering mode when true. */
  progressiveRendering: boolean
}

/**
 * Describes legacy runtime settings aliases accepted for migration compatibility.
 */
export interface EngineLegacyRuntimeSettings {
  /** Legacy alias for retained rendering toggle. */
  retained?: boolean
  /** Legacy alias for partial redraw toggle. */
  partial?: boolean
  /** Legacy alias for progressive rendering toggle. */
  progressive?: boolean
}

/**
 * Defines canonical defaults for runtime settings.
 */
export const DEFAULT_ENGINE_RUNTIME_SETTINGS: EngineRuntimeSettings = {
  retainedRendering: true,
  partialRedraw: true,
  progressiveRendering: true,
}

/**
 * Intent: resolve runtime settings from canonical and legacy compatibility fields.
 * @param input Canonical partial settings input.
 * @param legacy Legacy settings aliases.
 * @returns Fully-resolved runtime settings.
 */
export function resolveEngineRuntimeSettings(
  input?: Partial<EngineRuntimeSettings>,
  legacy?: EngineLegacyRuntimeSettings,
): EngineRuntimeSettings {
  return {
    retainedRendering: input?.retainedRendering ?? legacy?.retained ?? DEFAULT_ENGINE_RUNTIME_SETTINGS.retainedRendering,
    partialRedraw: input?.partialRedraw ?? legacy?.partial ?? DEFAULT_ENGINE_RUNTIME_SETTINGS.partialRedraw,
    progressiveRendering: input?.progressiveRendering
      ?? legacy?.progressive
      ?? DEFAULT_ENGINE_RUNTIME_SETTINGS.progressiveRendering,
  }
}
