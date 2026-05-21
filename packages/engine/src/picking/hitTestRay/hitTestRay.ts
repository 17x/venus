import type {
  EngineHitTestRayModule,
  EngineRay3D,
  EngineRayPickCandidate,
  EngineRayPickHit,
} from "./hitTestRay.contract";

/**
 * Creates ray hit-test module using axis-aligned slab intersection.
 */
export function createEngineHitTestRayModule(): EngineHitTestRayModule {
  return {
    hitTestRay: (ray, candidates) => resolveNearestRayHit(ray, candidates),
  };
}

/**
 * Resolves nearest hit candidate against one ray.
 * @param ray Ray origin and direction in world space.
 * @param candidates Candidate axis-aligned volumes.
 */
export function resolveNearestRayHit(
  ray: EngineRay3D,
  candidates: readonly EngineRayPickCandidate[],
): EngineRayPickHit | null {
  let nearest: EngineRayPickHit | null = null;

  for (const candidate of candidates) {
    const distance = resolveRayAabbDistance(ray, candidate);
    if (distance === null) {
      continue;
    }

    if (!nearest || distance < nearest.distance) {
      nearest = {
        id: candidate.id,
        distance,
      };
    }
  }

  return nearest;
}

/**
 * Resolves entry distance where one ray intersects one axis-aligned box.
 * @param ray Ray origin and direction in world space.
 * @param candidate Axis-aligned candidate volume.
 */
function resolveRayAabbDistance(
  ray: EngineRay3D,
  candidate: EngineRayPickCandidate,
): number | null {
  const x = resolveAxisIntersection(ray.originX, ray.directionX, candidate.minX, candidate.maxX);
  if (!x) {
    return null;
  }
  const y = resolveAxisIntersection(ray.originY, ray.directionY, candidate.minY, candidate.maxY);
  if (!y) {
    return null;
  }
  const z = resolveAxisIntersection(ray.originZ, ray.directionZ, candidate.minZ, candidate.maxZ);
  if (!z) {
    return null;
  }

  const entry = Math.max(x.entry, y.entry, z.entry);
  const exit = Math.min(x.exit, y.exit, z.exit);
  if (exit < 0 || entry > exit) {
    return null;
  }

  return Math.max(0, entry);
}

/**
 * Resolves entry/exit distances for one axis interval.
 * @param origin Ray origin for one axis.
 * @param direction Ray direction for one axis.
 * @param min Minimum interval boundary.
 * @param max Maximum interval boundary.
 */
function resolveAxisIntersection(
  origin: number,
  direction: number,
  min: number,
  max: number,
): { entry: number; exit: number } | null {
  if (direction === 0) {
    if (origin < min || origin > max) {
      return null;
    }
    return {
      entry: Number.NEGATIVE_INFINITY,
      exit: Number.POSITIVE_INFINITY,
    };
  }

  const inv = 1 / direction;
  const t0 = (min - origin) * inv;
  const t1 = (max - origin) * inv;
  return {
    entry: Math.min(t0, t1),
    exit: Math.max(t0, t1),
  };
}
