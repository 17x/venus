// Module responsibility: qos budget selection from profile/phase/pressure/capability.
// Non-responsibility: renderer execution and diagnostics persistence.

import type { EngineFrameBudget } from '../../renderer/types/index.ts'
import type { EngineFrameBudgetPressure } from '../createEngine/frameBudgetBroker/frameBudgetBroker.ts'
import type { EngineRenderStrategyPhase } from '../createEngine/strategy/strategy.ts'
import { DEFAULT_ENGINE_PHASE_BUDGET_PROFILES } from './budgetProfiles.ts'
import type { EngineDegradationDecision } from './degradationLadder.ts'

/**
 * Describes qos controller input payload.
 */
export interface EngineQosControllerInput {
  /** Runtime profile. */
  profile: 'editor' | 'game' | 'animation' | 'medical' | 'massive-data' | 'hybrid'
  /** Current strategy phase. */
  phase: EngineRenderStrategyPhase
  /** Current pressure tier. */
  pressure: EngineFrameBudgetPressure
  /** Device capability tier. */
  capabilityTier: 'low' | 'mid' | 'high'
  /** Current degradation decision. */
  degradation: EngineDegradationDecision
}

/**
 * Describes qos controller output payload.
 */
export interface EngineQosControllerDecision {
  /** Effective budget selected for current frame. */
  budget: EngineFrameBudget
  /** Decision trace label for diagnostics. */
  trace: string
}

/**
 * Intent: map strategy phase into phase-profile budget key.
 * @param phase Strategy phase.
 * @returns Budget profile key.
 */
function resolveBudgetProfileKey(phase: EngineRenderStrategyPhase): keyof typeof DEFAULT_ENGINE_PHASE_BUDGET_PROFILES {
  if (phase === 'pan' || phase === 'zoom') {
    return 'interactive'
  }

  return phase
}

/**
 * Intent: apply pressure contraction against phase-profile base budget.
 * @param budget Base phase budget.
 * @param pressure Pressure tier.
 * @returns Contracted budget.
 */
function applyPressureToBudget(budget: EngineFrameBudget, pressure: EngineFrameBudgetPressure): EngineFrameBudget {
  if (pressure === 'low') {
    return budget
  }

  if (pressure === 'medium') {
    return {
      ...budget,
      drawSubmitBudgetMs: Math.max(8, budget.drawSubmitBudgetMs - 2),
      textureUploadBudgetBytes: Math.floor(budget.textureUploadBudgetBytes * 0.8),
      textureUploadTotalBudgetBytes: Math.floor(budget.textureUploadTotalBudgetBytes * 0.8),
      tilePreloadBudgetMs: Math.max(1, budget.tilePreloadBudgetMs - 1),
      tilePreloadMaxUploads: Math.max(1, budget.tilePreloadMaxUploads - 1),
    }
  }

  return {
    ...budget,
    drawSubmitBudgetMs: Math.max(8, budget.drawSubmitBudgetMs - 4),
    textureUploadBudgetBytes: Math.floor(budget.textureUploadBudgetBytes * 0.6),
    textureUploadTotalBudgetBytes: Math.floor(budget.textureUploadTotalBudgetBytes * 0.6),
    tilePreloadBudgetMs: Math.max(1, budget.tilePreloadBudgetMs - 2),
    tilePreloadMaxUploads: Math.max(1, budget.tilePreloadMaxUploads - 2),
  }
}

/**
 * Intent: resolve one qos budget decision for current frame.
 * @param input Qos input payload.
 * @returns Qos budget decision.
 */
export function resolveEngineQosControllerDecision(input: EngineQosControllerInput): EngineQosControllerDecision {
  const profileKey = resolveBudgetProfileKey(input.phase)
  const baseBudget = DEFAULT_ENGINE_PHASE_BUDGET_PROFILES[profileKey]
  const pressureBudget = applyPressureToBudget(baseBudget, input.pressure)

  const capabilityAdjustedBudget = input.capabilityTier === 'low'
    ? {
      ...pressureBudget,
      textureUploadBudgetBytes: Math.floor(pressureBudget.textureUploadBudgetBytes * 0.85),
      textureUploadTotalBudgetBytes: Math.floor(pressureBudget.textureUploadTotalBudgetBytes * 0.85),
    }
    : pressureBudget

  return {
    budget: capabilityAdjustedBudget,
    trace: [input.profile, input.phase, input.pressure, input.capabilityTier, input.degradation.level].join('|'),
  }
}
