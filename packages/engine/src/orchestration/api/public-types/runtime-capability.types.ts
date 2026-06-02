import type {
  EngineBackendMode,
  EngineDiagnosticsSnapshot,
  EnginePickOptions,
  EnginePickPointInput,
  EnginePickResult,
  EngineQueryBoundsInput,
  EngineQueryResult,
  EngineRayInput,
  EngineRaycastHit,
  EngineRaycastOptions,
} from "./core-foundation.types";
import type {
  EnginePublicMetricsOutput,
} from "./facade-extensions.types";
import type {
  EngineRuntimeCommandEncodeInput,
  EngineRuntimeCommandEncodeOutput,
  EngineRuntimeCommandValidateInput,
  EngineRuntimeCommandValidateOutput,
  EngineRuntimeDirtyFlushOutput,
  EngineRuntimeDirtyMarkInput,
  EngineRuntimeDirtyStateOutput,
  EngineRuntimeDocumentApplyChangeSetInput,
  EngineRuntimeDocumentApplyChangeSetResult,
  EngineRuntimeFramePlanOutput,
  EngineRuntimePlanFrameRequest,
  EngineRuntimeWorldGraphStatsOutput,
  EngineRuntimeWorldSnapshotOutput,
} from "./runtime-document-world.types";
import type {
  EngineRuntimeBackendApi,
  EngineRuntimeBackendFallbackHistoryOutput,
  EngineRuntimeBackendStateOutput,
  EngineRuntimeCaptureFrameInput,
  EngineRuntimeCaptureFrameOutput,
  EngineRuntimeCollisionApi,
  EngineRuntimeCommandApi,
  EngineRuntimeCommandTraceOutput,
  EngineRuntimeCompileTriggerOutput,
  EngineRuntimeDirtyApi,
  EngineRuntimeDocumentApi,
  EngineRuntimeGetTraceOutput,
  EngineRuntimeObservabilityApi,
  EngineRuntimeNavigationApi,
  EngineRuntimePlanApi,
  EngineRuntimePlanInspectOutput,
  EngineRuntimeReplayOutput,
  EngineRuntimeReplayTokenOutput,
  EngineRuntimeResourceApi,
  EngineRuntimeLightingApi,
  EngineRuntimeVolumeApi,
  EngineRuntimeSpatialQueryOutput,
  EngineRuntimeSubmitOutput,
  EngineRuntimeUploadBatchOutput,
  EngineRuntimeBarrierPlanOutput,
  EngineRuntimeBarrierApplyOutput,
  EngineRuntimeReadbackOutput,
  EngineRuntimeGpuResourceDescriptor,
  EngineRuntimeGpuResourceOutput,
  EngineRuntimeWorldApi,
} from "./runtime-services.types";

