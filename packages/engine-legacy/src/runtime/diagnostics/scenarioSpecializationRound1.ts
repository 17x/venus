// Module responsibility: summarize scenario specialization round1 outcomes.
// Non-responsibility: scenario execution.

/**
 * Describes one scenario metric verdict.
 */
export interface EngineScenarioRound1Verdict {
  /** Scenario id. */
  scenario: string
  /** Whether scenario meets target. */
  pass: boolean
}

/**
 * Intent: resolve round1 summary from scenario verdicts.
 * @param verdicts Scenario verdict list.
 * @returns Aggregate pass state and failed scenario ids.
 */
export function resolveEngineScenarioRound1Summary(
  verdicts: readonly EngineScenarioRound1Verdict[],
): {pass: boolean; failed: string[]} {
  const failed = verdicts.filter((verdict) => !verdict.pass).map((verdict) => verdict.scenario)
  return {
    pass: failed.length === 0,
    failed,
  }
}
