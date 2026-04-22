/**
 * Configurable LOD (Level of Detail) system for rendering optimization.
 * Allows fine-grained control over degradation strategies during interaction.
 */

export type LodDegradationMode = 'conservative' | 'moderate' | 'aggressive'

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
}

/**
 * Get preset LOD configuration by mode.
 */
export function getLodPreset(mode: LodDegradationMode): EngineLodOptions {
  switch (mode) {
    case 'conservative':
      return {
        aggressiveVelocityThreshold: 3600,
        extremeVelocityThreshold: 7200,
        zoomScaleThreshold: 0.25,
        respectScenePressure: true,
      }
    case 'moderate':
      return {
        aggressiveVelocityThreshold: 2400,
        extremeVelocityThreshold: 4200,
        zoomScaleThreshold: 0.35,
        respectScenePressure: true,
      }
    case 'aggressive':
      return {
        aggressiveVelocityThreshold: 1200,
        extremeVelocityThreshold: 2400,
        zoomScaleThreshold: 0.5,
        respectScenePressure: true,
      }
  }
}

/**
 * Merge user options with preset defaults.
 */
export function mergeWithPreset(
  preset: EngineLodOptions,
  userOptions?: EngineLodOptions,
): EngineLodOptions {
  return {
    aggressiveVelocityThreshold: userOptions?.aggressiveVelocityThreshold ?? preset.aggressiveVelocityThreshold,
    extremeVelocityThreshold: userOptions?.extremeVelocityThreshold ?? preset.extremeVelocityThreshold,
    zoomScaleThreshold: userOptions?.zoomScaleThreshold ?? preset.zoomScaleThreshold,
    respectScenePressure: userOptions?.respectScenePressure ?? preset.respectScenePressure,
  }
}
