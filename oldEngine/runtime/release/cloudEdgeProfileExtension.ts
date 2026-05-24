// Module responsibility: validate cloud/edge profile extension compatibility.
// Non-responsibility: remote execution.

/**
 * Describes cloud/edge extension contract.
 */
export interface EngineCloudEdgeProfileExtension {
  /** Extension id. */
  id: string
  /** Whether extension keeps backward compatibility. */
  backwardCompatible: boolean
  /** Whether bandwidth policy is defined. */
  bandwidthPolicyDefined: boolean
}

/**
 * Intent: validate cloud/edge extension contract safety.
 * @param extension Cloud/edge extension contract.
 * @returns True when extension is compatible.
 */
export function validateEngineCloudEdgeProfileExtension(
  extension: EngineCloudEdgeProfileExtension,
): boolean {
  return extension.id.length > 0 && extension.backwardCompatible && extension.bandwidthPolicyDefined
}
