import type {
  EnginePickOptions,
  EnginePickPointInput,
  EngineRayInput,
  EngineRaycastOptions,
  EngineRuntimeApi,
  EngineRuntimeBackendCapabilitiesOutput,
  EngineRuntimeBackendGetActiveOutput,
  EngineRuntimeBackendGetFallbackTraceOutput,
  EngineRuntimeBackendLimitsOutput,
  EngineRuntimeBackendListAvailableOutput,
  EngineRuntimeBackendProbeHeadlessOutput,
  EngineRuntimeBackendSelectInput,
  EngineRuntimeBackendSelectOutput,
  EngineRuntimeBarrierApplyOutput,
  EngineRuntimeBarrierPlanOutput,
  EngineRuntimeCaptureFrameInput,
  EngineRuntimeCaptureFrameOutput,
  EngineRuntimeCommandCreateEncoderInput,
  EngineRuntimeCommandCreateEncoderOutput,
  EngineRuntimeCommandEncodeInput,
  EngineRuntimeCommandEncodeOutput,
  EngineRuntimeCommandOptimizeInput,
  EngineRuntimeCommandOptimizeOutput,
  EngineRuntimeCommandValidateInput,
  EngineRuntimeCommandValidateOutput,
  EngineRuntimeCompileTriggerOutput,
  EngineRuntimeDirtyFlushInput,
  EngineRuntimeDirtyFlushOutput,
  EngineRuntimeDirtyMarkBatchInput,
  EngineRuntimeDirtyMarkInput,
  EngineRuntimeDirtyResetOutput,
  EngineRuntimeDirtyStateOutput,
  EngineRuntimeDocumentApplyChangeSetInput,
  EngineRuntimeDocumentApplyChangeSetResult,
  EngineRuntimeDocumentCreateSnapshotInput,
  EngineRuntimeDocumentDeserializeSnapshotInput,
  EngineRuntimeDocumentDiffSnapshotsInput,
  EngineRuntimeDocumentDiffSnapshotsOutput,
  EngineRuntimeDocumentRebaseChangeSetInput,
  EngineRuntimeDocumentSerializeSnapshotInput,
  EngineRuntimeDocumentSerializeSnapshotOutput,
  EngineRuntimeDocumentValidateSnapshotInput,
  EngineRuntimeDocumentValidateSnapshotOutput,
  EngineRuntimeFramePlanOutput,
  EngineRuntimeGpuResourceDescriptor,
  EngineRuntimeGpuResourceOutput,
  EngineRuntimePlanFrameRequest,
  EngineRuntimeReadbackOutput,
  EngineRuntimeReplayOutput,
  EngineRuntimeReplayTokenOutput,
  EngineRuntimeRoiPlanRequest,
  EngineRuntimeRoiPlanOutput,
  EngineRuntimeLodPlanRequest,
  EngineRuntimeLodPlanOutput,
  EngineRuntimeBudgetPlanRequest,
  EngineRuntimeBudgetPlanOutput,
  EngineRuntimeSpatialQueryOutput,
  EngineRuntimeSubmitOutput,
  EngineRuntimeUploadBatchOutput,
  EngineRuntimeVisibilityPlanRequest,
  EngineRuntimeVisibilityPlanOutput,
  EngineRuntimeWorldClearOutput,
  EngineRuntimeWorldCompileFromDocumentInput,
  EngineRuntimeWorldGraphStatsOutput,
  EngineRuntimeWorldQueryComponentInput,
  EngineRuntimeWorldQueryComponentOutput,
  EngineRuntimeWorldQueryEntityInput,
  EngineRuntimeWorldQueryEntityOutput,
  EngineRuntimeWorldSnapshotOutput,
} from "./public-types";
import type {
  BoxTransformSource,
  ResolvedNodeTransform,
} from "../interaction/shapeTransform";
import type {
  ResolveEngineAdaptiveHitToleranceOptions,
  EngineAdaptiveHitTolerance,
} from "../interaction/hitTolerance";
import type {
  ResolveEngineGeometryPayloadOptions,
  EngineGeometryPayload,
} from "../interaction/geometryPayload";
import type { EngineRenderSchedulerDiagnostics } from "../scheduler/renderScheduler";

