import type {
  EngineRuntimeWorldClearOutput,
  EngineRuntimeWorldCompileFromDocumentInput,
  EngineRuntimeWorldEntity,
  EngineRuntimeWorldGraphStatsOutput,
  EngineRuntimeWorldQueryComponentInput,
  EngineRuntimeWorldQueryComponentOutput,
  EngineRuntimeWorldQueryEntityInput,
  EngineRuntimeWorldQueryEntityOutput,
  EngineRuntimeWorldSnapshotOutput,
} from "./public-types";
import type { EngineDocumentSnapshot } from "../../kernel/document/document-contracts";

/**
 * Defines dependencies required by the runtime world domain helpers.
 */
export type RuntimeWorldFoundationDeps = {
  /** Reads current runtime document snapshot. */
  getDocumentSnapshot: () => EngineDocumentSnapshot;
  /** Builds runtime world from document snapshot. */
  buildRuntimeWorldFromDocument: (snapshot: EngineDocumentSnapshot) => {
    revision: number;
    entities: ReadonlyArray<EngineRuntimeWorldEntity & {
      /** Optional 3D bounds for volumetric world entities. */
      bounds3d?: { x: number; y: number; z: number; width: number; height: number; depth: number };
      /** Optional 3D transform for spatial world entities. */
      transform3d?: {
        x: number; y: number; z: number;
        rotationX: number; rotationY: number; rotationZ: number;
        scaleX: number; scaleY: number; scaleZ: number;
      };
      /** Source entity type from scene compiler. */
      sourceType?: string;
      /** Painter's algorithm render order. */
      renderOrder?: number;
      /** Whether this entity contributes to the visible layer. */
      visible?: boolean;
      /** Lighting model selection for this entity. */
      lightingMode?: "inherit" | "unlit" | "lit";
      /** Optional material reference id. */
      materialId?: string;
    }>;
  };
  /** Reads current runtime-world snapshot override. */
  getRuntimeWorldSnapshotOverride: () => EngineRuntimeWorldSnapshotOutput | null;
  /** Updates runtime-world snapshot override. */
  setRuntimeWorldSnapshotOverride: (snapshot: EngineRuntimeWorldSnapshotOutput | null) => void;
};

/**
 * Assembles runtime world helper functions (snapshot, compile, query, clear).
 * @param deps Shared world state and module delegates from createEngine closure.
 */
