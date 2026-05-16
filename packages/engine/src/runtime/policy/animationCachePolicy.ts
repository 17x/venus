// Module responsibility: resolve animation keyframe/interpolation cache usage policy.
// Non-responsibility: timeline playback execution.

/**
 * Describes animation cache policy input payload.
 */
export interface EngineAnimationCachePolicyInput {
  /** Whether operation is timeline seek. */
  seek: boolean
  /** Distance to nearest keyframe in frames. */
  keyframeDistance: number
  /** Interpolation segment complexity score. */
  interpolationComplexity: number
}

/**
 * Describes animation cache policy decision payload.
 */
export interface EngineAnimationCachePolicyDecision {
  /** Whether keyframe cache should be prioritized. */
  useKeyframeCache: boolean
  /** Whether interpolation cache should be prioritized. */
  useInterpolationCache: boolean
}

/**
 * Intent: resolve animation cache lane preference by seek and keyframe proximity.
 * @param input Animation cache policy input payload.
 * @returns Animation cache policy decision.
 */
export function resolveEngineAnimationCachePolicy(
  input: EngineAnimationCachePolicyInput,
): EngineAnimationCachePolicyDecision {
  if (input.seek || input.keyframeDistance <= 1) {
    return {
      useKeyframeCache: true,
      useInterpolationCache: false,
    }
  }

  return {
    useKeyframeCache: input.keyframeDistance <= 4,
    useInterpolationCache: input.interpolationComplexity > 0,
  }
}
