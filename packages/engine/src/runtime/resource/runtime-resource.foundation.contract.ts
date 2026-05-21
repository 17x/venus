/**
 * Runtime resource foundation API level classifications.
 */
export type EngineRuntimeResourceFoundationLevel = "foundation";

/**
 * Runtime resource foundation stability classifications.
 */
export type EngineRuntimeResourceFoundationStability = "beta";

/**
 * Error codes reserved for runtime resource foundation APIs.
 */
export type EngineRuntimeResourceFoundationErrorCode =
  | "ENGINE_RESOURCE_INVALID_DESCRIPTOR"
  | "ENGINE_RESOURCE_NOT_FOUND";

/**
 * API descriptor contract for one runtime resource foundation endpoint.
 */
export interface EngineRuntimeResourceFoundationApiDescriptor {
  /** Canonical runtime API method name. */
  name:
    | "engine.runtime.resource.register"
    | "engine.runtime.resource.update"
    | "engine.runtime.resource.release"
    | "engine.runtime.resource.pin"
    | "engine.runtime.resource.unpin"
    | "engine.runtime.resource.getResidency"
    | "engine.runtime.resource.collectGarbage";
  /** API layering classification. */
  level: EngineRuntimeResourceFoundationLevel;
  /** API stability tag. */
  stability: EngineRuntimeResourceFoundationStability;
  /** Reserved error code set for this endpoint. */
  errorCodes: readonly EngineRuntimeResourceFoundationErrorCode[];
  /** Determinism guarantee summary for endpoint behavior. */
  determinism: string;
}

/**
 * Runtime resource foundation descriptor map used by contract tests and docs.
 */
export const ENGINE_RUNTIME_RESOURCE_FOUNDATION_API = {
  register: {
    name: "engine.runtime.resource.register",
    level: "foundation",
    stability: "beta",
    errorCodes: ["ENGINE_RESOURCE_INVALID_DESCRIPTOR"],
    determinism: "Same descriptor input yields the same initial residency fields.",
  },
  update: {
    name: "engine.runtime.resource.update",
    level: "foundation",
    stability: "beta",
    errorCodes: ["ENGINE_RESOURCE_NOT_FOUND", "ENGINE_RESOURCE_INVALID_DESCRIPTOR"],
    determinism: "Same resource state and patch yield the same residency update output.",
  },
  release: {
    name: "engine.runtime.resource.release",
    level: "foundation",
    stability: "beta",
    errorCodes: ["ENGINE_RESOURCE_NOT_FOUND"],
    determinism: "Same resource id and registry state yield the same release result.",
  },
  pin: {
    name: "engine.runtime.resource.pin",
    level: "foundation",
    stability: "beta",
    errorCodes: ["ENGINE_RESOURCE_NOT_FOUND"],
    determinism: "Same resource id yields the same pinned residency snapshot.",
  },
  unpin: {
    name: "engine.runtime.resource.unpin",
    level: "foundation",
    stability: "beta",
    errorCodes: ["ENGINE_RESOURCE_NOT_FOUND"],
    determinism: "Same resource id yields the same unpinned residency snapshot.",
  },
  getResidency: {
    name: "engine.runtime.resource.getResidency",
    level: "foundation",
    stability: "beta",
    errorCodes: ["ENGINE_RESOURCE_NOT_FOUND"],
    determinism: "Same resource id and registry state yield the same residency snapshot.",
  },
  collectGarbage: {
    name: "engine.runtime.resource.collectGarbage",
    level: "foundation",
    stability: "beta",
    errorCodes: ["ENGINE_RESOURCE_INVALID_DESCRIPTOR"],
    determinism: "Same GC budget and registry state yield the same released resource id set.",
  },
} as const satisfies Readonly<
  Record<
    | "register"
    | "update"
    | "release"
    | "pin"
    | "unpin"
    | "getResidency"
    | "collectGarbage",
    EngineRuntimeResourceFoundationApiDescriptor
  >
>;

/**
 * Resolves one runtime resource foundation API descriptor by key.
 * @param apiKey Descriptor key from the runtime resource foundation map.
 */
export function resolveEngineRuntimeResourceFoundationApiDescriptor(
  apiKey: keyof typeof ENGINE_RUNTIME_RESOURCE_FOUNDATION_API,
): EngineRuntimeResourceFoundationApiDescriptor {
  return ENGINE_RUNTIME_RESOURCE_FOUNDATION_API[apiKey];
}
