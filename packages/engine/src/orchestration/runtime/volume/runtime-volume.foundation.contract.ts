/**
 * Runtime volume foundation API level classifications.
 */
export type EngineRuntimeVolumeFoundationLevel = "foundation";

/**
 * Runtime volume foundation stability classifications.
 */
export type EngineRuntimeVolumeFoundationStability = "beta";

/**
 * Error codes reserved for runtime volume foundation APIs.
 */
export type EngineRuntimeVolumeFoundationErrorCode =
  | "ENGINE_VOLUME_INVALID_DESCRIPTOR"
  | "ENGINE_VOLUME_RESOURCE_NOT_FOUND";

/**
 * API descriptor contract for one runtime volume foundation endpoint.
 */
export interface EngineRuntimeVolumeFoundationApiDescriptor {
  /** Canonical runtime API method name. */
  name:
    | "engine.runtime.volume.createSlicePlan"
    | "engine.runtime.volume.resolveTransferFunction"
    | "engine.runtime.volume.resolveResidencyBudget";
  /** API layering classification. */
  level: EngineRuntimeVolumeFoundationLevel;
  /** API stability tag. */
  stability: EngineRuntimeVolumeFoundationStability;
  /** Reserved error code set for this endpoint. */
  errorCodes: readonly EngineRuntimeVolumeFoundationErrorCode[];
  /** Determinism guarantee summary for endpoint behavior. */
  determinism: string;
}

/**
 * Runtime volume foundation descriptor map used by contract tests and docs.
 */
export const ENGINE_RUNTIME_VOLUME_FOUNDATION_API = {
  createSlicePlan: {
    name: "engine.runtime.volume.createSlicePlan",
    level: "foundation",
    stability: "beta",
    errorCodes: ["ENGINE_VOLUME_INVALID_DESCRIPTOR"],
    determinism: "Same volume id, axis, slice index, and slab options yield the same slice-plan output.",
  },
  resolveTransferFunction: {
    name: "engine.runtime.volume.resolveTransferFunction",
    level: "foundation",
    stability: "beta",
    errorCodes: ["ENGINE_VOLUME_INVALID_DESCRIPTOR"],
    determinism: "Same window and stop input yields the same normalized transfer-function payload.",
  },
  resolveResidencyBudget: {
    name: "engine.runtime.volume.resolveResidencyBudget",
    level: "foundation",
    stability: "beta",
    errorCodes: ["ENGINE_VOLUME_RESOURCE_NOT_FOUND", "ENGINE_VOLUME_INVALID_DESCRIPTOR"],
    determinism: "Same budget input and resource residency state yield the same budget summary output.",
  },
} as const satisfies Readonly<
  Record<
    | "createSlicePlan"
    | "resolveTransferFunction"
    | "resolveResidencyBudget",
    EngineRuntimeVolumeFoundationApiDescriptor
  >
>;

/**
 * Resolves one runtime volume foundation API descriptor by key.
 * @param apiKey Descriptor key from the runtime volume foundation map.
 */
export function resolveEngineRuntimeVolumeFoundationApiDescriptor(
  apiKey: keyof typeof ENGINE_RUNTIME_VOLUME_FOUNDATION_API,
): EngineRuntimeVolumeFoundationApiDescriptor {
  return ENGINE_RUNTIME_VOLUME_FOUNDATION_API[apiKey];
}
