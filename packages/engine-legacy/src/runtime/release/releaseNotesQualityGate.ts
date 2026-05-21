// Module responsibility: evaluate release notes quality gate completeness.
// Non-responsibility: release notes generation.

/**
 * Describes release notes mandatory section checklist.
 */
export interface EngineReleaseNotesChecklist {
  /** Whether risk section exists. */
  riskSection: boolean
  /** Whether migration guidance exists. */
  migrationSection: boolean
  /** Whether rollback guidance exists. */
  rollbackSection: boolean
}

/**
 * Intent: compute release notes quality gate verdict.
 * @param checklist Release notes checklist.
 * @returns True when all mandatory sections are complete.
 */
export function computeEngineReleaseNotesQualityGate(checklist: EngineReleaseNotesChecklist): boolean {
  return checklist.riskSection && checklist.migrationSection && checklist.rollbackSection
}
