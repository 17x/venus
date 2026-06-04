import type { EngineDocumentSnapshot } from "../document/document-contracts";

const LEGACY_FALLBACK_GRID_STEP = 24;

/**
 * Runtime 3D transform contract projected from document semantic payloads.
 */
export interface EngineRuntimeEntityTransform3D {
  /** Translation in world X axis. */
  x: number;
  /** Translation in world Y axis. */
  y: number;
  /** Translation in world Z axis. */
  z: number;
  /** Rotation in degrees around X axis. */
  rotationX: number;
  /** Rotation in degrees around Y axis. */
  rotationY: number;
  /** Rotation in degrees around Z axis. */
  rotationZ: number;
  /** Scale factor on X axis. */
  scaleX: number;
  /** Scale factor on Y axis. */
  scaleY: number;
  /** Scale factor on Z axis. */
  scaleZ: number;
}

/**
 * Runtime 3D bounds contract projected from document semantic payloads.
 */
export interface EngineRuntimeEntityBounds3D {
  /** Left position in world coordinates. */
  x: number;
  /** Top position in world coordinates. */
  y: number;
  /** Front position in world coordinates. */
  z: number;
  /** Width in world coordinates. */
  width: number;
  /** Height in world coordinates. */
  height: number;
  /** Depth in world coordinates. */
  depth: number;
}

/**
 * Runtime entity contract produced from document snapshots.
 */
export interface EngineRuntimeEntity {
  /** Stable entity id inherited from document node id. */
  id: string;
  /** Optional parent entity id used by hierarchy-aware runtime stages. */
  parentId?: string;
  /** Semantic node kind projected from document layer. */
  kind: "group" | "shape" | "text" | "image" | "custom";
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
  /** Canonical 3D bounds used by runtime ray/picking/projection stages. */
  bounds3d: EngineRuntimeEntityBounds3D;
  /** Canonical 3D transform used by runtime composition stages. */
  transform3d: EngineRuntimeEntityTransform3D;
  /** Optional source type propagated from product/runtime adapters. */
  sourceType?: string;
  /** Optional deterministic render order token from adapters. */
  renderOrder?: number;
  /** Optional visibility bit used by runtime filtering. */
  visible?: boolean;
  /** Optional lighting mode hint used by backend shading paths. */
  lightingMode?: "inherit" | "unlit" | "lit";
  /** Optional material binding id used by backend material paths. */
  materialId?: string;
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
  const entities: EngineRuntimeEntity[] = entityIds.map((entityId, index) => {
    const sourceNode = snapshot.nodes[entityId];
    const semantic3d = sourceNode.semantic3d;
    const bounds3d: EngineRuntimeEntityBounds3D = semantic3d
      ? {
          x: semantic3d.bounds.x,
          y: semantic3d.bounds.y,
          z: semantic3d.bounds.z,
          width: semantic3d.bounds.width,
          height: semantic3d.bounds.height,
          depth: semantic3d.bounds.depth,
        }
      : {
          // Keep deterministic fallback geometry for nodes that have not
          // migrated to semantic3d payloads yet.
          x: index * LEGACY_FALLBACK_GRID_STEP,
          y: index * LEGACY_FALLBACK_GRID_STEP,
          z: 0,
          width: 64,
          height: 64,
          depth: 0,
        };
    const transform3d: EngineRuntimeEntityTransform3D = semantic3d
      ? {
          x: semantic3d.transform.x,
          y: semantic3d.transform.y,
          z: semantic3d.transform.z,
          rotationX: semantic3d.transform.rotationX,
          rotationY: semantic3d.transform.rotationY,
          rotationZ: semantic3d.transform.rotationZ,
          scaleX: semantic3d.transform.scaleX,
          scaleY: semantic3d.transform.scaleY,
          scaleZ: semantic3d.transform.scaleZ,
        }
      : {
          x: bounds3d.x,
          y: bounds3d.y,
          z: bounds3d.z,
          rotationX: 0,
          rotationY: 0,
          rotationZ: 0,
          scaleX: 1,
          scaleY: 1,
          scaleZ: 1,
        };

    return {
      id: entityId,
      parentId: sourceNode.parentId,
      kind: sourceNode.kind,
      bounds: {
        // Visibility and picking must use the same world bounds submitted by
        // adapters. Index-grid fallback is only valid for legacy nodes.
        x: bounds3d.x,
        y: bounds3d.y,
        width: bounds3d.width,
        height: bounds3d.height,
      },
      bounds3d,
      transform3d,
      sourceType: semantic3d?.sourceType,
      renderOrder: semantic3d?.renderOrder,
      visible: semantic3d?.visible,
      lightingMode: semantic3d?.lightingMode,
      materialId: semantic3d?.materialId,
    };
  });

  return {
    revision: snapshot.revision,
    entities,
  };
}
