// Module responsibility: evaluate final migration debt burndown completion.
// Non-responsibility: debt item execution.

/**
 * Describes one migration debt item.
 */
export interface EngineMigrationDebtItem {
  /** Debt id. */
  id: string
  /** Whether item is critical severity. */
  critical: boolean
  /** Whether item is resolved. */
  resolved: boolean
}

/**
 * Intent: compute final migration debt burndown verdict.
 * @param items Migration debt items.
 * @returns True when no unresolved critical debt remains.
 */
export function computeEngineFinalMigrationDebtBurndown(items: readonly EngineMigrationDebtItem[]): boolean {
  return items.every((item) => !item.critical || item.resolved)
}
