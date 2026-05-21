/**
 * Stable identifier for one engine core module.
 */
export type EngineModuleId = string;

/**
 * Stable identifier for one runtime capability provided by a module or adapter.
 */
export type EngineCapabilityId = string;

/**
 * Runtime behavior policy used when an API needs a missing capability.
 */
export type EngineRuntimeStrictness = "strict" | "dev";

/**
 * Diagnostic warning emitted by module/profile capability checks.
 */
export interface EngineModuleWarning {
  /**
   * Machine-readable warning code.
   */
  code: string;
  /**
   * Human-readable warning message.
   */
  message: string;
  /**
   * Module related to the warning when one exists.
   */
  moduleId?: EngineModuleId;
  /**
   * Capability related to the warning when one exists.
   */
  capabilityId?: EngineCapabilityId;
}

/**
 * Sink used by module activation and capability gates for deterministic diagnostics.
 */
export interface EngineModuleDiagnosticsSink {
  /**
   * Records one warning without deciding whether execution should continue.
   */
  warn: (warning: EngineModuleWarning) => void;
}

/**
 * Context passed to modules during profile-backed runtime activation.
 */
export interface EngineModuleActivationContext {
  /**
   * Missing-capability policy requested by the active profile.
   */
  strictness: EngineRuntimeStrictness;
  /**
   * Diagnostics sink used by modules to report non-fatal activation details.
   */
  diagnostics: EngineModuleDiagnosticsSink;
}

/**
 * Result returned by a module activation hook.
 */
export interface EngineModuleActivationResult {
  /**
   * Module that produced this activation result.
   */
  moduleId: EngineModuleId;
  /**
   * Whether the module is active in the assembled runtime.
   */
  active: boolean;
  /**
   * Capabilities made available after activation.
   */
  providedCapabilities: readonly EngineCapabilityId[];
}

/**
 * Declarative contract for one platform-free core module.
 */
export interface EngineCoreModule {
  /**
   * Stable module id used by profiles and diagnostics.
   */
  id: EngineModuleId;
  /**
   * Capabilities provided when this module is active.
   */
  provides: readonly EngineCapabilityId[];
  /**
   * Capabilities that must be present for this module to activate correctly.
   */
  requires?: readonly EngineCapabilityId[];
  /**
   * Capabilities this module can use when present but does not require.
   */
  optional?: readonly EngineCapabilityId[];
  /**
   * Optional activation hook for modules that need runtime initialization.
   */
  initialize?: (context: EngineModuleActivationContext) => EngineModuleActivationResult;
}
