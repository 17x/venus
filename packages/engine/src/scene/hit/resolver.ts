import type { EnginePoint } from '../types/types.ts'
import type {
  EngineHitResolverOptions,
  EngineHitQuery,
  EnginePointHitQuery,
  EngineRayHitQuery,
  EngineResolvedHitSet,
} from './contracts.ts'

/**
 * Declares one shared hit resolver surface for 2D/3D query dispatch.
 */
export interface EngineHitResolver {
  /**
   * Resolves one hit-set snapshot from a 2D point query or 3D ray query.
   * @param query Hit query payload.
   */
  resolve(query: EngineHitQuery): EngineResolvedHitSet
}

const RAY_SCENE_PLANE_Z = 0
const RAY_DIRECTION_EPSILON = 1e-8

/**
 * Creates one hit resolver that dispatches between 2D and 3D hit query paths.
 * @param options Resolver callbacks.
 */
export function createEngineHitResolver(
  options: EngineHitResolverOptions,
): EngineHitResolver {
  /**
   * Resolves one hit-set snapshot from a 2D point query or 3D ray query.
   * @param query Hit query payload.
   */
  const resolve = (query: EngineHitQuery): EngineResolvedHitSet => {
    if (query.mode === 'point-2d') {
      const summary = options.resolvePointHits(query)
      const hits = summary.hits.slice()
      return {
        mode: 'point-2d',
        hits,
        primaryHit: hits[0] ?? null,
        exactCheckCount: summary.exactCheckCount,
        exactCheckBudget: summary.exactCheckBudget,
        exactBudgetExceeded: summary.exactBudgetExceeded,
      }
    }

    const rayHits = resolveRayHitsWithCompatibilityFallback(query, options)
    return {
      mode: 'ray-3d',
      hits: rayHits,
      primaryHit: rayHits[0] ?? null,
      // Ray fallback currently reuses point-hit execution semantics.
      exactCheckCount: rayHits.length,
      exactCheckBudget: Number.POSITIVE_INFINITY,
      exactBudgetExceeded: false,
    }
  }

  return {
    resolve,
  }
}

/**
 * Resolves ray hits through native callback or conservative compatibility fallback.
 * @param query Ray-hit query payload.
 * @param options Resolver callbacks.
 */
function resolveRayHitsWithCompatibilityFallback(
  query: EngineRayHitQuery,
  options: EngineHitResolverOptions,
) {
  if (options.resolveRayHits) {
    return options.resolveRayHits(query)
  }

  const originPoint = resolveRayProjectedPointOnScenePlane(query)
  if (!originPoint) {
    return []
  }

  // Compatibility bridge: project 3D ray on the canonical scene plane so the
  // existing point hit pipeline can still resolve deterministic picks.
  const fallbackSummary = options.resolvePointHits({
    mode: 'point-2d',
    point: originPoint,
    tolerance: 0,
  })
  return fallbackSummary.hits.slice()
}

/**
 * Converts a point hit query into a shared point-hit query shape.
 * @param point Point payload.
 * @param tolerance Optional tolerance radius.
 */
export function createEnginePointHitQuery(
  point: EnginePoint,
  tolerance = 0,
): EnginePointHitQuery {
  return {
    mode: 'point-2d',
    point,
    tolerance,
  }
}

/**
 * Resolves one projected 2D point where the ray intersects scene plane z=0.
 * @param query Ray-hit query payload.
 */
function resolveRayProjectedPointOnScenePlane(
  query: EngineRayHitQuery,
): EnginePoint | null {
  const { origin, direction } = query.ray
  if (Math.abs(direction.z) <= RAY_DIRECTION_EPSILON) {
    return null
  }

  const distance = (RAY_SCENE_PLANE_Z - origin.z) / direction.z
  if (distance < 0) {
    return null
  }

  if (typeof query.maxDistance === 'number' && Number.isFinite(query.maxDistance)) {
    if (distance > Math.max(0, query.maxDistance)) {
      return null
    }
  }

  return {
    x: origin.x + direction.x * distance,
    y: origin.y + direction.y * distance,
  }
}
