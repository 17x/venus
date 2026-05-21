// Module responsibility: validate observability schema lock requirements.
// Non-responsibility: telemetry emission.

/**
 * Describes observability schema lock input.
 */
export interface EngineObservabilitySchemaLockInput {
  /** Mandatory field count expected by schema. */
  expectedMandatoryFieldCount: number
  /** Mandatory field count present in sample schema. */
  observedMandatoryFieldCount: number
}

/**
 * Intent: compute observability schema lock verdict.
 * @param input Observability schema lock input.
 * @returns True when mandatory field counts match.
 */
export function computeEngineObservabilitySchemaLockV1(input: EngineObservabilitySchemaLockInput): boolean {
  return input.expectedMandatoryFieldCount === input.observedMandatoryFieldCount
}
