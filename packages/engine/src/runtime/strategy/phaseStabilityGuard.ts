// Module responsibility: phase hysteresis and minimum dwell stabilization.
// Non-responsibility: deriving initial phase from interaction inputs.

import type { EngineRenderStrategyPhase } from '../createEngine/strategy/strategy.ts'

/**
 * Describes one phase stability state.
 */
export interface EnginePhaseStabilityState {
  /** Current stable phase. */
  phase: EngineRenderStrategyPhase
  /** Pending candidate phase while waiting dwell completion. */
  pendingPhase: EngineRenderStrategyPhase | null
  /** Number of consecutive frames observed for pending phase. */
  pendingFrames: number
}

/**
 * Describes phase stability guard config.
 */
export interface EnginePhaseStabilityConfig {
  /** Required consecutive frames before phase switch commits. */
  minDwellFrames: number
}

/**
 * Defines canonical phase stability config.
 */
export const DEFAULT_ENGINE_PHASE_STABILITY_CONFIG: EnginePhaseStabilityConfig = {
  minDwellFrames: 2,
}

/**
 * Intent: resolve stable phase using pending dwell-frame accumulation.
 * @param state Previous stability state.
 * @param nextPhase Next raw phase candidate.
 * @param config Stability config.
 * @returns Updated stability state.
 */
export function resolveEngineStablePhase(
  state: EnginePhaseStabilityState,
  nextPhase: EngineRenderStrategyPhase,
  config: EnginePhaseStabilityConfig = DEFAULT_ENGINE_PHASE_STABILITY_CONFIG,
): EnginePhaseStabilityState {
  if (nextPhase === state.phase) {
    return {
      phase: state.phase,
      pendingPhase: null,
      pendingFrames: 0,
    }
  }

  if (state.pendingPhase !== nextPhase) {
    return {
      ...state,
      pendingPhase: nextPhase,
      pendingFrames: 1,
    }
  }

  const pendingFrames = state.pendingFrames + 1
  if (pendingFrames < config.minDwellFrames) {
    return {
      ...state,
      pendingFrames,
    }
  }

  return {
    phase: nextPhase,
    pendingPhase: null,
    pendingFrames: 0,
  }
}
