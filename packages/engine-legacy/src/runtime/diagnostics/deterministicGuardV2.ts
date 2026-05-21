// Module responsibility: compare repeated outputs against deterministic tolerance.
// Non-responsibility: output generation.

/**
 * Describes deterministic comparison input.
 */
export interface EngineDeterministicGuardInput {
  /** Baseline scalar output. */
  baseline: number
  /** Candidate scalar output. */
  candidate: number
  /** Allowed absolute tolerance. */
  tolerance: number
}

/**
 * Intent: resolve deterministic guard pass/fail.
 * @param input Deterministic guard input.
 * @returns True when absolute delta is within tolerance.
 */
export function passEngineDeterministicGuardV2(input: EngineDeterministicGuardInput): boolean {
  return Math.abs(input.candidate - input.baseline) <= Math.max(0, input.tolerance)
}
