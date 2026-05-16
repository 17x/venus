// Module responsibility: validate GA readiness checklist completeness.
// Non-responsibility: GA execution.

/**
 * Describes GA readiness checklist.
 */
export interface EngineGaReadinessChecklist {
  /** Whether docs are frozen. */
  docsFrozen: boolean
  /** Whether changelog is prepared. */
  changelogReady: boolean
  /** Whether operations handoff is complete. */
  opsHandoffReady: boolean
}

/**
 * Intent: validate GA readiness checklist.
 * @param checklist GA readiness checklist.
 * @returns True when checklist is complete.
 */
export function validateEngineGaReadiness(checklist: EngineGaReadinessChecklist): boolean {
  return checklist.docsFrozen && checklist.changelogReady && checklist.opsHandoffReady
}
