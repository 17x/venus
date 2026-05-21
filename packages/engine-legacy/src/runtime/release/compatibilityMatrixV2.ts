// Module responsibility: evaluate compatibility matrix v2 coverage completeness.
// Non-responsibility: runtime capability probing.

/**
 * Describes one compatibility matrix entry.
 */
export interface EngineCompatibilityMatrixEntryV2 {
  /** Profile id. */
  profile: string
  /** Backend id. */
  backend: string
  /** Whether this pair is verified. */
  verified: boolean
}

/**
 * Intent: compute compatibility matrix v2 gate pass verdict.
 * @param entries Compatibility matrix entries.
 * @returns True when all declared entries are verified and matrix is non-empty.
 */
export function computeEngineCompatibilityMatrixV2(entries: readonly EngineCompatibilityMatrixEntryV2[]): boolean {
  return entries.length > 0 && entries.every((entry) => entry.profile.length > 0 && entry.backend.length > 0 && entry.verified)
}
