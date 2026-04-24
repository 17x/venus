import type { EngineHitTestResult } from './hitTest.ts'
import type { EnginePoint, EngineSceneSnapshot } from './types.ts'

export interface EngineHitPlan {
  revision: string | number
  planVersion: number
  point: EnginePoint
  tolerance: number
  candidateNodeIds: readonly string[]
  candidateCount: number
  hitCount: number
  exactCheckCount: number
  primaryHitNodeId: string | null
}

export interface PrepareEngineHitPlanOptions {
  scene: EngineSceneSnapshot
  point: EnginePoint
  tolerance?: number
  queryPointCandidates: (point: EnginePoint, tolerance?: number) => string[]
  hitTestAll?: (point: EnginePoint, tolerance?: number) => EngineHitTestResult[]
  hits?: readonly EngineHitTestResult[]
  exactCheckCount?: number
}

// Keep hit-plan construction read-only so shortlist diagnostics can evolve
// before the actual hit-test pipeline is refactored to consume the same plan.
export function prepareEngineHitPlan(
  options: PrepareEngineHitPlanOptions,
): EngineHitPlan {
  const tolerance = Math.max(0, options.tolerance ?? 0)
  const candidateNodeIds = options.queryPointCandidates(options.point, tolerance)
  const hits = options.hits
    ? [...options.hits]
    : options.hitTestAll
      ? options.hitTestAll(options.point, tolerance)
      : []

  return {
    revision: options.scene.revision,
    planVersion: options.scene.metadata?.planVersion ?? 0,
    point: options.point,
    tolerance,
    candidateNodeIds,
    candidateCount: candidateNodeIds.length,
    hitCount: hits.length,
    exactCheckCount: Math.max(0, options.exactCheckCount ?? 0),
    primaryHitNodeId: hits[0]?.nodeId ?? null,
  }
}