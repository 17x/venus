import type { EngineRuntimeWorldSnapshot } from "../ecs/runtimeWorld";

/**
 * Spatial index snapshot for deterministic coarse-candidate queries.
 */
export interface EngineSpatialIndexSnapshot {
  /** Runtime revision used to build this index snapshot. */
  revision: number;
  /** Bounds table keyed by entity id. */
  boundsById: Readonly<Record<string, { x: number; y: number; width: number; height: number }>>;
}

/**
 * Builds one spatial index snapshot from a runtime world snapshot.
 * @param world Runtime world snapshot containing entity bounds.
 */
export function createSpatialIndexFromWorld(
  world: EngineRuntimeWorldSnapshot,
): EngineSpatialIndexSnapshot {
  const boundsById: Record<string, { x: number; y: number; width: number; height: number }> = {};
  for (const entity of world.entities) {
    boundsById[entity.id] = {
      x: entity.bounds.x,
      y: entity.bounds.y,
      width: entity.bounds.width,
      height: entity.bounds.height,
    };
  }

  return {
    revision: world.revision,
    boundsById,
  };
}

/**
 * Queries coarse candidates that intersect one rectangle.
 * @param index Spatial index snapshot.
 * @param bounds Query rectangle in world coordinates.
 */
export function querySpatialCandidates(
  index: EngineSpatialIndexSnapshot,
  bounds: { x: number; y: number; width: number; height: number },
): readonly string[] {
  const results: string[] = [];
  const entityIds = Object.keys(index.boundsById).sort((left, right) => left.localeCompare(right));

  for (const entityId of entityIds) {
    const entityBounds = index.boundsById[entityId];
    if (isIntersecting(bounds, entityBounds)) {
      results.push(entityId);
    }
  }

  return results;
}

/**
 * Resolves axis-aligned rectangle intersection for staged spatial queries.
 * @param left Left rectangle.
 * @param right Right rectangle.
 */
function isIntersecting(
  left: { x: number; y: number; width: number; height: number },
  right: { x: number; y: number; width: number; height: number },
): boolean {
  const leftRight = left.x + left.width;
  const rightRight = right.x + right.width;
  const leftBottom = left.y + left.height;
  const rightBottom = right.y + right.height;
  if (leftRight <= right.x || rightRight <= left.x) {
    return false;
  }
  if (leftBottom <= right.y || rightBottom <= left.y) {
    return false;
  }
  return true;
}
