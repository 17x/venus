// Module responsibility: diagnostics sampling settings contract.
// Non-responsibility: diagnostics collection implementation.

/**
 * Describes diagnostics sampling configuration used by runtime telemetry.
 */
export interface EngineDiagnosticsSettings {
  /** Sampling interval in milliseconds for runtime diagnostics snapshots. */
  sampleIntervalMs: number
  /** Enables extended debug-only diagnostics fields when true. */
  includeDebugFields: boolean
}

/**
 * Defines canonical defaults for diagnostics settings.
 */
export const DEFAULT_ENGINE_DIAGNOSTICS_SETTINGS: EngineDiagnosticsSettings = {
  sampleIntervalMs: 33,
  includeDebugFields: false,
}
