// Module responsibility: evaluate refactor completion readiness from gate checklist.
// Non-responsibility: collecting gate evidence.

/**
 * Describes refactor completion readiness checklist.
 */
export interface EngineRefactorCompletionReadinessChecklist {
  /** Whether governance gates passed. */
  governancePassed: boolean
  /** Whether SLO closeout gate passed. */
  sloPassed: boolean
  /** Whether migration debt burndown passed. */
  migrationPassed: boolean
  /** Whether evidence bundle gate passed. */
  evidencePassed: boolean
}

/**
 * Intent: compute refactor completion readiness verdict.
 * @param checklist Refactor completion readiness checklist.
 * @returns True when all readiness gates are passed.
 */
export function computeEngineRefactorCompletionReadiness(
  checklist: EngineRefactorCompletionReadinessChecklist,
): boolean {
  return checklist.governancePassed && checklist.sloPassed && checklist.migrationPassed && checklist.evidencePassed
}
