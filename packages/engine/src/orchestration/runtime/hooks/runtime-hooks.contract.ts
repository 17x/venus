/**
 * Runtime hooks API level classifications.
 */
export type EngineRuntimeHooksLevel = "developer";

/**
 * Runtime hooks API stability classifications.
 */
export type EngineRuntimeHooksStability = "beta";

/**
 * Error codes reserved for runtime hooks APIs.
 */
export type EngineRuntimeHooksErrorCode = "ENGINE_HOOKS_INVALID_LISTENER";

/**
 * Canonical runtime hook stage tokens.
 */
export type EngineRuntimeHookStage =
  | "beforeCompile"
  | "afterCompile"
  | "beforeRenderPlan"
  | "afterRenderPlan"
  | "beforeSubmit"
  | "afterSubmit";

/**
 * Runtime hook listener payload envelope.
 */
export interface EngineRuntimeHookEnvelope {
  /** Hook stage token for this callback invocation. */
  stage: EngineRuntimeHookStage;
  /** Monotonic timestamp in milliseconds. */
  timestamp: number;
  /** Stable engine session identifier. */
  engineId: string;
  /** Current document revision emitted by runtime state. */
  revision: string;
  /** Optional stage-specific context payload. */
  context?: unknown;
}

/**
 * Runtime hook listener function contract.
 */
export interface EngineRuntimeHookListener {
  /**
   * Handles one emitted runtime hook envelope.
   * @param payload Runtime hook envelope payload.
   */
  (payload: EngineRuntimeHookEnvelope): void;
}

/**
 * Runtime hook subscription options.
 */
export interface EngineRuntimeHookSubscriptionOptions {
  /** Optional scope token used by offAll operations. */
  scope?: "global" | "session" | "trace";
}

/**
 * Runtime hook listener stats snapshot.
 */
export interface EngineRuntimeHookListenerStats {
  /** Total listener count registered across all hook stages. */
  totalListeners: number;
  /** Deterministic per-stage listener count snapshot. */
  perStage: Readonly<Record<EngineRuntimeHookStage, number>>;
}

/**
 * API descriptor contract for one runtime hooks endpoint.
 */
export interface EngineRuntimeHooksApiDescriptor {
  /** Canonical runtime API method name. */
  name:
    | "engine.hooks.beforeCompile"
    | "engine.hooks.afterCompile"
    | "engine.hooks.beforeRenderPlan"
    | "engine.hooks.afterRenderPlan"
    | "engine.hooks.beforeSubmit"
    | "engine.hooks.afterSubmit"
    | "engine.hooks.offAll"
    | "engine.hooks.getStats";
  /** API layering classification. */
  level: EngineRuntimeHooksLevel;
  /** API stability tag. */
  stability: EngineRuntimeHooksStability;
  /** Reserved error code set for this endpoint. */
  errorCodes: readonly EngineRuntimeHooksErrorCode[];
  /** Determinism guarantee summary for endpoint behavior. */
  determinism: string;
}

/**
 * Runtime hooks descriptor map used by contract tests and docs.
 */
export const ENGINE_RUNTIME_HOOKS_API = {
  beforeCompile: {
    name: "engine.hooks.beforeCompile",
    level: "developer",
    stability: "beta",
    errorCodes: ["ENGINE_HOOKS_INVALID_LISTENER"],
    determinism: "Same stage input and listener registry state yield identical callback ordering.",
  },
  afterCompile: {
    name: "engine.hooks.afterCompile",
    level: "developer",
    stability: "beta",
    errorCodes: ["ENGINE_HOOKS_INVALID_LISTENER"],
    determinism: "Same stage input and listener registry state yield identical callback ordering.",
  },
  beforeRenderPlan: {
    name: "engine.hooks.beforeRenderPlan",
    level: "developer",
    stability: "beta",
    errorCodes: ["ENGINE_HOOKS_INVALID_LISTENER"],
    determinism: "Same stage input and listener registry state yield identical callback ordering.",
  },
  afterRenderPlan: {
    name: "engine.hooks.afterRenderPlan",
    level: "developer",
    stability: "beta",
    errorCodes: ["ENGINE_HOOKS_INVALID_LISTENER"],
    determinism: "Same stage input and listener registry state yield identical callback ordering.",
  },
  beforeSubmit: {
    name: "engine.hooks.beforeSubmit",
    level: "developer",
    stability: "beta",
    errorCodes: ["ENGINE_HOOKS_INVALID_LISTENER"],
    determinism: "Same stage input and listener registry state yield identical callback ordering.",
  },
  afterSubmit: {
    name: "engine.hooks.afterSubmit",
    level: "developer",
    stability: "beta",
    errorCodes: ["ENGINE_HOOKS_INVALID_LISTENER"],
    determinism: "Same stage input and listener registry state yield identical callback ordering.",
  },
  offAll: {
    name: "engine.hooks.offAll",
    level: "developer",
    stability: "beta",
    errorCodes: [],
    determinism: "Same scope input and listener registry state yield identical removal result.",
  },
  getStats: {
    name: "engine.hooks.getStats",
    level: "developer",
    stability: "beta",
    errorCodes: [],
    determinism: "Same listener registry state yields identical per-stage stats snapshot.",
  },
} as const satisfies Readonly<
  Record<
    | "beforeCompile"
    | "afterCompile"
    | "beforeRenderPlan"
    | "afterRenderPlan"
    | "beforeSubmit"
    | "afterSubmit"
    | "offAll"
    | "getStats",
    EngineRuntimeHooksApiDescriptor
  >
>;

/**
 * Resolves one runtime hooks API descriptor by key.
 * @param apiKey Descriptor key from the runtime hooks descriptor map.
 */
export function resolveEngineRuntimeHooksApiDescriptor(
  apiKey: keyof typeof ENGINE_RUNTIME_HOOKS_API,
): EngineRuntimeHooksApiDescriptor {
  return ENGINE_RUNTIME_HOOKS_API[apiKey];
}
