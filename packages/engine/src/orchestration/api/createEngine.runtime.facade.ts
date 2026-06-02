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
  EngineRuntimeDocumentPreflightApplyChangeSetInput,
  EngineRuntimeDocumentPreflightApplyChangeSetOutput,
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
  EngineRuntimeOpenWorldMap,
  EngineRuntimeWorldAgentState,
  EngineRuntimeWorldStepInput,
  EngineRuntimeWorldResolveCollisionInput,
  EngineRuntimeWorldResolveCollisionOutput,
  EngineRuntimeWorldObstacle,
  EngineRuntimeCollisionQueryAabbInput,
  EngineRuntimeCollisionQueryAabbOutput,
  EngineRuntimeCollisionUnregisterOutput,
  EngineRuntimeCollisionEvaluateTriggersInput,
  EngineRuntimeCollisionEvaluateTriggersOutput,
  EngineRuntimeNavigationPath,
  EngineRuntimeNavigationStepPathAgentsInput,
  EngineRuntimeNavigationUnregisterPathOutput,
  EngineRuntimeLightingProfile,
  EngineRuntimeLightingEnvironmentInput,
  EngineRuntimeLightingEnvironmentOutput,
  EngineLightCollection,
} from "./public-types";
import type {
  BoxTransformSource,
  ResolvedNodeTransform,
} from "../../kernel/interaction/shapeTransform";
import type {
  ResolveEngineAdaptiveHitToleranceOptions,
  EngineAdaptiveHitTolerance,
} from "../../kernel/interaction/hitTolerance";
import type {
  ResolveEngineGeometryPayloadOptions,
  EngineGeometryPayload,
} from "../../kernel/interaction/geometryPayload";
import type { EngineRenderSchedulerDiagnostics } from "../../orchestration/renderScheduler";

const ONE_GIBIBYTE_BYTES = Number("1024") * Number("1024") * Number("1024");
const INTERACTION_VOLUME_BUDGET_RATIO = 0.125;
const PREVIEW_VOLUME_BUDGET_RATIO = 0.25;
const QUALITY_VOLUME_BUDGET_RATIO = 0.5;
const HALF_DIVISOR = 2;
const MIN_SAMPLE_STEP_MM = 0.001;

/**
 * Builds runtime namespace facade for the engine handle.
 * @param deps Runtime dependency bridge backed by createEngine closures.
 */
