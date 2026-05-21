// Module responsibility: validate deterministic snapshot archive integrity.
// Non-responsibility: snapshot rendering.

/**
 * Describes one deterministic snapshot archive entry.
 */
export interface EngineDeterministicSnapshotArchiveEntry {
  /** Snapshot id. */
  id: string
  /** Snapshot deterministic hash. */
  hash: string
  /** Snapshot schema version. */
  schemaVersion: string
}

/**
 * Intent: compute deterministic snapshot archive validity.
 * @param entries Snapshot archive entries.
 * @returns True when entries are non-empty and fully versioned.
 */
export function computeEngineDeterministicSnapshotArchive(entries: readonly EngineDeterministicSnapshotArchiveEntry[]): boolean {
  return entries.length > 0
    && entries.every((entry) => entry.id.length > 0 && entry.hash.length > 0 && entry.schemaVersion.length > 0)
}
