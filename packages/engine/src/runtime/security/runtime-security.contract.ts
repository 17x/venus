/**
 * Runtime security API level classifications.
 */
export type EngineRuntimeSecurityLevel = "developer";

/**
 * Runtime security API stability classifications.
 */
export type EngineRuntimeSecurityStability = "beta";

/**
 * Error codes reserved for runtime security APIs.
 */
export type EngineRuntimeSecurityErrorCode =
  | "ENGINE_SECURITY_INVALID_TRUST_LEVEL"
  | "ENGINE_SECURITY_INVALID_POLICY"
  | "ENGINE_SECURITY_QUOTA_EXCEEDED";

/**
 * Canonical trust-level tokens accepted by security APIs.
 */
export type EngineRuntimeTrustLevel = "low" | "standard" | "high";

/**
 * Resource-access policy payload accepted by security APIs.
 */
export type EngineRuntimeSecurityPolicy = Readonly<Record<string, unknown>>;

/**
 * Security audit entry contract returned by audit-log APIs.
 */
export interface EngineRuntimeSecurityAuditEntry {
  /** Stable audit entry id. */
  id: string;
  /** Audit event type token. */
  type: string;
  /** Audit timestamp in milliseconds. */
  timestamp: number;
  /** Audit payload object. */
  payload: Readonly<Record<string, unknown>>;
}

/**
 * API descriptor contract for one runtime security endpoint.
 */
export interface EngineRuntimeSecurityApiDescriptor {
  /** Canonical runtime API method name. */
  name:
    | "engine.security.setTrustLevel"
    | "engine.security.setResourceAccessPolicy"
    | "engine.security.getAuditLog";
  /** API layering classification. */
  level: EngineRuntimeSecurityLevel;
  /** API stability tag. */
  stability: EngineRuntimeSecurityStability;
  /** Reserved error code set for this endpoint. */
  errorCodes: readonly EngineRuntimeSecurityErrorCode[];
  /** Determinism guarantee summary for endpoint behavior. */
  determinism: string;
}

/**
 * Runtime security descriptor map used by contract tests and docs.
 */
export const ENGINE_RUNTIME_SECURITY_API = {
  setTrustLevel: {
    name: "engine.security.setTrustLevel",
    level: "developer",
    stability: "beta",
    errorCodes: ["ENGINE_SECURITY_INVALID_TRUST_LEVEL"],
    determinism: "Same trust-level input and same state yield the same trust-level result.",
  },
  setResourceAccessPolicy: {
    name: "engine.security.setResourceAccessPolicy",
    level: "developer",
    stability: "beta",
    errorCodes: ["ENGINE_SECURITY_INVALID_POLICY", "ENGINE_SECURITY_QUOTA_EXCEEDED"],
    determinism: "Same security policy input and same state yield the same policy result.",
  },
  getAuditLog: {
    name: "engine.security.getAuditLog",
    level: "developer",
    stability: "beta",
    errorCodes: [],
    determinism: "Same audit registry state and same limit input yield the same audit-log slice.",
  },
} as const satisfies Readonly<
  Record<"setTrustLevel" | "setResourceAccessPolicy" | "getAuditLog", EngineRuntimeSecurityApiDescriptor>
>;

/**
 * Resolves one runtime security API descriptor by key.
 * @param apiKey Descriptor key from the runtime security descriptor map.
 */
export function resolveEngineRuntimeSecurityApiDescriptor(
  apiKey: keyof typeof ENGINE_RUNTIME_SECURITY_API,
): EngineRuntimeSecurityApiDescriptor {
  return ENGINE_RUNTIME_SECURITY_API[apiKey];
}
