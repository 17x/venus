import type {
  EngineHitTestRayModule,
  EngineRay3D,
  EngineRayPickCandidate,
  EngineRayPickHit,
  EngineRayTriangle,
} from "./hitTestRay.contract";

/**
 * Creates ray hit-test module using axis-aligned slab intersection
 * with optional triangle-level refinement via Möller–Trumbore.
 */
export function createEngineHitTestRayModule(): EngineHitTestRayModule {
  return {
    hitTestRay: (ray, candidates) => resolveNearestRayHit(ray, candidates),
  };
}

/**
 * Resolves nearest hit candidate against one ray.
 * Prefers triangle-level intersection when candidate carries triangles;
 * falls back to AABB slab intersection otherwise.
 * @param ray Ray origin and direction in world space.
 * @param candidates Candidate axis-aligned volumes, optionally with triangle lists.
 */
export function resolveNearestRayHit(
  ray: EngineRay3D,
  candidates: readonly EngineRayPickCandidate[],
): EngineRayPickHit | null {
  let nearest: EngineRayPickHit | null = null;

  for (const candidate of candidates) {
    let distance: number | null = null;

    // When triangle data is available, use per-triangle Möller–Trumbore intersection
    // for sub-AABB accuracy; otherwise fall back to slab intersection.
    if (candidate.triangles && candidate.triangles.length > 0) {
      distance = resolveRayTrianglesDistance(ray, candidate.triangles);
    } else {
      distance = resolveRayAabbDistance(ray, candidate);
    }

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
 * Resolves nearest triangle intersection distance for one ray against a triangle list.
 * Uses the Möller–Trumbore algorithm for fast ray-triangle intersection.
 * @param ray Ray origin and direction in world space.
 * @param triangles Triangle list to test against.
 */
function resolveRayTrianglesDistance(
  ray: EngineRay3D,
  triangles: readonly EngineRayTriangle[],
): number | null {
  let nearest: number | null = null;

  for (const tri of triangles) {
    const dist = resolveRayTriangleDistance(ray, tri);
    if (dist !== null && (nearest === null || dist < nearest)) {
      nearest = dist;
    }
  }

  return nearest;
}

/**
 * Möller–Trumbore ray-triangle intersection.
 * Returns the distance from ray origin to intersection point, or null on miss.
 * @param ray Ray origin and direction in world space.
 * @param tri Triangle with counter-clockwise winding.
 */
function resolveRayTriangleDistance(
  ray: EngineRay3D,
  tri: EngineRayTriangle,
): number | null {
  const EPSILON = 1e-12;

  // Edge vectors.
  const e1x = tri.v1x - tri.v0x;
  const e1y = tri.v1y - tri.v0y;
  const e1z = tri.v1z - tri.v0z;

  const e2x = tri.v2x - tri.v0x;
  const e2y = tri.v2y - tri.v0y;
  const e2z = tri.v2z - tri.v0z;

  // Cross product of ray direction and edge2.
  const hx = ray.directionY * e2z - ray.directionZ * e2y;
  const hy = ray.directionZ * e2x - ray.directionX * e2z;
  const hz = ray.directionX * e2y - ray.directionY * e2x;

  // Determinant (dot of edge1 and h).
  const det = e1x * hx + e1y * hy + e1z * hz;

  // Ray parallel to triangle plane.
  if (Math.abs(det) < EPSILON) {
    return null;
  }

  const invDet = 1 / det;

  // Vector from v0 to ray origin.
  const sx = ray.originX - tri.v0x;
  const sy = ray.originY - tri.v0y;
  const sz = ray.originZ - tri.v0z;

  // Barycentric coordinate u.
  const u = (sx * hx + sy * hy + sz * hz) * invDet;
  if (u < 0 || u > 1) {
    return null;
  }

  // Cross product of s and edge1.
  const qx = sy * e1z - sz * e1y;
  const qy = sz * e1x - sx * e1z;
  const qz = sx * e1y - sy * e1x;

  // Barycentric coordinate v.
  const v = (ray.directionX * qx + ray.directionY * qy + ray.directionZ * qz) * invDet;
  if (v < 0 || u + v > 1) {
    return null;
  }

  // Intersection distance t.
  const t = (e2x * qx + e2y * qy + e2z * qz) * invDet;
  if (t < 0) {
    return null;
  }

  return t;
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