export interface EngineRuntimeApi {
  /** Returns current runtime document snapshot. */
  getDocumentSnapshot: () => import("../../../kernel/document/document-contracts").EngineDocumentSnapshot;
  /** Returns current runtime document revision. */
  getDocumentRevision: () => number;
  /** Applies one runtime change-set through document execution path. */
  applyChangeSet: (input: EngineRuntimeDocumentApplyChangeSetInput) => EngineRuntimeDocumentApplyChangeSetResult;
  /** Compiles runtime world from optional document snapshot. */
  compileWorld: (options?: { snapshot?: import("../../../kernel/document/document-contracts").EngineDocumentSnapshot }) => EngineRuntimeWorldSnapshotOutput;
  /** Returns current runtime world snapshot. */
  getRuntimeWorld: () => EngineRuntimeWorldSnapshotOutput;
  /** Returns current runtime world stats. */
  getRuntimeWorldStats: () => EngineRuntimeWorldGraphStatsOutput;
  /** Returns current runtime dirty state. */
  getDirtyState: () => EngineRuntimeDirtyStateOutput;
  /** Marks one runtime dirty domain. */
  markDirty: (domain: EngineRuntimeDirtyMarkInput["domain"], token: string) => EngineRuntimeDirtyStateOutput;
  /** Flushes requested runtime dirty domains. */
  flushDirtyState: (domains: readonly EngineRuntimeDirtyMarkInput["domain"][]) => EngineRuntimeDirtyFlushOutput;
  /** Schedules one incremental compile cycle. */
  scheduleIncrementalCompile: (options?: { reason?: string }) => EngineRuntimeCompileTriggerOutput;
  /** Forces one full compile cycle with explicit reason. */
  forceFullCompile: (reason: string) => EngineRuntimeCompileTriggerOutput;
  /** Creates one runtime render plan. */
  createRenderPlan: (request: EngineRuntimePlanFrameRequest) => EngineRuntimeFramePlanOutput;
  /** Inspects one runtime render plan payload. */
  inspectRenderPlan: (plan: unknown) => EngineRuntimePlanInspectOutput;
  /** Encodes one runtime command buffer. */
  encodeCommandBuffer: (plan: EngineRuntimeCommandEncodeInput) => EngineRuntimeCommandEncodeOutput;
  /** Validates one runtime command buffer. */
  validateCommandBuffer: (buffer: EngineRuntimeCommandValidateInput) => EngineRuntimeCommandValidateOutput;
  /** Submits one runtime command buffer. */
  submit: (commandBuffer: EngineRuntimeCommandValidateInput) => EngineRuntimeSubmitOutput;
  /** Submits one runtime command-buffer batch. */
  submitBatch: (commandBuffers: readonly EngineRuntimeCommandValidateInput[]) => EngineRuntimeSubmitOutput;
  /** Creates one runtime GPU resource descriptor record. */
  createGpuResource: (descriptor: EngineRuntimeGpuResourceDescriptor) => EngineRuntimeGpuResourceOutput;
  /** Updates one runtime GPU resource descriptor record. */
  updateGpuResource: (resourceId: string, patch: Readonly<Record<string, unknown>>) => EngineRuntimeGpuResourceOutput;
  /** Destroys one runtime GPU resource descriptor record. */
  destroyGpuResource: (resourceId: string) => EngineRuntimeGpuResourceOutput;
  /** Creates one runtime upload batch. */
  createUploadBatch: (request: { resourceIds: readonly string[] }) => EngineRuntimeUploadBatchOutput;
  /** Creates one runtime barrier plan. */
  createBarrierPlan: (request: { resourceIds: readonly string[] }) => EngineRuntimeBarrierPlanOutput;
  /** Applies one runtime barrier plan. */
  applyBarrierPlan: (plan: { planId: string }) => EngineRuntimeBarrierApplyOutput;
  /** Reads back one runtime resource. */
  readbackResource: (request: { resourceId: string }) => EngineRuntimeReadbackOutput;
  /** Queries viewport candidates through runtime spatial path. */
  queryViewportCandidates: (query: EngineQueryBoundsInput) => EngineRuntimeSpatialQueryOutput;
  /** Queries frustum-visible set through runtime spatial path. */
  queryFrustumVisibleSet: (query: Readonly<Record<string, unknown>>) => EngineRuntimeSpatialQueryOutput;
  /** Resolves one runtime planar hit-test operation. */
  hitTestPlanar: (point: EnginePickPointInput, options?: EnginePickOptions) => EnginePickResult;
  /** Resolves one runtime ray hit-test operation. */
  hitTestRay: (ray: EngineRayInput, options?: EngineRaycastOptions) => EngineRaycastHit | null;
  /** Queries runtime spatial index. */
  querySpatialIndex: (query: Readonly<Record<string, unknown>>) => EngineRuntimeSpatialQueryOutput;
  /** Returns runtime backend state. */
  getBackendState: () => EngineRuntimeBackendStateOutput;
  /** Switches runtime backend preference and returns resolved state. */
  switchBackend: (target: EngineBackendMode | "auto", options?: Readonly<Record<string, unknown>>) => EngineRuntimeBackendStateOutput;
  /** Returns runtime backend fallback history. */
  getBackendFallbackHistory: () => EngineRuntimeBackendFallbackHistoryOutput;
  /** Sets runtime backend debug options. */
  setBackendDebugOptions: (options: Readonly<Record<string, unknown>>) => { accepted: boolean };
  /** Captures one runtime frame token. */
  captureFrame: (options?: EngineRuntimeCaptureFrameInput) => EngineRuntimeCaptureFrameOutput;
  /** Captures one runtime command-trace snapshot. */
  captureCommandTrace: (options?: { label?: string }) => EngineRuntimeCommandTraceOutput;
  /** Creates one deterministic runtime replay token. */
  createReplayToken: (scope: string) => EngineRuntimeReplayTokenOutput;
  /** Replays one deterministic runtime token. */
  replay: (token: string) => EngineRuntimeReplayOutput;
  /** Returns current runtime metrics snapshot. */
  getMetrics: () => EnginePublicMetricsOutput;
  /** Returns one runtime trace by trace id. */
  getTrace: (traceId: string) => EngineRuntimeGetTraceOutput;
  /** Document foundation API namespace. */
  document: EngineRuntimeDocumentApi;
  /** Runtime world foundation API namespace. */
  world: EngineRuntimeWorldApi;
  /** Runtime navigation API namespace. */
  navigation: EngineRuntimeNavigationApi;
  /** Runtime collision API namespace. */
  collision: EngineRuntimeCollisionApi;
  /** Dirty foundation API namespace. */
  dirty: EngineRuntimeDirtyApi;
  /** Command foundation API namespace. */
  command: EngineRuntimeCommandApi;
  /** Backend foundation API namespace. */
  backend: EngineRuntimeBackendApi;
  /** Render-planning foundation API namespace. */
  plan: EngineRuntimePlanApi;
  /** Volume foundation API namespace. */
  volume: EngineRuntimeVolumeApi;
  /** Lighting foundation API namespace. */
  lighting: EngineRuntimeLightingApi;
  /** Runtime resource foundation API namespace. */
  resource: EngineRuntimeResourceApi;
  /** Runtime observability foundation API namespace. */
  observability: EngineRuntimeObservabilityApi;
}

