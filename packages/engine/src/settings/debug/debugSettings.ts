// Module responsibility: internal debug toggles with release-safe defaults.
// Non-responsibility: user-facing configuration.

/**
 * Describes internal debug-only runtime settings.
 */
export interface EngineDebugSettings {
  /** Enables runtime diagnostics overlays when true. */
  diagnosticsOverlayEnabled: boolean
  /** Enables verbose policy decision logging when true. */
  policyDecisionLogEnabled: boolean
}

/**
 * Defines release-safe defaults for debug settings.
 */
export const DEFAULT_ENGINE_DEBUG_SETTINGS: EngineDebugSettings = {
  diagnosticsOverlayEnabled: false,
  policyDecisionLogEnabled: false,
}
