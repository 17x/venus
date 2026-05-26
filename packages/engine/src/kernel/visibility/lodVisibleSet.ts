import type { EngineAABB3D } from "../interaction/camera/cameraFrustum";

/**
 * Declares one occlusion candidate for visibility determination.
 */
export interface EngineOcclusionCandidate {
  /** Stable node id. */
  id: string;
  /** World-space axis-aligned bounding box. */
  aabb: EngineAABB3D;
  /** LOD level index for multi-resolution visibility. */
  lodLevel: number;
  /** Whether this candidate was visible in the previous frame. */
  wasVisible: boolean;
}

/**
 * Declares the LOD visible-set pipeline contract.
 * Resolves which LOD level each candidate should render at based on distance and policy.
 */
export interface EngineLodVisibleSet {
  /** Candidate ids visible at each LOD level. */
  levelIds: Map<number, readonly string[]>;
  /** Total visible candidate count across all LOD levels. */
  totalVisibleCount: number;
  /** Candidates that were occluded (not visible). */
  occludedIds: readonly string[];
}

/**
 * Resolves LOD level index from camera distance using a simple distance-threshold policy.
 * @param distance Distance from camera to candidate center.
 * @param lodDistances Threshold distances for each LOD level (ascending order).
 */
export function resolveLodLevel(
  distance: number,
  lodDistances: readonly number[],
): number {
  for (let i = 0; i < lodDistances.length; i += 1) {
    if (distance <= (lodDistances[i] ?? Number.POSITIVE_INFINITY)) {
      return i;
    }
  }
  return lodDistances.length;
}
