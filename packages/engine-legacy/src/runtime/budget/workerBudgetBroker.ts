// Module responsibility: arbitrate worker task grants under queue budget and priority.
// Non-responsibility: worker task execution.

/**
 * Describes one worker queue task request.
 */
export interface EngineWorkerTaskRequest {
  /** Task id for diagnostics and queue tracking. */
  id: string
  /** Task priority score, larger means higher priority. */
  priority: number
  /** Estimated cost units consumed by task. */
  cost: number
}

/**
 * Describes worker budget broker decision payload.
 */
export interface EngineWorkerBudgetBrokerDecision {
  /** Task ids granted in this scheduling cycle. */
  grantedTaskIds: string[]
  /** Remaining budget units after arbitration. */
  remainingBudget: number
}

/**
 * Intent: select worker tasks under budget with priority-first fairness.
 * @param budgetUnits Budget units available for current cycle.
 * @param requests Worker task requests.
 * @returns Worker grant decision.
 */
export function resolveEngineWorkerBudgetBrokerDecision(
  budgetUnits: number,
  requests: readonly EngineWorkerTaskRequest[],
): EngineWorkerBudgetBrokerDecision {
  const sortedRequests = [...requests].sort((left, right) => {
    if (left.priority !== right.priority) {
      return right.priority - left.priority
    }

    return left.cost - right.cost
  })
  const grantedTaskIds: string[] = []
  let remainingBudget = Math.max(0, budgetUnits)

  for (const request of sortedRequests) {
    const safeCost = Math.max(0, request.cost)
    if (safeCost > remainingBudget) {
      continue
    }

    grantedTaskIds.push(request.id)
    remainingBudget -= safeCost
  }

  return {
    grantedTaskIds,
    remainingBudget,
  }
}
