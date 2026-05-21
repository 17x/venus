// Module responsibility: evaluate program closeout postmortem completeness.
// Non-responsibility: report authoring.

/**
 * Describes program closeout postmortem checklist.
 */
export interface EngineProgramCloseoutPostmortemChecklist {
  /** Whether timeline section is complete. */
  timelineComplete: boolean
  /** Whether outcome metrics section is complete. */
  outcomeMetricsComplete: boolean
  /** Whether follow-up actions section is complete. */
  followUpActionsComplete: boolean
}

/**
 * Intent: compute program closeout postmortem verdict.
 * @param checklist Program closeout postmortem checklist.
 * @returns True when closeout postmortem includes mandatory sections.
 */
export function computeEngineProgramCloseoutPostmortem(checklist: EngineProgramCloseoutPostmortemChecklist): boolean {
  return checklist.timelineComplete && checklist.outcomeMetricsComplete && checklist.followUpActionsComplete
}
