/**
 * Declares the post-processing effect type tokens for the postprocess pass chain.
 */
export type EnginePostProcessEffect =
  /** Tone mapping (ACES, Reinhard, etc.). */
  | "toneMapping"
  /** Gamma correction pass. */
  | "gamma"
  /** Bloom / glow effect. */
  | "bloom"
  /** Screen-space ambient occlusion. */
  | "ssao"
  /** Fast approximate anti-aliasing. */
  | "fxaa"
  /** Temporal anti-aliasing. */
  | "taa"
  /** Vignette effect. */
  | "vignette";

/**
 * Declares one post-process effect configuration in the pass chain.
 */
export interface EnginePostProcessConfig {
  /** Effect type token. */
  effect: EnginePostProcessEffect;
  /** Whether this effect is enabled. */
  enabled: boolean;
  /** Effect-specific parameters. */
  params: Record<string, number>;
}

/**
 * Declares the post-process pass chain for frame finalization.
 * Effects are applied in declaration order.
 */
export interface EnginePostProcessChain {
  /** Ordered post-process effects. */
  effects: readonly EnginePostProcessConfig[];
}

/**
 * Creates a default post-process chain with tone mapping and gamma enabled.
 */
export function createDefaultPostProcessChain(): EnginePostProcessChain {
  return {
    effects: [
      { effect: "toneMapping", enabled: true, params: { exposure: 1.0 } },
      { effect: "gamma", enabled: true, params: { factor: 2.2 } },
      { effect: "bloom", enabled: false, params: { threshold: 1.0, strength: 0.5, radius: 0.5 } },
      { effect: "fxaa", enabled: false, params: {} },
    ],
  };
}
