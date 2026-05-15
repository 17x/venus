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
  /** Optional native 3D ray-hit resolver callback. */
  resolveRayHits?: (query: EngineRayHitQuery) => EngineHitTestResult[]
}

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
}
