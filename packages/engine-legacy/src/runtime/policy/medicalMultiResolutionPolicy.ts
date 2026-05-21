// Module responsibility: prioritize medical ROI layers across multi-resolution assets.
// Non-responsibility: texture upload execution.

/**
 * Describes one medical region candidate.
 */
export interface EngineMedicalRegionCandidate {
  /** Region id for traceability. */
  regionId: string
  /** Whether region is critical. */
  critical: boolean
  /** Resolution level, larger means finer detail. */
  resolutionLevel: number
}

/**
 * Intent: resolve ordered medical region ids by criticality then resolution.
 * @param candidates Medical region candidates.
 * @returns Ordered region ids for processing.
 */
export function resolveEngineMedicalMultiResolutionOrder(
  candidates: readonly EngineMedicalRegionCandidate[],
): string[] {
  return [...candidates]
    .sort((left, right) => {
      if (left.critical !== right.critical) {
        return left.critical ? -1 : 1
      }

      return right.resolutionLevel - left.resolutionLevel
    })
    .map((candidate) => candidate.regionId)
}
