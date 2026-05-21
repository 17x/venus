// Module responsibility: normalize phase-decision input into one explicit contract.
// Non-responsibility: selecting budgets or mutating renderer state.

import type { EngineFrameBudgetPressure } from '../createEngine/frameBudgetBroker/frameBudgetBroker.ts'
import type { EngineRenderStrategyPhase } from '../createEngine/strategy/strategy.ts'

/**
 * Describes v2 strategy input used by qos and phase-state modules.
 */
export interface EngineStrategyInputV2 {
  /** Runtime profile name. */
  profile: 'editor' | 'game' | 'animation' | 'medical' | 'massive-data' | 'hybrid'
  /** Current strategy phase. */
  phase: EngineRenderStrategyPhase
  /** Current coarse budget pressure tier. */
  pressure: EngineFrameBudgetPressure
  /** Whether camera animation is active. */
  cameraAnimationActive: boolean
  /** Predictor confidence in range [0,1]. */
  predictorConfidence: number
  /** Elapsed time since last interaction mutation in ms. */
  interactionElapsedMs: number
}

/**
 * Intent: normalize strategy input fields into bounded deterministic ranges.
 * @param input Raw strategy input.
 * @returns Normalized strategy input.
 */
export function resolveEngineStrategyInputV2(input: EngineStrategyInputV2): EngineStrategyInputV2 {
  return {
    ...input,
    predictorConfidence: Math.max(0, Math.min(1, input.predictorConfidence)),
    interactionElapsedMs: Math.max(0, input.interactionElapsedMs),
  }
}
