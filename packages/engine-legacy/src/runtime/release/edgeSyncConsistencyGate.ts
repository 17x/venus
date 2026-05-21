// Module responsibility: evaluate edge-sync consistency gate across cloud and edge snapshots.
// Non-responsibility: snapshot transport.

/**
 * Describes one edge-sync consistency mismatch.
 */
export interface EngineEdgeSyncMismatch {
  /** Mismatch key path. */
  key: string
  /** Mismatch category. */
  category: 'version' | 'policy' | 'capability'
}

/**
 * Intent: compute edge-sync consistency gate pass verdict.
 * @param mismatches Edge-sync mismatch list.
 * @returns True when no mismatches exist.
 */
export function computeEngineEdgeSyncConsistencyGate(mismatches: readonly EngineEdgeSyncMismatch[]): boolean {
  return mismatches.length === 0
}
