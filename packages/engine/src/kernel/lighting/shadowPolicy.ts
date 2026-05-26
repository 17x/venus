/**
 * Declares the shadow map type for directional and spot light shadows.
 */
export type EngineShadowMapType =
  /** Basic shadow map with hard edges. */
  | "basic"
  /** Percentage-closer filtering for soft shadows. */
  | "pcf"
  /** Variance shadow map for pre-filterable soft shadows. */
  | "vsm";

/**
 * Declares shadow map policy controls for one shadow-casting light.
 */
export interface EngineShadowPolicy {
  /** Whether shadow casting is enabled for this light. */
  enabled: boolean;
  /** Shadow map type determining quality/performance trade-off. */
  type: EngineShadowMapType;
  /** Shadow map resolution in pixels (power of 2 recommended). */
  mapSize: number;
  /** Shadow camera near plane distance. */
  near: number;
  /** Shadow camera far plane distance. */
  far: number;
  /** Depth bias for shadow acne prevention. */
  bias: number;
  /** Normal offset bias for shadow acne prevention on steep surfaces. */
  normalBias: number;
  /** Shadow darkness factor (0 = no shadows, 1 = full darkness). */
  darkness: number;
}

/**
 * Declares shadow diagnostics emitted per frame for parity telemetry.
 */
export interface EngineShadowDiagnostics {
  /** Number of shadow maps rendered in the current frame. */
  shadowMapCount: number;
  /** Total shadow draw calls submitted in the current frame. */
  shadowDrawCallCount: number;
  /** Total shadow map texture memory in bytes. */
  shadowTextureBytes: number;
}

/**
 * Default shadow policy used when no explicit policy is provided.
 */
export function createDefaultShadowPolicy(): EngineShadowPolicy {
  return {
    enabled: false,
    type: "pcf",
    mapSize: 1024,
    near: 0.5,
    far: 500,
    bias: 0.0001,
    normalBias: 0.02,
    darkness: 1,
  };
}

/**
 * Creates zero-valued shadow diagnostics snapshot.
 */
export function createZeroShadowDiagnostics(): EngineShadowDiagnostics {
  return {
    shadowMapCount: 0,
    shadowDrawCallCount: 0,
    shadowTextureBytes: 0,
  };
}
