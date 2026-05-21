// Module responsibility: prioritize medical ROI resources by criticality and distance.
// Non-responsibility: resource loading.

/**
 * Describes one medical ROI candidate.
 */
export interface EngineMedicalRoiCandidate {
  /** ROI id. */
  id: string
  /** Whether ROI belongs to critical region. */
  critical: boolean
  /** Distance to viewport center in px. */
  distancePx: number
}

/**
 * Intent: resolve medical ROI order by criticality then center proximity.
 * @param rois ROI candidates.
 * @returns Ordered ROI ids.
 */
export function resolveEngineMedicalRoiPriority(
  rois: readonly EngineMedicalRoiCandidate[],
): string[] {
  return [...rois]
    .sort((left, right) => {
      if (left.critical !== right.critical) {
        return left.critical ? -1 : 1
      }

      return left.distancePx - right.distancePx
    })
    .map((roi) => roi.id)
}
