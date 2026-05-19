// Module responsibility: derive visibility LOD diagnostics from existing frame-plan snapshots.
// Non-responsibility: mutating render plans or selecting renderer draw paths.

import type { EngineFramePlan } from '../../scene/framePlan.ts'
import {
  resolveEngineVisibilityLodPlan,
  type EngineVisibilityLodPlan,
  type EngineVisibilityLodPressure,
} from '../../visibility/index.ts'
import type { EngineFrameBudgetPressure } from './frameBudgetBroker/frameBudgetBroker.ts'

const DEFAULT_FULL_DETAIL_RANK_DISTANCE = 24
const DEFAULT_REDUCED_DETAIL_RANK_DISTANCE = 96
const DEFAULT_PROXY_PROJECTED_AREA = 16

/**
 * Intent: resolve a diagnostics-only visibility LOD plan from the latest frame plan.
 * @param framePlan Latest viewport frame plan snapshot.
 * @param pressure Latest runtime budget pressure.
 * @returns Visibility LOD plan used by diagnostics dashboards.
 */
export function resolveCreateEngineVisibilityLodDiagnostics(
  framePlan: EngineFramePlan | null,
  pressure: EngineFrameBudgetPressure,
): EngineVisibilityLodPlan {
  if (!framePlan || framePlan.candidateCount === 0) {
    return {
      entries: [],
      fullCount: 0,
      reducedCount: 0,
      proxyCount: 0,
      culledCount: 0,
    }
  }

  const viewportArea = Math.max(0, framePlan.viewportBounds.width * framePlan.viewportBounds.height)
  const projectedAreaPerCandidate = viewportArea / Math.max(1, framePlan.candidateCount)
  return resolveEngineVisibilityLodPlan({
    candidates: framePlan.candidateNodeIds.map((nodeId, index) => ({
      nodeId,
      // Frame-plan candidate order is already visibility-prioritized by the
      // active spatial/visibility resolver; rank distance keeps diagnostics
      // stable until true camera-space distance is available in the frame plan.
      distanceToCamera: index + 1,
      projectedScreenArea: projectedAreaPerCandidate,
    })),
    thresholds: {
      fullDistance: DEFAULT_FULL_DETAIL_RANK_DISTANCE,
      reducedDistance: DEFAULT_REDUCED_DETAIL_RANK_DISTANCE,
      proxyArea: DEFAULT_PROXY_PROJECTED_AREA,
    },
    pressure: resolveVisibilityLodPressure(pressure),
  })
}

/**
 * Intent: map runtime budget pressure into visibility LOD pressure tiers.
 * @param pressure Latest runtime budget pressure.
 * @returns Visibility LOD pressure tier.
 */
function resolveVisibilityLodPressure(pressure: EngineFrameBudgetPressure): EngineVisibilityLodPressure {
  if (pressure === 'high') {
    return 'high'
  }

  if (pressure === 'medium') {
    return 'medium'
  }

  return 'low'
}
