// Module responsibility: define preview/resolve pass transition contract.
// Non-responsibility: drawing pass execution.

import type { EngineRenderStrategyPhase } from '../../runtime/createEngine/strategy/strategy.ts'

/**
 * Describes progressive pass name.
 */
export type EngineProgressivePass = 'preview' | 'resolve'

/**
 * Describes progressive rendering decision input payload.
 */
export interface EngineProgressiveRenderingInput {
  /** Strategy phase associated with current frame. */
  phase: EngineRenderStrategyPhase
  /** Whether interaction is still active in this frame. */
  interactionActive: boolean
  /** Whether settle sharpness contract is pending. */
  settleSharpnessPending: boolean
}

/**
 * Intent: resolve current progressive pass from strategy and settle state.
 * @param input Progressive rendering input payload.
 * @returns Progressive pass name.
 */
export function resolveEngineProgressivePass(input: EngineProgressiveRenderingInput): EngineProgressivePass {
  if (input.interactionActive || input.phase === 'pan' || input.phase === 'zoom' || input.phase === 'camera') {
    return 'preview'
  }

  if (input.settleSharpnessPending || input.phase === 'settling') {
    return 'preview'
  }

  return 'resolve'
}
