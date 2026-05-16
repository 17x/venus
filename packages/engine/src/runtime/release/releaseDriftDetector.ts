// Module responsibility: detect configuration drift between baseline and runtime snapshot.
// Non-responsibility: drift reconciliation.

/**
 * Describes one release profile drift entry.
 */
export interface EngineReleaseDriftEntry {
  /** Drift key path. */
  key: string
  /** Approved baseline value. */
  expectedValue: string
  /** Runtime observed value. */
  actualValue: string
}

/**
 * Intent: compute release drift entries from baseline and runtime snapshots.
 * @param entries Candidate drift entries.
 * @returns Drift entries with mismatched values only.
 */
export function computeEngineReleaseDrift(entries: readonly EngineReleaseDriftEntry[]): EngineReleaseDriftEntry[] {
  return entries.filter((entry) => entry.expectedValue !== entry.actualValue)
}
