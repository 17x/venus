// Module responsibility: expose a diagnostics-only bridge from coarse frame plans to occlusion planning counters.
// Non-responsibility: applying true runtime occlusion culling or replacing camera-projected visibility.

import type { EngineFramePlan } from '../../scene/framePlan.ts'
import {
  resolveEngineVisibilityOcclusionPlan,
} from '../../visibility/index.ts'

/**
 * Declares runtime diagnostics for the staged hierarchical occlusion planner bridge.
 */
export interface EngineCreateVisibilityOcclusionDiagnostics {
  /** Proxy mode used to derive occlusion diagnostics from available runtime data. */
  mode: 'unavailable' | 'rank-proxy'
  /** Number of frame-plan candidates submitted to the occlusion diagnostics bridge. */
  candidateCount: number
  /** Number of candidates reported visible by the diagnostics occlusion plan. */
  visibleCount: number
  /** Number of candidates reported occluded by the diagnostics occlusion plan. */
  occludedCount: number
}

const DEFAULT_COVERAGE_RATIO = 0.95
const DEFAULT_MIN_OCCLUDER_AREA = 1
const DEFAULT_DEPTH_EPSILON = 0.01

/**
 * Intent: derive a diagnostics-only hierarchical occlusion summary from the latest coarse frame plan.
 * @param framePlan Latest viewport frame plan snapshot.
 * @returns Occlusion diagnostics summary for runtime dashboards.
 */
export function resolveCreateEngineVisibilityOcclusionDiagnostics(
  framePlan: EngineFramePlan | null,
): EngineCreateVisibilityOcclusionDiagnostics {
  if (!framePlan || framePlan.candidateCount === 0) {
    return {
      mode: 'unavailable',
      candidateCount: 0,
      visibleCount: 0,
      occludedCount: 0,
    }
  }

  // AI-TEMP: frame plans do not yet carry true projected bounds/depth; remove when B2 camera-projected
  // visibility candidates are stored in EngineFramePlan; ref engine-lifecycle-render-audit-and-3d-roadmap-2026-05-18.md.
  const proxyBounds = {
    x: 0,
    y: 0,
    width: Math.max(0, framePlan.viewportBounds.width),
    height: Math.max(0, framePlan.viewportBounds.height),
  }
  const plan = resolveEngineVisibilityOcclusionPlan({
    candidates: framePlan.candidateNodeIds.map((nodeId, index) => ({
      nodeId,
      screenBounds: proxyBounds,
      depth: index + 1,
      occluder: index === 0,
    })),
    thresholds: {
      coverageRatio: DEFAULT_COVERAGE_RATIO,
      minOccluderArea: DEFAULT_MIN_OCCLUDER_AREA,
      depthEpsilon: DEFAULT_DEPTH_EPSILON,
    },
  })

  return {
    mode: 'rank-proxy',
    candidateCount: framePlan.candidateCount,
    visibleCount: plan.visibleCount,
    occludedCount: plan.occludedCount,
  }
}
