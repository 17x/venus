/**
 * 3D ray contract used by staged ray picking module.
 */
export interface EngineRay3D {
  /** Ray origin x in world space. */
  originX: number;
  /** Ray origin y in world space. */
  originY: number;
  /** Ray origin z in world space. */
  originZ: number;
  /** Ray direction x in world space. */
  directionX: number;
  /** Ray direction y in world space. */
  directionY: number;
  /** Ray direction z in world space. */
  directionZ: number;
}

/**
 * Declares one triangle for ray-triangle intersection testing.
 * Vertices are in counter-clockwise winding order.
 */
export interface EngineRayTriangle {
  /** First vertex x coordinate. */
  v0x: number;
  /** First vertex y coordinate. */
  v0y: number;
  /** First vertex z coordinate. */
  v0z: number;
  /** Second vertex x coordinate. */
  v1x: number;
  /** Second vertex y coordinate. */
  v1y: number;
  /** Second vertex z coordinate. */
  v1z: number;
  /** Third vertex x coordinate. */
  v2x: number;
  /** Third vertex y coordinate. */
  v2y: number;
  /** Third vertex z coordinate. */
  v2z: number;
}

/**
 * Axis-aligned candidate volume consumed by ray picking.
 */
export interface EngineRayPickCandidate {
  /** Stable candidate id returned on hit. */
  id: string;
  /** Minimum x boundary. */
  minX: number;
  /** Maximum x boundary. */
  maxX: number;
  /** Minimum y boundary. */
  minY: number;
  /** Maximum y boundary. */
  maxY: number;
  /** Minimum z boundary. */
  minZ: number;
  /** Maximum z boundary. */
  maxZ: number;
  /** Optional triangle list for per-triangle ray intersection. When provided, triangle-level
   * intersection is used in preference to the AABB slab test for this candidate. */
  triangles?: readonly EngineRayTriangle[];
}

/**
 * Ray hit payload returned by staged ray picking.
 */
export interface EngineRayPickHit {
  /** Hit candidate id. */
  id: string;
  /** Distance from origin along ray direction where hit occurs. */
  distance: number;
}

/**
 * Contract for ray picking module.
 */
export interface EngineHitTestRayModule {
  /**
   * Resolves nearest hit candidate against one ray and candidate list.
   */
  hitTestRay: (
    ray: EngineRay3D,
    candidates: readonly EngineRayPickCandidate[],
  ) => EngineRayPickHit | null;
}