export function createEngineRuntimeFacadeNamespace(deps: {
  resolveRuntimeDocumentSnapshot: () => import("../../kernel/document/document-contracts").EngineDocumentSnapshot;
  resolveRuntimeDocumentRevision: () => number;
  applyRuntimeDocumentChangeSet: (
    input: EngineRuntimeDocumentApplyChangeSetInput,
  ) => EngineRuntimeDocumentApplyChangeSetResult;
  preflightRuntimeDocumentChangeSetApply: (
    input: EngineRuntimeDocumentPreflightApplyChangeSetInput,
  ) => EngineRuntimeDocumentPreflightApplyChangeSetOutput;
  compileRuntimeWorld: (options?: { snapshot?: import("../../kernel/document/document-contracts").EngineDocumentSnapshot }) => EngineRuntimeWorldSnapshotOutput;
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
  submitRuntimeCommandBufferBatch: (
    commandBuffers: readonly EngineRuntimeCommandValidateInput[],
  ) => EngineRuntimeSubmitOutput;
  createRuntimeGpuResource: (descriptor: EngineRuntimeGpuResourceDescriptor) => EngineRuntimeGpuResourceOutput;
  updateRuntimeGpuResource: (
    resourceId: string,
    patch: Readonly<Record<string, unknown>>,
  ) => EngineRuntimeGpuResourceOutput;
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
  createRuntimeDocumentSnapshot: (input: EngineRuntimeDocumentCreateSnapshotInput) => import("../../kernel/document/document-contracts").EngineDocumentSnapshot;
  validateRuntimeDocumentSnapshot: (
    input: EngineRuntimeDocumentValidateSnapshotInput,
  ) => EngineRuntimeDocumentValidateSnapshotOutput;
  resolveRuntimeDocumentSchemaVersion: () => number;
  diffRuntimeDocumentSnapshots: (
    input: EngineRuntimeDocumentDiffSnapshotsInput,
  ) => EngineRuntimeDocumentDiffSnapshotsOutput;
  rebaseRuntimeDocumentChangeSet: (input: EngineRuntimeDocumentRebaseChangeSetInput) => import("../../kernel/document/document-contracts").EngineDocumentChangeSet;
  serializeRuntimeDocumentSnapshot: (
    input: EngineRuntimeDocumentSerializeSnapshotInput,
  ) => EngineRuntimeDocumentSerializeSnapshotOutput;
  deserializeRuntimeDocumentSnapshot: (input: EngineRuntimeDocumentDeserializeSnapshotInput) => import("../../kernel/document/document-contracts").EngineDocumentSnapshot;
  compileRuntimeWorldFromDocument: (
    input: EngineRuntimeWorldCompileFromDocumentInput,
  ) => EngineRuntimeWorldSnapshotOutput;
  queryRuntimeWorldEntity: (input: EngineRuntimeWorldQueryEntityInput) => EngineRuntimeWorldQueryEntityOutput;
  queryRuntimeWorldComponent: (input: EngineRuntimeWorldQueryComponentInput) => EngineRuntimeWorldQueryComponentOutput;
  queryRuntimeNodeTransform: (source: BoxTransformSource) => ResolvedNodeTransform;
  formatRuntimeNodeSvgTransform: (transform: ResolvedNodeTransform) => string | undefined;
  setRuntimeOpenWorldMap: (map: EngineRuntimeOpenWorldMap) => EngineRuntimeOpenWorldMap;
  getRuntimeOpenWorldMap: () => EngineRuntimeOpenWorldMap;
  setRuntimeWorldAgents: (
    agents: readonly EngineRuntimeWorldAgentState[],
  ) => readonly EngineRuntimeWorldAgentState[];
  getRuntimeWorldAgents: () => readonly EngineRuntimeWorldAgentState[];
  registerRuntimeNavigationPath: (path: EngineRuntimeNavigationPath) => EngineRuntimeNavigationPath;
  unregisterRuntimeNavigationPath: (pathId: string) => EngineRuntimeNavigationUnregisterPathOutput;
  getRuntimeNavigationPaths: () => readonly EngineRuntimeNavigationPath[];
  stepRuntimeWorldAgents: (
    input: EngineRuntimeWorldStepInput,
  ) => readonly EngineRuntimeWorldAgentState[];
  stepRuntimeNavigationPathAgents: (
    input: EngineRuntimeNavigationStepPathAgentsInput,
  ) => readonly EngineRuntimeWorldAgentState[];
  resolveRuntimeWorldCollision: (
    input: EngineRuntimeWorldResolveCollisionInput,
  ) => EngineRuntimeWorldResolveCollisionOutput;
  setRuntimeCollisionObstacles: (
    obstacles: readonly EngineRuntimeWorldObstacle[],
  ) => readonly EngineRuntimeWorldObstacle[];
  getRuntimeCollisionObstacles: () => readonly EngineRuntimeWorldObstacle[];
  registerRuntimeCollider: (collider: EngineRuntimeWorldObstacle) => EngineRuntimeWorldObstacle;
  unregisterRuntimeCollider: (colliderId: string) => EngineRuntimeCollisionUnregisterOutput;
  queryRuntimeCollisionAabb: (
    input: EngineRuntimeCollisionQueryAabbInput,
  ) => EngineRuntimeCollisionQueryAabbOutput;
  evaluateRuntimeCollisionTriggers: (
    input: EngineRuntimeCollisionEvaluateTriggersInput,
  ) => EngineRuntimeCollisionEvaluateTriggersOutput;
  clearRuntimeWorldSnapshot: () => EngineRuntimeWorldClearOutput;
  createRuntimeAuthoringGraphSnapshot: (input: import("./public-types").EngineRuntimeAuthoringGraphSnapshotInput) => import("./public-types").EngineRuntimeAuthoringGraphSnapshotOutput;
  compareRuntimeAuthoringGraphSnapshots: (input: import("./public-types").EngineRuntimeAuthoringGraphCompareInput) => import("./public-types").EngineRuntimeAuthoringGraphComparisonOutput;
  createRuntimeAuthoringPreviewToken: (input: import("./public-types").EngineRuntimeAuthoringPreviewTokenInput) => import("./public-types").EngineRuntimeAuthoringPreviewTokenOutput;
  resolveRuntimeAuthoringDiagnostics: () => import("./public-types").EngineRuntimeAuthoringDiagnosticsOutput;
  markRuntimeDirtyDomainsBatch: (input: EngineRuntimeDirtyMarkBatchInput) => EngineRuntimeDirtyStateOutput;
  resolveRuntimePendingDirtyDomains: () => readonly EngineRuntimeDirtyMarkInput["domain"][];
  resetRuntimeDirtyState: () => EngineRuntimeDirtyResetOutput;
  createRuntimeCommandEncoder: (
    input: EngineRuntimeCommandCreateEncoderInput,
  ) => EngineRuntimeCommandCreateEncoderOutput;
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
  setRuntimeLightingCollection: (collection: EngineLightCollection) => EngineLightCollection;
  getRuntimeLightingCollection: () => EngineLightCollection;
  clearRuntimeLightingCollection: () => EngineLightCollection;
  applyRuntimeLightingProfile: (profile: EngineRuntimeLightingProfile) => EngineLightCollection;
  resolveRuntimeLightingEnvironment: (
    input: EngineRuntimeLightingEnvironmentInput,
  ) => EngineRuntimeLightingEnvironmentOutput;
  applyRuntimeLightingEnvironment: (
    input: EngineRuntimeLightingEnvironmentInput,
  ) => EngineRuntimeLightingEnvironmentOutput;
  registerRuntimeModelAsset: (descriptor: import("./public-types").EngineRuntimeModelAssetDescriptor) => import("./public-types").EngineRuntimeModelDiagnosticsOutput;
  unregisterRuntimeModelAsset: (modelId: string) => { unregistered: boolean; removedInstanceCount: number };
  setRuntimeModelInstances: (instances: readonly import("./public-types").EngineRuntimeModelInstanceDescriptor[]) => import("./public-types").EngineRuntimeModelDiagnosticsOutput;
  getRuntimeModelInstances: (options?: { cameraPosition?: readonly [number, number, number] }) => readonly import("./public-types").EngineRuntimeModelInstanceSnapshot[];
  resolveRuntimeModelDiagnostics: () => import("./public-types").EngineRuntimeModelDiagnosticsOutput;
}): EngineRuntimeApi {
  /**
   * Clamps one numeric value into [min, max] while preserving deterministic fallback behavior.
   * @param value Source numeric value.
   * @param min Lower bound.
   * @param max Upper bound.
   */
  function clamp(value: number, min: number, max: number): number {
    if (!Number.isFinite(value)) {
      return min;
    }
    return Math.min(max, Math.max(min, value));
  }

  /**
   * Resolves deterministic fallback budget bytes from requested quality target.
   * @param target Requested quality target.
   */
  function resolveVolumeBudgetBytes(target: "interaction" | "preview" | "quality"): number {
    if (target === "interaction") {
      return ONE_GIBIBYTE_BYTES * INTERACTION_VOLUME_BUDGET_RATIO;
    }
    if (target === "preview") {
      return ONE_GIBIBYTE_BYTES * PREVIEW_VOLUME_BUDGET_RATIO;
    }
    return ONE_GIBIBYTE_BYTES * QUALITY_VOLUME_BUDGET_RATIO;
  }

  /**
   * Normalizes one opacity-stop array into deterministic sorted/clamped output.
   * @param stops Caller-provided opacity stops.
   */
  function normalizeOpacityStops(
    stops: readonly { position: number; opacity: number }[] | undefined,
  ): readonly { position: number; opacity: number }[] {
    if (!stops || stops.length === 0) {
      return [
        { position: 0, opacity: 0 },
        { position: 1, opacity: 1 },
      ];
    }

    return stops
      .map((stop) => ({
        position: clamp(stop.position, 0, 1),
        opacity: clamp(stop.opacity, 0, 1),
      }))
      .sort((left, right) => left.position - right.position);
  }

  /**
   * Normalizes one color-stop array into deterministic sorted/clamped output.
   * @param stops Caller-provided color stops.
   */
  function normalizeColorStops(
    stops: readonly { position: number; color: string }[] | undefined,
  ): readonly { position: number; color: string }[] {
    if (!stops || stops.length === 0) {
      return [
        { position: 0, color: "#000000" },
        { position: 1, color: "#ffffff" },
      ];
    }

    return stops
      .map((stop) => ({
        position: clamp(stop.position, 0, 1),
        color: stop.color,
      }))
      .sort((left, right) => left.position - right.position);
  }

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
      preflightApplyChangeSet: (input) => deps.preflightRuntimeDocumentChangeSetApply(input),
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
      setOpenWorldMap: (map) => deps.setRuntimeOpenWorldMap(map),
      getOpenWorldMap: () => deps.getRuntimeOpenWorldMap(),
      setAgents: (agents) => deps.setRuntimeWorldAgents(agents),
      getAgents: () => deps.getRuntimeWorldAgents(),
      stepAgents: (input) => deps.stepRuntimeWorldAgents(input),
      resolveCollision: (input) => deps.resolveRuntimeWorldCollision(input),
      clear: () => deps.clearRuntimeWorldSnapshot(),
    },
    authoring: {
      createGraphSnapshot: (input) => deps.createRuntimeAuthoringGraphSnapshot(input),
      compareGraphSnapshots: (input) => deps.compareRuntimeAuthoringGraphSnapshots(input),
      createPreviewToken: (input) => deps.createRuntimeAuthoringPreviewToken(input),
      getDiagnostics: () => deps.resolveRuntimeAuthoringDiagnostics(),
    },
    navigation: {
      setAgents: (agents) => deps.setRuntimeWorldAgents(agents),
      getAgents: () => deps.getRuntimeWorldAgents(),
      registerPath: (path) => deps.registerRuntimeNavigationPath(path),
      unregisterPath: (pathId) => deps.unregisterRuntimeNavigationPath(pathId),
      getPaths: () => deps.getRuntimeNavigationPaths(),
      stepAgents: (input) => deps.stepRuntimeWorldAgents(input),
      stepPathAgents: (input) => deps.stepRuntimeNavigationPathAgents(input),
    },
    collision: {
      registerCollider: (collider) => deps.registerRuntimeCollider(collider),
      unregisterCollider: (colliderId) => deps.unregisterRuntimeCollider(colliderId),
      setObstacles: (obstacles) => deps.setRuntimeCollisionObstacles(obstacles),
      getObstacles: () => deps.getRuntimeCollisionObstacles(),
      queryAabb: (input) => deps.queryRuntimeCollisionAabb(input),
      evaluateTriggers: (input) => deps.evaluateRuntimeCollisionTriggers(input),
      resolve: (input) => deps.resolveRuntimeWorldCollision(input),
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
    volume: {
      createSlicePlan: (input) => {
        const sliceIndex = Math.max(0, Math.floor(input.sliceIndex));
        const slabThickness = Math.max(1, Math.floor(input.slabThicknessVoxels ?? 1));
        const slabHalfSpan = Math.floor((slabThickness - 1) / HALF_DIVISOR);
        const slabStartIndex = Math.max(0, sliceIndex - slabHalfSpan);
        const slabEndIndex = sliceIndex + (slabThickness - 1 - slabHalfSpan);
        const spacing = input.spacingMm;
        // Prefer explicit spacing and keep deterministic mm-step fallback when spacing is absent/invalid.
        const sampleStepMm = spacing
          ? Math.max(MIN_SAMPLE_STEP_MM, Math.min(spacing.x, spacing.y, spacing.z))
          : 1;

        return {
          planId: `volume-slice:${input.volumeResourceId}:${input.axis}:${sliceIndex}:${slabStartIndex}:${slabEndIndex}`,
          volumeResourceId: input.volumeResourceId,
          axis: input.axis,
          sliceIndex,
          slabStartIndex,
          slabEndIndex,
          sampleStepMm,
        };
      },
      resolveTransferFunction: (input) => {
        const safeWindowWidth = Math.max(1, Math.abs(input.windowWidth));
          const windowMin = input.windowCenter - safeWindowWidth / HALF_DIVISOR;
          const windowMax = input.windowCenter + safeWindowWidth / HALF_DIVISOR;
        const opacityStops = normalizeOpacityStops(input.opacityStops);
        const colorStops = normalizeColorStops(input.colorStops);

        return {
          transferId: `volume-transfer:${windowMin}:${windowMax}:${input.invert ? "inv" : "lin"}:${opacityStops.length}:${colorStops.length}`,
          windowMin,
          windowMax,
          invert: input.invert === true,
          opacityStops,
          colorStops,
        };
      },
      resolveResidencyBudget: (input) => {
        const budgetBytes = Number.isFinite(input.maxBytes)
          ? Math.max(0, Math.floor(input.maxBytes as number))
          : resolveVolumeBudgetBytes(input.target);
        const resourceStates: {
          resourceId: string;
          sizeBytes: number;
          pinned: boolean;
          decodeStatus:
            | "registered"
            | "queued"
            | "decoding"
            | "ready"
            | "failed";
        }[] = [];
        const missingResourceIds: string[] = [];

        for (const resourceId of input.volumeResourceIds) {
          try {
            const residency = deps.getRuntimeResourceResidency(resourceId);
            resourceStates.push({
              resourceId,
              sizeBytes: residency.sizeBytes,
              pinned: residency.pinned,
              decodeStatus: residency.decodeStatus,
            });
          } catch {
            // Missing resource ids are reported instead of throwing to keep budget checks composable.
            missingResourceIds.push(resourceId);
          }
        }

        const estimatedResidentBytes = resourceStates.reduce(
          (sum, state) => sum + state.sizeBytes,
          0,
        );

        return {
          budgetBytes,
          estimatedResidentBytes,
          overBudget: estimatedResidentBytes > budgetBytes,
          missingResourceIds,
          resourceStates,
        };
      },
    },
    lighting: {
      setCollection: (collection) => deps.setRuntimeLightingCollection(collection),
      getCollection: () => deps.getRuntimeLightingCollection(),
      clearCollection: () => deps.clearRuntimeLightingCollection(),
      applyProfile: (profile) => deps.applyRuntimeLightingProfile(profile),
      resolveEnvironment: (input) => deps.resolveRuntimeLightingEnvironment(input),
      applyEnvironment: (input) => deps.applyRuntimeLightingEnvironment(input),
    },
    model: {
      registerAsset: (descriptor) => deps.registerRuntimeModelAsset(descriptor),
      unregisterAsset: (modelId) => deps.unregisterRuntimeModelAsset(modelId),
      setInstances: (instances) => deps.setRuntimeModelInstances(instances),
      getInstances: (options) => deps.getRuntimeModelInstances(options),
      getDiagnostics: () => deps.resolveRuntimeModelDiagnostics(),
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
