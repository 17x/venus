// Module responsibility: evaluate fallback parity between 2D and 3D modes.
// Non-responsibility: mode fallback execution.

/**
 * Describes one fallback parity sample across modes.
 */
export interface EngineFallbackParitySample2d3d {
  /** Sample id. */
  id: string
  /** Fallback reason in 2D mode. */
  reason2d: string
  /** Fallback reason in 3D mode. */
  reason3d: string
  /** Whether sample is critical severity. */
  critical: boolean
}

/**
 * Intent: compute 2D/3D fallback parity gate verdict.
 * @param samples Fallback parity samples.
 * @returns True when no critical parity mismatch exists.
 */
export function computeEngineFallbackParityGate2d3d(samples: readonly EngineFallbackParitySample2d3d[]): boolean {
  return samples.every((sample) => !sample.critical || sample.reason2d === sample.reason3d)
}
