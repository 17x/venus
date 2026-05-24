/**
 * Stability level allowed for engine public runtime capabilities.
 */
export type EnginePublicApiStability = "stable" | "experimental";

/**
 * Runtime capability descriptor shape published for cross-layer integration checks.
 */
export interface EngineRuntimeCapabilityRecord {
  /** Canonical capability method name exposed to consumers. */
  name: string;
  /** Public entry signature used by consumers. */
  entry: string;
  /** Stability tag enforced by contract tests and governance docs. */
  stability: EnginePublicApiStability;
  /** Responsibility layer for this capability. */
  layer: "runtime";
  /** Short notes for migration/readability in diagnostics tools. */
  notes: string;
}

/**
 * Version marker for diagnostics capability snapshot payload compatibility.
 */
export const ENGINE_RUNTIME_CAPABILITY_SCHEMA_VERSION = 5;

/**
 * Single-source runtime capability registry consumed by docs/tests/tooling.
 */
export const ENGINE_RUNTIME_CAPABILITY_REGISTRY = [
  {
    name: "query",
    entry: "EngineHandle.query",
    stability: "stable",
    layer: "runtime",
    notes: "Runtime scene query capability.",
  },
  {
    name: "pick",
    entry: "EngineHandle.pick",
    stability: "stable",
    layer: "runtime",
    notes: "Runtime point-hit capability.",
  },
  {
    name: "raycast",
    entry: "EngineHandle.raycast",
    stability: "stable",
    layer: "runtime",
    notes: "Runtime ray-hit capability.",
  },
  {
    name: "getDiagnostics",
    entry: "EngineHandle.getDiagnostics",
    stability: "stable",
    layer: "runtime",
    notes: "Runtime diagnostics capability.",
  },
  {
    name: "runtimeDocumentCreateSnapshot",
    entry: "EngineHandle.runtime.document.createSnapshot",
    stability: "experimental",
    layer: "runtime",
    notes: "Runtime document create-snapshot capability.",
  },
  {
    name: "runtimeDocumentValidateSnapshot",
    entry: "EngineHandle.runtime.document.validateSnapshot",
    stability: "experimental",
    layer: "runtime",
    notes: "Runtime document validate-snapshot capability.",
  },
  {
    name: "runtimeDocumentGetRevision",
    entry: "EngineHandle.runtime.document.getRevision",
    stability: "experimental",
    layer: "runtime",
    notes: "Runtime document revision capability.",
  },
  {
    name: "runtimeDocumentGetSchemaVersion",
    entry: "EngineHandle.runtime.document.getSchemaVersion",
    stability: "experimental",
    layer: "runtime",
    notes: "Runtime document schema capability.",
  },
  {
    name: "runtimeDocumentApplyChangeSet",
    entry: "EngineHandle.runtime.document.applyChangeSet",
    stability: "experimental",
    layer: "runtime",
    notes: "Runtime document apply capability.",
  },
  {
    name: "runtimeDocumentPreflightApplyChangeSet",
    entry: "EngineHandle.runtime.document.preflightApplyChangeSet",
    stability: "experimental",
    layer: "runtime",
    notes: "Runtime document preflight-apply capability.",
  },
  {
    name: "runtimeDocumentDiffSnapshots",
    entry: "EngineHandle.runtime.document.diffSnapshots",
    stability: "experimental",
    layer: "runtime",
    notes: "Runtime document diff capability.",
  },
  {
    name: "runtimeDocumentRebaseChangeSet",
    entry: "EngineHandle.runtime.document.rebaseChangeSet",
    stability: "experimental",
    layer: "runtime",
    notes: "Runtime document rebase capability.",
  },
  {
    name: "runtimeDocumentSerializeSnapshot",
    entry: "EngineHandle.runtime.document.serializeSnapshot",
    stability: "experimental",
    layer: "runtime",
    notes: "Runtime document serialize capability.",
  },
  {
    name: "runtimeDocumentDeserializeSnapshot",
    entry: "EngineHandle.runtime.document.deserializeSnapshot",
    stability: "experimental",
    layer: "runtime",
    notes: "Runtime document deserialize capability.",
  },
  {
    name: "runtimeWorldCompileFromDocument",
    entry: "EngineHandle.runtime.world.compileFromDocument",
    stability: "experimental",
    layer: "runtime",
    notes: "Runtime world compile capability.",
  },
  {
    name: "runtimeWorldGetWorldSnapshot",
    entry: "EngineHandle.runtime.world.getWorldSnapshot",
    stability: "experimental",
    layer: "runtime",
    notes: "Runtime world snapshot capability.",
  },
  {
    name: "runtimeWorldQueryEntity",
    entry: "EngineHandle.runtime.world.queryEntity",
    stability: "experimental",
    layer: "runtime",
    notes: "Runtime world query-entity capability.",
  },
  {
    name: "runtimeWorldQueryComponent",
    entry: "EngineHandle.runtime.world.queryComponent",
    stability: "experimental",
    layer: "runtime",
    notes: "Runtime world query-component capability.",
  },
  {
    name: "runtimeWorldGetGraphStats",
    entry: "EngineHandle.runtime.world.getGraphStats",
    stability: "experimental",
    layer: "runtime",
    notes: "Runtime world stats capability.",
  },
  {
    name: "runtimeWorldClear",
    entry: "EngineHandle.runtime.world.clear",
    stability: "experimental",
    layer: "runtime",
    notes: "Runtime world clear capability.",
  },
  {
    name: "runtimeDirtyGetState",
    entry: "EngineHandle.runtime.dirty.getState",
    stability: "experimental",
    layer: "runtime",
    notes: "Runtime dirty-state capability.",
  },
  {
    name: "runtimeDirtyMark",
    entry: "EngineHandle.runtime.dirty.mark",
    stability: "experimental",
    layer: "runtime",
    notes: "Runtime dirty-mark capability.",
  },
  {
    name: "runtimeDirtyMarkBatch",
    entry: "EngineHandle.runtime.dirty.markBatch",
    stability: "experimental",
    layer: "runtime",
    notes: "Runtime dirty mark-batch capability.",
  },
  {
    name: "runtimeDirtyGetPendingDomains",
    entry: "EngineHandle.runtime.dirty.getPendingDomains",
    stability: "experimental",
    layer: "runtime",
    notes: "Runtime dirty pending-domains capability.",
  },
  {
    name: "runtimeDirtyFlush",
    entry: "EngineHandle.runtime.dirty.flush",
    stability: "experimental",
    layer: "runtime",
    notes: "Runtime dirty flush capability.",
  },
  {
    name: "runtimeDirtyReset",
    entry: "EngineHandle.runtime.dirty.reset",
    stability: "experimental",
    layer: "runtime",
    notes: "Runtime dirty reset capability.",
  },
  {
    name: "runtimeCommandEncode",
    entry: "EngineHandle.runtime.command.encode",
    stability: "experimental",
    layer: "runtime",
    notes: "Runtime command encode capability.",
  },
  {
    name: "runtimeCommandCreateEncoder",
    entry: "EngineHandle.runtime.command.createEncoder",
    stability: "experimental",
    layer: "runtime",
    notes: "Runtime command create-encoder capability.",
  },
  {
    name: "runtimeCommandValidate",
    entry: "EngineHandle.runtime.command.validate",
    stability: "experimental",
    layer: "runtime",
    notes: "Runtime command validate capability.",
  },
  {
    name: "runtimeCommandOptimize",
    entry: "EngineHandle.runtime.command.optimize",
    stability: "experimental",
    layer: "runtime",
    notes: "Runtime command optimize capability.",
  },
  {
    name: "runtimeCommandInspect",
    entry: "EngineHandle.runtime.command.inspect",
    stability: "experimental",
    layer: "runtime",
    notes: "Runtime command inspect capability.",
  },
  {
    name: "runtimeCommandReplay",
    entry: "EngineHandle.runtime.command.replay",
    stability: "experimental",
    layer: "runtime",
    notes: "Runtime command replay capability.",
  },
  {
    name: "runtimeBackendListAvailable",
    entry: "EngineHandle.runtime.backend.listAvailable",
    stability: "experimental",
    layer: "runtime",
    notes: "Runtime backend list capability.",
  },
  {
    name: "runtimeBackendSelect",
    entry: "EngineHandle.runtime.backend.select",
    stability: "experimental",
    layer: "runtime",
    notes: "Runtime backend select capability.",
  },
  {
    name: "runtimeBackendGetActive",
    entry: "EngineHandle.runtime.backend.getActive",
    stability: "experimental",
    layer: "runtime",
    notes: "Runtime backend active capability.",
  },
  {
    name: "runtimeBackendGetCapabilities",
    entry: "EngineHandle.runtime.backend.getCapabilities",
    stability: "experimental",
    layer: "runtime",
    notes: "Runtime backend capabilities capability.",
  },
  {
    name: "runtimeBackendGetLimits",
    entry: "EngineHandle.runtime.backend.getLimits",
    stability: "experimental",
    layer: "runtime",
    notes: "Runtime backend limits capability.",
  },
  {
    name: "runtimeBackendGetFallbackTrace",
    entry: "EngineHandle.runtime.backend.getFallbackTrace",
    stability: "experimental",
    layer: "runtime",
    notes: "Runtime backend fallback capability.",
  },
  {
    name: "runtimeBackendProbeHeadless",
    entry: "EngineHandle.runtime.backend.probeHeadless",
    stability: "experimental",
    layer: "runtime",
    notes: "Runtime backend probe-headless capability.",
  },
  {
    name: "runtimePlanCreateFramePlan",
    entry: "EngineHandle.runtime.plan.createFramePlan",
    stability: "experimental",
    layer: "runtime",
    notes: "Runtime plan frame capability.",
  },
  {
    name: "runtimePlanCreateVisibilityPlan",
    entry: "EngineHandle.runtime.plan.createVisibilityPlan",
    stability: "experimental",
    layer: "runtime",
    notes: "Runtime plan visibility capability.",
  },
  {
    name: "runtimePlanCreateLodPlan",
    entry: "EngineHandle.runtime.plan.createLodPlan",
    stability: "experimental",
    layer: "runtime",
    notes: "Runtime plan LOD capability.",
  },
  {
    name: "runtimePlanCreateRoiPlan",
    entry: "EngineHandle.runtime.plan.createRoiPlan",
    stability: "experimental",
    layer: "runtime",
    notes: "Runtime plan ROI capability.",
  },
  {
    name: "runtimePlanCreateBudgetPlan",
    entry: "EngineHandle.runtime.plan.createBudgetPlan",
    stability: "experimental",
    layer: "runtime",
    notes: "Runtime plan budget capability.",
  },
  {
    name: "runtimePlanInspect",
    entry: "EngineHandle.runtime.plan.inspect",
    stability: "experimental",
    layer: "runtime",
    notes: "Runtime plan inspect capability.",
  },
  {
    name: "runtimeVolumeCreateSlicePlan",
    entry: "EngineHandle.runtime.volume.createSlicePlan",
    stability: "experimental",
    layer: "runtime",
    notes: "Runtime volume slice-plan capability.",
  },
  {
    name: "runtimeVolumeResolveTransferFunction",
    entry: "EngineHandle.runtime.volume.resolveTransferFunction",
    stability: "experimental",
    layer: "runtime",
    notes: "Runtime volume transfer-function capability.",
  },
  {
    name: "runtimeVolumeResolveResidencyBudget",
    entry: "EngineHandle.runtime.volume.resolveResidencyBudget",
    stability: "experimental",
    layer: "runtime",
    notes: "Runtime volume residency-budget capability.",
  },
  {
    name: "runtimeResourceRegister",
    entry: "EngineHandle.runtime.resource.register",
    stability: "experimental",
    layer: "runtime",
    notes: "Runtime resource register capability.",
  },
  {
    name: "runtimeResourceUpdate",
    entry: "EngineHandle.runtime.resource.update",
    stability: "experimental",
    layer: "runtime",
    notes: "Runtime resource update capability.",
  },
  {
    name: "runtimeResourceRelease",
    entry: "EngineHandle.runtime.resource.release",
    stability: "experimental",
    layer: "runtime",
    notes: "Runtime resource release capability.",
  },
  {
    name: "runtimeResourcePin",
    entry: "EngineHandle.runtime.resource.pin",
    stability: "experimental",
    layer: "runtime",
    notes: "Runtime resource pin capability.",
  },
  {
    name: "runtimeResourceUnpin",
    entry: "EngineHandle.runtime.resource.unpin",
    stability: "experimental",
    layer: "runtime",
    notes: "Runtime resource unpin capability.",
  },
  {
    name: "runtimeResourceGetResidency",
    entry: "EngineHandle.runtime.resource.getResidency",
    stability: "experimental",
    layer: "runtime",
    notes: "Runtime resource residency capability.",
  },
  {
    name: "runtimeResourceCollectGarbage",
    entry: "EngineHandle.runtime.resource.collectGarbage",
    stability: "experimental",
    layer: "runtime",
    notes: "Runtime resource GC capability.",
  },
  {
    name: "runtimeObservabilityStartTrace",
    entry: "EngineHandle.runtime.observability.startTrace",
    stability: "experimental",
    layer: "runtime",
    notes: "Runtime observability trace-start capability.",
  },
  {
    name: "runtimeObservabilityStopTrace",
    entry: "EngineHandle.runtime.observability.stopTrace",
    stability: "experimental",
    layer: "runtime",
    notes: "Runtime observability trace-stop capability.",
  },
  {
    name: "runtimeObservabilityGetTrace",
    entry: "EngineHandle.runtime.observability.getTrace",
    stability: "experimental",
    layer: "runtime",
    notes: "Runtime observability trace-get capability.",
  },
  {
    name: "runtimeObservabilityGetMetricsSnapshot",
    entry: "EngineHandle.runtime.observability.getMetricsSnapshot",
    stability: "experimental",
    layer: "runtime",
    notes: "Runtime observability metrics capability.",
  },
  {
    name: "runtimeObservabilityCaptureFrame",
    entry: "EngineHandle.runtime.observability.captureFrame",
    stability: "experimental",
    layer: "runtime",
    notes: "Runtime observability capture capability.",
  },
  {
    name: "runtimeObservabilityCreateReplayToken",
    entry: "EngineHandle.runtime.observability.createReplayToken",
    stability: "experimental",
    layer: "runtime",
    notes: "Runtime observability replay-token capability.",
  },
  {
    name: "runtimeObservabilityReplay",
    entry: "EngineHandle.runtime.observability.replay",
    stability: "experimental",
    layer: "runtime",
    notes: "Runtime observability replay capability.",
  },
] as const satisfies readonly EngineRuntimeCapabilityRecord[];