export function createRuntimeWorldFoundation(deps: RuntimeWorldFoundationDeps): {
  resolveRuntimeWorldSnapshotOutput: () => EngineRuntimeWorldSnapshotOutput;
  compileRuntimeWorldFromDocument: (
    input: EngineRuntimeWorldCompileFromDocumentInput,
  ) => EngineRuntimeWorldSnapshotOutput;
  queryRuntimeWorldEntity: (
    input: EngineRuntimeWorldQueryEntityInput,
  ) => EngineRuntimeWorldQueryEntityOutput;
  queryRuntimeWorldComponent: (
    input: EngineRuntimeWorldQueryComponentInput,
  ) => EngineRuntimeWorldQueryComponentOutput;
  clearRuntimeWorldSnapshot: (_unused?: void) => EngineRuntimeWorldClearOutput;
  resolveRuntimeWorldGraphStatsOutput: () => EngineRuntimeWorldGraphStatsOutput;
} {
  /**
   * Projects one internal world entity into the public runtime world entity contract.
   * @param entity Internal runtime world entity potentially carrying extended 3D fields.
   */
  function resolveRuntimeWorldEntityOutput(
    entity: RuntimeWorldFoundationDeps["buildRuntimeWorldFromDocument"] extends (
      snapshot: EngineDocumentSnapshot,
    ) => { entities: ReadonlyArray<infer TEntity> }
      ? TEntity
      : never,
  ): EngineRuntimeWorldEntity {
    const semantic3d = entity.bounds3d && entity.transform3d
      ? {
          bounds: {
            x: entity.bounds3d.x,
            y: entity.bounds3d.y,
            z: entity.bounds3d.z,
            width: entity.bounds3d.width,
            height: entity.bounds3d.height,
            depth: entity.bounds3d.depth,
          },
          transform: {
            x: entity.transform3d.x,
            y: entity.transform3d.y,
            z: entity.transform3d.z,
            rotationX: entity.transform3d.rotationX,
            rotationY: entity.transform3d.rotationY,
            rotationZ: entity.transform3d.rotationZ,
            scaleX: entity.transform3d.scaleX,
            scaleY: entity.transform3d.scaleY,
            scaleZ: entity.transform3d.scaleZ,
          },
          sourceType: entity.sourceType,
          renderOrder: entity.renderOrder,
          visible: entity.visible,
          lightingMode: entity.lightingMode,
          materialId: entity.materialId,
        }
      : entity.semantic3d;

    return {
      id: entity.id,
      bounds: {
        x: entity.bounds.x,
        y: entity.bounds.y,
        width: entity.bounds.width,
        height: entity.bounds.height,
      },
      semantic3d,
    };
  }

  /**
   * Returns current runtime world snapshot output.
   */
  function resolveRuntimeWorldSnapshotOutput(): EngineRuntimeWorldSnapshotOutput {
    const override = deps.getRuntimeWorldSnapshotOverride();
    if (override) {
      return {
        worldRevision: override.worldRevision,
        entities: [...override.entities],
      };
    }
    const runtimeWorld = deps.buildRuntimeWorldFromDocument(deps.getDocumentSnapshot());
    return {
      worldRevision: runtimeWorld.revision,
      entities: runtimeWorld.entities.map((entity) => resolveRuntimeWorldEntityOutput(entity)),
    };
  }

  /**
   * Compiles one runtime-world snapshot from explicit document snapshot input.
   * @param input Runtime world compile-from-document request.
   */
  function compileRuntimeWorldFromDocument(
    input: EngineRuntimeWorldCompileFromDocumentInput,
  ): EngineRuntimeWorldSnapshotOutput {
    if (!input || !input.snapshot || typeof input.snapshot.nodes !== "object" || input.snapshot.nodes === null) {
      throw new Error("ENGINE_WORLD_NOT_COMPILED");
    }
    const runtimeWorld = deps.buildRuntimeWorldFromDocument(input.snapshot);
    const snapshot: EngineRuntimeWorldSnapshotOutput = {
      worldRevision: runtimeWorld.revision,
      entities: runtimeWorld.entities.map((entity) => resolveRuntimeWorldEntityOutput(entity)),
    };
    deps.setRuntimeWorldSnapshotOverride(snapshot);
    return snapshot;
  }

  /**
   * Queries one runtime-world entity by id.
   * @param input Runtime world query-entity request.
   */
  function queryRuntimeWorldEntity(
    input: EngineRuntimeWorldQueryEntityInput,
  ): EngineRuntimeWorldQueryEntityOutput {
    if (!input || typeof input.entityId !== "string") {
      throw new Error("ENGINE_WORLD_NOT_COMPILED");
    }
    const snapshot = resolveRuntimeWorldSnapshotOutput();
    const entity = snapshot.entities.find((item) => item.id === input.entityId) ?? null;
    return {
      found: entity !== null,
      entity,
    };
  }

  /**
   * Queries runtime-world entities that expose requested component facet.
   * @param input Runtime world query-component request.
   */
  function queryRuntimeWorldComponent(
    input: EngineRuntimeWorldQueryComponentInput,
  ): EngineRuntimeWorldQueryComponentOutput {
    if (!input || typeof input.component !== "string") {
      throw new Error("ENGINE_WORLD_NOT_COMPILED");
    }
    const snapshot = resolveRuntimeWorldSnapshotOutput();

    /**
     * Keeps world component queries aligned with semantic3d completeness goals.
     * @param entity Runtime-world entity candidate from the current snapshot.
     */
    const matchComponent = (entity: (typeof snapshot.entities)[number]): boolean => {
      const semantic3d = entity.semantic3d;
      if (input.component === "transform") {
        return Boolean(semantic3d?.transform);
      }

      if (input.component === "geometry") {
        const hasBaseBounds = entity.bounds.width > 0 || entity.bounds.height > 0;
        const has3dBounds = semantic3d
          ? semantic3d.bounds.width > 0 || semantic3d.bounds.height > 0 || semantic3d.bounds.depth > 0
          : false;
        return hasBaseBounds || has3dBounds;
      }

      if (input.component === "material") {
        return Boolean(semantic3d?.materialId || semantic3d?.lightingMode);
      }

      if (input.component === "visibility") {
        return semantic3d?.visible !== false;
      }

      if (input.component === "picking") {
        const has2dPickArea = entity.bounds.width > 0 && entity.bounds.height > 0;
        const has3dPickVolume = semantic3d
          ? semantic3d.bounds.width > 0 && semantic3d.bounds.height > 0 && semantic3d.bounds.depth >= 0
          : false;
        return has2dPickArea || has3dPickVolume;
      }

      return false;
    };

    return {
      entityIds: snapshot.entities
        .filter((entity) => matchComponent(entity))
        .map((entity) => entity.id),
    };
  }

  /**
   * Clears current runtime-world snapshot override.
   * @param _unused Unused placeholder to keep call shape explicit for future extension.
   */
  function clearRuntimeWorldSnapshot(_unused?: void): EngineRuntimeWorldClearOutput {
    const currentSnapshot = resolveRuntimeWorldSnapshotOutput();
    deps.setRuntimeWorldSnapshotOverride({
      worldRevision: currentSnapshot.worldRevision,
      entities: [],
    });
    return {
      clearedEntityCount: currentSnapshot.entities.length,
    };
  }

  /**
   * Returns current runtime world graph stats output.
   */
  function resolveRuntimeWorldGraphStatsOutput(): EngineRuntimeWorldGraphStatsOutput {
    const snapshot = resolveRuntimeWorldSnapshotOutput();
    return {
      worldRevision: snapshot.worldRevision,
      entityCount: snapshot.entities.length,
    };
  }

  return {
    resolveRuntimeWorldSnapshotOutput,
    compileRuntimeWorldFromDocument,
    queryRuntimeWorldEntity,
    queryRuntimeWorldComponent,
    clearRuntimeWorldSnapshot,
    resolveRuntimeWorldGraphStatsOutput,
  };
}
