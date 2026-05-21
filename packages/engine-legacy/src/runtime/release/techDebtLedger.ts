// Module responsibility: validate quarterly tech-debt ledger readiness.
// Non-responsibility: debt remediation execution.

/**
 * Describes tech-debt ledger entry.
 */
export interface EngineTechDebtEntry {
  /** Debt id. */
  id: string
  /** Whether entry has planned cleanup quarter. */
  scheduled: boolean
}

/**
 * Intent: validate tech-debt ledger has actionable entries.
 * @param entries Tech-debt entries.
 * @returns True when ledger is actionable.
 */
export function validateEngineTechDebtLedger(entries: readonly EngineTechDebtEntry[]): boolean {
  return entries.length > 0 && entries.every((entry) => entry.id.length > 0 && entry.scheduled)
}
