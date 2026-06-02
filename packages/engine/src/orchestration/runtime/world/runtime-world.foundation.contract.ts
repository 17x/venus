import type { EngineRuntimeWorldSnapshot } from "../../../kernel/ecs/runtimeWorld";

/**
 * Runtime world foundation API level classifications.
 */
export type EngineRuntimeWorldFoundationLevel = "foundation";

/**
 * Runtime world foundation stability classifications.
 */
export type EngineRuntimeWorldFoundationStability = "beta";

/**
 * Error codes reserved for runtime world foundation APIs.
 */
export type EngineRuntimeWorldFoundationErrorCode = "ENGINE_WORLD_NOT_COMPILED";

/**
 * Runtime world snapshot output contract for foundation APIs.
 */
export interface EngineRuntimeWorldSnapshotOutput {
  /** Runtime world revision aligned to latest compiled document revision. */
  worldRevision: number;
  /** Deterministic runtime entity snapshot in id order. */
  entities: EngineRuntimeWorldSnapshot["entities"];
}

/**
 * Runtime world graph stats output contract for foundation APIs.
 */
export interface EngineRuntimeWorldGraphStatsOutput {
  /** Runtime world revision aligned to latest compile output. */
  worldRevision: number;
  /** Number of runtime entities currently materialized. */
  entityCount: number;
}

/**
 * API descriptor contract for one runtime world foundation endpoint.
 */
export interface EngineRuntimeWorldFoundationApiDescriptor {
  /** Canonical runtime API method name. */
  name:
    | "engine.runtime.world.compileFromDocument"
    | "engine.runtime.world.getWorldSnapshot"
    | "engine.runtime.world.queryEntity"
    | "engine.runtime.world.queryComponent"
    | "engine.runtime.world.getGraphStats"
    | "engine.runtime.world.setOpenWorldMap"
    | "engine.runtime.world.getOpenWorldMap"
    | "engine.runtime.world.setAgents"
    | "engine.runtime.world.getAgents"
    | "engine.runtime.world.stepAgents"
    | "engine.runtime.world.resolveCollision"
    | "engine.runtime.world.clear";
  /** API layering classification. */
  level: EngineRuntimeWorldFoundationLevel;
  /** API stability tag. */
  stability: EngineRuntimeWorldFoundationStability;
  /** Reserved error code set for this endpoint. */
  errorCodes: readonly EngineRuntimeWorldFoundationErrorCode[];
  /** Determinism guarantee summary for endpoint behavior. */
  determinism: string;
}

/**
 * Runtime world foundation descriptor map used by contract tests and docs.
 */
export const ENGINE_RUNTIME_WORLD_FOUNDATION_API = {
  compileFromDocument: {
    name: "engine.runtime.world.compileFromDocument",
    level: "foundation",
    stability: "beta",
    errorCodes: ["ENGINE_WORLD_NOT_COMPILED"],
    determinism: "Same document snapshot yields identical compiled world revision and entity ordering.",
  },
  getWorldSnapshot: {
    name: "engine.runtime.world.getWorldSnapshot",
    level: "foundation",
    stability: "beta",
    errorCodes: ["ENGINE_WORLD_NOT_COMPILED"],
    determinism: "Same compiled document revision yields identical world snapshot ordering.",
  },
  getGraphStats: {
    name: "engine.runtime.world.getGraphStats",
    level: "foundation",
    stability: "beta",
    errorCodes: ["ENGINE_WORLD_NOT_COMPILED"],
    determinism: "Same world snapshot yields identical entityCount and worldRevision values.",
  },
  setOpenWorldMap: {
    name: "engine.runtime.world.setOpenWorldMap",
    level: "foundation",
    stability: "beta",
    errorCodes: ["ENGINE_WORLD_NOT_COMPILED"],
    determinism: "Same map payload yields identical open-world obstacle snapshot.",
  },
  getOpenWorldMap: {
    name: "engine.runtime.world.getOpenWorldMap",
    level: "foundation",
    stability: "beta",
    errorCodes: ["ENGINE_WORLD_NOT_COMPILED"],
    determinism: "Same internal open-world map state yields identical output.",
  },
  setAgents: {
    name: "engine.runtime.world.setAgents",
    level: "foundation",
    stability: "beta",
    errorCodes: ["ENGINE_WORLD_NOT_COMPILED"],
    determinism: "Same agent input payload yields identical normalized agent snapshot.",
  },
  getAgents: {
    name: "engine.runtime.world.getAgents",
    level: "foundation",
    stability: "beta",
    errorCodes: ["ENGINE_WORLD_NOT_COMPILED"],
    determinism: "Same internal world-agent state yields identical output ordering.",
  },
  stepAgents: {
    name: "engine.runtime.world.stepAgents",
    level: "foundation",
    stability: "beta",
    errorCodes: ["ENGINE_WORLD_NOT_COMPILED"],
    determinism: "Same dt/path input and same current agent state yields identical stepped state.",
  },
  resolveCollision: {
    name: "engine.runtime.world.resolveCollision",
    level: "foundation",
    stability: "beta",
    errorCodes: ["ENGINE_WORLD_NOT_COMPILED"],
    determinism: "Same open-world obstacle state and same circle input yields identical resolved position.",
  },
  queryEntity: {
    name: "engine.runtime.world.queryEntity",
    level: "foundation",
    stability: "beta",
    errorCodes: ["ENGINE_WORLD_NOT_COMPILED"],
    determinism: "Same world snapshot and same entityId yields identical found/entity output.",
  },
  queryComponent: {
    name: "engine.runtime.world.queryComponent",
    level: "foundation",
    stability: "beta",
    errorCodes: ["ENGINE_WORLD_NOT_COMPILED"],
    determinism: "Same world snapshot and same component yields identical entity id ordering.",
  },
  clear: {
    name: "engine.runtime.world.clear",
    level: "foundation",
    stability: "beta",
    errorCodes: ["ENGINE_WORLD_NOT_COMPILED"],
    determinism: "Same pre-clear world snapshot yields identical clearedEntityCount.",
  },
} as const satisfies Readonly<
  Record<
    | "compileFromDocument"
    | "getWorldSnapshot"
    | "queryEntity"
    | "queryComponent"
    | "getGraphStats"
    | "setOpenWorldMap"
    | "getOpenWorldMap"
    | "setAgents"
    | "getAgents"
    | "stepAgents"
    | "resolveCollision"
    | "clear",
    EngineRuntimeWorldFoundationApiDescriptor
  >
>;

/**
 * Resolves one runtime world foundation API descriptor by key.
 * @param apiKey Descriptor key from the runtime world foundation map.
 */
export function resolveEngineRuntimeWorldFoundationApiDescriptor(
  apiKey: keyof typeof ENGINE_RUNTIME_WORLD_FOUNDATION_API,
): EngineRuntimeWorldFoundationApiDescriptor {
  return ENGINE_RUNTIME_WORLD_FOUNDATION_API[apiKey];
}
