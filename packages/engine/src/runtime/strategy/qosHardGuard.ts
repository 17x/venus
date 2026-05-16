// Module responsibility: enforce hard guard invariants on qos decisions.
// Non-responsibility: producing base qos decisions.

import type { EngineQosControllerDecision, EngineQosControllerInput } from './qosController.ts'

/**
 * Describes one qos hard-guard evaluation output.
 */
export interface EngineQosHardGuardResult {
  /** Effective decision after hard-guard corrections. */
  decision: EngineQosControllerDecision
  /** Guard trigger identifiers applied to this frame. */
  triggers: string[]
}

/**
 * Intent: enforce non-bypassable hard guards on qos decision outputs.
 * @param input Qos controller input.
 * @param decision Qos controller decision.
 * @returns Guarded decision and trigger list.
 */
export function applyEngineQosHardGuard(
  input: EngineQosControllerInput,
  decision: EngineQosControllerDecision,
): EngineQosHardGuardResult {
  const triggers: string[] = []
  let guardedDecision = decision

  if (input.degradation.criticalLayerExempt) {
    triggers.push('critical-layer-exempt')
  }

  if (input.profile === 'medical') {
    triggers.push('medical-integrity-priority')
    guardedDecision = {
      ...guardedDecision,
      budget: {
        ...guardedDecision.budget,
        drawSubmitBudgetMs: Math.max(guardedDecision.budget.drawSubmitBudgetMs, 20),
      },
      trace: `${guardedDecision.trace}|medical-guard`,
    }
  }

  return {
    decision: guardedDecision,
    triggers,
  }
}
