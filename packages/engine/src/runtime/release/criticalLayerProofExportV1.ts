// Module responsibility: validate critical-layer proof export records.
// Non-responsibility: proof export persistence.

/**
 * Describes one critical-layer proof record.
 */
export interface EngineCriticalLayerProofRecord {
  /** Frame id. */
  frameId: string
  /** Integrity hash. */
  integrityHash: string
  /** Whether critical-layer integrity is preserved. */
  preserved: boolean
}

/**
 * Intent: compute critical-layer proof export validity.
 * @param records Critical-layer proof records.
 * @returns True when all records carry hashes and preserved integrity.
 */
export function computeEngineCriticalLayerProofExportV1(records: readonly EngineCriticalLayerProofRecord[]): boolean {
  return records.length > 0
    && records.every((record) => record.frameId.length > 0 && record.integrityHash.length > 0 && record.preserved)
}
