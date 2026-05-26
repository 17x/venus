/**
 * Declares lighting quality tiers for frame-budget-aware light rendering.
 */
export type EngineLightingQualityTier =
  /** Maximum quality: all lights, full shadow resolution, per-pixel lighting. */
  | "high"
  /** Balanced: limited shadow lights, shadow resolution halved. */
  | "medium"
  /** Minimum quality: no shadows, vertex lighting, reduced light count. */
  | "low";

/**
 * Declares lighting quality controls tied to frame-budget pressure signals.
 */
export interface EngineLightingQualityPolicy {
  /** Current lighting quality tier. */
  tier: EngineLightingQualityTier;
  /** Maximum active shadow-casting lights at this tier. */
  maxShadowLights: number;
  /** Maximum total active lights at this tier. */
  maxTotalLights: number;
  /** Shadow map resolution divisor relative to base resolution at this tier. */
  shadowResolutionDivisor: number;
}

/**
 * Resolves lighting quality policy for a given frame-budget pressure level.
 * @param pressure Frame-budget pressure signal from backend diagnostics.
 */
export function resolveLightingQualityPolicy(
  pressure: "low" | "medium" | "high",
): EngineLightingQualityPolicy {
  if (pressure === "low") {
    return { tier: "high", maxShadowLights: 4, maxTotalLights: 16, shadowResolutionDivisor: 1 };
  }
  if (pressure === "medium") {
    return { tier: "medium", maxShadowLights: 2, maxTotalLights: 8, shadowResolutionDivisor: 2 };
  }
  return { tier: "low", maxShadowLights: 0, maxTotalLights: 4, shadowResolutionDivisor: 4 };
}