/**
 * Runtime capability name union derived from the single-source registry.
 */
export type EngineRuntimeCapabilityName = typeof ENGINE_RUNTIME_CAPABILITY_REGISTRY[number]["name"];

/**
 * Runtime capability entry union derived from the single-source registry.
 */
export type EngineRuntimeCapabilityEntry = typeof ENGINE_RUNTIME_CAPABILITY_REGISTRY[number]["entry"];

/**
 * Runtime capability descriptor published for cross-layer integration checks.
 */
export interface EngineRuntimeCapabilityDescriptor extends Omit<EngineRuntimeCapabilityRecord, "name" | "entry"> {
  /** Canonical capability method name exposed to consumers. */
  name: EngineRuntimeCapabilityName;
  /** Public entry signature used by consumers. */
  entry: EngineRuntimeCapabilityEntry;
}

/**
 * Builds one name-indexed runtime capability map from the canonical registry.
 * @param registry Single-source runtime capability registry entries.
 */
function resolveRuntimeCapabilityMapFromRegistry(
  registry: readonly EngineRuntimeCapabilityDescriptor[],
): Readonly<Record<EngineRuntimeCapabilityName, EngineRuntimeCapabilityDescriptor>> {
  const map: Partial<Record<EngineRuntimeCapabilityName, EngineRuntimeCapabilityDescriptor>> = {};
  for (const descriptor of registry) {
    map[descriptor.name] = descriptor;
  }
  return map as Readonly<Record<EngineRuntimeCapabilityName, EngineRuntimeCapabilityDescriptor>>;
}

/**
 * Declares the canonical runtime capability map consumed by docs/tests/tooling.
 */
export const ENGINE_RUNTIME_CAPABILITY_MAP = resolveRuntimeCapabilityMapFromRegistry(
  ENGINE_RUNTIME_CAPABILITY_REGISTRY,
);

/**
 * Resolves one runtime capability descriptor by canonical method name.
 * @param name Capability method name.
 */
export function resolveEngineRuntimeCapabilityDescriptor(
  name: EngineRuntimeCapabilityName,
): EngineRuntimeCapabilityDescriptor {
  return ENGINE_RUNTIME_CAPABILITY_MAP[name];
}
