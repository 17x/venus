// Module responsibility: summarize round2 gate results for scenario specialization closure.
// Non-responsibility: executing gate suites.

/**
 * Describes one gate verdict.
 */
export interface EngineGateVerdict {
  /** Gate id. */
  gate: string
  /** Whether gate passed. */
  pass: boolean
}

/**
 * Intent: resolve round2 pass/fail summary from gate verdicts.
 * @param verdicts Gate verdict list.
 * @returns Pass flag and failed gate ids.
 */
export function resolveEngineScenarioSpecializationRound2(
  verdicts: readonly EngineGateVerdict[],
): {pass: boolean; failedGates: string[]} {
  const failedGates = verdicts.filter((verdict) => !verdict.pass).map((verdict) => verdict.gate)
  return {
    pass: failedGates.length === 0,
    failedGates,
  }
}
