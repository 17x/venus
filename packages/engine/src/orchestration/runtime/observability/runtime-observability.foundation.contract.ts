/**
 * Runtime observability foundation API level classifications.
 */
export type EngineRuntimeObservabilityFoundationLevel = "foundation";

/**
 * Runtime observability foundation stability classifications.
 */
export type EngineRuntimeObservabilityFoundationStability = "beta";

/**
 * Error codes reserved for runtime observability foundation APIs.
 */
export type EngineRuntimeObservabilityFoundationErrorCode =
  | "ENGINE_OBSERVABILITY_TRACE_NOT_FOUND"
  | "ENGINE_OBSERVABILITY_INVALID_INPUT";

/**
 * API descriptor contract for one runtime observability foundation endpoint.
 */
export interface EngineRuntimeObservabilityFoundationApiDescriptor {
  /** Canonical runtime API method name. */
  name:
    | "engine.runtime.observability.startTrace"
    | "engine.runtime.observability.stopTrace"
    | "engine.runtime.observability.getTrace"
    | "engine.runtime.observability.getMetricsSnapshot"
    | "engine.runtime.observability.captureFrame"
    | "engine.runtime.observability.createReplayToken"
    | "engine.runtime.observability.replay";
  /** API layering classification. */
  level: EngineRuntimeObservabilityFoundationLevel;
  /** API stability tag. */
  stability: EngineRuntimeObservabilityFoundationStability;
  /** Reserved error code set for this endpoint. */
  errorCodes: readonly EngineRuntimeObservabilityFoundationErrorCode[];
  /** Determinism guarantee summary for endpoint behavior. */
  determinism: string;
}

/**
 * Runtime observability foundation descriptor map used by contract tests and docs.
 */
export const ENGINE_RUNTIME_OBSERVABILITY_FOUNDATION_API = {
  startTrace: {
    name: "engine.runtime.observability.startTrace",
    level: "foundation",
    stability: "beta",
    errorCodes: ["ENGINE_OBSERVABILITY_INVALID_INPUT"],
    determinism: "Same options and runtime clock yield the same started trace payload shape.",
  },
  stopTrace: {
    name: "engine.runtime.observability.stopTrace",
    level: "foundation",
    stability: "beta",
    errorCodes: ["ENGINE_OBSERVABILITY_TRACE_NOT_FOUND"],
    determinism: "Same trace id and trace state yield the same stop payload fields.",
  },
  getTrace: {
    name: "engine.runtime.observability.getTrace",
    level: "foundation",
    stability: "beta",
    errorCodes: ["ENGINE_OBSERVABILITY_TRACE_NOT_FOUND"],
    determinism: "Same trace id and trace state yield identical event sequences.",
  },
  getMetricsSnapshot: {
    name: "engine.runtime.observability.getMetricsSnapshot",
    level: "foundation",
    stability: "beta",
    errorCodes: ["ENGINE_OBSERVABILITY_INVALID_INPUT"],
    determinism: "Same runtime metrics state yields identical snapshot values.",
  },
  captureFrame: {
    name: "engine.runtime.observability.captureFrame",
    level: "foundation",
    stability: "beta",
    errorCodes: ["ENGINE_OBSERVABILITY_INVALID_INPUT"],
    determinism: "Same capture options and runtime frame state yield the same capture payload shape.",
  },
  createReplayToken: {
    name: "engine.runtime.observability.createReplayToken",
    level: "foundation",
    stability: "beta",
    errorCodes: ["ENGINE_OBSERVABILITY_INVALID_INPUT"],
    determinism: "Same scope and revision state yield deterministic replay token prefixes.",
  },
  replay: {
    name: "engine.runtime.observability.replay",
    level: "foundation",
    stability: "beta",
    errorCodes: ["ENGINE_OBSERVABILITY_INVALID_INPUT"],
    determinism: "Same replay token format yields the same acceptance result.",
  },
} as const satisfies Readonly<
  Record<
    | "startTrace"
    | "stopTrace"
    | "getTrace"
    | "getMetricsSnapshot"
    | "captureFrame"
    | "createReplayToken"
    | "replay",
    EngineRuntimeObservabilityFoundationApiDescriptor
  >
>;

/**
 * Resolves one runtime observability foundation API descriptor by key.
 * @param apiKey Descriptor key from the runtime observability foundation map.
 */
export function resolveEngineRuntimeObservabilityFoundationApiDescriptor(
  apiKey: keyof typeof ENGINE_RUNTIME_OBSERVABILITY_FOUNDATION_API,
): EngineRuntimeObservabilityFoundationApiDescriptor {
  return ENGINE_RUNTIME_OBSERVABILITY_FOUNDATION_API[apiKey];
}
