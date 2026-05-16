// Module responsibility: scaling adjustment contract for runtime quality scaler.
// Non-responsibility: runtime pressure monitoring.

/**
 * Describes configurable bounds for runtime auto-scaling decisions.
 */
export interface EngineScalingSettings {
  /** Minimum render scale allowed under pressure. */
  minRenderScale: number
  /** Maximum render scale allowed when pressure is low. */
  maxRenderScale: number
  /** Cooldown time between scale adjustments in milliseconds. */
  cooldownMs: number
}

/**
 * Defines canonical defaults for scaling settings.
 */
export const DEFAULT_ENGINE_SCALING_SETTINGS: EngineScalingSettings = {
  minRenderScale: 0.75,
  maxRenderScale: 1.5,
  cooldownMs: 120,
}
