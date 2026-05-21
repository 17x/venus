// Module responsibility: evaluate phase-G closeout postmortem completeness.
// Non-responsibility: report authoring.

/**
 * Describes phase-G closeout postmortem checklist.
 */
export interface EnginePhaseGCloseoutPostmortemChecklist {
  /** Whether timeline section is complete. */
  timelineComplete: boolean
  /** Whether incident summary section is complete. */
  incidentSummaryComplete: boolean
  /** Whether next-step backlog section is complete. */
  nextStepsComplete: boolean
}

/**
 * Intent: compute phase-G closeout postmortem pass verdict.
 * @param checklist Phase-G closeout postmortem checklist.
 * @returns True when closeout report is complete.
 */
export function computeEnginePhaseGCloseoutPostmortem(
  checklist: EnginePhaseGCloseoutPostmortemChecklist,
): boolean {
  return checklist.timelineComplete && checklist.incidentSummaryComplete && checklist.nextStepsComplete
}
