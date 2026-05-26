import type { EngineCameraFrustum } from "../../interaction/camera/cameraFrustum";

/**
 * Spatial query node input containing coarse 2D bounds.
 */
export interface EngineSpatialQueryNode {
  /** Stable node id returned in query results. */
  id: string;
  /** Node left coordinate in world space. */
  x: number;
  /** Node top coordinate in world space. */
  y: number;
  /** Node width in world space. */
  width: number;
  /** Node height in world space. */
  height: number;
  /** Optional node depth-min coordinate in world space for 3D frustum queries. */
  z?: number;
  /** Optional node depth extent in world space for 3D frustum queries. */
  depth?: number;
}

/**
 * Axis-aligned rectangle query bounds in world space.
 */
export interface EngineSpatialQueryBounds {
  /** Left coordinate. */
  x: number;
  /** Top coordinate. */
  y: number;
  /** Width. */
  width: number;
  /** Height. */
  height: number;
}

/**
 * Point query payload used by point-candidate resolution.
 */
export interface EngineSpatialQueryPoint {
  /** Point x coordinate in world space. */
  x: number;
  /** Point y coordinate in world space. */
  y: number;
}

/**
 * Spatial query result payload used by viewport/frustum query paths.
 */
export interface EngineSpatialQueryResult {
  /** Deterministically sorted node ids intersecting query bounds. */
  nodeIds: readonly string[];
}

/**
 * Contract for staged spatial-query module.
 */
export interface EngineSpatialQueryModule {
  /**
   * Resolves viewport candidate node ids from world-space bounds.
   */
  queryViewportCandidates: (
    nodes: readonly EngineSpatialQueryNode[],
    bounds: EngineSpatialQueryBounds,
  ) => readonly string[];
  /**
   * Resolves frustum-visible node ids using true 3D frustum-AABB intersection when
   * frustum is provided and nodes carry z/depth bounds; falls back to 2D AABB query otherwise.
   */
  queryFrustumVisibleSet: (
    nodes: readonly EngineSpatialQueryNode[],
    bounds: EngineSpatialQueryBounds,
    frustum?: EngineCameraFrustum,
  ) => EngineSpatialQueryResult;
  /**
   * Resolves deterministic point candidates ranked by distance to query point.
   */
  queryPointCandidates: (
    nodes: readonly EngineSpatialQueryNode[],
    point: EngineSpatialQueryPoint,
    tolerance: number,
  ) => readonly string[];
}
