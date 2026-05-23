import type { EngineDocumentSnapshot } from "../document/document-contracts";

/**
 * Runtime entity contract produced from document snapshots.
 */
export interface EngineRuntimeEntity {
  /** Stable entity id inherited from document node id. */
  id: string;
  /** Coarse bounds used by staged spatial/visibility/picking systems. */
  bounds: {
    /** Left position in world coordinates. */
    x: number;
    /** Top position in world coordinates. */
    y: number;
    /** Width in world coordinates. */
    width: number;
    /** Height in world coordinates. */
    height: number;
  };
}

/**
 * Immutable runtime world snapshot consumed by downstream render stages.
 */
export interface EngineRuntimeWorldSnapshot {
  /** Runtime world revision aligned to document revision. */
  revision: number;
  /** Runtime entities in deterministic id order. */
  entities: readonly EngineRuntimeEntity[];
}

/**
 * Builds one deterministic runtime-world snapshot from the persistent document.
 * @param snapshot Document snapshot used as runtime source of truth.
 */
export function createRuntimeWorldFromDocument(
  snapshot: EngineDocumentSnapshot,
): EngineRuntimeWorldSnapshot {
  const entityIds = Object.keys(snapshot.nodes).sort((left, right) => left.localeCompare(right));
  const entities: EngineRuntimeEntity[] = entityIds.map((entityId, index) => ({
    id: entityId,
    bounds: {
      x: index * 24,
      y: index * 24,
      width: 64,
      height: 64,
    },
  }));

  return {
    revision: snapshot.revision,
    entities,
  };
}
