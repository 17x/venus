// Module responsibility: throttle massive-data query throughput under pressure.
// Non-responsibility: query execution.

/**
 * Describes massive-throughput policy input.
 */
export interface EngineMassiveThroughputPolicyInput {
  /** Requested query budget units. */
  requestedUnits: number
  /** Current pressure score in [0, 1]. */
  pressureScore: number
}

/**
 * Intent: resolve allowed throughput units under pressure.
 * @param input Throughput policy input.
 * @returns Allowed throughput units.
 */
export function resolveEngineMassiveThroughputUnits(
  input: EngineMassiveThroughputPolicyInput,
): number {
  const requested = Math.max(1, input.requestedUnits)
  const pressure = Math.max(0, Math.min(1, input.pressureScore))
  return Math.max(1, Math.floor(requested * (1 - pressure * 0.7)))
}