/**
 * Capability spatial pack contract exposed under engine.capability.spatial.
 */
export interface EngineCapabilitySpatialApi {
  /**
   * Resolves deterministic spatial query results from world-space bounds.
   */
  query: (query: EngineQueryBoundsInput) => EngineQueryResult;
  /**
   * Creates unified hit geometry payload for pointer/selection/marquee strategy.
   */
  createHitGeometryPayload: (
    request: import("../../../kernel/interaction/geometryPayload").ResolveEngineGeometryPayloadOptions,
  ) => import("../../../kernel/interaction/geometryPayload").EngineGeometryPayload;
}

/**
 * Capability geometry pack contract exposed under engine.capability.geometry.
 */
export interface EngineCapabilityGeometryApi {
  /**
   * Resolves matrix-based transform metadata from source box transform fields.
   */
  computeNodeTransform: (
    source: import("../../../kernel/interaction/shapeTransform").BoxTransformSource,
  ) => import("../../../kernel/interaction/shapeTransform").ResolvedNodeTransform;
  /**
   * Serializes one resolved node transform into SVG transform syntax.
   */
  formatNodeSvgTransform: (
    transform: import("../../../kernel/interaction/shapeTransform").ResolvedNodeTransform,
  ) => string | undefined;
}

/**
 * Capability picking pack contract exposed under engine.capability.picking.
 */
export interface EngineCapabilityPickingApi {
  /**
   * Resolves deterministic point pick results.
   */
  pick: (point: EnginePickPointInput, options?: EnginePickOptions) => EnginePickResult;
  /**
   * Resolves deterministic raycast results.
   */
  raycast: (ray: EngineRayInput, options?: EngineRaycastOptions) => EngineRaycastHit | null;
  /**
   * Resolves adaptive hit tolerance from viewport/tuning options.
   */
  getAdaptiveTolerance: (
    options?: import("../../../kernel/interaction/hitTolerance").ResolveEngineAdaptiveHitToleranceOptions,
  ) => import("../../../kernel/interaction/hitTolerance").EngineAdaptiveHitTolerance;
}

/**
 * Capability diagnostics pack contract exposed under engine.capability.diagnostics.
 */
export interface EngineCapabilityDiagnosticsApi {
  /**
   * Returns public diagnostics summary for capability-oriented tooling.
   */
  getSummary: () => EngineDiagnosticsSnapshot;
}

/**
 * Capability replay pack contract exposed under engine.capability.replay.
 */
export interface EngineCapabilityReplayApi {
  /**
   * Creates one deterministic replay token from provided scope.
   */
  createToken: (scope: string) => EngineRuntimeReplayTokenOutput;
  /**
   * Validates token shape for replay pipeline acceptance.
   */
  validateToken: (token: string) => { valid: boolean };
  /**
   * Runs one replay token through runtime replay pipeline.
   */
  run: (token: string) => EngineRuntimeReplayOutput;
  /**
   * Exports one replay payload descriptor for external tooling.
   */
  export: (token: string) => { token: string; accepted: boolean };
}

/**
 * Public capability facade exposed under engine.capability.*
 */
export interface EngineCapabilityApi {
  /** Geometry transform capability pack. */
  geometry: EngineCapabilityGeometryApi;
  /** Spatial query capability pack. */
  spatial: EngineCapabilitySpatialApi;
  /** Picking capability pack. */
  picking: EngineCapabilityPickingApi;
  /** Diagnostics capability pack. */
  diagnostics: EngineCapabilityDiagnosticsApi;
  /** Replay capability pack. */
  replay: EngineCapabilityReplayApi;
}

/**
 * Public engine facade returned by createEngine().
 */
