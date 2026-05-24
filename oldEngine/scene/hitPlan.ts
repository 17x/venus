import type { EngineHitTestResult } from './hitTest/hitTest.ts'
import type { EngineHitResolutionPath, EngineHitSelectionPolicy, EngineRayMissClass } from './hit/contracts.ts'
import type { EnginePoint, EngineSceneSnapshot } from './types/types.ts'

export interface EngineHitPlan {
  revision: string | number
  planVersion: number
  point: EnginePoint
  tolerance: number
  candidateNodeIds: readonly string[]
  candidateCount: number
  hitCount: number
  exactCheckCount: number
  // Maximum exact checks allowed for this hit execution.
  exactCheckBudget: number
  // Whether exact-hit traversal stopped due to budget exhaustion.
  exactBudgetExceeded: boolean
  // Concrete resolver path used by the originating hit execution.
  resolutionPath: EngineHitResolutionPath
  // Ordering policy used to choose the primary hit.
  selectionPolicy: EngineHitSelectionPolicy
  // Ray miss class emitted by resolver diagnostics (point hits report none).
  rayMissClass: EngineRayMissClass
  // Primary hit target kind emitted by native 3D ray diagnostics.
  primaryHitTargetKind: 'shape' | 'mesh' | 'instance' | 'none'
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
  // Optional exact-check cap used by the originating hit execution.
  exactCheckBudget?: number
  // Optional marker emitted when exact-check cap was reached.
  exactBudgetExceeded?: boolean
  // Optional resolver-path marker emitted by the hit resolver.
  resolutionPath?: EngineHitResolutionPath
  // Optional selection-policy marker emitted by the hit resolver.
  selectionPolicy?: EngineHitSelectionPolicy
  // Optional ray miss classification emitted by the hit resolver.
  rayMissClass?: EngineRayMissClass
  // Optional primary target kind emitted by the hit resolver.
  primaryHitTargetKind?: EngineHitPlan['primaryHitTargetKind']
}

// Keep hit-plan construction read-only so shortlist diagnostics can evolve
// before the actual hit-test pipeline is refactored to consume the same plan.
/**
 * Handles prepareEngineHitPlan.
 * @param options Options object for this operation.
 */
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
    exactCheckBudget: Math.max(0, options.exactCheckBudget ?? Number.POSITIVE_INFINITY),
    exactBudgetExceeded: options.exactBudgetExceeded ?? false,
    resolutionPath: options.resolutionPath ?? 'point-2d',
    selectionPolicy: options.selectionPolicy ?? 'paint-order-2d',
    rayMissClass: options.rayMissClass ?? 'none',
    primaryHitTargetKind: options.primaryHitTargetKind ?? resolvePrimaryHitTargetKind(hits[0] ?? null),
    primaryHitNodeId: hits[0]?.nodeId ?? null,
  }
}

/**
 * Resolves a hit-plan target kind from the primary hit result.
 * @param hit Primary hit candidate.
 */
function resolvePrimaryHitTargetKind(
  hit: EngineHitTestResult | null,
): EngineHitPlan['primaryHitTargetKind'] {
  if (!hit) {
    return 'none'
  }

  return hit.hitTargetKind ?? 'shape'
}
