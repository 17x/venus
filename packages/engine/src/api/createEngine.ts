import type {
  EngineGraphNodeInput,
  EngineHandle,
  EngineInvalidateInput,
  EngineRuntimeBackendFallbackTraceItem,
  EnginePublicCapabilitiesOutput,
  EngineRuntimeWorldSnapshotOutput,
} from "./public-types";
import {
  resolveEnginePerformanceOptions,
  type CreateEngineOptions,
} from "./createEngineContracts";
import { resolveCreateEnginePolicyBootstrap } from "../policy/createEnginePolicyBootstrap";
import { resolveCreateEngineFrame } from "../render-planning/createEngineFrameResolver";
import {
  type EngineViewportState,
} from "../view/viewportFacade";
import type { EngineRenderFrameStats } from "../render-runtime/runtimeFacade";
import {
  type EngineIncrementalCompileOutput,
} from "../compiler/incrementalCompiler";
import {
  resolveStagedExecutionSnapshot,
  type EngineExecutionSnapshot,
} from "../render-execution/stagedExecutionChain";
import {
  ENGINE_RUNTIME_CAPABILITY_MAP,
  ENGINE_RUNTIME_CAPABILITY_SCHEMA_VERSION,
} from "./runtimeCapabilityMap";
import { createEngineRuntimeFromProfile } from "../runtime/runtime-builder";
import { createEngineDocumentGraphModule } from "../document/documentGraph/documentGraph";
import { createEngineSceneCompilerModule } from "../compiler/sceneCompiler/sceneCompiler";
import { createEngineRuntimeWorldModule } from "../scene-runtime/runtimeWorld/runtimeWorld";
import { createEngineDirtyPropagationModule } from "../dirty/dirtyPropagation/dirtyPropagation";
import { createEngineCommandEncoderModule } from "../command-buffer/commandEncoder/commandEncoder";
import { createEngineCommandReplayModule } from "../command-buffer/commandReplay/commandReplay";
import { createEngineBackendSelectorModule } from "../backend/backendSelector/backendSelector";
import { createEngineProductAdapterBoundaryModule } from "./productAdapterBoundary/productAdapterBoundary";
import { createEnginePublicApiSurfaceModule } from "./publicApiSurface/publicApiSurface";
import { createEngineViewModule } from "../core/view/viewport-module";
import { createEngineSpatialQueryModule } from "../spatial/spatialQuery/spatialQuery";
import { createEngineHitTestRayModule } from "../picking/hitTestRay/hitTestRay";
import {
  type EngineRenderScheduler,
} from "../scheduler/renderScheduler";
import {
  performanceNow,
  resolveCreateEngineRuntimeProfile,
  resolveDirtyDomainsFromCompileOutput,
  resolveDocumentNodeFromGraphNode,
  resolveEngineBackend,
  resolveRayPickCandidateFromGraphNode,
  resolveSpatialQueryNodeFromGraphNode,
  resolveViewSnapshotFromViewportState,
} from "./createEngine.foundation";
import { createEngineEventsAndHooksFacade } from "./createEngine.events-hooks.facade";
import { createEngineExtensionAndSchedulerFacade } from "./createEngine.extension-scheduler.facade";
import { createEngineCachePolicySecurityFacade } from "./createEngine.cache-policy-security.facade";
import { createEngineMediaOverlayFacade } from "./createEngine.media-overlay.facade";
import { createEngineLifecycleViewFacade } from "./createEngine.lifecycle-view.facade";
import { createEngineGraphRenderFacade } from "./createEngine.graph-render.facade";
import { createEngineEventsHooksCacheFoundation } from "./createEngine.events-hooks-cache.foundation";
import { createRuntimeResourceObservabilityFoundation } from "./createEngine.runtime-resource-observability.foundation";
import { createRuntimeGpuBackendQueryFoundation } from "./createEngine.runtime-gpu-backend-query.foundation";
import { createRuntimePlanFoundation } from "./createEngine.runtime-plan.foundation";
import { createRuntimeDocumentDirtyCommandFoundation } from "./createEngine.runtime-document-dirty-command.foundation";
import { createRuntimeSchedulerFoundation } from "./createEngine.runtime-scheduler.foundation";
import { createFrameGraphViewFoundation } from "./createEngine.frame-graph-view.foundation";
import { createRuntimeBackendDiagnosticsFoundation } from "./createEngine.runtime-backend-diagnostics.foundation";
import { createRuntimeTelemetrySubmitGpuFoundation } from "./createEngine.runtime-telemetry-submit-gpu.foundation";
import { createEngineRuntimeRegistriesFoundation } from "./createEngine.runtime-registries.foundation";
import { createEngineBootstrapRuntimeFoundation } from "./createEngine.bootstrap-runtime.foundation";
import { createEngineValidationFoundation } from "./createEngine.validation.foundation";
import { createEngineRuntimeCapabilityDisposeFacade } from "./createEngine.runtime-capability-dispose.facade";
const ENGINE_RUNTIME_DOCUMENT_SCHEMA_VERSION = 1;
/** Creates the canonical engine facade with explicit backend and lifecycle diagnostics. @param options Engine creation options for surface, backend, runtime adapter, and staged planning knobs. */
export function createEngine(options: CreateEngineOptions): EngineHandle {
  const performance = resolveEnginePerformanceOptions(options);
  const policy = resolveCreateEnginePolicyBootstrap(options);
  const documentGraphModule = createEngineDocumentGraphModule();
  const sceneCompilerModule = createEngineSceneCompilerModule();
  const runtimeWorldModule = createEngineRuntimeWorldModule();
  const dirtyPropagationModule = createEngineDirtyPropagationModule();
  const commandEncoderModule = createEngineCommandEncoderModule();
  const commandReplayModule = createEngineCommandReplayModule();
  const backendSelectorModule = createEngineBackendSelectorModule();
  const productAdapterBoundaryModule = createEngineProductAdapterBoundaryModule();
  const publicApiSurfaceModule = createEnginePublicApiSurfaceModule();
  const viewModule = createEngineViewModule();
  const spatialQueryModule = createEngineSpatialQueryModule();
  const hitTestRayModule = createEngineHitTestRayModule();
  const graphNodeState = new Map<string, EngineGraphNodeInput>();
  let viewportState: EngineViewportState = {
    width: options.surface.width,
    height: options.surface.height,
    offsetX: 0,
    offsetY: 0,
    scale: 1,
  };
  const viewportFacade = viewModule.createViewportFacade({
    getViewportState: () => viewportState,
    setViewportState: (next) => {
      viewportState = next;
    },
  });
  let lastInteractionAtMs = 0;
  let lastInteractionKind: "none" | "set" | "pan" | "zoom" = "none";
  let latestFrameStats: EngineRenderFrameStats = {
    timestampMs: 0,
    phase: "static",
    pressure: "low",
    pressureReason: "within-low-thresholds",
    pressureSignals: {
      sceneNodeCountHigh: false,
      tileQueuePendingHigh: false,
      dirtyRegionCountHigh: false,
      sceneNodeCountMedium: false,
      tileQueuePendingMedium: false,
      dirtyRegionCountMedium: false,
    },
  };
  let documentSnapshot = documentGraphModule.createSnapshot();
  let latestCompileOutput: EngineIncrementalCompileOutput = {
    changeSetId: "bootstrap-empty",
    previousRevision: 0,
    currentRevision: 0,
    changedNodeIds: [],
    invalidation: { transform: false, geometry: false, material: false, text: false, visibility: false, picking: false, gpuUpload: false },
  };
  let latestExecutionSnapshot: EngineExecutionSnapshot = { documentRevision: 0, worldRevision: 0, compile: latestCompileOutput, visibleCandidateIds: [], pickingHitIds: [], drawCount: 0 };
  let latestRuntimeWorldRevision = 0, runtimeWorldSnapshotOverride: EngineRuntimeWorldSnapshotOutput | null = null;
  let latestDirtyState = dirtyPropagationModule.createEmptyState(), lastRuntimeDirtyMarkedAt = 0;
  let lastEncodedCommandCount = 0, lastReplayEventCount = 0, lastReplayFirstCommandId: string | null = null;
  let runtimeCommandEncoderCounter = 0, overlayNodes: readonly unknown[] = [], mountTarget: unknown = null;
  let developerConfig: Readonly<Record<string, unknown>> = { debug: Boolean(options.debug) };
  let viewportLayout: unknown = null, qualityProfile = "balanced", frameBudgetMs = 16;
  let interactionState: Readonly<Record<string, unknown>> | null = null, transformPreview: unknown = null;
  let annotations: readonly unknown[] = [], mediaSources: readonly unknown[] = [], mediaTimeMs = 0, diagnosticsEnabled = true;
  let backendPreference: "auto" | "webgpu" | "webgl" | "canvas2d" | "headless" = options.backend ?? "auto";
  let runtimeBackendFallbackHistory: EngineRuntimeBackendFallbackTraceItem[] = [];
  let runtimeBackendDebugOptions: Readonly<Record<string, unknown>> = {};
  let runtimePlanInteractiveIntervalMs = 8, runtimePlanRequestCounter = 0;
  const runtimePlanPendingRequestIds = new Set<string>();
  let runtimePlanScheduler: EngineRenderScheduler | null = null;
  const {
    eventListeners, eventListenerMetadata, pausedEventTypes, eventTypeDeliveryCounters, eventListenerLastDeliveredAt,
    hookStages, hookListeners, hookListenerMetadata, extensionRegistry, schedulerTaskRegistry, createSchedulerTaskId,
    cacheNamespaces, cacheNamespaceStats, assetStates, headlessSessions, createHeadlessSessionId,
    runtimeGpuResources, runtimeUploadBatches, runtimeBarrierPlans, runtimeResourceRegistry, runtimeTraceRegistry,
  } = createEngineRuntimeRegistriesFoundation();
  let policyRenderState: Readonly<Record<string, unknown>> = {}, policyResourceState: Readonly<Record<string, unknown>> = {};
  let policyFallbackState: Readonly<Record<string, unknown>> = {}, securityTrustLevel: "low" | "standard" | "high" = "standard";
  let securityResourceAccessPolicy: Readonly<Record<string, unknown>> = {};
  const securityAuditLog: Array<Readonly<Record<string, unknown>>> = [];
  let securityAuditCounter = 0, runtimeUploadBatchCounter = 0, runtimeBarrierPlanCounter = 0;
  let lastInvalidatePayload: EngineInvalidateInput | null = null, runtimeResourceResidencyVersion = 0, runtimeTraceCounter = 0, runtimeReplayCounter = 0;
  const { boundaryValidation, publicApiSurfaceViolations } = createEngineValidationFoundation({ productAdapterBoundaryModule, publicApiSurfaceModule }, options);
  const resolveNow = options.runtimeAdapter?.now ?? (() => performanceNow());
  const engineId = `engine-${Math.max(0, Math.floor(resolveNow()))}`;
  const { backend, backendSelection } = resolveEngineBackend(options, backendSelectorModule);
  const runtimeProfile = resolveCreateEngineRuntimeProfile(backendSelection);
  const profileRuntime = createEngineRuntimeFromProfile(runtimeProfile);
  const {
    applyDocumentAndCompile,
    resolveFrameOrchestration,
    applyGraphSnapshot,
    applyGraphPatchBatch,
    applyViewPatch,
  } = createFrameGraphViewFoundation({
    getDocumentSnapshot: () => documentSnapshot,
    setDocumentSnapshot: (snapshot) => {
      documentSnapshot = snapshot;
    },
    applyDocumentChangeSet: (snapshot, changeSet) => documentGraphModule.applyChangeSet(snapshot, changeSet),
    compileSceneChangeSet: (input) => sceneCompilerModule.compileChangeSet(input),
    buildRuntimeWorldFromDocument: (snapshot) => runtimeWorldModule.buildFromDocument(snapshot),
    setRuntimeWorldSnapshotOverride: (snapshot) => {
      runtimeWorldSnapshotOverride = snapshot;
    },
    setLatestCompileOutput: (output) => {
      latestCompileOutput = output;
    },
    getLatestCompileOutput: () => latestCompileOutput,
    setLatestRuntimeWorldRevision: (revision) => {
      latestRuntimeWorldRevision = revision;
    },
    getLatestDirtyState: () => latestDirtyState,
    setLatestDirtyState: (state) => {
      latestDirtyState = state;
    },
    markDirtyBatch: (state, domains) => dirtyPropagationModule.markDirtyBatch(state, domains),
    resolveDirtyDomainsFromCompileOutput,
    getViewport: () => viewportFacade.getViewport(),
    resolveExecutionSnapshot: (input) => resolveStagedExecutionSnapshot(input),
    setLatestExecutionSnapshot: (snapshot) => {
      latestExecutionSnapshot = snapshot;
    },
    encodeCommands: (commands) => commandEncoderModule.encode(commands),
    setLastEncodedCommandCount: (count) => {
      lastEncodedCommandCount = count;
    },
    replayCommands: (commands) =>
      commandReplayModule.replay(
        commands as ReturnType<typeof commandEncoderModule.encode>["commands"],
      ),
    setLastReplayEventCount: (count) => {
      lastReplayEventCount = count;
    },
    setLastReplayFirstCommandId: (commandId) => {
      lastReplayFirstCommandId = commandId;
    },
    resolveFrameDecision: (input) =>
      resolveCreateEngineFrame({
        scene: { nodeCount: input.nodeCount },
        viewport: input.viewport,
        performance,
        policy,
        interactionActive: input.interactionActive,
        nowMs: input.nowMs,
        lastInteractionAtMs: input.lastInteractionAtMs,
        lastInteractionKind: input.lastInteractionKind,
        cameraAnimationActive: false,
        cameraCachePreviewOnly: true,
        settleDelayMs: 120,
        tileQueuePendingCount: 0,
        dirtyRegionCount: 0,
      }),
    setLatestFrameStats: (stats) => {
      latestFrameStats = stats;
    },
    flushAllDirtyDomains: (state) => dirtyPropagationModule.flushDirty(state, state.dirtyDomains),
    assertSchedulerCapability: () => {
      const schedulerRequirement = profileRuntime.requireCapability("scheduler.frame-phases");
      if (schedulerRequirement.shouldThrow) {
        throw new Error(
          schedulerRequirement.warning?.message ??
            "Profile runtime is missing scheduler.frame-phases capability.",
        );
      }
    },
    getLastInteractionAtMs: () => lastInteractionAtMs,
    getLastInteractionKind: () => lastInteractionKind,
    getGraphNodeState: () => graphNodeState,
    resolveDocumentNodeFromGraphNode,
    setViewport: (view) => viewportFacade.setViewport(view),
    resolveViewSnapshot: (viewport) => resolveViewSnapshotFromViewportState(viewport),
    resolveNow,
    setLastInteractionAtMs: (timestampMs) => { lastInteractionAtMs = timestampMs; },
    setLastInteractionKind: (kind) => { lastInteractionKind = kind; },
  });
  const {
    resolvePublicDiagnostics,
    resolveRuntimeBackendGetActiveOutput,
    resolveRuntimeBackendGetFallbackTraceOutput,
    selectRuntimeBackend,
    resolveRuntimeBackendCapabilities,
    resolveRuntimeBackendLimits,
    probeRuntimeHeadlessBackend,
    createRuntimeHitGeometryPayload,
    resolveRuntimeHitTolerance,
    queryRuntimeNodeTransform,
    formatRuntimeNodeSvgTransform,
  } = createRuntimeBackendDiagnosticsFoundation({
    getBackendInfo: () => {
      const backendInfo = runtimeShell.getBackendInfo();
      return {
        requested: backendInfo.requested,
        resolved: backendInfo.resolved === "auto" ? "canvas2d" : backendInfo.resolved,
        fallbackReason: backendInfo.fallbackReason,
      };
    },
    getAvailableBackendModes: () => resolveRuntimeBackendListAvailableOutput().available,
    resolveDiagnosticsSnapshot: () => ({
      pixelRatio: 1,
      outputPixelRatio: 1,
      framePlan: {
        candidateNodeIds: latestExecutionSnapshot.visibleCandidateIds,
        candidateCount: latestExecutionSnapshot.visibleCandidateIds.length,
        sceneNodeCount: Object.keys(documentSnapshot.nodes).length,
        planVersion: latestExecutionSnapshot.documentRevision,
      },
      hitPlan: {
        planVersion: latestExecutionSnapshot.documentRevision,
        candidateCount: latestExecutionSnapshot.pickingHitIds.length,
        hitCount: latestExecutionSnapshot.pickingHitIds.length,
        exactCheckCount: latestExecutionSnapshot.pickingHitIds.length,
      },
      overlays: {
        count: overlayNodes.length,
      },
      invalidate: lastInvalidatePayload,
      capabilities: {
        schemaVersion: ENGINE_RUNTIME_CAPABILITY_SCHEMA_VERSION,
        runtime: Object.values(ENGINE_RUNTIME_CAPABILITY_MAP),
      },
    }),
  });
  const {
    resolveRuntimeDocumentRevision, resolveRuntimeDocumentSchemaVersion, applyRuntimeDocumentChangeSet,
    createRuntimeDocumentSnapshot, validateRuntimeDocumentSnapshot, diffRuntimeDocumentSnapshots,
    rebaseRuntimeDocumentChangeSet, serializeRuntimeDocumentSnapshot, deserializeRuntimeDocumentSnapshot,
    resolveRuntimeWorldSnapshotOutput, compileRuntimeWorldFromDocument, queryRuntimeWorldEntity,
    queryRuntimeWorldComponent, clearRuntimeWorldSnapshot, resolveRuntimeWorldGraphStatsOutput,
    resolveRuntimeDirtyStateOutput, markRuntimeDirtyDomain, markRuntimeDirtyDomainsBatch,
    resolveRuntimePendingDirtyDomains, flushRuntimeDirtyDomains, resetRuntimeDirtyState,
    encodeRuntimeCommandPlan, createRuntimeCommandEncoder, validateRuntimeCommandBuffer,
    optimizeRuntimeCommandBuffer, inspectRuntimeCommandBuffer, replayRuntimeCommandBuffer,
    resolveRuntimeBackendListAvailableOutput,
  } = createRuntimeDocumentDirtyCommandFoundation({
    getDocumentSnapshot: () => documentSnapshot,
    applyDocumentAndCompile,
    schemaVersion: ENGINE_RUNTIME_DOCUMENT_SCHEMA_VERSION,
    buildRuntimeWorldFromDocument: (snapshot) => runtimeWorldModule.buildFromDocument(snapshot),
    getRuntimeWorldSnapshotOverride: () => runtimeWorldSnapshotOverride,
    setRuntimeWorldSnapshotOverride: (snapshot) => { runtimeWorldSnapshotOverride = snapshot; },
    getLatestDirtyState: () => latestDirtyState,
    setLatestDirtyState: (state) => { latestDirtyState = state; },
    markDirty: (state, domain) => dirtyPropagationModule.markDirty(state, domain),
    markDirtyBatch: (state, domains) => dirtyPropagationModule.markDirtyBatch(state, domains),
    flushDirty: (state, domains) => dirtyPropagationModule.flushDirty(state, domains),
    createEmptyDirtyState: () => dirtyPropagationModule.createEmptyState(),
    getLastRuntimeDirtyMarkedAt: () => lastRuntimeDirtyMarkedAt,
    setLastRuntimeDirtyMarkedAt: (timestampMs) => { lastRuntimeDirtyMarkedAt = timestampMs; },
    resolveNow,
    encodeCommands: (commands) => commandEncoderModule.encode(commands),
    getLatestCompileChangeSetId: () => latestCompileOutput.changeSetId,
    allocateRuntimeCommandEncoderId: (profile) => { runtimeCommandEncoderCounter += 1; return `encoder-${profile}-${runtimeCommandEncoderCounter}`; },
    replayCommands: (commands) => commandReplayModule.replay(commands),
    getBackendProbeModes: () => backendSelectorModule.getDefaultProbes().map((probe) => probe.mode),
  });
  const { createRuntimeFramePlan, createRuntimeVisibilityPlan, createRuntimeLodPlan, createRuntimeRoiPlan, createRuntimeBudgetPlan, inspectRuntimePlan } = createRuntimePlanFoundation({
    resolveFrameDecision: (input) =>
      resolveCreateEngineFrame({
        scene: { nodeCount: Math.max(0, input.nodeCount) },
        viewport: {
          width: Math.max(1, input.viewportWidth),
          height: Math.max(1, input.viewportHeight),
          offsetX: 0,
          offsetY: 0,
          scale: input.viewportScale,
        },
        performance,
        policy,
        interactionActive: input.interactionActive,
        nowMs: resolveNow(),
        lastInteractionAtMs,
        lastInteractionKind,
        cameraAnimationActive: false,
        cameraCachePreviewOnly: true,
        settleDelayMs: 120,
        tileQueuePendingCount: Math.max(0, input.tileQueuePendingCount),
        dirtyRegionCount: Math.max(0, input.dirtyRegionCount),
      }),
    getViewportScale: () => viewportFacade.getViewport().scale,
    getDocumentRevision: () => documentSnapshot.revision,
  });
  const { requestRuntimePlanFrame, cancelRuntimePlanFrame, setRuntimePlanInteractiveInterval, resolveRuntimePlanSchedulerDiagnostics, disposeRuntimePlanScheduler } = createRuntimeSchedulerFoundation({
    renderFrame: async () => {
      const stats = resolveFrameOrchestration(resolveNow());
      return {
        drawCount: latestExecutionSnapshot.drawCount,
        visibleCount: latestExecutionSnapshot.visibleCandidateIds.length,
        frameMs: Math.max(0, stats.timestampMs),
      };
    },
    getInteractiveIntervalMs: () => runtimePlanInteractiveIntervalMs,
    setInteractiveIntervalMs: (nextIntervalMs) => { runtimePlanInteractiveIntervalMs = nextIntervalMs; },
    getRuntimePlanScheduler: () => runtimePlanScheduler,
    setRuntimePlanScheduler: (scheduler) => { runtimePlanScheduler = scheduler; },
    getPendingRequestIds: () => runtimePlanPendingRequestIds,
    getRuntimePlanRequestCounter: () => runtimePlanRequestCounter,
    setRuntimePlanRequestCounter: (nextCounter) => { runtimePlanRequestCounter = nextCounter; },
    resolveNow,
    requestFrame: options.runtimeAdapter?.requestFrame
      ? (callback) => options.runtimeAdapter!.requestFrame(() => callback())
      : undefined,
    cancelFrame: options.runtimeAdapter?.cancelFrame
      ? (handle) => options.runtimeAdapter!.cancelFrame(handle as number)
      : undefined,
  });
  const {
    registerRuntimeResource, updateRuntimeResource, releaseRuntimeResource, pinRuntimeResource, unpinRuntimeResource,
    getRuntimeResourceResidency, collectRuntimeResources, startRuntimeTrace, stopRuntimeTrace,
    getRuntimeTrace, createRuntimeReplayToken, replayRuntimeToken,
  } = createRuntimeResourceObservabilityFoundation({
    runtimeResourceRegistry,
    runtimeTraceRegistry,
    getRuntimeResourceResidencyVersion: () => runtimeResourceResidencyVersion,
    setRuntimeResourceResidencyVersion: (nextVersion) => { runtimeResourceResidencyVersion = nextVersion; },
    getRuntimeTraceCounter: () => runtimeTraceCounter,
    setRuntimeTraceCounter: (nextCounter) => { runtimeTraceCounter = nextCounter; },
    getRuntimeReplayCounter: () => runtimeReplayCounter,
    setRuntimeReplayCounter: (nextCounter) => { runtimeReplayCounter = nextCounter; },
    resolveNow,
    resolveRevision: () => documentSnapshot.revision,
    emitEvent: (type, payload) => {
      emitEvent(type, payload);
    },
  });
  const {
    getRuntimeMetricsSnapshot, captureRuntimeFrame, resolveRuntimeDocumentSnapshot, compileRuntimeWorld,
    scheduleRuntimeIncrementalCompile, forceRuntimeFullCompile, submitRuntimeCommandBuffer,
    submitRuntimeCommandBufferBatch, createRuntimeGpuResource, updateRuntimeGpuResource,
  } = createRuntimeTelemetrySubmitGpuFoundation({
    getLastEncodedCommandCount: () => lastEncodedCommandCount,
    getLastReplayEventCount: () => lastReplayEventCount,
    getLatestDrawCount: () => latestExecutionSnapshot.drawCount,
    resolveNow,
    emitEvent: (type, payload) => {
      emitEvent(type, payload);
    },
    getDocumentSnapshot: () => documentSnapshot,
    compileRuntimeWorldFromDocument,
    resolveRuntimeWorldSnapshotOutput,
    runtimeGpuResources,
  });
  const {
    destroyRuntimeGpuResource, createRuntimeUploadBatch, createRuntimeBarrierPlan, applyRuntimeBarrierPlan,
    readbackRuntimeResource, queryRuntimeViewportCandidates, queryRuntimeFrustumVisibleSet, queryRuntimeSpatialIndex,
    switchRuntimeBackend, resolveRuntimeBackendFallbackHistory, setRuntimeBackendDebugOptions,
    captureRuntimeCommandTrace, resolveRuntimePublicMetrics, queryGraph, pickGraph, raycastGraph,
  } = createRuntimeGpuBackendQueryFoundation({
    runtimeGpuResources,
    runtimeUploadBatches,
    runtimeBarrierPlans,
    getRuntimeUploadBatchCounter: () => runtimeUploadBatchCounter,
    setRuntimeUploadBatchCounter: (nextCounter) => { runtimeUploadBatchCounter = nextCounter; },
    getRuntimeBarrierPlanCounter: () => runtimeBarrierPlanCounter,
    setRuntimeBarrierPlanCounter: (nextCounter) => { runtimeBarrierPlanCounter = nextCounter; },
    graphNodeState,
    resolveSpatialQueryNodeFromGraphNode,
    resolveRayPickCandidateFromGraphNode,
    spatialQueryViewportCandidates: (nodes, bounds) => spatialQueryModule.queryViewportCandidates(nodes, bounds),
    spatialQueryPointCandidates: (nodes, point, tolerance) =>
      spatialQueryModule.queryPointCandidates(nodes, point, tolerance),
    hitTestRay: (ray, candidates) => hitTestRayModule.hitTestRay(ray, candidates),
    selectRuntimeBackend: (input) => selectRuntimeBackend({ preference: input.preference ?? "auto" }),
    resolveRuntimeBackendState: () => {
      const backendInfo = runtimeShell.getBackendInfo();
      return {
        requested: backendInfo.requested,
        resolved: backendInfo.resolved,
        fallbackReason: backendInfo.fallbackReason,
      };
    },
    getRuntimeBackendFallbackHistory: () => runtimeBackendFallbackHistory,
    setRuntimeBackendFallbackHistory: (history) => {
      runtimeBackendFallbackHistory = [...history];
    },
    setRuntimeBackendDebugOptionsState: (nextOptions) => {
      runtimeBackendDebugOptions = nextOptions;
    },
    startRuntimeTrace,
    emitEvent: (type, payload) => {
      emitEvent(type, payload);
    },
    getLastEncodedCommandCount: () => lastEncodedCommandCount,
    getLastReplayEventCount: () => lastReplayEventCount,
    getLatestDrawCount: () => latestExecutionSnapshot.drawCount,
  });

  const { runtimeShell, runtimeFacade } = createEngineBootstrapRuntimeFoundation({
    options,
    backend,
    backendSelection,
    applyDocumentAndCompile,
    resolveFrameOrchestration,
    resolveNow,
    getLatestFrameStats: () => latestFrameStats,
    getViewport: () => viewportFacade.getViewport(),
  });

  const {
    registerEventListener,
    unregisterEventListener,
    unregisterAllEventListeners,
    assertValidEventType,
    assertValidEventListener,
    emitEvent,
    registerHookListener,
    unregisterAllHookListeners,
    emitHook,
    resolveHookListenerStats,
    resolveEventListenerStats,
    appendSecurityAuditLog,
    resolveCacheNamespace,
  } = createEngineEventsHooksCacheFoundation({
    eventListeners,
    eventListenerMetadata,
    pausedEventTypes,
    eventTypeDeliveryCounters,
    eventListenerLastDeliveredAt,
    hookStages,
    hookListeners,
    hookListenerMetadata,
    cacheNamespaces,
    cacheNamespaceStats,
    securityAuditLog,
    getSecurityAuditCounter: () => securityAuditCounter,
    setSecurityAuditCounter: (nextCounter) => {
      securityAuditCounter = nextCounter;
    },
    resolveNow,
    engineId,
    resolveRevision: () => documentSnapshot.revision,
  });

  return {
    ...createEngineLifecycleViewFacade({
      emitEvent, isMounted: () => mountTarget !== null, setMountTarget: (target) => { mountTarget = target; },
      getDeveloperConfig: () => developerConfig, setDeveloperConfig: (config) => { developerConfig = config; },
      getViewportLayout: () => viewportLayout, setViewportLayout: (layout) => { viewportLayout = layout; },
      getInteractionState: () => interactionState, getTransformPreview: () => transformPreview,
      getAnnotationCount: () => annotations.length, getMediaSourceCount: () => mediaSources.length, getMediaTimeMs: () => mediaTimeMs,
      getBackendPreference: () => backendPreference, getRuntimeBackendDebugOptions: () => runtimeBackendDebugOptions,
      runtimeStart: () => runtimeFacade.start(), runtimeStop: () => runtimeFacade.stop(), runtimePause: () => runtimeShell.pause(), runtimeResume: () => runtimeShell.resume(),
      markInteractionSet: () => { lastInteractionAtMs = resolveNow(); lastInteractionKind = "set"; },
      resizeRuntime: (width, height) => runtimeShell.resize(width, height), resizeViewport: (width, height) => { viewportFacade.resize(width, height); },
      resolveViewportSnapshot: () => resolveViewSnapshotFromViewportState(viewportFacade.getViewport()), applyViewPatch, getViewportState: () => viewportFacade.getViewport(),
      getQuality: () => qualityProfile, setQuality: (profile) => { qualityProfile = profile; }, getFrameBudget: () => frameBudgetMs,
      setFrameBudget: (budget) => { frameBudgetMs = Number.isFinite(budget) ? Math.max(1, budget) : frameBudgetMs; },
      defaultDebugEnabled: Boolean(options.debug),
    }),
    ...createEngineGraphRenderFacade({
      emitHook, emitEvent, applyGraphSnapshot, applyGraphPatchBatch,
      getGraphRevision: () => documentSnapshot.revision, getGraphNodes: () => [...graphNodeState.values()], getGraphNodeCount: () => graphNodeState.size,
      queryGraph, pickGraph, raycastGraph, resolveFrameOrchestration, resolveNow,
      getLastInteractionKind: () => lastInteractionKind, getLatestExecutionSnapshot: () => latestExecutionSnapshot,
    }),
    ...createEngineMediaOverlayFacade({
      getOverlayNodes: () => overlayNodes, setOverlayNodes: (nodes) => { overlayNodes = nodes; },
      setTransformPreview: (preview) => { transformPreview = preview; }, getTransformPreview: () => transformPreview,
      setAnnotations: (nextAnnotations) => { annotations = nextAnnotations; }, getAnnotations: () => annotations,
      setInvalidatePayload: (payload) => { lastInvalidatePayload = payload as EngineInvalidateInput; },
      queryGraph, getGraphNodeIds: () => [...graphNodeState.keys()], setInteractionState: (state) => { interactionState = state; },
      markInteractionSet: () => { lastInteractionAtMs = resolveNow(); lastInteractionKind = "set"; },
      emitEvent, assetStates, setMediaSources: (sources) => { mediaSources = sources; }, getMediaSources: () => mediaSources,
      setMediaTimeMs: (timeMs) => { mediaTimeMs = timeMs; }, getMediaTimeMs: () => mediaTimeMs,
      resolveNow, getBackendPreference: () => backendPreference, setBackendPreference: (preference) => { backendPreference = preference; },
      getRuntimeCapabilitySnapshot: (): EnginePublicCapabilitiesOutput => ({ schemaVersion: ENGINE_RUNTIME_CAPABILITY_SCHEMA_VERSION, runtime: Object.values(ENGINE_RUNTIME_CAPABILITY_MAP) }),
      createHeadlessSessionId, headlessSessions,
    }),
    ...createEngineEventsAndHooksFacade({
      registerEventListener, unregisterEventListener, unregisterAllEventListeners,
      assertValidEventType, assertValidEventListener, pausedEventTypes,
      resolveEventListenerStats, registerHookListener, unregisterAllHookListeners, resolveHookListenerStats,
    }),
    ...createEngineExtensionAndSchedulerFacade({ extensionRegistry, schedulerTaskRegistry, getFrameBudgetMs: () => frameBudgetMs, createSchedulerTaskId }),
    ...createEngineCachePolicySecurityFacade({
      cacheNamespaces, resolveCacheNamespace,
      getPolicyRenderState: () => policyRenderState, setPolicyRenderState: (state) => { policyRenderState = state; },
      getPolicyResourceState: () => policyResourceState, setPolicyResourceState: (state) => { policyResourceState = state; },
      getPolicyFallbackState: () => policyFallbackState, setPolicyFallbackState: (state) => { policyFallbackState = state; },
      getSecurityTrustLevel: () => securityTrustLevel, setSecurityTrustLevel: (level) => { securityTrustLevel = level; },
      getSecurityResourceAccessPolicy: () => securityResourceAccessPolicy, setSecurityResourceAccessPolicy: (policy) => { securityResourceAccessPolicy = policy; },
      getSecurityAuditLog: () => securityAuditLog, appendSecurityAuditLog,
    }),
    ...createEngineRuntimeCapabilityDisposeFacade({
      runtimeFacade, registerEventListener, unregisterEventListener, emitEvent,
      lastEncodedCommandCount, lastReplayEventCount, latestExecutionSnapshot,
      setDiagnosticsEnabled: (enabled: boolean) => { diagnosticsEnabled = enabled; },
      createRuntimeReplayToken, replayRuntimeToken, resolvePublicDiagnostics,
      getDiagnosticsEnabled: () => diagnosticsEnabled, getOverlayCount: () => overlayNodes.length,
      captureFrame: () => runtimeShell.captureFrame(), getRuntimeStats: () => runtimeShell.getStats(),
      runtimeProfileId: runtimeProfile.id, runtimeCapabilityCount: profileRuntime.capabilityIds.length,
      lastFramePressureReason: latestFrameStats.pressureReason, lastFramePressureSignals: latestFrameStats.pressureSignals, lastDocumentRevision: documentSnapshot.revision,
      lastCompileChangeSetId: latestCompileOutput.changeSetId, lastCompileChangedNodeCount: latestCompileOutput.changedNodeIds.length, lastExecutionDrawCount: latestExecutionSnapshot.drawCount,
      lastRuntimeWorldRevision: latestRuntimeWorldRevision, lastDirtyDomainCount: latestDirtyState.dirtyDomains.length, lastReplayFirstCommandId,
      lastBoundaryViolationCount: boundaryValidation.violations.length, lastPublicApiViolationCount: publicApiSurfaceViolations.length,
      getBackendInfo: () => runtimeShell.getBackendInfo(),
      resolveRuntimeDocumentSnapshot, resolveRuntimeDocumentRevision, applyRuntimeDocumentChangeSet, compileRuntimeWorld,
      resolveRuntimeWorldSnapshotOutput, resolveRuntimeWorldGraphStatsOutput, resolveRuntimeDirtyStateOutput, markRuntimeDirtyDomain,
      flushRuntimeDirtyDomains, scheduleRuntimeIncrementalCompile, forceRuntimeFullCompile, createRuntimeFramePlan,
      inspectRuntimePlan, encodeRuntimeCommandPlan, validateRuntimeCommandBuffer, submitRuntimeCommandBuffer,
      submitRuntimeCommandBufferBatch, createRuntimeGpuResource, updateRuntimeGpuResource, destroyRuntimeGpuResource,
      createRuntimeUploadBatch, createRuntimeBarrierPlan, applyRuntimeBarrierPlan, readbackRuntimeResource,
      queryRuntimeViewportCandidates, queryRuntimeFrustumVisibleSet, pickGraph, raycastGraph, queryRuntimeSpatialIndex,
      switchRuntimeBackend, resolveRuntimeBackendFallbackHistory, setRuntimeBackendDebugOptions, captureRuntimeFrame,
      captureRuntimeCommandTrace, resolveRuntimePublicMetrics, getRuntimeTrace, createRuntimeDocumentSnapshot,
      validateRuntimeDocumentSnapshot, resolveRuntimeDocumentSchemaVersion, diffRuntimeDocumentSnapshots, rebaseRuntimeDocumentChangeSet, serializeRuntimeDocumentSnapshot, deserializeRuntimeDocumentSnapshot,
      compileRuntimeWorldFromDocument, queryRuntimeWorldEntity, queryRuntimeWorldComponent, queryRuntimeNodeTransform,
      formatRuntimeNodeSvgTransform, clearRuntimeWorldSnapshot, markRuntimeDirtyDomainsBatch, resolveRuntimePendingDirtyDomains,
      resetRuntimeDirtyState, createRuntimeCommandEncoder, optimizeRuntimeCommandBuffer, inspectRuntimeCommandBuffer,
      replayRuntimeCommandBuffer, resolveRuntimeBackendListAvailableOutput, selectRuntimeBackend, resolveRuntimeBackendGetActiveOutput,
      resolveRuntimeBackendCapabilities, resolveRuntimeBackendLimits, resolveRuntimeBackendGetFallbackTraceOutput, probeRuntimeHeadlessBackend,
      createRuntimeVisibilityPlan, createRuntimeLodPlan, createRuntimeRoiPlan, createRuntimeBudgetPlan,
      createRuntimeHitGeometryPayload, resolveRuntimeHitTolerance, requestRuntimePlanFrame, cancelRuntimePlanFrame,
      setRuntimePlanInteractiveInterval, resolveRuntimePlanSchedulerDiagnostics, registerRuntimeResource, updateRuntimeResource, releaseRuntimeResource, pinRuntimeResource, unpinRuntimeResource, getRuntimeResourceResidency,
      collectRuntimeResources, startRuntimeTrace, stopRuntimeTrace, getRuntimeMetricsSnapshot,
      queryGraph, resolvePublicDiagnosticsForCapability: resolvePublicDiagnostics,
      disposeRuntimePlanScheduler, isMounted: () => mountTarget !== null,
    }),
  };
}

