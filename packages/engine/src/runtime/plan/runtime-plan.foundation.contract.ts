/**
 * Runtime plan foundation API level classifications.
 */
export type EngineRuntimePlanFoundationLevel = "foundation";

/**
 * Runtime plan foundation stability classifications.
 */
export type EngineRuntimePlanFoundationStability = "beta";

/**
 * Error codes reserved for runtime plan foundation APIs.
 */
export type EngineRuntimePlanFoundationErrorCode =
  | "ENGINE_PLAN_INVALID_REQUEST"
  | "ENGINE_PLAN_INSPECT_INVALID";

/**
 * API descriptor contract for one runtime plan foundation endpoint.
 */
export interface EngineRuntimePlanFoundationApiDescriptor {
  /** Canonical runtime API method name. */
  name:
    | "engine.runtime.plan.createFramePlan"
    | "engine.runtime.plan.createVisibilityPlan"
    | "engine.runtime.plan.createLodPlan"
    | "engine.runtime.plan.createRoiPlan"
    | "engine.runtime.plan.createBudgetPlan"
    | "engine.runtime.plan.inspect";
  /** API layering classification. */
  level: EngineRuntimePlanFoundationLevel;
  /** API stability tag. */
  stability: EngineRuntimePlanFoundationStability;
  /** Reserved error code set for this endpoint. */
  errorCodes: readonly EngineRuntimePlanFoundationErrorCode[];
  /** Determinism guarantee summary for endpoint behavior. */
  determinism: string;
}

/**
 * Runtime plan foundation descriptor map used by contract tests and docs.
 */
export const ENGINE_RUNTIME_PLAN_FOUNDATION_API = {
  createFramePlan: {
    name: "engine.runtime.plan.createFramePlan",
    level: "foundation",
    stability: "beta",
    errorCodes: ["ENGINE_PLAN_INVALID_REQUEST"],
    determinism: "Same request and runtime frame state yield the same frame-plan output.",
  },
  createVisibilityPlan: {
    name: "engine.runtime.plan.createVisibilityPlan",
    level: "foundation",
    stability: "beta",
    errorCodes: ["ENGINE_PLAN_INVALID_REQUEST"],
    determinism: "Same candidate id list yields the same visible id sequence.",
  },
  createLodPlan: {
    name: "engine.runtime.plan.createLodPlan",
    level: "foundation",
    stability: "beta",
    errorCodes: ["ENGINE_PLAN_INVALID_REQUEST"],
    determinism: "Same scale and threshold yield the same lodLevel and threshold output.",
  },
  createRoiPlan: {
    name: "engine.runtime.plan.createRoiPlan",
    level: "foundation",
    stability: "beta",
    errorCodes: ["ENGINE_PLAN_INVALID_REQUEST"],
    determinism: "Same bounds and margin inputs yield the same ROI output bounds.",
  },
  createBudgetPlan: {
    name: "engine.runtime.plan.createBudgetPlan",
    level: "foundation",
    stability: "beta",
    errorCodes: ["ENGINE_PLAN_INVALID_REQUEST"],
    determinism: "Same pressure signals yield the same pressure and reason values.",
  },
  inspect: {
    name: "engine.runtime.plan.inspect",
    level: "foundation",
    stability: "beta",
    errorCodes: ["ENGINE_PLAN_INSPECT_INVALID"],
    determinism: "Same plan payload shape yields the same inspect validity and summary.",
  },
} as const satisfies Readonly<
  Record<
    | "createFramePlan"
    | "createVisibilityPlan"
    | "createLodPlan"
    | "createRoiPlan"
    | "createBudgetPlan"
    | "inspect",
    EngineRuntimePlanFoundationApiDescriptor
  >
>;

/**
 * Resolves one runtime plan foundation API descriptor by key.
 * @param apiKey Descriptor key from the runtime plan foundation map.
 */
export function resolveEngineRuntimePlanFoundationApiDescriptor(
  apiKey: keyof typeof ENGINE_RUNTIME_PLAN_FOUNDATION_API,
): EngineRuntimePlanFoundationApiDescriptor {
  return ENGINE_RUNTIME_PLAN_FOUNDATION_API[apiKey];
}
