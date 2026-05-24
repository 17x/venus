// Module responsibility: validate v2 roadmap draft completeness.
// Non-responsibility: roadmap prioritization.

/**
 * Describes v2 roadmap checklist.
 */
export interface EngineV2RoadmapChecklist {
  /** Whether capability-gap section exists. */
  capabilityGaps: boolean
  /** Whether milestone breakdown exists. */
  milestones: boolean
  /** Whether risk and investment section exists. */
  riskAndInvestment: boolean
}

/**
 * Intent: validate v2 roadmap completeness.
 * @param checklist V2 roadmap checklist.
 * @returns True when checklist is complete.
 */
export function validateEngineV2RoadmapDraft(checklist: EngineV2RoadmapChecklist): boolean {
  return checklist.capabilityGaps && checklist.milestones && checklist.riskAndInvestment
}
