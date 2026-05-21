/**
 * Public API level used by canonical public-surface governance.
 */
export type EnginePublicApiLevel = "developer" | "advanced" | "foundation";

/**
 * One public API descriptor entry used by docs/test coverage gates.
 */
export interface EnginePublicApiDescriptor {
  /** Fully qualified API name, for example engine.setGraph. */
  name: string;
  /** Public API level used by governance and documentation checks. */
  level: EnginePublicApiLevel;
  /** Stability channel for release and migration policy. */
  stability: "experimental" | "beta" | "stable";
}

/**
 * Violation emitted when a public API descriptor breaks namespace policy.
 */
export interface EnginePublicApiViolation {
  /** API name that failed governance checks. */
  name: string;
  /** Human-readable reason describing the violation. */
  reason: string;
}

/**
 * Contract for public API surface validation and catalog construction.
 */
export interface EnginePublicApiSurfaceModule {
  /**
   * Validates descriptors against canonical namespace policy.
   */
  validateDescriptors: (
    descriptors: readonly EnginePublicApiDescriptor[],
  ) => readonly EnginePublicApiViolation[];
  /**
   * Returns descriptors sorted by API name for deterministic docs generation.
   */
  createDeterministicCatalog: (
    descriptors: readonly EnginePublicApiDescriptor[],
  ) => readonly EnginePublicApiDescriptor[];
}
