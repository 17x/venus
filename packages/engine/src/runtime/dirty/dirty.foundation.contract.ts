import type { EngineDirtyDomain } from "../../dirty/dirtyPropagation/dirtyPropagation.contract";

/**
 * Runtime dirty foundation API level classifications.
 */
export type EngineRuntimeDirtyFoundationLevel = "foundation";

/**
 * Runtime dirty foundation stability classifications.
 */
export type EngineRuntimeDirtyFoundationStability = "beta";

/**
 * Error codes reserved for runtime dirty foundation APIs.
 */
export type EngineRuntimeDirtyFoundationErrorCode = "ENGINE_DIRTY_INVALID_DOMAIN";

/**
 * Dirty state snapshot contract returned by runtime dirty APIs.
 */
export interface EngineRuntimeDirtyStateSnapshot {
  /** Deterministic sorted dirty domain list. */
  pendingDomains: readonly EngineDirtyDomain[];
  /** Epoch milliseconds when dirty mark was last updated. */
  lastMarkedAt: number;
}

/**
 * Dirty mark input contract for runtime dirty APIs.
 */
export interface EngineRuntimeDirtyMarkInput {
  /** Dirty domain to mark for subsequent incremental work. */
  domain: EngineDirtyDomain;
  /** Deterministic caller token for traceability. */
  token: string;
}

/**
 * API descriptor contract for one runtime dirty foundation endpoint.
 */
export interface EngineRuntimeDirtyFoundationApiDescriptor {
  /** Canonical runtime API method name. */
  name:
    | "engine.runtime.dirty.getState"
    | "engine.runtime.dirty.mark"
    | "engine.runtime.dirty.markBatch"
    | "engine.runtime.dirty.getPendingDomains"
    | "engine.runtime.dirty.flush"
    | "engine.runtime.dirty.reset";
  /** API layering classification. */
  level: EngineRuntimeDirtyFoundationLevel;
  /** API stability tag. */
  stability: EngineRuntimeDirtyFoundationStability;
  /** Reserved error code set for this endpoint. */
  errorCodes: readonly EngineRuntimeDirtyFoundationErrorCode[];
  /** Determinism guarantee summary for endpoint behavior. */
  determinism: string;
}

/**
 * Runtime dirty foundation descriptor map used by contract tests and docs.
 */
export const ENGINE_RUNTIME_DIRTY_FOUNDATION_API = {
  getState: {
    name: "engine.runtime.dirty.getState",
    level: "foundation",
    stability: "beta",
    errorCodes: [],
    determinism: "Same marked domain set yields same pendingDomains output.",
  },
  mark: {
    name: "engine.runtime.dirty.mark",
    level: "foundation",
    stability: "beta",
    errorCodes: ["ENGINE_DIRTY_INVALID_DOMAIN"],
    determinism: "Same mark sequence yields same pendingDomains ordering.",
  },
  markBatch: {
    name: "engine.runtime.dirty.markBatch",
    level: "foundation",
    stability: "beta",
    errorCodes: ["ENGINE_DIRTY_INVALID_DOMAIN"],
    determinism: "Same batch domain sequence yields same pendingDomains ordering.",
  },
  getPendingDomains: {
    name: "engine.runtime.dirty.getPendingDomains",
    level: "foundation",
    stability: "beta",
    errorCodes: [],
    determinism: "Same dirty state yields same pending domain ordering.",
  },
  flush: {
    name: "engine.runtime.dirty.flush",
    level: "foundation",
    stability: "beta",
    errorCodes: ["ENGINE_DIRTY_INVALID_DOMAIN"],
    determinism: "Same dirty state and same flush domains yields same post-flush pending domains.",
  },
  reset: {
    name: "engine.runtime.dirty.reset",
    level: "foundation",
    stability: "beta",
    errorCodes: [],
    determinism: "Same call always yields empty pendingDomains state.",
  },
} as const satisfies Readonly<
  Record<
    "getState" | "mark" | "markBatch" | "getPendingDomains" | "flush" | "reset",
    EngineRuntimeDirtyFoundationApiDescriptor
  >
>;

/**
 * Resolves one runtime dirty foundation API descriptor by key.
 * @param apiKey Descriptor key from the runtime dirty foundation map.
 */
export function resolveEngineRuntimeDirtyFoundationApiDescriptor(
  apiKey: keyof typeof ENGINE_RUNTIME_DIRTY_FOUNDATION_API,
): EngineRuntimeDirtyFoundationApiDescriptor {
  return ENGINE_RUNTIME_DIRTY_FOUNDATION_API[apiKey];
}
