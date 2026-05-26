import type { EngineShadowPolicy } from "../kernel/lighting/shadowPolicy";

/**
 * Declares the cascaded shadow map strategy for large outdoor scenes.
 * Splits the view frustum into multiple cascades with increasing shadow map coverage.
 */
export interface EngineCascadedShadowStrategy {
  /** Number of shadow cascades (2–4 recommended). */
  cascadeCount: number;
  /** Per-cascade shadow policies (parallel array to cascades). */
  cascadePolicies: readonly EngineShadowPolicy[];
  /** Cascade split lambda (0 = uniform, 1 = logarithmic). */
  splitLambda: number;
  /** Maximum shadow distance in world units. */
  maxShadowDistance: number;
  /** Whether to use pancaking to reduce shadow acne on distant cascades. */
  usePancaking: boolean;
}

/**
 * Creates a default 3-cascade shadow strategy.
 */
export function createDefaultCascadedShadowStrategy(): EngineCascadedShadowStrategy {
  const basePolicy: EngineShadowPolicy = {
    enabled: true, type: "pcf", mapSize: 2048, near: 0.5, far: 500,
    bias: 0.0001, normalBias: 0.02, darkness: 1,
  };
  return {
    cascadeCount: 3,
    cascadePolicies: [
      { ...basePolicy, mapSize: 2048, far: 50 },
      { ...basePolicy, mapSize: 1024, far: 200 },
      { ...basePolicy, mapSize: 512, far: 500 },
    ],
    splitLambda: 0.75,
    maxShadowDistance: 500,
    usePancaking: true,
  };
}
