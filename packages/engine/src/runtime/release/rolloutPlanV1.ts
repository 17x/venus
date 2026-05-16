// Module responsibility: model rollout batch and rollback threshold rules.
// Non-responsibility: traffic control.

/**
 * Describes one rollout batch.
 */
export interface EngineRolloutBatch {
  /** Batch id. */
  id: string
  /** Traffic percentage in [0, 100]. */
  trafficPercent: number
}

/**
 * Intent: validate rollout batches monotonicity and total cap.
 * @param batches Rollout batch list.
 * @returns True when rollout plan is valid.
 */
export function validateEngineRolloutPlanV1(batches: readonly EngineRolloutBatch[]): boolean {
  if (batches.length === 0) {
    return false
  }

  let previousPercent = -1
  for (const batch of batches) {
    if (batch.trafficPercent < previousPercent || batch.trafficPercent > 100) {
      return false
    }

    previousPercent = batch.trafficPercent
  }

  return batches[batches.length - 1].trafficPercent === 100
}
