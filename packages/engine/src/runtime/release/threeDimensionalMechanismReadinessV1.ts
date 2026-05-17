// Module responsibility: compute 3D mechanism readiness gate from runtime diagnostics coverage.
// Non-responsibility: runtime diagnostics collection.

const PREVIEW_EXECUTION_MODE_UNKNOWN = 'unknown'
const VISIBILITY_EXECUTION_MODE_FALLBACK_COARSE = 'fallback-frustum-coarse'

/**
 * Describes 3D mechanism readiness input from runtime diagnostics and wiring state.
 */
export interface EngineThreeDimensionalMechanismReadinessInputV1 {
  /** Whether visibility policy is no longer coarse fallback-only. */
  visibilityPolicyReady: boolean
  /** Whether 3D preview mode is observable and no longer unknown. */
  previewExecutionModeReady: boolean
  /** Whether dimension-aware tile streaming key wiring is enabled. */
  streamingKeyReady: boolean
}

/**
 * Describes baseline telemetry signals consumed by mechanism readiness input resolver.
 */
export interface EngineThreeDimensionalMechanismTelemetrySignalsV1 {
  /** Preview execution mode counters from baseline summary snapshots. */
  previewExecutionModeCounts: Readonly<Record<string, number>>
  /** 3D visibility execution mode counters from baseline summary snapshots. */
  visibility3dExecutionModeCounts: Readonly<Record<string, number>>
  /** Whether tile streaming key wiring is enabled in runtime path. */
  streamingKeyReady: boolean
}

/**
 * Intent: compute total observed frame count from keyed counters.
 * @param counts Counter map keyed by execution mode.
 * @returns Sum of all counter values.
 */
function computeEngineCounterTotal(counts: Readonly<Record<string, number>>): number {
  let total = 0
  for (const value of Object.values(counts)) {
    total += value
  }

  return total
}

/**
 * Intent: resolve preview execution mode readiness from baseline counters.
 * @param previewExecutionModeCounts Preview execution mode counters.
 * @returns True when baseline observed at least one known mode and no unknown mode remains.
 */
function resolveEnginePreviewExecutionModeReadiness(
  previewExecutionModeCounts: Readonly<Record<string, number>>,
): boolean {
  const totalCount = computeEngineCounterTotal(previewExecutionModeCounts)
  const unknownCount = previewExecutionModeCounts[PREVIEW_EXECUTION_MODE_UNKNOWN] ?? 0
  const knownCount = Math.max(0, totalCount - unknownCount)
  return knownCount > 0 && unknownCount === 0
}

/**
 * Intent: resolve visibility policy readiness from baseline counters.
 * @param visibility3dExecutionModeCounts 3D visibility execution mode counters.
 * @returns True when baseline observed at least one non-fallback visibility mode.
 */
function resolveEngineVisibilityPolicyReadiness(
  visibility3dExecutionModeCounts: Readonly<Record<string, number>>,
): boolean {
  const totalCount = computeEngineCounterTotal(visibility3dExecutionModeCounts)
  const coarseFallbackCount = visibility3dExecutionModeCounts[VISIBILITY_EXECUTION_MODE_FALLBACK_COARSE] ?? 0
  const upgradedModeCount = Math.max(0, totalCount - coarseFallbackCount)
  return upgradedModeCount > 0
}

/**
 * Intent: compose mechanism readiness booleans from baseline telemetry counters.
 * @param signals Baseline telemetry and streaming-key wiring signals.
 * @returns Mechanism readiness input accepted by gate function.
 */
export function computeEngineThreeDimensionalMechanismReadinessInputV1(
  signals: EngineThreeDimensionalMechanismTelemetrySignalsV1,
): EngineThreeDimensionalMechanismReadinessInputV1 {
  return {
    visibilityPolicyReady: resolveEngineVisibilityPolicyReadiness(signals.visibility3dExecutionModeCounts),
    previewExecutionModeReady: resolveEnginePreviewExecutionModeReadiness(signals.previewExecutionModeCounts),
    streamingKeyReady: signals.streamingKeyReady,
  }
}

/**
 * Intent: compute 3D mechanism readiness gate verdict.
 * @param input 3D mechanism readiness input.
 * @returns True when mechanism wiring requirements are satisfied.
 */
export function computeEngineThreeDimensionalMechanismReadinessV1(
  input: EngineThreeDimensionalMechanismReadinessInputV1,
): boolean {
  return input.visibilityPolicyReady && input.previewExecutionModeReady && input.streamingKeyReady
}
