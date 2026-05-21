// Module responsibility: evaluate production alert trigger policy.
// Non-responsibility: alert delivery.

/**
 * Describes production SLO sample.
 */
export interface EngineProductionSloSample {
  /** Input-to-photon p95 in ms. */
  inputToPhotonP95Ms: number
  /** Critical-layer missing ratio in [0, 1]. */
  criticalLayerMissingRatio: number
}

/**
 * Intent: resolve production alert trigger from SLO sample.
 * @param sample SLO sample.
 * @returns Triggered alert ids.
 */
export function resolveEngineProductionAlerts(sample: EngineProductionSloSample): string[] {
  const alerts: string[] = []
  if (sample.inputToPhotonP95Ms > 50) {
    alerts.push('slo-latency')
  }
  if (sample.criticalLayerMissingRatio > 0) {
    alerts.push('critical-layer-integrity')
  }

  return alerts
}
