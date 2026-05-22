/**
 * Runtime policy API level classifications.
 */
export type EngineRuntimePolicyLevel = "developer";

/**
 * Runtime policy API stability classifications.
 */
export type EngineRuntimePolicyStability = "beta";

/**
 * Error codes reserved for runtime policy APIs.
 */
export type EngineRuntimePolicyErrorCode =
  | "ENGINE_POLICY_INVALID_INPUT"
  | "ENGINE_POLICY_CONFLICT";

/**
 * Policy payload contract accepted by policy setters.
 */
export type EngineRuntimePolicyInput = Readonly<Record<string, unknown>>;

/**
 * Effective policy snapshot contract returned by getEffectivePolicy.
 */
export interface EngineRuntimeEffectivePolicy {
  /** Effective render policy payload. */
  render: EngineRuntimePolicyInput;
  /** Effective resource policy payload. */
  resource: EngineRuntimePolicyInput;
  /** Effective fallback policy payload. */
  fallback: EngineRuntimePolicyInput;
}

/**
 * API descriptor contract for one runtime policy endpoint.
 */
export interface EngineRuntimePolicyApiDescriptor {
  /** Canonical runtime API method name. */
  name:
    | "engine.policy.setRenderPolicy"
    | "engine.policy.setResourcePolicy"
    | "engine.policy.setFallbackPolicy"
    | "engine.policy.getEffectivePolicy";
  /** API layering classification. */
  level: EngineRuntimePolicyLevel;
  /** API stability tag. */
  stability: EngineRuntimePolicyStability;
  /** Reserved error code set for this endpoint. */
  errorCodes: readonly EngineRuntimePolicyErrorCode[];
  /** Determinism guarantee summary for endpoint behavior. */
  determinism: string;
}

/**
 * Runtime policy descriptor map used by contract tests and docs.
 */
export const ENGINE_RUNTIME_POLICY_API = {
  setRenderPolicy: {
    name: "engine.policy.setRenderPolicy",
    level: "developer",
    stability: "beta",
    errorCodes: ["ENGINE_POLICY_INVALID_INPUT", "ENGINE_POLICY_CONFLICT"],
    determinism: "Same policy input and same current policy state yield the same render policy result.",
  },
  setResourcePolicy: {
    name: "engine.policy.setResourcePolicy",
    level: "developer",
    stability: "beta",
    errorCodes: ["ENGINE_POLICY_INVALID_INPUT", "ENGINE_POLICY_CONFLICT"],
    determinism: "Same policy input and same current policy state yield the same resource policy result.",
  },
  setFallbackPolicy: {
    name: "engine.policy.setFallbackPolicy",
    level: "developer",
    stability: "beta",
    errorCodes: ["ENGINE_POLICY_INVALID_INPUT", "ENGINE_POLICY_CONFLICT"],
    determinism: "Same policy input and same current policy state yield the same fallback policy result.",
  },
  getEffectivePolicy: {
    name: "engine.policy.getEffectivePolicy",
    level: "developer",
    stability: "beta",
    errorCodes: [],
    determinism: "Same policy registry state yields the same effective policy snapshot.",
  },
} as const satisfies Readonly<
  Record<"setRenderPolicy" | "setResourcePolicy" | "setFallbackPolicy" | "getEffectivePolicy", EngineRuntimePolicyApiDescriptor>
>;

/**
 * Resolves one runtime policy API descriptor by key.
 * @param apiKey Descriptor key from the runtime policy descriptor map.
 */
export function resolveEngineRuntimePolicyApiDescriptor(
  apiKey: keyof typeof ENGINE_RUNTIME_POLICY_API,
): EngineRuntimePolicyApiDescriptor {
  return ENGINE_RUNTIME_POLICY_API[apiKey];
}
