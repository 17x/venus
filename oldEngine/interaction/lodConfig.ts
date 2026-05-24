/**
 * Configurable LOD (Level of Detail) system for rendering optimization.
 * Allows fine-grained control over degradation strategies during interaction.
 */

/**
 * Render quality modes exposed to interaction capability policy.
 */
export type EngineLodRenderQuality = 'full' | 'interactive'

export type LodDegradationMode = 'conservative' | 'moderate' | 'aggressive'
export type EngineLodInteractionPhase = 'static' | 'pan' | 'zoom' | 'drag' | 'precision' | 'settled'

export interface EngineLodInteractionCapability {
  /** Preferred quality mode for this interaction phase. */
  quality?: EngineLodRenderQuality
  dpr?: number | 'auto'
  interactionActive?: boolean
  interactiveIntervalMs?: number
}

export interface EngineLodOptions {
  /**
   * Velocity threshold (px/sec) at which LOD increases by 1 level.
   * Conservative: 3000-4000, Moderate: 2000-2500, Aggressive: 1200-1600
   */
  aggressiveVelocityThreshold?: number

  /**
   * Velocity threshold (px/sec) at which LOD increases by 1 more level (max = 3).
   * Conservative: 6000-8000, Moderate: 4000-5000, Aggressive: 2400-3200
   */
  extremeVelocityThreshold?: number

  /**
   * Zoom scale threshold below which LOD increases (zoomed out = lower detail).
   * Conservative: 0.25, Moderate: 0.35, Aggressive: 0.5
   */
  zoomScaleThreshold?: number

  /**
   * Preset degradation strategy.
   * - conservative: high detail preserved during motion
   * - moderate: balanced (default)
   * - aggressive: aggressive degradation, current behavior
   */
  mode?: LodDegradationMode

  /**
   * When true, use shape/image count thresholds; when false, disable LOD entirely.
   */
  respectScenePressure?: boolean
}

export interface EngineLodConfig {
  /**
   * Enable LOD system entirely. Default: false (disabled, preserve full detail).
   * When false, ignores all degradation thresholds.
   */
  enabled: boolean

  /**
   * LOD-specific options. Only used if enabled=true.
   */
  options?: EngineLodOptions

  /**
   * Optional per-phase render capabilities for pan/zoom/drag style scenarios.
   *
   * This is intentionally separate from `enabled`: the legacy `enabled` flag
   * controls screen/detail simplification heuristics, while interaction
   * capabilities let hosts centralize phase-specific render behavior.
   */
  interactionCapabilities?: Partial<Record<EngineLodInteractionPhase, EngineLodInteractionCapability>>
}
