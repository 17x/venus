// Module responsibility: deterministic degradation ladder resolution with critical-layer guard.
// Non-responsibility: selecting pressure tiers or phase transitions.

import type { EngineFrameBudgetPressure } from '../createEngine/frameBudgetBroker/frameBudgetBroker.ts'
import type { EngineStrategyInputV2 } from './strategyInputV2.ts'

/**
 * Defines deterministic degradation ladder levels.
 */
export type EngineDegradationLevel = 'none' | 'l1-non-critical-effects' | 'l2-non-critical-detail' | 'l3-far-field-detail'

/**
 * Describes degradation decision output.
 */
export interface EngineDegradationDecision {
  /** Resolved degradation level. */
  level: EngineDegradationLevel
  /** Whether critical layers are exempt from degradation passes. */
  criticalLayerExempt: boolean
}

/**
 * Intent: resolve degradation level from pressure and strategy phase.
 * @param input Normalized strategy input.
 * @returns Degradation decision.
 */
export function resolveEngineDegradationDecision(input: EngineStrategyInputV2): EngineDegradationDecision {
  const pressure = input.pressure as EngineFrameBudgetPressure

  if (pressure === 'high') {
    if (input.phase === 'static') {
      return { level: 'l2-non-critical-detail', criticalLayerExempt: true }
    }

    return { level: 'l3-far-field-detail', criticalLayerExempt: true }
  }

  if (pressure === 'medium') {
    return { level: 'l1-non-critical-effects', criticalLayerExempt: true }
  }

  return { level: 'none', criticalLayerExempt: true }
}
