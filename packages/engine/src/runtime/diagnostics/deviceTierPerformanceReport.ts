// Module responsibility: summarize profile recommendations per device tier.
// Non-responsibility: device probing.

/**
 * Device tier union.
 */
export type EngineDeviceTier = 'low' | 'mid' | 'high'

/**
 * Describes tier recommendation output.
 */
export interface EngineDeviceTierRecommendation {
  /** Device tier. */
  tier: EngineDeviceTier
  /** Recommended profile. */
  profile: string
  /** Recommended preset. */
  preset: string
}

/**
 * Intent: resolve default recommendation for each device tier.
 * @returns Tier recommendations.
 */
export function resolveEngineDeviceTierRecommendations(): EngineDeviceTierRecommendation[] {
  return [
    { tier: 'low', profile: 'massive-data', preset: 'battery-saver' },
    { tier: 'mid', profile: 'editor', preset: 'balanced' },
    { tier: 'high', profile: 'game', preset: 'quality' },
  ]
}
