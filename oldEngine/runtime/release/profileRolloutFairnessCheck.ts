// Module responsibility: evaluate rollout fairness across profile cohorts.
// Non-responsibility: cohort assignment.

/**
 * Describes one profile rollout cohort sample.
 */
export interface EngineProfileRolloutCohortSample {
  /** Cohort id. */
  cohortId: string
  /** Exposure ratio in [0, 1]. */
  exposureRatio: number
}

/**
 * Intent: compute profile rollout fairness verdict.
 * @param cohorts Cohort samples.
 * @param maxGap Maximum allowed exposure ratio gap.
 * @returns True when exposure gap is bounded by max gap.
 */
export function computeEngineProfileRolloutFairnessCheck(
  cohorts: readonly EngineProfileRolloutCohortSample[],
  maxGap: number,
): boolean {
  if (cohorts.length === 0) {
    return false
  }

  const exposures = cohorts.map((cohort) => cohort.exposureRatio)
  const minExposure = Math.min(...exposures)
  const maxExposure = Math.max(...exposures)
  return maxExposure - minExposure <= maxGap
}
