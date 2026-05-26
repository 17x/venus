/**
 * Declares one bone in a skeletal animation rig.
 */
export interface EngineSkeletonBone {
  /** Unique bone identifier. */
  id: string;
  /** Bone name for editor display. */
  name: string;
  /** Parent bone id, or null for root bones. */
  parentId: string | null;
  /** Inverse-bind matrix as 16-element column-major array. */
  inverseBindMatrix: readonly number[];
}

/**
 * Declares per-vertex skin weight data for skeletal animation.
 */
export interface EngineSkinWeights {
  /** Joint indices affecting this vertex (max 4). */
  jointIndices: readonly number[];
  /** Weight values for each joint (sum should be 1.0). */
  weights: readonly number[];
}

/**
 * Declares the skeletal animation baseline contract.
 */
export interface EngineSkeleton {
  /** Unique skeleton identifier. */
  id: string;
  /** Ordered bones forming the skeleton hierarchy. */
  bones: readonly EngineSkeletonBone[];
  /** Root bone id for hierarchy traversal. */
  rootBoneId: string;
}

/**
 * Declares one morph target for blend-shape animation.
 */
export interface EngineMorphTarget {
  /** Unique morph target identifier. */
  id: string;
  /** Morph target name (e.g. "smile", "blink"). */
  name: string;
  /** Default weight value (0–1). */
  defaultWeight: number;
}

/**
 * Declares the morph target animation baseline contract.
 */
export interface EngineMorphTargetCollection {
  /** Ordered morph targets for this mesh. */
  targets: readonly EngineMorphTarget[];
  /** Current weights for each morph target (parallel array to targets). */
  weights: readonly number[];
}
