// Module responsibility: resolve thermal-aware runtime mode.
// Non-responsibility: battery and thermal sensing.

/**
 * Describes thermal-aware policy input.
 */
export interface EngineThermalPolicyInput {
  /** Thermal score in [0, 1], higher is hotter. */
  thermalScore: number
  /** Battery level in [0, 1]. */
  batteryLevel: number
}

/**
 * Thermal-aware mode result.
 */
export type EngineThermalAwareMode = 'normal' | 'throttle' | 'battery-saver'

/**
 * Intent: resolve thermal-aware mode from thermal and battery signals.
 * @param input Thermal policy input.
 * @returns Thermal-aware mode.
 */
export function resolveEngineThermalAwareMode(input: EngineThermalPolicyInput): EngineThermalAwareMode {
  if (input.batteryLevel < 0.2) {
    return 'battery-saver'
  }

  if (input.thermalScore >= 0.7) {
    return 'throttle'
  }

  return 'normal'
}
