// Module responsibility: evaluate week1 post-GA observability evidence completeness.
// Non-responsibility: telemetry ingestion.

/**
 * Describes one week1 observability sample.
 */
export interface EngineWeek1ObservabilitySample {
  /** Input-to-photon p95 in milliseconds. */
  inputToPhotonP95Ms: number | null
  /** Critical-layer missing ratio. */
  criticalLayerMissingRatio: number | null
  /** Whether anomaly attribution notes are present. */
  anomalyAttributionReady: boolean
}

/**
 * Intent: compute whether post-GA week1 observability audit passes.
 * @param sample Week1 observability sample.
 * @returns True when mandatory observability evidence is complete.
 */
export function computeEnginePostGaWeek1ObservabilityAudit(sample: EngineWeek1ObservabilitySample): boolean {
  return sample.inputToPhotonP95Ms !== null
    && sample.criticalLayerMissingRatio !== null
    && sample.anomalyAttributionReady
}
