import type { EngineRay3 } from '../../math/dimension/types.ts'
import type { EnginePoint } from '../types/types.ts'
import type {
  EngineHitExecutionSummary,
  EngineHitTestResult,
} from '../hitTest/hitTest.ts'

/**
 * Declares supported hit-query modes for staged 2D/3D runtime hit routing.
 */
export type EngineHitQueryMode = 'point-2d' | 'ray-3d'

/**
 * Declares resolver-side selection policy labels for hit ordering diagnostics.
 */
export type EngineHitSelectionPolicy =
  | 'paint-order-2d'
  | 'depth-first-ray'

/**
 * Declares 3D ray target classes for native mesh/instance hit diagnostics.
 */
export type EngineRayHitTargetKind = 'shape' | 'mesh' | 'instance'

/**
 * Declares one 2D point-hit query payload.
 */
export interface EnginePointHitQuery {
  /** Query mode discriminant used by resolver narrowing. */
  mode: 'point-2d'
  /** Point in world/canvas-aligned 2D space. */
  point: EnginePoint
  /** Optional tolerance radius in world units. */
  tolerance?: number
}

/**
 * Declares one 3D ray-hit query payload.
 */
export interface EngineRayHitQuery {
  /** Query mode discriminant used by resolver narrowing. */
  mode: 'ray-3d'
  /** Ray payload in world space. */
  ray: EngineRay3
  /** Optional max distance for ray intersection acceptance. */
  maxDistance?: number
}

/**
 * Declares shared hit-query union consumed by hit resolver.
 */
export type EngineHitQuery =
  | EnginePointHitQuery
  | EngineRayHitQuery

/**
 * Declares resolver callbacks for 2D and 3D hit execution paths.
 */
export interface EngineHitResolverOptions {
  /** Executes exact/coarse 2D hit traversal and returns detailed summary. */
  resolvePointHits(query: EnginePointHitQuery): EngineHitExecutionSummary
  /**
   * Optional native 3D ray-hit resolver callback.
   * Accepts either a compact hit list or a full summary with ray-budget diagnostics.
   */
  resolveRayHits?: (query: EngineRayHitQuery) => EngineRayHitResolutionResult
}

/**
 * Declares one detailed native 3D ray-hit resolution summary payload.
 */
export interface EngineRayHitResolutionSummary {
  /** Ordered hit list resolved by native 3D ray traversal. */
  hits: EngineHitTestResult[]
  /** Optional exact-check count observed by native traversal. */
  exactCheckCount?: number
  /** Optional exact-check budget used by native traversal. */
  exactCheckBudget?: number
  /** Optional marker emitted when native traversal budget was exhausted. */
  exactBudgetExceeded?: boolean
}

/**
 * Declares supported return payload shapes for native 3D ray-hit callbacks.
 */
export type EngineRayHitResolutionResult = EngineHitTestResult[] | EngineRayHitResolutionSummary

/**
 * Declares hit resolution-path labels used by diagnostics and migration audits.
 */
export type EngineHitResolutionPath =
  | 'point-2d'
  | 'ray-native-3d'
  | 'ray-fallback-plane-projection'
  | 'ray-fallback-plane-miss'

/**
 * Declares ray miss classification labels used by 3D hit diagnostics.
 */
export type EngineRayMissClass =
  | 'none'
  | 'ray-parallel-scene-plane'
  | 'ray-away-from-scene-plane'
  | 'ray-max-distance-exceeded'
  | 'ray-fallback-projected-point-no-hit'
  | 'ray-native-no-hit'

/**
 * Declares one resolved hit-set snapshot shared across runtime hit consumers.
 */
export interface EngineResolvedHitSet {
  /** Query mode used to resolve this hit set. */
  mode: EngineHitQueryMode
  /** Ordered hit list for this query. */
  hits: EngineHitTestResult[]
  /** First/primary hit convenience field. */
  primaryHit: EngineHitTestResult | null
  /** Exact-check count observed for this query. */
  exactCheckCount: number
  /** Exact-check budget used while resolving this query. */
  exactCheckBudget: number
  /** Whether exact traversal hit the configured budget cap. */
  exactBudgetExceeded: boolean
  /** Concrete resolver path used to produce this hit-set payload. */
  resolutionPath: EngineHitResolutionPath
  /** Selection policy used to order this hit set and choose the primary hit. */
  selectionPolicy: EngineHitSelectionPolicy
  /** Ray-specific miss class for diagnostics (point path always reports none). */
  rayMissClass: EngineRayMissClass
  /** Primary hit target kind for native 3D mesh/instance diagnostics. */
  primaryHitTargetKind: EngineRayHitTargetKind | 'none'
}
