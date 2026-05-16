// Module responsibility: standardize camera smoothing and inertia policy by profile.
// Non-responsibility: camera animation stepping.

import type { EngineProfileName } from '../../settings/index.ts'

/**
 * Describes resolved camera runtime policy snapshot.
 */
export interface EngineCameraRuntimePolicy {
  /** Smoothing factor in range [0, 1]. */
  smoothing: number
  /** Inertia factor in range [0, 1]. */
  inertia: number
  /** Prediction horizon in milliseconds. */
  predictionMs: number
}

/**
 * Intent: resolve profile-specific camera runtime policy.
 * @param profile Runtime profile.
 * @returns Camera runtime policy.
 */
export function resolveEngineCameraRuntimePolicy(profile: EngineProfileName): EngineCameraRuntimePolicy {
  if (profile === 'game') {
    return {
      smoothing: 0.15,
      inertia: 0.35,
      predictionMs: 32,
    }
  }

  if (profile === 'animation') {
    return {
      smoothing: 0.25,
      inertia: 0.2,
      predictionMs: 20,
    }
  }

  if (profile === 'medical') {
    return {
      smoothing: 0.35,
      inertia: 0.1,
      predictionMs: 12,
    }
  }

  return {
    smoothing: 0.2,
    inertia: 0.25,
    predictionMs: 24,
  }
}
