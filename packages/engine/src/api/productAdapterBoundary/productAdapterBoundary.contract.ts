/**
 * Violation emitted when adapter input contains forbidden product-runtime semantics.
 */
export interface EngineProductBoundaryViolation {
  /** Dot-path key where forbidden semantic was detected. */
  path: string;
  /** Human-readable reason used by diagnostics and review checks. */
  reason: string;
}

/**
 * Validation result for product-adapter boundary checks.
 */
export interface EngineProductBoundaryValidationResult {
  /** True when no forbidden product semantic was detected. */
  safe: boolean;
  /** Detected violations in deterministic path order. */
  violations: readonly EngineProductBoundaryViolation[];
}

/**
 * Contract for product-adapter boundary helpers.
 */
export interface EngineProductAdapterBoundaryModule {
  /**
   * Validates one arbitrary adapter payload for forbidden product semantics.
   */
  validateSafeInput: (input: unknown) => EngineProductBoundaryValidationResult;
  /**
   * Throws when the payload violates product-adapter boundary policy.
   */
  assertSafeInput: (input: unknown) => void;
}
