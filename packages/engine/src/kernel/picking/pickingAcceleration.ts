/**
 * Declares the high-density picking acceleration strategy contract.
 * Provides spatial acceleration structures for scenes with many pickable entities.
 */
export interface EnginePickingAccelerationStrategy {
  /** Maximum depth of the spatial hierarchy. */
  maxDepth: number;
  /** Minimum entities per leaf node before subdivision stops. */
  minEntitiesPerLeaf: number;
  /** Whether to use screen-space binning for lasso/box selection. */
  useScreenSpaceBinning: boolean;
  /** Whether to cache pick results across frames for static scenes. */
  useFrameCoherence: boolean;
}

/**
 * Creates a default picking acceleration strategy.
 */
export function createDefaultPickingAccelerationStrategy(): EnginePickingAccelerationStrategy {
  return {
    maxDepth: 8,
    minEntitiesPerLeaf: 4,
    useScreenSpaceBinning: true,
    useFrameCoherence: true,
  };
}
