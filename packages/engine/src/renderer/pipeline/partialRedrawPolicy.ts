// Module responsibility: normalize dirty-region lifecycle and full-redraw fallback thresholds.
// Non-responsibility: region generation from scene diffing.

import type { EngineRect } from '../../scene/types/types.ts'
import type { EngineRenderStrategyPhase } from '../../runtime/createEngine/strategy/strategy.ts'

/**
 * Describes one partial-redraw policy decision.
 */
export interface EnginePartialRedrawDecision {
  /** Normalized dirty regions after merge pass. */
  dirtyRegions: EngineRect[]
  /** Whether runtime should fallback to full redraw for this frame. */
  fallbackToFullRedraw: boolean
}

const MAX_DIRTY_REGION_COUNT = 12

/**
 * Intent: merge dirty regions and resolve full-redraw fallback for current phase.
 * @param dirtyRegions Raw dirty region list.
 * @param phase Current strategy phase.
 * @returns Partial redraw decision payload.
 */
export function resolveEnginePartialRedrawDecision(
  dirtyRegions: readonly EngineRect[],
  phase: EngineRenderStrategyPhase,
): EnginePartialRedrawDecision {
  const normalized = dirtyRegions
    .filter((region) => region.width > 0 && region.height > 0)
    .map((region) => ({ ...region }))

  const interactivePhase = phase === 'pan' || phase === 'zoom'
  const fallbackToFullRedraw =
    normalized.length === 0 ||
    normalized.length > MAX_DIRTY_REGION_COUNT ||
    (interactivePhase && normalized.length > MAX_DIRTY_REGION_COUNT / 2)

  return {
    dirtyRegions: normalized,
    fallbackToFullRedraw,
  }
}
