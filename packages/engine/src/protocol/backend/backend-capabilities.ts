import type { EngineProtocolResolvedBackendMode } from "./backend-mode";

/**
 * Capability probe result for one backend mode.
 */
export interface EngineBackendCapabilityProbeResult {
  /** Backend mode represented by this capability probe result. */
  mode: EngineProtocolResolvedBackendMode;
  /** Whether current host reports this backend mode as available. */
  available: boolean;
  /** Optional diagnostic reason when capability is unavailable. */
  reason?: string;
}

/**
 * Capability snapshot for one backend selection decision.
 */
export interface EngineBackendCapabilitySnapshot {
  /** Ordered probe results used by selector evaluation. */
  probes: readonly EngineBackendCapabilityProbeResult[];
}
