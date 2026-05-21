// Module responsibility: compute bounded perf budget recalibration.
// Non-responsibility: perf benchmark execution.

/**
 * Describes perf budget recalibration input.
 */
export interface EnginePerfBudgetRecalibrationInput {
  /** Baseline frame budget in milliseconds. */
  baselineBudgetMs: number
  /** Observed p95 frame time in milliseconds. */
  observedP95Ms: number
  /** Maximum allowed adjustment ratio in [0, 1]. */
  maxAdjustmentRatio: number
}

/**
 * Intent: compute bounded perf budget recalibration target.
 * @param input Recalibration input.
 * @returns Recalibrated budget in milliseconds.
 */
export function computeEnginePerfBudgetRecalibrationV1(input: EnginePerfBudgetRecalibrationInput): number {
  const rawDelta = input.observedP95Ms - input.baselineBudgetMs
  const maxDelta = Math.abs(input.baselineBudgetMs * input.maxAdjustmentRatio)
  // Clamp recalibration amplitude to keep policy drift bounded across releases.
  const boundedDelta = Math.max(-maxDelta, Math.min(maxDelta, rawDelta))
  return input.baselineBudgetMs + boundedDelta
}
