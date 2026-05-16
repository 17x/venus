// Module responsibility: compute ROI sharpen weights for upload prioritization.
// Non-responsibility: texture upload scheduling.

/**
 * Describes one ROI target used by sharpen policy weighting.
 */
export interface EngineRoiTarget {
  /** Target id used by scheduler diagnostics and debug traces. */
  id: string
  /** Distance from viewport center in CSS pixels. */
  distanceToCenterPx: number
}

/**
 * Describes weighted ROI target result.
 */
export interface EngineWeightedRoiTarget extends EngineRoiTarget {
  /** Computed sharpen priority score in [0, 1]. */
  sharpenWeight: number
}

/**
 * Intent: compute ROI sharpen weights using center-distance falloff.
 * @param targets ROI targets for this frame.
 * @param maxDistancePx Max expected center distance in CSS pixels.
 * @returns ROI targets with sharpen weights.
 */
export function resolveEngineRoiSharpenWeights(
  targets: readonly EngineRoiTarget[],
  maxDistancePx: number,
): EngineWeightedRoiTarget[] {
  const safeMaxDistance = Math.max(1, maxDistancePx)
  return targets.map((target) => {
    const normalizedDistance = Math.max(0, Math.min(1, target.distanceToCenterPx / safeMaxDistance))
    return {
      ...target,
      sharpenWeight: 1 - normalizedDistance,
    }
  })
}