/**
 * Builds runtime namespace facade for the engine handle.
 * @param deps Runtime dependency bridge backed by createEngine closures.
 */
export function createEngineRuntimeFacadeNamespace(deps: {
  resolveRuntimeDocumentSnapshot: () => import("../document/document-contracts").EngineDocumentSnapshot;
  resolveRuntimeDocumentRevision: () => number;
  applyRuntimeDocumentChangeSet: (input: EngineRuntimeDocumentApplyChangeSetInput) => EngineRuntimeDocumentApplyChangeSetResult;
  compileRuntimeWorld: (options?: { snapshot?: import("../document/document-contracts").EngineDocumentSnapshot }) => EngineRuntimeWorldSnapshotOutput;
  resolveRuntimeWorldSnapshotOutput: () => EngineRuntimeWorldSnapshotOutput;
  resolveRuntimeWorldGraphStatsOutput: () => EngineRuntimeWorldGraphStatsOutput;
  resolveRuntimeDirtyStateOutput: () => EngineRuntimeDirtyStateOutput;
  markRuntimeDirtyDomain: (input: EngineRuntimeDirtyMarkInput) => EngineRuntimeDirtyStateOutput;
  flushRuntimeDirtyDomains: (input: EngineRuntimeDirtyFlushInput) => EngineRuntimeDirtyFlushOutput;
  scheduleRuntimeIncrementalCompile: (options?: { reason?: string }) => EngineRuntimeCompileTriggerOutput;
  forceRuntimeFullCompile: (reason: string) => EngineRuntimeCompileTriggerOutput;
  createRuntimeFramePlan: (request: EngineRuntimePlanFrameRequest) => EngineRuntimeFramePlanOutput;
  inspectRuntimePlan: (plan: unknown) => { valid: boolean; summary: string };
  encodeRuntimeCommandPlan: (plan: EngineRuntimeCommandEncodeInput) => EngineRuntimeCommandEncodeOutput;
  validateRuntimeCommandBuffer: (buffer: EngineRuntimeCommandValidateInput) => EngineRuntimeCommandValidateOutput;
  submitRuntimeCommandBuffer: (commandBuffer: EngineRuntimeCommandValidateInput) => EngineRuntimeSubmitOutput;
  submitRuntimeCommandBufferBatch: (commandBuffers: readonly EngineRuntimeCommandValidateInput[]) => EngineRuntimeSubmitOutput;
  createRuntimeGpuResource: (descriptor: EngineRuntimeGpuResourceDescriptor) => EngineRuntimeGpuResourceOutput;
  updateRuntimeGpuResource: (resourceId: string, patch: Readonly<Record<string, unknown>>) => EngineRuntimeGpuResourceOutput;
  destroyRuntimeGpuResource: (resourceId: string) => EngineRuntimeGpuResourceOutput;
  createRuntimeUploadBatch: (request: { resourceIds: readonly string[] }) => EngineRuntimeUploadBatchOutput;
  createRuntimeBarrierPlan: (request: { resourceIds: readonly string[] }) => EngineRuntimeBarrierPlanOutput;
  applyRuntimeBarrierPlan: (plan: { planId: string }) => EngineRuntimeBarrierApplyOutput;
  readbackRuntimeResource: (request: { resourceId: string }) => EngineRuntimeReadbackOutput;
  queryRuntimeViewportCandidates: (query: import("./public-types").EngineQueryBoundsInput) => EngineRuntimeSpatialQueryOutput;
  queryRuntimeFrustumVisibleSet: (query: Readonly<Record<string, unknown>>) => EngineRuntimeSpatialQueryOutput;
  pickGraph: (point: EnginePickPointInput, options?: EnginePickOptions) => import("./public-types").EnginePickResult;
  raycastGraph: (ray: EngineRayInput, options?: EngineRaycastOptions) => import("./public-types").EngineRaycastHit | null;
  queryRuntimeSpatialIndex: (query: Readonly<Record<string, unknown>>) => EngineRuntimeSpatialQueryOutput;
  resolveRuntimeBackendState: () => import("./public-types").EngineRuntimeBackendStateOutput;
  switchRuntimeBackend: (target: import("./public-types").EngineBackendMode | "auto", options?: Readonly<Record<string, unknown>>) => import("./public-types").EngineRuntimeBackendStateOutput;
  resolveRuntimeBackendFallbackHistory: () => import("./public-types").EngineRuntimeBackendFallbackHistoryOutput;
  setRuntimeBackendDebugOptions: (options: Readonly<Record<string, unknown>>) => { accepted: boolean };
  captureRuntimeFrame: (options?: EngineRuntimeCaptureFrameInput) => EngineRuntimeCaptureFrameOutput;
  captureRuntimeCommandTrace: (options?: { label?: string }) => import("./public-types").EngineRuntimeCommandTraceOutput;
  createRuntimeReplayToken: (scope: string) => EngineRuntimeReplayTokenOutput;
  replayRuntimeToken: (token: string) => EngineRuntimeReplayOutput;
  resolveRuntimePublicMetrics: () => import("./public-types").EnginePublicMetricsOutput;
  getRuntimeTrace: (traceId: string) => import("./public-types").EngineRuntimeGetTraceOutput;
  createRuntimeDocumentSnapshot: (input: EngineRuntimeDocumentCreateSnapshotInput) => import("../document/document-contracts").EngineDocumentSnapshot;
  validateRuntimeDocumentSnapshot: (input: EngineRuntimeDocumentValidateSnapshotInput) => EngineRuntimeDocumentValidateSnapshotOutput;
  resolveRuntimeDocumentSchemaVersion: () => number;
  diffRuntimeDocumentSnapshots: (input: EngineRuntimeDocumentDiffSnapshotsInput) => EngineRuntimeDocumentDiffSnapshotsOutput;
  rebaseRuntimeDocumentChangeSet: (input: EngineRuntimeDocumentRebaseChangeSetInput) => import("../document/document-contracts").EngineDocumentChangeSet;
  serializeRuntimeDocumentSnapshot: (input: EngineRuntimeDocumentSerializeSnapshotInput) => EngineRuntimeDocumentSerializeSnapshotOutput;
  deserializeRuntimeDocumentSnapshot: (input: EngineRuntimeDocumentDeserializeSnapshotInput) => import("../document/document-contracts").EngineDocumentSnapshot;
  compileRuntimeWorldFromDocument: (input: EngineRuntimeWorldCompileFromDocumentInput) => EngineRuntimeWorldSnapshotOutput;
  queryRuntimeWorldEntity: (input: EngineRuntimeWorldQueryEntityInput) => EngineRuntimeWorldQueryEntityOutput;
  queryRuntimeWorldComponent: (input: EngineRuntimeWorldQueryComponentInput) => EngineRuntimeWorldQueryComponentOutput;
  queryRuntimeNodeTransform: (source: BoxTransformSource) => ResolvedNodeTransform;
  formatRuntimeNodeSvgTransform: (transform: ResolvedNodeTransform) => string | undefined;
  clearRuntimeWorldSnapshot: () => EngineRuntimeWorldClearOutput;
  markRuntimeDirtyDomainsBatch: (input: EngineRuntimeDirtyMarkBatchInput) => EngineRuntimeDirtyStateOutput;
  resolveRuntimePendingDirtyDomains: () => readonly EngineRuntimeDirtyMarkInput["domain"][];
  resetRuntimeDirtyState: () => EngineRuntimeDirtyResetOutput;
  createRuntimeCommandEncoder: (input: EngineRuntimeCommandCreateEncoderInput) => EngineRuntimeCommandCreateEncoderOutput;
  optimizeRuntimeCommandBuffer: (input: EngineRuntimeCommandOptimizeInput) => EngineRuntimeCommandOptimizeOutput;
  inspectRuntimeCommandBuffer: (buffer: EngineRuntimeCommandValidateInput) => import("./public-types").EngineRuntimeCommandInspectOutput;
  replayRuntimeCommandBuffer: (buffer: EngineRuntimeCommandValidateInput) => import("./public-types").EngineRuntimeCommandReplayOutput;
  resolveRuntimeBackendListAvailableOutput: () => EngineRuntimeBackendListAvailableOutput;
  selectRuntimeBackend: (input: EngineRuntimeBackendSelectInput) => EngineRuntimeBackendSelectOutput;
  resolveRuntimeBackendGetActiveOutput: () => EngineRuntimeBackendGetActiveOutput;
  resolveRuntimeBackendCapabilities: () => EngineRuntimeBackendCapabilitiesOutput;
  resolveRuntimeBackendLimits: () => EngineRuntimeBackendLimitsOutput;
  resolveRuntimeBackendGetFallbackTraceOutput: () => EngineRuntimeBackendGetFallbackTraceOutput;
  probeRuntimeHeadlessBackend: () => EngineRuntimeBackendProbeHeadlessOutput;
  createRuntimeVisibilityPlan: (request: EngineRuntimeVisibilityPlanRequest) => EngineRuntimeVisibilityPlanOutput;
  createRuntimeLodPlan: (request: EngineRuntimeLodPlanRequest) => EngineRuntimeLodPlanOutput;
  createRuntimeRoiPlan: (request: EngineRuntimeRoiPlanRequest) => EngineRuntimeRoiPlanOutput;
  createRuntimeBudgetPlan: (request: EngineRuntimeBudgetPlanRequest) => EngineRuntimeBudgetPlanOutput;
  createRuntimeHitGeometryPayload: (request: ResolveEngineGeometryPayloadOptions) => EngineGeometryPayload;
  resolveRuntimeHitTolerance: (options?: ResolveEngineAdaptiveHitToleranceOptions) => EngineAdaptiveHitTolerance;
  requestRuntimePlanFrame: (mode?: "interactive" | "normal") => { requestId: string; scheduled: boolean };
  cancelRuntimePlanFrame: (requestId: string) => { cancelled: boolean };
  setRuntimePlanInteractiveInterval: (intervalMs: number) => { intervalMs: number };
  resolveRuntimePlanSchedulerDiagnostics: () => EngineRenderSchedulerDiagnostics;
  registerRuntimeResource: (descriptor: import("./public-types").EngineRuntimeResourceDescriptor) => import("./public-types").EngineRuntimeResourceResidencyOutput;
  updateRuntimeResource: (resourceId: string, patch: import("./public-types").EngineRuntimeResourcePatch) => import("./public-types").EngineRuntimeResourceResidencyOutput;
  releaseRuntimeResource: (resourceId: string) => { released: boolean };
  pinRuntimeResource: (resourceId: string) => import("./public-types").EngineRuntimeResourceResidencyOutput;
  unpinRuntimeResource: (resourceId: string) => import("./public-types").EngineRuntimeResourceResidencyOutput;
  getRuntimeResourceResidency: (resourceId: string) => import("./public-types").EngineRuntimeResourceResidencyOutput;
  collectRuntimeResources: (options: import("./public-types").EngineRuntimeResourceCollectGarbageInput) => import("./public-types").EngineRuntimeResourceCollectGarbageOutput;
  startRuntimeTrace: (options: import("./public-types").EngineRuntimeStartTraceInput) => import("./public-types").EngineRuntimeStartTraceOutput;
  stopRuntimeTrace: (traceId: string) => import("./public-types").EngineRuntimeStopTraceOutput;
  getRuntimeMetricsSnapshot: () => import("./public-types").EngineRuntimeMetricsSnapshot;
}): EngineRuntimeApi {
  return {
    getDocumentSnapshot: () => deps.resolveRuntimeDocumentSnapshot(),
    getDocumentRevision: () => deps.resolveRuntimeDocumentRevision(),
    applyChangeSet: (input) => deps.applyRuntimeDocumentChangeSet(input),
    compileWorld: (options) => deps.compileRuntimeWorld(options),
    getRuntimeWorld: () => deps.resolveRuntimeWorldSnapshotOutput(),
    getRuntimeWorldStats: () => deps.resolveRuntimeWorldGraphStatsOutput(),
    getDirtyState: () => deps.resolveRuntimeDirtyStateOutput(),
    markDirty: (domain, token) => deps.markRuntimeDirtyDomain({ domain, token }),
    flushDirtyState: (domains) => deps.flushRuntimeDirtyDomains({ domains }),
    scheduleIncrementalCompile: (options) => deps.scheduleRuntimeIncrementalCompile(options),
    forceFullCompile: (reason) => deps.forceRuntimeFullCompile(reason),
    createRenderPlan: (request) => deps.createRuntimeFramePlan(request),
    inspectRenderPlan: (plan) => deps.inspectRuntimePlan(plan),
    encodeCommandBuffer: (plan) => deps.encodeRuntimeCommandPlan(plan),
    validateCommandBuffer: (buffer) => deps.validateRuntimeCommandBuffer(buffer),
    submit: (commandBuffer) => deps.submitRuntimeCommandBuffer(commandBuffer),
    submitBatch: (commandBuffers) => deps.submitRuntimeCommandBufferBatch(commandBuffers),
    createGpuResource: (descriptor) => deps.createRuntimeGpuResource(descriptor),
    updateGpuResource: (resourceId, patch) => deps.updateRuntimeGpuResource(resourceId, patch),
    destroyGpuResource: (resourceId) => deps.destroyRuntimeGpuResource(resourceId),
    createUploadBatch: (request) => deps.createRuntimeUploadBatch(request),
    createBarrierPlan: (request) => deps.createRuntimeBarrierPlan(request),
    applyBarrierPlan: (plan) => deps.applyRuntimeBarrierPlan(plan),
    readbackResource: (request) => deps.readbackRuntimeResource(request),
    queryViewportCandidates: (query) => deps.queryRuntimeViewportCandidates(query),
    queryFrustumVisibleSet: (query) => deps.queryRuntimeFrustumVisibleSet(query),
    hitTestPlanar: (point, pickOptions) => deps.pickGraph(point, pickOptions),
    hitTestRay: (ray, raycastOptions) => deps.raycastGraph(ray, raycastOptions),
    querySpatialIndex: (query) => deps.queryRuntimeSpatialIndex(query),
    getBackendState: () => deps.resolveRuntimeBackendState(),
    switchBackend: (target, switchOptions) => deps.switchRuntimeBackend(target, switchOptions),
    getBackendFallbackHistory: () => deps.resolveRuntimeBackendFallbackHistory(),
    setBackendDebugOptions: (debugOptions) => deps.setRuntimeBackendDebugOptions(debugOptions),
    captureFrame: (captureOptions) => deps.captureRuntimeFrame(captureOptions),
    captureCommandTrace: (options) => deps.captureRuntimeCommandTrace(options),
    createReplayToken: (scope) => deps.createRuntimeReplayToken(scope),
    replay: (token) => deps.replayRuntimeToken(token),
    getMetrics: () => deps.resolveRuntimePublicMetrics(),
    getTrace: (traceId) => deps.getRuntimeTrace(traceId),
    document: {
      createSnapshot: (input) => deps.createRuntimeDocumentSnapshot(input),
      validateSnapshot: (input) => deps.validateRuntimeDocumentSnapshot(input),
      getRevision: () => deps.resolveRuntimeDocumentRevision(),
      getSchemaVersion: () => deps.resolveRuntimeDocumentSchemaVersion(),
      applyChangeSet: (input) => deps.applyRuntimeDocumentChangeSet(input),
      diffSnapshots: (input) => deps.diffRuntimeDocumentSnapshots(input),
      rebaseChangeSet: (input) => deps.rebaseRuntimeDocumentChangeSet(input),
      serializeSnapshot: (input) => deps.serializeRuntimeDocumentSnapshot(input),
      deserializeSnapshot: (input) => deps.deserializeRuntimeDocumentSnapshot(input),
    },
    world: {
      compileFromDocument: (input) => deps.compileRuntimeWorldFromDocument(input),
      getWorldSnapshot: () => deps.resolveRuntimeWorldSnapshotOutput(),
      queryEntity: (input) => deps.queryRuntimeWorldEntity(input),
      queryComponent: (input) => deps.queryRuntimeWorldComponent(input),
      getGraphStats: () => deps.resolveRuntimeWorldGraphStatsOutput(),
      queryNodeTransform: (source) => deps.queryRuntimeNodeTransform(source),
      formatNodeSvgTransform: (transform) => deps.formatRuntimeNodeSvgTransform(transform),
      clear: () => deps.clearRuntimeWorldSnapshot(),
    },
    dirty: {
      getState: () => deps.resolveRuntimeDirtyStateOutput(),
      mark: (input) => deps.markRuntimeDirtyDomain(input),
      markBatch: (input) => deps.markRuntimeDirtyDomainsBatch(input),
      getPendingDomains: () => deps.resolveRuntimePendingDirtyDomains(),
      flush: (input) => deps.flushRuntimeDirtyDomains(input),
      reset: () => deps.resetRuntimeDirtyState(),
    },
    command: {
      createEncoder: (input) => deps.createRuntimeCommandEncoder(input),
      encode: (plan) => deps.encodeRuntimeCommandPlan(plan),
      validate: (buffer) => deps.validateRuntimeCommandBuffer(buffer),
      optimize: (input) => deps.optimizeRuntimeCommandBuffer(input),
      inspect: (buffer) => deps.inspectRuntimeCommandBuffer(buffer),
      replay: (buffer) => deps.replayRuntimeCommandBuffer(buffer),
    },
    backend: {
      listAvailable: () => deps.resolveRuntimeBackendListAvailableOutput(),
      select: (input) => deps.selectRuntimeBackend(input),
      getActive: () => deps.resolveRuntimeBackendGetActiveOutput(),
      getCapabilities: () => deps.resolveRuntimeBackendCapabilities(),
      getLimits: () => deps.resolveRuntimeBackendLimits(),
      getFallbackTrace: () => deps.resolveRuntimeBackendGetFallbackTraceOutput(),
      probeHeadless: () => deps.probeRuntimeHeadlessBackend(),
    },
    plan: {
      createFramePlan: (request) => deps.createRuntimeFramePlan(request),
      createVisibilityPlan: (request) => deps.createRuntimeVisibilityPlan(request),
      createLodPlan: (request) => deps.createRuntimeLodPlan(request),
      createRoiPlan: (request) => deps.createRuntimeRoiPlan(request),
      createBudgetPlan: (request) => deps.createRuntimeBudgetPlan(request),
      createHitGeometryPayload: (request) => deps.createRuntimeHitGeometryPayload(request),
      resolveHitTolerance: (options) => deps.resolveRuntimeHitTolerance(options),
      requestFrame: (mode) => deps.requestRuntimePlanFrame(mode),
      cancelFrame: (requestId) => deps.cancelRuntimePlanFrame(requestId),
      setInteractiveInterval: (intervalMs) => deps.setRuntimePlanInteractiveInterval(intervalMs),
      getSchedulerDiagnostics: () => deps.resolveRuntimePlanSchedulerDiagnostics(),
      inspect: (plan) => deps.inspectRuntimePlan(plan),
    },
    resource: {
      register: (descriptor) => deps.registerRuntimeResource(descriptor),
      update: (resourceId, patch) => deps.updateRuntimeResource(resourceId, patch),
      release: (resourceId) => deps.releaseRuntimeResource(resourceId),
      pin: (resourceId) => deps.pinRuntimeResource(resourceId),
      unpin: (resourceId) => deps.unpinRuntimeResource(resourceId),
      getResidency: (resourceId) => deps.getRuntimeResourceResidency(resourceId),
      collectGarbage: (options) => deps.collectRuntimeResources(options),
    },
    observability: {
      startTrace: (options) => deps.startRuntimeTrace(options),
      stopTrace: (traceId) => deps.stopRuntimeTrace(traceId),
      getTrace: (traceId) => deps.getRuntimeTrace(traceId),
      getMetricsSnapshot: () => deps.getRuntimeMetricsSnapshot(),
      captureFrame: (options) => deps.captureRuntimeFrame(options),
      createReplayToken: (scope) => deps.createRuntimeReplayToken(scope),
      replay: (token) => deps.replayRuntimeToken(token),
    },
  };
}
