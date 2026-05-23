import { querySpatialCandidates, type EngineSpatialIndexSnapshot } from "../spatial/spatialIndex";

/**
 * Picking hit result used by staged interaction routing.
 */
export interface EnginePickingHit {
  /** Hit entity id. */
  entityId: string;
  /** Coarse rank where lower values are higher priority. */
  rank: number;
}

/**
 * Picking pipeline output containing prioritized hit stack.
 */
export interface EnginePickingHitStack {
  /** Ordered hits from highest to lowest priority. */
  hits: readonly EnginePickingHit[];
}

/**
 * Resolves picking hits for a pointer location using spatial candidates.
 * @param options Picking query options.
 */
export function resolvePickingHitStack(options: {
  /** Spatial index snapshot built from runtime world. */
  spatialIndex: EngineSpatialIndexSnapshot;
  /** Pointer x in world coordinates. */
  x: number;
  /** Pointer y in world coordinates. */
  y: number;
}): EnginePickingHitStack {
  const candidates = querySpatialCandidates(options.spatialIndex, {
    x: options.x,
    y: options.y,
    width: 1,
    height: 1,
  });

  const hits = candidates.map((entityId, index) => ({
    entityId,
    rank: index,
  }));

  return {
    hits,
  };
}
