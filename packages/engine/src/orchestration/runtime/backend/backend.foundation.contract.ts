import type { EngineBackendMode } from "../../../orchestration/api/public-types";

/**
 * Runtime backend foundation API level classifications.
 */
export type EngineRuntimeBackendFoundationLevel = "foundation";

/**
 * Runtime backend foundation stability classifications.
 */
export type EngineRuntimeBackendFoundationStability = "beta";

/**
 * Error codes reserved for runtime backend foundation APIs.
 */
export type EngineRuntimeBackendFoundationErrorCode =
  | "ENGINE_BACKEND_UNAVAILABLE"
  | "ENGINE_BACKEND_PROBE_FAILED";

/**
 * One fallback trace item describing backend resolution path.
 */
export interface EngineRuntimeBackendFallbackTraceItem {
  /** Requested backend mode. */
  requested: EngineBackendMode;
  /** Resolved backend mode used at runtime. */
  resolved: EngineBackendMode;
  /** Optional human-readable fallback reason. */
  reason: string | null;
  /** Optional compressed-texture fallback reason when no direct compressed path exists. */
  compressedTextureFallback: string | null;
}

/**
 * listAvailable output contract for runtime backend foundation APIs.
 */
export interface EngineRuntimeBackendListAvailableOutput {
  /** Deterministic backend mode list in priority order. */
  available: readonly EngineBackendMode[];
}

/**
 * getActive output contract for runtime backend foundation APIs.
 */
export interface EngineRuntimeBackendGetActiveOutput {
  /** Active backend mode for current runtime session. */
  active: EngineBackendMode;
}

/**
 * getFallbackTrace output contract for runtime backend foundation APIs.
 */
export interface EngineRuntimeBackendGetFallbackTraceOutput {
  /** Deterministic fallback trace list from current runtime session. */
  fallbackTrace: readonly EngineRuntimeBackendFallbackTraceItem[];
}

/**
 * API descriptor contract for one runtime backend foundation endpoint.
 */
export interface EngineRuntimeBackendFoundationApiDescriptor {
  /** Canonical runtime API method name. */
  name:
    | "engine.runtime.backend.listAvailable"
    | "engine.runtime.backend.select"
    | "engine.runtime.backend.getActive"
    | "engine.runtime.backend.getCapabilities"
    | "engine.runtime.backend.getLimits"
    | "engine.runtime.backend.getFallbackTrace"
    | "engine.runtime.backend.probeHeadless";
  /** API layering classification. */
  level: EngineRuntimeBackendFoundationLevel;
  /** API stability tag. */
  stability: EngineRuntimeBackendFoundationStability;
  /** Reserved error code set for this endpoint. */
  errorCodes: readonly EngineRuntimeBackendFoundationErrorCode[];
  /** Determinism guarantee summary for endpoint behavior. */
  determinism: string;
}

/**
 * Runtime backend foundation descriptor map used by contract tests and docs.
 */
export const ENGINE_RUNTIME_BACKEND_FOUNDATION_API = {
  listAvailable: {
    name: "engine.runtime.backend.listAvailable",
    level: "foundation",
    stability: "beta",
    errorCodes: ["ENGINE_BACKEND_PROBE_FAILED"],
    determinism: "Same probe set yields identical available backend ordering.",
  },
  select: {
    name: "engine.runtime.backend.select",
    level: "foundation",
    stability: "beta",
    errorCodes: ["ENGINE_BACKEND_UNAVAILABLE"],
    determinism: "Same preference and same available set yields identical resolved backend.",
  },
  getActive: {
    name: "engine.runtime.backend.getActive",
    level: "foundation",
    stability: "beta",
    errorCodes: ["ENGINE_BACKEND_UNAVAILABLE"],
    determinism: "Same runtime backend state yields identical active backend mode.",
  },
  getFallbackTrace: {
    name: "engine.runtime.backend.getFallbackTrace",
    level: "foundation",
    stability: "beta",
    errorCodes: ["ENGINE_BACKEND_PROBE_FAILED"],
    determinism: "Same backend selection inputs yield identical fallback trace items.",
  },
  getCapabilities: {
    name: "engine.runtime.backend.getCapabilities",
    level: "foundation",
    stability: "beta",
    errorCodes: ["ENGINE_BACKEND_UNAVAILABLE"],
    determinism: "Same active backend yields identical capability switch set.",
  },
  getLimits: {
    name: "engine.runtime.backend.getLimits",
    level: "foundation",
    stability: "beta",
    errorCodes: ["ENGINE_BACKEND_UNAVAILABLE"],
    determinism: "Same active backend yields identical operational limits.",
  },
  probeHeadless: {
    name: "engine.runtime.backend.probeHeadless",
    level: "foundation",
    stability: "beta",
    errorCodes: ["ENGINE_BACKEND_PROBE_FAILED"],
    determinism: "Same host probe set yields identical headless support result.",
  },
} as const satisfies Readonly<
  Record<
    | "listAvailable"
    | "select"
    | "getActive"
    | "getCapabilities"
    | "getLimits"
    | "getFallbackTrace"
    | "probeHeadless",
    EngineRuntimeBackendFoundationApiDescriptor
  >
>;

/**
 * Resolves one runtime backend foundation API descriptor by key.
 * @param apiKey Descriptor key from the runtime backend foundation map.
 */
export function resolveEngineRuntimeBackendFoundationApiDescriptor(
  apiKey: keyof typeof ENGINE_RUNTIME_BACKEND_FOUNDATION_API,
): EngineRuntimeBackendFoundationApiDescriptor {
  return ENGINE_RUNTIME_BACKEND_FOUNDATION_API[apiKey];
}
