// Module responsibility: evaluate release evidence bundle completeness.
// Non-responsibility: artifact upload.

/**
 * Describes one release evidence item.
 */
export interface EngineReleaseEvidenceItem {
  /** Evidence key. */
  key: string
  /** Whether evidence artifact exists. */
  present: boolean
}

/**
 * Intent: compute release evidence bundle gate verdict.
 * @param items Release evidence items.
 * @returns True when all required evidence artifacts are present.
 */
export function computeEngineReleaseEvidenceBundleGate(items: readonly EngineReleaseEvidenceItem[]): boolean {
  return items.length > 0 && items.every((item) => item.key.length > 0 && item.present)
}
