// Module responsibility: normalize legacy strategy aliases to one canonical set.
// Non-responsibility: computing strategy phase transitions.

import type { EngineRenderStrategyPhase } from '../createEngine/strategy/strategy.ts'

/**
 * Describes one strategy convergence result for diagnostics and migration checks.
 */
export interface EngineStrategyConvergenceResult {
  /** Canonical phase after alias normalization. */
  phase: EngineRenderStrategyPhase
  /** Whether one legacy alias mapping was applied. */
  legacyAliasApplied: boolean
}

/**
 * Intent: converge legacy strategy phase aliases to canonical phase set.
 * @param phaseLike Raw phase string from diagnostics/replay source.
 * @returns Canonical convergence result.
 */
export function resolveEngineStrategyConvergence(phaseLike: string): EngineStrategyConvergenceResult {
  if (phaseLike === 'interactive-pan') {
    return {
      phase: 'pan',
      legacyAliasApplied: true,
    }
  }

  if (phaseLike === 'interactive-zoom') {
    return {
      phase: 'zoom',
      legacyAliasApplied: true,
    }
  }

  if (phaseLike === 'idle') {
    return {
      phase: 'static',
      legacyAliasApplied: true,
    }
  }

  if (
    phaseLike === 'pan' ||
    phaseLike === 'zoom' ||
    phaseLike === 'settling' ||
    phaseLike === 'static' ||
    phaseLike === 'camera'
  ) {
    return {
      phase: phaseLike,
      legacyAliasApplied: false,
    }
  }

  return {
    phase: 'static',
    legacyAliasApplied: true,
  }
}
