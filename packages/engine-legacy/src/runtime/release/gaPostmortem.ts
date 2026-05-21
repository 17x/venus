// Module responsibility: validate GA postmortem mandatory sections.
// Non-responsibility: incident response.

/**
 * Describes GA postmortem checklist.
 */
export interface EngineGaPostmortemChecklist {
  /** Whether release timeline is documented. */
  timeline: boolean
  /** Whether week-1 monitoring review is documented. */
  week1Review: boolean
  /** Whether next-iteration backlog is documented. */
  nextBacklog: boolean
}

/**
 * Intent: validate GA postmortem completeness.
 * @param checklist GA postmortem checklist.
 * @returns True when postmortem is complete.
 */
export function validateEngineGaPostmortem(checklist: EngineGaPostmortemChecklist): boolean {
  return checklist.timeline && checklist.week1Review && checklist.nextBacklog
}
