import type { EnginePoint } from '../types/types.ts'
import type {
  EngineRayHitResolutionResult,
  EngineRayMissClass,
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
        resolutionPath: 'point-2d',
        selectionPolicy: 'paint-order-2d',
        rayMissClass: 'none',
        primaryHitTargetKind: resolvePrimaryHitTargetKind(hits[0] ?? null),
      }
    }

    const {
      hits: rayHits,
      resolutionPath,
      exactCheckCount,
      exactCheckBudget,
      exactBudgetExceeded,
      rayMissClass,
    } = resolveRayHitsWithCompatibilityFallback(query, options)
    return {
      mode: 'ray-3d',
      hits: rayHits,
      primaryHit: rayHits[0] ?? null,
      exactCheckCount,
      exactCheckBudget,
      exactBudgetExceeded,
      resolutionPath,
      selectionPolicy: 'depth-first-ray',
      rayMissClass,
      primaryHitTargetKind: resolvePrimaryHitTargetKind(rayHits[0] ?? null),
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
): Pick<EngineResolvedHitSet, 'hits' | 'resolutionPath' | 'exactCheckCount' | 'exactCheckBudget' | 'exactBudgetExceeded' | 'rayMissClass'> {
  if (options.resolveRayHits) {
    const nativeSummary = normalizeNativeRayResolutionSummary(options.resolveRayHits(query))
    const nativeOrderedHits = orderRayHitsByDepthPriority(nativeSummary.hits)
    const nativeRayMissClass: EngineRayMissClass = nativeSummary.hits.length > 0
      ? 'none'
      : 'ray-native-no-hit'
    return {
      hits: nativeOrderedHits,
      resolutionPath: 'ray-native-3d',
      exactCheckCount: nativeSummary.exactCheckCount,
      exactCheckBudget: nativeSummary.exactCheckBudget,
      exactBudgetExceeded: nativeSummary.exactBudgetExceeded,
      rayMissClass: nativeRayMissClass,
    }
  }

  const {point: originPoint, missClass} = resolveRayProjectedPointOnScenePlane(query)
  if (!originPoint) {
    return {
      hits: [],
      resolutionPath: 'ray-fallback-plane-miss',
      exactCheckCount: 0,
      exactCheckBudget: 0,
      exactBudgetExceeded: false,
      rayMissClass: missClass,
    }
  }

  // Compatibility bridge: project 3D ray on the canonical scene plane so the
  // existing point hit pipeline can still resolve deterministic picks.
  const fallbackSummary = options.resolvePointHits({
    mode: 'point-2d',
    point: originPoint,
    tolerance: 0,
  })
  const fallbackOrderedHits = orderRayHitsByDepthPriority(fallbackSummary.hits)
  const fallbackRayMissClass: EngineRayMissClass = fallbackSummary.hits.length > 0
    ? 'none'
    : 'ray-fallback-projected-point-no-hit'
  return {
    hits: fallbackOrderedHits,
    resolutionPath: 'ray-fallback-plane-projection',
    exactCheckCount: fallbackSummary.exactCheckCount,
    exactCheckBudget: fallbackSummary.exactCheckBudget,
    exactBudgetExceeded: fallbackSummary.exactBudgetExceeded,
    rayMissClass: fallbackRayMissClass,
  }
}

/**
 * Normalizes native 3D ray-hit callback output into one summary payload shape.
 * @param result Native 3D ray-hit callback result payload.
 */
function normalizeNativeRayResolutionSummary(
  result: EngineRayHitResolutionResult,
): Required<EngineRayHitResolutionSummaryLike> {
  if (Array.isArray(result)) {
    return {
      hits: result.slice(),
      exactCheckCount: result.length,
      exactCheckBudget: Number.POSITIVE_INFINITY,
      exactBudgetExceeded: false,
    }
  }

  return {
    hits: result.hits.slice(),
    exactCheckCount: Math.max(0, result.exactCheckCount ?? result.hits.length),
    exactCheckBudget: Math.max(0, result.exactCheckBudget ?? Number.POSITIVE_INFINITY),
    exactBudgetExceeded: result.exactBudgetExceeded ?? false,
  }
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
): {point: EnginePoint | null; missClass: EngineRayMissClass} {
  const { origin, direction } = query.ray
  if (Math.abs(direction.z) <= RAY_DIRECTION_EPSILON) {
    return {
      point: null,
      missClass: 'ray-parallel-scene-plane',
    }
  }

  const distance = (RAY_SCENE_PLANE_Z - origin.z) / direction.z
  if (distance < 0) {
    return {
      point: null,
      missClass: 'ray-away-from-scene-plane',
    }
  }

  if (typeof query.maxDistance === 'number' && Number.isFinite(query.maxDistance)) {
    if (distance > Math.max(0, query.maxDistance)) {
      return {
        point: null,
        missClass: 'ray-max-distance-exceeded',
      }
    }
  }

  return {
    point: {
      x: origin.x + direction.x * distance,
      y: origin.y + direction.y * distance,
    },
    missClass: 'none',
  }
}

/**
 * Describes one normalized native ray summary shape with required fields.
 */
interface EngineRayHitResolutionSummaryLike {
  hits: EngineResolvedHitSet['hits']
  exactCheckCount: number
  exactCheckBudget: number
  exactBudgetExceeded: boolean
}

/**
 * Applies one depth-first ordering policy to ray hits before primary-hit selection.
 * @param hits Ray-hit list collected by native or compatibility resolver paths.
 */
function orderRayHitsByDepthPriority(
  hits: EngineResolvedHitSet['hits'],
): EngineResolvedHitSet['hits'] {
  return hits
    .slice()
    .sort((left, right) => {
      const leftRayDistance = resolveComparableRayDistance(left.rayDistance)
      const rightRayDistance = resolveComparableRayDistance(right.rayDistance)
      if (leftRayDistance !== rightRayDistance) {
        return leftRayDistance - rightRayDistance
      }

      if (right.zOrder !== left.zOrder) {
        return right.zOrder - left.zOrder
      }
      if (right.score !== left.score) {
        return right.score - left.score
      }
      return left.index - right.index
    })
}

/**
 * Resolves a comparable ray distance where missing distances sort after explicit depths.
 * @param rayDistance Candidate ray distance.
 */
function resolveComparableRayDistance(rayDistance: number | undefined): number {
  return typeof rayDistance === 'number' && Number.isFinite(rayDistance)
    ? Math.max(0, rayDistance)
    : Number.POSITIVE_INFINITY
}

/**
 * Resolves the primary target kind exposed by hit diagnostics.
 * @param hit Primary hit candidate.
 */
function resolvePrimaryHitTargetKind(
  hit: EngineResolvedHitSet['primaryHit'],
): EngineResolvedHitSet['primaryHitTargetKind'] {
  if (!hit) {
    return 'none'
  }

  return hit?.hitTargetKind ?? 'shape'
}
