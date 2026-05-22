import type {
  EngineGraphInput,
  EngineGraphNodeInput,
  EngineGraphPatchInput,
  EngineHandle,
  EngineEventListener,
  EngineHookListener,
  EngineHookStage,
  EngineInvalidateInput,
  EnginePickOptions,
  EnginePickPointInput,
  EnginePickResult,
  EngineQueryBoundsInput,
  EngineQueryResult,
  EngineRayInput,
  EngineRaycastHit,
  EngineRaycastOptions,
  EngineRenderResult,
  EngineRuntimeBackendFallbackTraceItem,
  EngineRuntimeBackendFallbackHistoryOutput,
  EngineRuntimeBackendStateOutput,
  EngineRuntimeBackendCapabilitiesOutput,
  EngineRuntimeBackendGetActiveOutput,
  EngineRuntimeBackendGetFallbackTraceOutput,
  EngineRuntimeBackendLimitsOutput,
  EngineRuntimeBackendListAvailableOutput,
  EngineRuntimeBackendProbeHeadlessOutput,
  EngineRuntimeBackendSelectInput,
  EngineRuntimeBackendSelectOutput,
  EngineRuntimeBudgetPlanOutput,
  EngineRuntimeBudgetPlanRequest,
  EngineRuntimeCaptureFrameInput,
  EngineRuntimeCaptureFrameOutput,
  EngineRuntimeCompileTriggerOutput,
  EngineRuntimeCommand,
  EngineRuntimeCommandCreateEncoderInput,
  EngineRuntimeCommandCreateEncoderOutput,
  EngineRuntimeCommandEncodeInput,
  EngineRuntimeCommandEncodeOutput,
  EngineRuntimeCommandInspectOutput,
  EngineRuntimeCommandTraceOutput,
  EngineRuntimeCommandOptimizeInput,
  EngineRuntimeCommandOptimizeOutput,
  EngineRuntimeCommandReplayOutput,
  EngineRuntimeCommandValidateInput,
  EngineRuntimeCommandValidateOutput,
  EngineRuntimeDirtyFlushInput,
  EngineRuntimeDirtyFlushOutput,
  EngineRuntimeDirtyMarkInput,
  EngineRuntimeDirtyMarkBatchInput,
  EngineRuntimeDirtyResetOutput,
  EngineRuntimeDirtyStateOutput,
  EngineRuntimeDocumentCreateSnapshotInput,
  EngineRuntimeDocumentDeserializeSnapshotInput,
  EngineRuntimeDocumentDiffSnapshotsInput,
  EngineRuntimeDocumentDiffSnapshotsOutput,
  EngineRuntimeDocumentApplyChangeSetInput,
  EngineRuntimeDocumentApplyChangeSetResult,
  EngineRuntimeDocumentRebaseChangeSetInput,
  EngineRuntimeDocumentSerializeSnapshotInput,
  EngineRuntimeDocumentSerializeSnapshotOutput,
  EngineRuntimeDocumentValidateSnapshotInput,
  EngineRuntimeDocumentValidateSnapshotOutput,
  EngineRuntimeFramePlanOutput,
  EngineRuntimeGetTraceOutput,
  EngineRuntimeLodPlanOutput,
  EngineRuntimeLodPlanRequest,
  EngineRuntimeMetricsSnapshot,
  EngineRuntimePlanFrameRequest,
  EngineRuntimePlanInspectOutput,
  EngineRuntimeReplayOutput,
  EngineRuntimeReplayTokenOutput,
  EngineRuntimeSubmitOutput,
  EngineRuntimeGpuResourceDescriptor,
  EngineRuntimeGpuResourceOutput,
  EngineRuntimeUploadBatchOutput,
  EngineRuntimeBarrierPlanOutput,
  EngineRuntimeBarrierApplyOutput,
  EngineRuntimeReadbackOutput,
  EngineRuntimeSpatialQueryOutput,
  EnginePublicMetricsOutput,
  EngineRuntimeResourceCollectGarbageInput,
  EngineRuntimeResourceCollectGarbageOutput,
  EngineRuntimeResourceDescriptor,
  EngineRuntimeResourcePatch,
  EngineRuntimeResourceResidencyOutput,
  EngineRuntimeRoiPlanOutput,
  EngineRuntimeRoiPlanRequest,
  EngineRuntimeStartTraceInput,
  EngineRuntimeStartTraceOutput,
  EngineRuntimeStopTraceOutput,
  EngineRuntimeTraceEvent,
  EngineRuntimeVisibilityPlanOutput,
  EngineRuntimeVisibilityPlanRequest,
  EngineRuntimeWorldGraphStatsOutput,
  EngineRuntimeWorldClearOutput,
  EngineRuntimeWorldCompileFromDocumentInput,
  EngineRuntimeWorldQueryComponentInput,
  EngineRuntimeWorldQueryComponentOutput,
  EngineRuntimeWorldQueryEntityInput,
  EngineRuntimeWorldQueryEntityOutput,
  EngineRuntimeWorldSnapshotOutput,
  EngineViewInput,
  EngineViewSnapshot,
} from "./public-types";
import type { EngineBackend } from "../backend/backend";
import { resolveBackendSelectionFromProtocol } from "../protocol/backend/backend-selection";
import { resolveEngineBackendFromAdapters } from "../backend/backendAdapterRegistry";
import { createEngineRuntimeShell } from "../runtime/engineRuntime";
import {
  resolveEnginePerformanceOptions,
  type CreateEngineOptions,
} from "./createEngineContracts";
import { resolveCreateEnginePolicyBootstrap } from "../policy/createEnginePolicyBootstrap";
import { resolveCreateEngineFrame } from "../render-planning/createEngineFrameResolver";
import {
  type EngineViewportState,
} from "../view/viewportFacade";
import { createEngineRuntimeFacade } from "../render-runtime/runtimeFacade";
import type { EngineRenderFrameStats } from "../render-runtime/runtimeFacade";
import type { EngineDocumentChangeSet } from "../document/document-contracts";
import type {
  EngineDocumentChangeOperation,
  EngineDocumentSnapshot,
  EngineDocumentNode,
  EngineDocumentNodeKind,
  EngineDocumentNodePayload,
} from "../document/document-contracts";
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
import { browserPlatformRuntimeProfile } from "../profiles/browser/browser-runtime-profile";
import { headlessRuntimeProfile } from "../profiles/headless/headless-runtime-profile";
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
import type { EngineDirtyDomain } from "../dirty/dirtyPropagation/dirtyPropagation.contract";
import { createEngineSpatialQueryModule } from "../spatial/spatialQuery/spatialQuery";
import { createEngineHitTestRayModule } from "../picking/hitTestRay/hitTestRay";
import type { EngineSpatialQueryNode } from "../spatial/spatialQuery/spatialQuery.contract";
import type { EngineRayPickCandidate } from "../picking/hitTestRay/hitTestRay.contract";
import {
  resolveEngineGeometryPayload,
  type EngineGeometryPayload,
  type ResolveEngineGeometryPayloadOptions,
} from "../interaction/geometryPayload";
import {
  resolveEngineAdaptiveHitTolerance,
  type EngineAdaptiveHitTolerance,
  type ResolveEngineAdaptiveHitToleranceOptions,
} from "../interaction/hitTolerance";
import {
  resolveNodeTransform,
  toResolvedNodeSvgTransform,
  type BoxTransformSource,
  type ResolvedNodeTransform,
} from "../interaction/shapeTransform";
import {
  createEngineRenderScheduler,
  type EngineRenderScheduler,
  type EngineRenderSchedulerDiagnostics,
} from "../scheduler/renderScheduler";

const ENGINE_RUNTIME_DOCUMENT_SCHEMA_VERSION = 1;

/**
 * Resolves one document node kind from graph-node input.
 * @param node Graph node payload received from public setGraph/updateGraph APIs.
 */
function resolveDocumentNodeKindFromGraphNode(node: EngineGraphNodeInput): EngineDocumentNodeKind {
  if (node.kind === "group" || node.kind === "shape" || node.kind === "text" || node.kind === "image" || node.kind === "custom") {
    return node.kind;
  }
  const fallbackKind = typeof node.type === "string" ? node.type : "shape";
  if (fallbackKind === "group" || fallbackKind === "shape" || fallbackKind === "text" || fallbackKind === "image" || fallbackKind === "custom") {
    return fallbackKind;
  }
  return "shape";
}

/**
 * Resolves one document payload revision object from graph-node input payload.
 * @param node Graph node payload received from public setGraph/updateGraph APIs.
 */
function resolveDocumentNodePayloadFromGraphNode(node: EngineGraphNodeInput): EngineDocumentNodePayload {
  const rawPayload = node.payload;
  return {
    transformRevision: typeof rawPayload?.transformRevision === "number" ? rawPayload.transformRevision : 1,
    geometryRevision: typeof rawPayload?.geometryRevision === "number" ? rawPayload.geometryRevision : 1,
    materialRevision: typeof rawPayload?.materialRevision === "number" ? rawPayload.materialRevision : 1,
    textRevision: typeof rawPayload?.textRevision === "number" ? rawPayload.textRevision : 1,
    visibilityRevision: typeof rawPayload?.visibilityRevision === "number" ? rawPayload.visibilityRevision : 1,
    pickingRevision: typeof rawPayload?.pickingRevision === "number" ? rawPayload.pickingRevision : 1,
    gpuUploadRevision: typeof rawPayload?.gpuUploadRevision === "number" ? rawPayload.gpuUploadRevision : 1,
  };
}

/**
 * Resolves one document node from graph-node input.
 * @param node Graph node payload received from public setGraph/updateGraph APIs.
 */
function resolveDocumentNodeFromGraphNode(node: EngineGraphNodeInput): EngineDocumentNode {
  return {
    id: node.id,
    kind: resolveDocumentNodeKindFromGraphNode(node),
    parentId: typeof node.parentId === "string" ? node.parentId : undefined,
    payload: resolveDocumentNodePayloadFromGraphNode(node),
  };
}

/**
 * Resolves one public view snapshot from viewport state.
 * @param viewport Viewport state resolved by viewport facade.
 */
function resolveViewSnapshotFromViewportState(viewport: {
  width: number;
  height: number;
  offsetX: number;
  offsetY: number;
  scale: number;
}): EngineViewSnapshot {
  return {
    viewportWidth: viewport.width,
    viewportHeight: viewport.height,
    offsetX: viewport.offsetX,
    offsetY: viewport.offsetY,
    scale: viewport.scale,
  };
}

/**
 * Resolves one finite numeric value from unknown input.
 * @param value Raw input value.
 * @param fallback Fallback value when input is not finite.
 */
function resolveFiniteNumber(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

/**
 * Resolves one spatial query node from raw graph node payload.
 * @param node Raw graph node payload tracked by createEngine graph state.
 */
function resolveSpatialQueryNodeFromGraphNode(node: EngineGraphNodeInput): EngineSpatialQueryNode {
  const x = resolveFiniteNumber(node.x, 0);
  const y = resolveFiniteNumber(node.y, 0);
  const width = Math.abs(resolveFiniteNumber(node.width, 0));
  const height = Math.abs(resolveFiniteNumber(node.height, 0));
  return {
    id: node.id,
    x,
    y,
    width,
    height,
  };
}

/**
 * Resolves one ray-pick candidate from raw graph node payload.
 * @param node Raw graph node payload tracked by createEngine graph state.
 */
function resolveRayPickCandidateFromGraphNode(node: EngineGraphNodeInput): EngineRayPickCandidate {
  const x = resolveFiniteNumber(node.x, 0);
  const y = resolveFiniteNumber(node.y, 0);
  const z = resolveFiniteNumber(node.z, 0);
  const width = Math.abs(resolveFiniteNumber(node.width, 0));
  const height = Math.abs(resolveFiniteNumber(node.height, 0));
  const depth = Math.abs(resolveFiniteNumber(node.depth, 0));
  return {
    id: node.id,
    minX: x,
    maxX: x + width,
    minY: y,
    maxY: y + height,
    minZ: z,
    maxZ: z + depth,
  };
}

/**
 * Resolves backend instance for the current createEngine invocation.
 * @param options Engine creation options with requested backend and surface.
 */
function resolveEngineBackend(
  options: CreateEngineOptions,
  backendSelectorModule: ReturnType<typeof createEngineBackendSelectorModule>,
): {
  backend: EngineBackend;
  backendSelection: ReturnType<typeof resolveBackendSelectionFromProtocol>;
} {
  const backendSelection = backendSelectorModule.resolveSelection(options);
  /**
   * Normalizes selector output to concrete adapter mode for strict backend adapter resolution.
   * @param mode Resolved selector mode that may still be typed as EngineBackendMode.
   */
  function normalizeResolvedBackendMode(mode: typeof backendSelection.resolved): "webgpu" | "webgl" | "canvas2d" | "headless" {
    if (mode === "auto") {
      // Keep runtime deterministic even if selector contract drifts and leaks auto mode.
      return "headless";
    }
    return mode;
  }
  const backend = resolveEngineBackendFromAdapters(
    normalizeResolvedBackendMode(backendSelection.resolved),
    {
      surface: options.surface,
      canvas2d: options.canvas2d,
    },
  );
  return {
    backend,
    backendSelection,
  };
}

/**
 * Resolves the runtime profile selected for one createEngine invocation.
 * @param backendSelection Backend selection metadata resolved for this engine instance.
 */
function resolveCreateEngineRuntimeProfile(backendSelection: {
  resolved: string;
}) {
  if (backendSelection.resolved === "headless") {
    return headlessRuntimeProfile;
  }
  return browserPlatformRuntimeProfile;
}

/**
 * Creates the canonical engine facade with explicit backend and lifecycle diagnostics.
 * @param options Engine creation options for surface, backend, runtime adapter, and staged planning knobs.
 */
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
    invalidation: {
      transform: false,
      geometry: false,
      material: false,
      text: false,
      visibility: false,
      picking: false,
      gpuUpload: false,
    },
  };
  let latestExecutionSnapshot: EngineExecutionSnapshot = {
    documentRevision: 0,
    worldRevision: 0,
    compile: latestCompileOutput,
    visibleCandidateIds: [],
    pickingHitIds: [],
    drawCount: 0,
  };
  let latestRuntimeWorldRevision = 0;
  let runtimeWorldSnapshotOverride: EngineRuntimeWorldSnapshotOutput | null = null;
  let latestDirtyState = dirtyPropagationModule.createEmptyState();
  let lastRuntimeDirtyMarkedAt = 0;
  let lastEncodedCommandCount = 0;
  let lastReplayEventCount = 0;
  let lastReplayFirstCommandId: string | null = null;
  let runtimeCommandEncoderCounter = 0;
  let overlayNodes: readonly unknown[] = [];
  let mountTarget: unknown = null;
  let developerConfig: Readonly<Record<string, unknown>> = {
    debug: Boolean(options.debug),
  };
  let viewportLayout: unknown = null;
  let qualityProfile = "balanced";
  let frameBudgetMs = 16;
  let interactionState: Readonly<Record<string, unknown>> | null = null;
  let transformPreview: unknown = null;
  let annotations: readonly unknown[] = [];
  let mediaSources: readonly unknown[] = [];
  let mediaTimeMs = 0;
  let diagnosticsEnabled = true;
  let backendPreference: "auto" | "webgpu" | "webgl" | "canvas2d" | "headless" = options.backend ?? "auto";
  let runtimeBackendFallbackHistory: EngineRuntimeBackendFallbackTraceItem[] = [];
  let runtimeBackendDebugOptions: Readonly<Record<string, unknown>> = {};
  let runtimePlanInteractiveIntervalMs = 8;
  let runtimePlanRequestCounter = 0;
  const runtimePlanPendingRequestIds = new Set<string>();
  let runtimePlanScheduler: EngineRenderScheduler | null = null;
  const eventListeners = new Map<string, Set<(payload: unknown) => void>>();
  const eventListenerMetadata = new Map<string, Map<(payload: unknown) => void, {
    scope?: "global" | "session" | "trace";
    sampleRate?: number;
    throttleMs?: number;
  }>>();
  const pausedEventTypes = new Set<string>();
  const eventTypeDeliveryCounters = new Map<string, number>();
  const eventListenerLastDeliveredAt = new Map<string, Map<(payload: unknown) => void, number>>();
  const hookStages: readonly EngineHookStage[] = [
    "beforeCompile",
    "afterCompile",
    "beforeRenderPlan",
    "afterRenderPlan",
    "beforeSubmit",
    "afterSubmit",
  ];
  const hookListeners = new Map<EngineHookStage, Set<EngineHookListener>>();
  const hookListenerMetadata = new Map<EngineHookStage, Map<EngineHookListener, {
    scope?: "global" | "session" | "trace";
  }>>();
  const extensionRegistry = new Map<string, { pluginId: string; state: "registered" | "active" | "errored" | "disposed" }>();
  const schedulerTaskRegistry = new Map<string, {
    taskId: string;
    queue: string;
    priority: "low" | "normal" | "high";
    budgetMs: number;
    task: unknown;
  }>();
  let schedulerTaskCounter = 0;
  const cacheNamespaces = new Map<string, Map<string, {
    value: unknown;
    tags: readonly string[];
    policy: { ttlMs?: number; pinned?: boolean; tags?: readonly string[] } | undefined;
  }>>();
  const cacheNamespaceStats = new Map<string, { hitCount: number; missCount: number }>();
  let policyRenderState: Readonly<Record<string, unknown>> = {};
  let policyResourceState: Readonly<Record<string, unknown>> = {};
  let policyFallbackState: Readonly<Record<string, unknown>> = {};
  let securityTrustLevel: "low" | "standard" | "high" = "standard";
  let securityResourceAccessPolicy: Readonly<Record<string, unknown>> = {};
  const securityAuditLog: Array<Readonly<Record<string, unknown>>> = [];
  let securityAuditCounter = 0;
  const assetStates = new Map<string, "loaded" | "preloaded" | "unloaded">();
  const headlessSessions = new Map<string, { createdAtMs: number }>();
  let headlessSessionCounter = 0;
  const runtimeGpuResources = new Map<string, EngineRuntimeGpuResourceDescriptor>();
  const runtimeUploadBatches = new Map<string, readonly string[]>();
  const runtimeBarrierPlans = new Map<string, readonly string[]>();
  let runtimeUploadBatchCounter = 0;
  let runtimeBarrierPlanCounter = 0;
  let lastInvalidatePayload: EngineInvalidateInput | null = null;
  const runtimeResourceRegistry = new Map<string, {
    id: string;
    kind: EngineRuntimeResourceDescriptor["kind"];
    sizeBytes: number;
    pinned: boolean;
    residencyVersion: number;
  }>();
  let runtimeResourceResidencyVersion = 0;
  const runtimeTraceRegistry = new Map<string, {
    traceId: string;
    startedAtMs: number;
    stoppedAtMs: number | null;
    events: EngineRuntimeTraceEvent[];
  }>();
  let runtimeTraceCounter = 0;
  let runtimeReplayCounter = 0;
  const boundaryValidation = productAdapterBoundaryModule.validateSafeInput(options);
  const publicApiSurfaceViolations = publicApiSurfaceModule.validateDescriptors([
    {
      name: "engine.setGraph",
      level: "developer",
      stability: "stable",
    },
    {
      name: "engine.runtime.submit",
      level: "advanced",
      stability: "beta",
    },
    {
      name: "engine.capability.render.renderFrame",
      level: "developer",
      stability: "stable",
    },
    {
      name: "engine.events.on",
      level: "developer",
      stability: "stable",
    },
  ]);
  const resolveNow = options.runtimeAdapter?.now ?? (() => performanceNow());
  const engineId = `engine-${Math.max(0, Math.floor(resolveNow()))}`;
  const { backend, backendSelection } = resolveEngineBackend(
    options,
    backendSelectorModule,
  );
  const runtimeProfile = resolveCreateEngineRuntimeProfile(backendSelection);
  const profileRuntime = createEngineRuntimeFromProfile(runtimeProfile);

  /**
   * Applies one deterministic change-set and refreshes compile/runtime execution snapshots.
   * @param changeSet Ordered document mutations for the current frame boundary.
   */
  function applyDocumentAndCompile(changeSet: EngineDocumentChangeSet): void {
    const previousSnapshot = documentSnapshot;
    const currentSnapshot = documentGraphModule.applyChangeSet(previousSnapshot, changeSet);
    const compileOutput = sceneCompilerModule.compileChangeSet({
      previousSnapshot,
      currentSnapshot,
      changeSet,
    });
    const runtimeWorld = runtimeWorldModule.buildFromDocument(currentSnapshot);

    documentSnapshot = currentSnapshot;
    runtimeWorldSnapshotOverride = null;
    latestCompileOutput = compileOutput;
    latestRuntimeWorldRevision = runtimeWorld.revision;
    latestDirtyState = dirtyPropagationModule.markDirtyBatch(
      latestDirtyState,
      resolveDirtyDomainsFromCompileOutput(compileOutput),
    );
  }

  /**
   * Resolves staged planning/runtime diagnostics for one frame timestamp.
   * @param timestampMs Frame timestamp in milliseconds.
   */
  function resolveFrameOrchestration(timestampMs: number): EngineRenderFrameStats {
    // Guard staged frame orchestration with profile capability metadata so
    // H2.2 routes runtime assembly through profile-backed contracts.
    const schedulerRequirement = profileRuntime.requireCapability("scheduler.frame-phases");
    if (schedulerRequirement.shouldThrow) {
      throw new Error(
        schedulerRequirement.warning?.message ??
          "Profile runtime is missing scheduler.frame-phases capability.",
      );
    }

    const interactionActive = timestampMs - lastInteractionAtMs <= 120;
    const viewport = viewportFacade.getViewport();
    latestExecutionSnapshot = resolveStagedExecutionSnapshot({
      document: documentSnapshot,
      compile: latestCompileOutput,
      viewport: {
        width: viewport.width,
        height: viewport.height,
        offsetX: viewport.offsetX,
        offsetY: viewport.offsetY,
        scale: viewport.scale,
      },
    });

    const encoded = commandEncoderModule.encode(
      latestExecutionSnapshot.visibleCandidateIds.map((entityId, index) => ({
        id: `draw-${index}-${entityId}`,
        kind: "draw" as const,
        payload: {
          entityId,
        },
      })),
    );
    lastEncodedCommandCount = encoded.commands.length;
    const replayResult = commandReplayModule.replay(encoded.commands);
    lastReplayEventCount = replayResult.replayedCount;
    lastReplayFirstCommandId = replayResult.events[0]?.commandId ?? null;

    const decision = resolveCreateEngineFrame({
      scene: { nodeCount: latestExecutionSnapshot.visibleCandidateIds.length },
      viewport: {
        width: viewport.width,
        height: viewport.height,
        offsetX: viewport.offsetX,
        offsetY: viewport.offsetY,
        scale: viewport.scale,
      },
      performance,
      policy,
      interactionActive,
      nowMs: timestampMs,
      lastInteractionAtMs,
      lastInteractionKind,
      cameraAnimationActive: false,
      cameraCachePreviewOnly: true,
      settleDelayMs: 120,
      tileQueuePendingCount: 0,
      dirtyRegionCount: 0,
    });

    latestFrameStats = {
      timestampMs,
      phase: decision.runtime.strategy.phase,
      pressure: decision.runtime.budget.pressure,
      pressureReason: decision.runtime.budget.reason,
      pressureSignals: decision.runtime.budget.signals,
    };
    latestDirtyState = dirtyPropagationModule.flushDirty(
      latestDirtyState,
      latestDirtyState.dirtyDomains,
    );
    return latestFrameStats;
  }

  /**
   * Applies one complete graph snapshot as document source of truth.
   * @param graph Full graph payload from public setGraph/loadScene APIs.
   */
  function applyGraphSnapshot(graph: EngineGraphInput): void {
    graphNodeState.clear();
    for (const node of graph.nodes) {
      if (typeof node.id === "string" && node.id.length > 0) {
        graphNodeState.set(node.id, node);
      }
    }

    const nextNodes = graph.nodes
      .filter((node) => typeof node.id === "string" && node.id.length > 0)
      .map((node) => resolveDocumentNodeFromGraphNode(node));
    const nextNodeIdSet = new Set(nextNodes.map((node) => node.id));
    const currentNodeIds = Object.keys(documentSnapshot.nodes);
    const operations: EngineDocumentChangeOperation[] = [];

    for (const nodeId of currentNodeIds) {
      if (!nextNodeIdSet.has(nodeId)) {
        operations.push({
          type: "remove-node",
          nodeId,
        });
      }
    }

    for (const node of nextNodes) {
      operations.push({
        type: "upsert-node",
        node,
      });
    }

    const currentRevision = documentSnapshot.revision;
    const numericRevision = typeof graph.revision === "number"
      ? graph.revision
      : Number.parseInt(String(graph.revision ?? currentRevision + 1), 10);
    applyDocumentAndCompile({
      id: `set-graph-${currentRevision + 1}`,
      targetRevision: Number.isFinite(numericRevision) ? numericRevision : currentRevision + 1,
      operations,
    });
  }

  /**
   * Applies one incremental graph patch batch.
   * @param patch Incremental graph patch payload from updateGraph/applyScenePatchBatch APIs.
   */
  function applyGraphPatchBatch(patch: EngineGraphPatchInput): void {
    for (const [patchIndex, stagedPatch] of patch.patches.entries()) {
      if (stagedPatch.replaceAll) {
        applyGraphSnapshot({
          revision: stagedPatch.revision,
          nodes: stagedPatch.upsertNodes ?? [],
        });
        continue;
      }

      const operations: EngineDocumentChangeOperation[] = [];
      for (const nodeId of stagedPatch.removeNodeIds ?? []) {
        graphNodeState.delete(nodeId);
        operations.push({
          type: "remove-node",
          nodeId,
        });
      }
      for (const node of stagedPatch.upsertNodes ?? []) {
        if (typeof node.id !== "string" || node.id.length === 0) {
          continue;
        }
        graphNodeState.set(node.id, node);
        operations.push({
          type: "upsert-node",
          node: resolveDocumentNodeFromGraphNode(node),
        });
      }
      if (operations.length === 0) {
        continue;
      }

      const currentRevision = documentSnapshot.revision;
      const numericRevision = typeof stagedPatch.revision === "number"
        ? stagedPatch.revision
        : Number.parseInt(String(stagedPatch.revision ?? currentRevision + 1), 10);
      applyDocumentAndCompile({
        id: `patch-graph-${currentRevision + 1}-${patchIndex}`,
        targetRevision: Number.isFinite(numericRevision) ? numericRevision : currentRevision + 1,
        operations,
      });
    }
  }

  /**
   * Applies one viewport update patch from public setView/setViewport APIs.
   * @param view Partial viewport payload from public view methods.
   */
  function applyViewPatch(view: EngineViewInput): EngineViewSnapshot {
    lastInteractionAtMs = resolveNow();
    lastInteractionKind = "set";
    const nextViewport = viewportFacade.setViewport({
      width: view.viewportWidth,
      height: view.viewportHeight,
      offsetX: view.offsetX,
      offsetY: view.offsetY,
      scale: view.scale,
    });
    return resolveViewSnapshotFromViewportState(nextViewport);
  }

  /**
   * Resolves one public diagnostics snapshot for runtime bridge/tooling callers.
   */
  function resolvePublicDiagnostics() {
    return {
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
    };
  }

  /**
   * Returns current runtime document revision.
   */
  function resolveRuntimeDocumentRevision(): number {
    return documentSnapshot.revision;
  }

  /**
   * Returns runtime document schema version marker.
   */
  function resolveRuntimeDocumentSchemaVersion(): number {
    return ENGINE_RUNTIME_DOCUMENT_SCHEMA_VERSION;
  }

  /**
   * Applies one runtime document change-set with revision/schema guard checks.
   * @param input Runtime document apply request.
   */
  function applyRuntimeDocumentChangeSet(
    input: EngineRuntimeDocumentApplyChangeSetInput,
  ): EngineRuntimeDocumentApplyChangeSetResult {
    if (!input || !input.changeSet || !Array.isArray(input.changeSet.operations)) {
      throw new Error("ENGINE_DOCUMENT_INVALID_CHANGESET");
    }
    if (typeof input.baseRevision === "number" && input.baseRevision !== documentSnapshot.revision) {
      throw new Error("ENGINE_DOCUMENT_REVISION_CONFLICT");
    }
    if (
      typeof input.schemaVersion === "number" &&
      input.schemaVersion !== ENGINE_RUNTIME_DOCUMENT_SCHEMA_VERSION
    ) {
      throw new Error("ENGINE_DOCUMENT_INVALID_CHANGESET");
    }
    applyDocumentAndCompile(input.changeSet);
    return {
      nextRevision: documentSnapshot.revision,
      appliedOps: input.changeSet.operations.length,
      warnings: [],
    };
  }

  /**
   * Creates one runtime document snapshot from explicit revision and node table payload.
   * @param input Runtime document create-snapshot request.
   */
  function createRuntimeDocumentSnapshot(
    input: EngineRuntimeDocumentCreateSnapshotInput,
  ): EngineDocumentSnapshot {
    // Guard snapshot creation to keep invalid input behavior deterministic.
    if (!input || !Number.isFinite(input.revision) || typeof input.nodes !== "object" || input.nodes === null) {
      throw new Error("ENGINE_DOCUMENT_INVALID_CHANGESET");
    }
    return {
      revision: Math.max(0, Math.trunc(input.revision)),
      nodes: input.nodes,
    };
  }

  /**
   * Validates one runtime document snapshot shape.
   * @param input Runtime document validate-snapshot request.
   */
  function validateRuntimeDocumentSnapshot(
    input: EngineRuntimeDocumentValidateSnapshotInput,
  ): EngineRuntimeDocumentValidateSnapshotOutput {
    if (!input || !input.snapshot) {
      return {
        valid: false,
        issues: ["ENGINE_DOCUMENT_INVALID_CHANGESET"],
      };
    }
    const issues: string[] = [];
    if (!Number.isFinite(input.snapshot.revision) || input.snapshot.revision < 0) {
      issues.push("ENGINE_DOCUMENT_INVALID_CHANGESET");
    }
    if (typeof input.snapshot.nodes !== "object" || input.snapshot.nodes === null) {
      issues.push("ENGINE_DOCUMENT_INVALID_CHANGESET");
    }
    return {
      valid: issues.length === 0,
      issues,
    };
  }

  /**
   * Diffs two document snapshots and returns deterministic node-id deltas.
   * @param input Runtime document diff request.
   */
  function diffRuntimeDocumentSnapshots(
    input: EngineRuntimeDocumentDiffSnapshotsInput,
  ): EngineRuntimeDocumentDiffSnapshotsOutput {
    // Defensive contract guard keeps runtime/document error semantics aligned with foundation descriptor.
    if (!input || !input.base || !input.target) {
      throw new Error("ENGINE_DOCUMENT_INVALID_CHANGESET");
    }
    const baseNodeIds = new Set(Object.keys(input.base.nodes));
    const targetNodeIds = new Set(Object.keys(input.target.nodes));
    const addedNodeIds = [...targetNodeIds].filter((id) => !baseNodeIds.has(id)).sort();
    const removedNodeIds = [...baseNodeIds].filter((id) => !targetNodeIds.has(id)).sort();
    const updatedNodeIds = [...targetNodeIds]
      .filter((id) => baseNodeIds.has(id))
      .filter((id) => {
        const baseNode = input.base.nodes[id];
        const targetNode = input.target.nodes[id];
        // Structural JSON comparison is intentionally deterministic for plain document node payloads.
        return JSON.stringify(baseNode) !== JSON.stringify(targetNode);
      })
      .sort();
    return {
      addedNodeIds,
      removedNodeIds,
      updatedNodeIds,
    };
  }

  /**
   * Rebases one change-set target revision to provided base revision.
   * @param input Runtime document rebase request.
   */
  function rebaseRuntimeDocumentChangeSet(
    input: EngineRuntimeDocumentRebaseChangeSetInput,
  ): EngineDocumentChangeSet {
    // Reject malformed rebasing requests before touching runtime document state.
    if (!input || !input.changeSet || !Number.isFinite(input.baseRevision)) {
      throw new Error("ENGINE_DOCUMENT_INVALID_CHANGESET");
    }
    return {
      ...input.changeSet,
      targetRevision: Math.max(0, Math.trunc(input.baseRevision)) + 1,
    };
  }

  /**
   * Serializes one document snapshot into stable JSON payload string.
   * @param input Runtime document serialize request.
   */
  function serializeRuntimeDocumentSnapshot(
    input: EngineRuntimeDocumentSerializeSnapshotInput,
  ): EngineRuntimeDocumentSerializeSnapshotOutput {
    // Snapshot shape guard keeps serialization error behavior stable for callers.
    if (!input || !input.snapshot || typeof input.snapshot.revision !== "number") {
      throw new Error("ENGINE_DOCUMENT_INVALID_CHANGESET");
    }
    return {
      payload: JSON.stringify(input.snapshot),
    };
  }

  /**
   * Deserializes one snapshot payload and validates minimal snapshot shape.
   * @param input Runtime document deserialize request.
   */
  function deserializeRuntimeDocumentSnapshot(
    input: EngineRuntimeDocumentDeserializeSnapshotInput,
  ): EngineDocumentSnapshot {
    // Payload type guard prevents ambiguous JSON parser failures from leaking to API consumers.
    if (!input || typeof input.payload !== "string") {
      throw new Error("ENGINE_DOCUMENT_INVALID_CHANGESET");
    }
    const parsed = JSON.parse(input.payload) as Partial<EngineDocumentSnapshot>;
    // Minimal shape validation preserves deterministic contract behavior for invalid snapshots.
    if (typeof parsed.revision !== "number" || typeof parsed.nodes !== "object" || parsed.nodes === null) {
      throw new Error("ENGINE_DOCUMENT_INVALID_CHANGESET");
    }
    return {
      revision: parsed.revision,
      nodes: parsed.nodes,
    };
  }

  /**
   * Returns current runtime world snapshot output.
   */
  function resolveRuntimeWorldSnapshotOutput(): EngineRuntimeWorldSnapshotOutput {
    if (runtimeWorldSnapshotOverride) {
      return {
        worldRevision: runtimeWorldSnapshotOverride.worldRevision,
        entities: [...runtimeWorldSnapshotOverride.entities],
      };
    }
    const runtimeWorld = runtimeWorldModule.buildFromDocument(documentSnapshot);
    return {
      worldRevision: runtimeWorld.revision,
      entities: runtimeWorld.entities,
    };
  }

  /**
   * Compiles one runtime-world snapshot from explicit document snapshot input.
   * @param input Runtime world compile-from-document request.
   */
  function compileRuntimeWorldFromDocument(
    input: EngineRuntimeWorldCompileFromDocumentInput,
  ): EngineRuntimeWorldSnapshotOutput {
    if (!input || !input.snapshot || typeof input.snapshot.nodes !== "object" || input.snapshot.nodes === null) {
      throw new Error("ENGINE_WORLD_NOT_COMPILED");
    }
    const runtimeWorld = runtimeWorldModule.buildFromDocument(input.snapshot);
    const snapshot: EngineRuntimeWorldSnapshotOutput = {
      worldRevision: runtimeWorld.revision,
      entities: runtimeWorld.entities,
    };
    runtimeWorldSnapshotOverride = snapshot;
    return snapshot;
  }

  /**
   * Queries one runtime-world entity by id.
   * @param input Runtime world query-entity request.
   */
  function queryRuntimeWorldEntity(
    input: EngineRuntimeWorldQueryEntityInput,
  ): EngineRuntimeWorldQueryEntityOutput {
    if (!input || typeof input.entityId !== "string") {
      throw new Error("ENGINE_WORLD_NOT_COMPILED");
    }
    const snapshot = resolveRuntimeWorldSnapshotOutput();
    const entity = snapshot.entities.find((item) => item.id === input.entityId) ?? null;
    return {
      found: entity !== null,
      entity,
    };
  }

  /**
   * Queries runtime-world entities that expose requested component facet.
   * @param input Runtime world query-component request.
   */
  function queryRuntimeWorldComponent(
    input: EngineRuntimeWorldQueryComponentInput,
  ): EngineRuntimeWorldQueryComponentOutput {
    if (!input || typeof input.component !== "string") {
      throw new Error("ENGINE_WORLD_NOT_COMPILED");
    }
    const snapshot = resolveRuntimeWorldSnapshotOutput();
    // Current runtime world entity schema is bounds-only, so every entity exposes core components.
    return {
      entityIds: snapshot.entities.map((entity) => entity.id),
    };
  }

  /**
   * Clears current runtime-world snapshot override.
   * @param _unused Unused placeholder to keep call shape explicit for future extension.
   */
  function clearRuntimeWorldSnapshot(_unused?: void): EngineRuntimeWorldClearOutput {
    const previousCount = resolveRuntimeWorldSnapshotOutput().entities.length;
    runtimeWorldSnapshotOverride = {
      worldRevision: resolveRuntimeWorldSnapshotOutput().worldRevision,
      entities: [],
    };
    return {
      clearedEntityCount: previousCount,
    };
  }

  /**
   * Returns current runtime world graph stats output.
   */
  function resolveRuntimeWorldGraphStatsOutput(): EngineRuntimeWorldGraphStatsOutput {
    const snapshot = resolveRuntimeWorldSnapshotOutput();
    return {
      worldRevision: snapshot.worldRevision,
      entityCount: snapshot.entities.length,
    };
  }

  /**
   * Returns current runtime dirty state snapshot.
   */
  function resolveRuntimeDirtyStateOutput(): EngineRuntimeDirtyStateOutput {
    return {
      pendingDomains: [...latestDirtyState.dirtyDomains],
      lastMarkedAt: lastRuntimeDirtyMarkedAt,
    };
  }

  /**
   * Marks one runtime dirty domain and returns updated dirty state snapshot.
   * @param input Runtime dirty mark input.
   */
  function markRuntimeDirtyDomain(input: EngineRuntimeDirtyMarkInput): EngineRuntimeDirtyStateOutput {
    const validDomains: readonly EngineDirtyDomain[] = [
      "transform",
      "geometry",
      "material",
      "visibility",
      "picking",
      "resource",
    ];
    if (!input || !validDomains.includes(input.domain)) {
      throw new Error("ENGINE_DIRTY_INVALID_DOMAIN");
    }
    latestDirtyState = dirtyPropagationModule.markDirty(latestDirtyState, input.domain);
    lastRuntimeDirtyMarkedAt = resolveNow();
    return resolveRuntimeDirtyStateOutput();
  }

  /**
   * Marks multiple runtime dirty domains in one deterministic batch.
   * @param input Runtime dirty mark-batch request.
   */
  function markRuntimeDirtyDomainsBatch(
    input: EngineRuntimeDirtyMarkBatchInput,
  ): EngineRuntimeDirtyStateOutput {
    if (!input || !Array.isArray(input.domains)) {
      throw new Error("ENGINE_DIRTY_INVALID_DOMAIN");
    }
    latestDirtyState = dirtyPropagationModule.markDirtyBatch(latestDirtyState, input.domains);
    lastRuntimeDirtyMarkedAt = resolveNow();
    return resolveRuntimeDirtyStateOutput();
  }

  /**
   * Returns current pending dirty domains only.
   */
  function resolveRuntimePendingDirtyDomains(): readonly EngineRuntimeDirtyMarkInput["domain"][] {
    return [...latestDirtyState.dirtyDomains];
  }

  /**
   * Flushes requested dirty domains and returns post-flush state.
   * @param input Runtime dirty flush request.
   */
  function flushRuntimeDirtyDomains(
    input: EngineRuntimeDirtyFlushInput,
  ): EngineRuntimeDirtyFlushOutput {
    if (!input || !Array.isArray(input.domains)) {
      throw new Error("ENGINE_DIRTY_INVALID_DOMAIN");
    }
    const before = new Set(latestDirtyState.dirtyDomains);
    latestDirtyState = dirtyPropagationModule.flushDirty(latestDirtyState, input.domains);
    const after = new Set(latestDirtyState.dirtyDomains);
    let flushedCount = 0;
    for (const domain of before) {
      if (!after.has(domain)) {
        flushedCount += 1;
      }
    }
    return {
      flushedCount,
      state: resolveRuntimeDirtyStateOutput(),
    };
  }

  /**
   * Resets runtime dirty state to empty set.
   */
  function resetRuntimeDirtyState(): EngineRuntimeDirtyResetOutput {
    latestDirtyState = dirtyPropagationModule.createEmptyState();
    lastRuntimeDirtyMarkedAt = resolveNow();
    return {
      reset: true,
    };
  }

  /**
   * Encodes one runtime command plan into deterministic command output.
   * @param plan Runtime command encode input.
   */
  function encodeRuntimeCommandPlan(plan: EngineRuntimeCommandEncodeInput): EngineRuntimeCommandEncodeOutput {
    if (!plan || !Array.isArray(plan.commands)) {
      throw new Error("ENGINE_COMMAND_INVALID_PLAN");
    }
    const encoded = commandEncoderModule.encode(plan.commands as readonly EngineRuntimeCommand[]);
    return {
      bufferId: `buffer-${latestCompileOutput.changeSetId}-${encoded.commands.length}`,
      commands: encoded.commands,
      commandCount: encoded.commands.length,
    };
  }

  /**
   * Creates one runtime command encoder session.
   * @param input Runtime command create-encoder request.
   */
  function createRuntimeCommandEncoder(
    input: EngineRuntimeCommandCreateEncoderInput,
  ): EngineRuntimeCommandCreateEncoderOutput {
    if (!input || typeof input.profile !== "string" || input.profile.length === 0) {
      throw new Error("ENGINE_COMMAND_INVALID_PLAN");
    }
    runtimeCommandEncoderCounter += 1;
    return {
      encoderId: `encoder-${input.profile}-${runtimeCommandEncoderCounter}`,
    };
  }

  /**
   * Validates one runtime command buffer and returns deterministic issue summary.
   * @param buffer Runtime command validate input.
   */
  function validateRuntimeCommandBuffer(
    buffer: EngineRuntimeCommandValidateInput,
  ): EngineRuntimeCommandValidateOutput {
    if (!buffer || !Array.isArray(buffer.commands)) {
      return {
        valid: false,
        validationIssues: ["ENGINE_COMMAND_VALIDATION_FAILED"],
      };
    }
    const invalidCommand = buffer.commands.some((command) => typeof command.id !== "string" || command.id.length === 0);
    if (invalidCommand) {
      return {
        valid: false,
        validationIssues: ["ENGINE_COMMAND_VALIDATION_FAILED"],
      };
    }
    return {
      valid: true,
      validationIssues: [],
    };
  }

  /**
   * Optimizes runtime command buffer with deterministic id ordering.
   * @param input Runtime command optimize request.
   */
  function optimizeRuntimeCommandBuffer(
    input: EngineRuntimeCommandOptimizeInput,
  ): EngineRuntimeCommandOptimizeOutput {
    if (!input || !Array.isArray(input.commands)) {
      throw new Error("ENGINE_COMMAND_INVALID_PLAN");
    }
    const commands = [...input.commands].sort((left, right) => left.id.localeCompare(right.id));
    return {
      commands,
      commandCount: commands.length,
    };
  }

  /**
   * Inspects runtime command buffer and returns stable summary metadata.
   * @param buffer Runtime command inspect input.
   */
  function inspectRuntimeCommandBuffer(
    buffer: EngineRuntimeCommandValidateInput,
  ): EngineRuntimeCommandInspectOutput {
    const validation = validateRuntimeCommandBuffer(buffer);
    return {
      valid: validation.valid,
      summary: validation.valid
        ? `commands:${buffer.commands.length}`
        : `invalid:${validation.validationIssues.join("|")}`,
    };
  }

  /**
   * Replays runtime command buffer and returns replay-count summary.
   * @param buffer Runtime command replay input.
   */
  function replayRuntimeCommandBuffer(
    buffer: EngineRuntimeCommandValidateInput,
  ): EngineRuntimeCommandReplayOutput {
    const replayResult = commandReplayModule.replay(buffer?.commands ?? []);
    return {
      replayedCount: replayResult.replayedCount,
    };
  }

  /**
   * Returns available backend modes in selector-probe order.
   */
  function resolveRuntimeBackendListAvailableOutput(): EngineRuntimeBackendListAvailableOutput {
    return {
      available: backendSelectorModule.getDefaultProbes().map((probe) => probe.mode),
    };
  }

  /**
   * Returns active backend mode for current runtime session.
   */
  function resolveRuntimeBackendGetActiveOutput(): EngineRuntimeBackendGetActiveOutput {
    return {
      active: runtimeShell.getBackendInfo().resolved,
    };
  }

  /**
   * Returns deterministic fallback trace for current backend selection state.
   */
  function resolveRuntimeBackendGetFallbackTraceOutput(): EngineRuntimeBackendGetFallbackTraceOutput {
    const backendInfo = runtimeShell.getBackendInfo();
    const traceItem: EngineRuntimeBackendFallbackTraceItem = {
      requested: backendInfo.requested,
      resolved: backendInfo.resolved,
      reason: backendInfo.fallbackReason,
    };
    return {
      fallbackTrace: [traceItem],
    };
  }

  /**
   * Selects runtime backend preference and returns deterministic resolution snapshot.
   * @param input Runtime backend select request.
   */
  function selectRuntimeBackend(input: EngineRuntimeBackendSelectInput): EngineRuntimeBackendSelectOutput {
    const availableModes = resolveRuntimeBackendListAvailableOutput().available;
    const requested = input?.preference ?? "auto";
    const resolved = requested === "auto" || !availableModes.includes(requested)
      ? resolveRuntimeBackendGetActiveOutput().active
      : requested;
    return {
      requested,
      resolved,
    };
  }

  /**
   * Returns runtime capability switches for active backend mode.
   */
  function resolveRuntimeBackendCapabilities(): EngineRuntimeBackendCapabilitiesOutput {
    const active = resolveRuntimeBackendGetActiveOutput().active;
    return {
      compute: active !== "canvas2d",
      readback: true,
    };
  }

  /**
   * Returns runtime operational limits for active backend mode.
   */
  function resolveRuntimeBackendLimits(): EngineRuntimeBackendLimitsOutput {
    const active = resolveRuntimeBackendGetActiveOutput().active;
    if (active === "canvas2d") {
      return {
        maxTextureSize: 4096,
        maxCommandsPerSubmit: 1024,
      };
    }
    return {
      maxTextureSize: 16384,
      maxCommandsPerSubmit: 16384,
    };
  }

  /**
   * Probes whether headless backend mode is available in current host.
   */
  function probeRuntimeHeadlessBackend(): EngineRuntimeBackendProbeHeadlessOutput {
    return {
      supported: resolveRuntimeBackendListAvailableOutput().available.includes("headless"),
    };
  }

  /**
   * Creates one runtime frame-plan payload from explicit planning request.
   * @param request Runtime planning request payload.
   */
  function createRuntimeFramePlan(request: EngineRuntimePlanFrameRequest): EngineRuntimeFramePlanOutput {
    if (!request || !Number.isFinite(request.nodeCount)) {
      throw new Error("ENGINE_PLAN_INVALID_REQUEST");
    }
    const runtimeDecision = resolveCreateEngineFrame({
      scene: { nodeCount: Math.max(0, request.nodeCount) },
      viewport: {
        width: Math.max(1, request.viewportWidth),
        height: Math.max(1, request.viewportHeight),
        offsetX: 0,
        offsetY: 0,
        scale: viewportFacade.getViewport().scale,
      },
      performance,
      policy,
      interactionActive: request.interactionActive,
      nowMs: resolveNow(),
      lastInteractionAtMs,
      lastInteractionKind,
      cameraAnimationActive: false,
      cameraCachePreviewOnly: true,
      settleDelayMs: 120,
      tileQueuePendingCount: 0,
      dirtyRegionCount: 0,
    });
    return {
      planId: `plan-${documentSnapshot.revision}-${Math.max(0, request.nodeCount)}`,
      phase: runtimeDecision.phase,
      pressure: runtimeDecision.pressure,
      overscanBorderPx: runtimeDecision.overscanBorderPx,
      shortlistCandidateRatio: runtimeDecision.shortlistCandidateRatio,
    };
  }

  /**
   * Creates one runtime visibility-plan payload from candidate ids.
   * @param request Visibility-plan request payload.
   */
  function createRuntimeVisibilityPlan(
    request: EngineRuntimeVisibilityPlanRequest,
  ): EngineRuntimeVisibilityPlanOutput {
    if (!request || !Array.isArray(request.candidateNodeIds)) {
      throw new Error("ENGINE_PLAN_INVALID_REQUEST");
    }
    const visibleNodeIds = [...request.candidateNodeIds].sort();
    return {
      visibleNodeIds,
      visibleCount: visibleNodeIds.length,
    };
  }

  /**
   * Creates one runtime LOD-plan payload from viewport scale.
   * @param request LOD-plan request payload.
   */
  function createRuntimeLodPlan(request: EngineRuntimeLodPlanRequest): EngineRuntimeLodPlanOutput {
    if (!request || !Number.isFinite(request.scale)) {
      throw new Error("ENGINE_PLAN_INVALID_REQUEST");
    }
    const threshold = typeof request.baseThreshold === "number" ? request.baseThreshold : 1;
    const lodLevel: EngineRuntimeLodPlanOutput["lodLevel"] = request.scale >= threshold * 1.5
      ? "fine"
      : request.scale >= threshold
        ? "balanced"
        : "coarse";
    return {
      lodLevel,
      threshold,
    };
  }

  /**
   * Creates one runtime ROI-plan payload from bounds request.
   * @param request ROI-plan request payload.
   */
  function createRuntimeRoiPlan(request: EngineRuntimeRoiPlanRequest): EngineRuntimeRoiPlanOutput {
    if (!request || !Number.isFinite(request.width) || !Number.isFinite(request.height)) {
      throw new Error("ENGINE_PLAN_INVALID_REQUEST");
    }
    const margin = typeof request.margin === "number" ? Math.max(0, request.margin) : 0;
    return {
      x: request.x - margin,
      y: request.y - margin,
      width: Math.max(0, request.width) + margin * 2,
      height: Math.max(0, request.height) + margin * 2,
    };
  }

  /**
   * Creates one runtime budget-plan payload from pressure signals.
   * @param request Budget-plan request payload.
   */
  function createRuntimeBudgetPlan(
    request: EngineRuntimeBudgetPlanRequest,
  ): EngineRuntimeBudgetPlanOutput {
    if (!request || !Number.isFinite(request.nodeCount)) {
      throw new Error("ENGINE_PLAN_INVALID_REQUEST");
    }
    const frameDecision = resolveCreateEngineFrame({
      scene: { nodeCount: Math.max(0, request.nodeCount) },
      viewport: viewportFacade.getViewport(),
      performance,
      policy,
      interactionActive: false,
      nowMs: resolveNow(),
      lastInteractionAtMs,
      lastInteractionKind,
      cameraAnimationActive: false,
      cameraCachePreviewOnly: true,
      settleDelayMs: 120,
      tileQueuePendingCount: Math.max(0, request.tileQueuePendingCount),
      dirtyRegionCount: Math.max(0, request.dirtyRegionCount),
    });
    return {
      pressure: frameDecision.runtime.budget.pressure,
      reason: frameDecision.runtime.budget.reason,
    };
  }

  /**
   * Inspects one runtime plan payload and returns stable summary text.
   * @param plan Arbitrary runtime plan payload.
   */
  function inspectRuntimePlan(plan: unknown): EngineRuntimePlanInspectOutput {
    if (!plan || typeof plan !== "object") {
      throw new Error("ENGINE_PLAN_INSPECT_INVALID");
    }
    const keys = Object.keys(plan as Record<string, unknown>).sort();
    return {
      valid: keys.length > 0,
      summary: `plan-keys:${keys.join(",")}`,
    };
  }

  /**
   * Creates unified hit geometry payload from runtime plan request.
   * @param request Geometry payload request with nodes/pointer/selection context.
   */
  function createRuntimeHitGeometryPayload(
    request: ResolveEngineGeometryPayloadOptions,
  ): EngineGeometryPayload {
    return resolveEngineGeometryPayload(request);
  }

  /**
   * Resolves adaptive hit tolerance from viewport/tuning options.
   * @param options Optional viewport and tuning options.
   */
  function resolveRuntimeHitTolerance(
    options?: ResolveEngineAdaptiveHitToleranceOptions,
  ): EngineAdaptiveHitTolerance {
    return resolveEngineAdaptiveHitTolerance(options);
  }

  /**
   * Resolves node transform metadata from source box fields.
   * @param source Raw source box transform fields.
   */
  function queryRuntimeNodeTransform(source: BoxTransformSource): ResolvedNodeTransform {
    return resolveNodeTransform(source);
  }

  /**
   * Formats resolved node transform metadata into SVG transform syntax.
   * @param transform Resolved node transform metadata.
   */
  function formatRuntimeNodeSvgTransform(transform: ResolvedNodeTransform): string | undefined {
    return toResolvedNodeSvgTransform(transform);
  }

  /**
   * Creates one runtime plan scheduler instance bound to current render pipeline.
   * @param interactiveIntervalMs Interactive throttle interval in milliseconds.
   */
  function createRuntimePlanScheduler(interactiveIntervalMs: number): EngineRenderScheduler {
    return createEngineRenderScheduler({
      render: async () => {
        const stats = resolveFrameOrchestration(resolveNow());
        return {
          drawCount: latestExecutionSnapshot.drawCount,
          visibleCount: latestExecutionSnapshot.visibleCandidateIds.length,
          frameMs: Math.max(0, stats.timestampMs),
        };
      },
      interactiveIntervalMs,
      // Reuse host adapter scheduling hooks so tests/headless hosts do not require browser globals.
      scheduleFrame: options.runtimeAdapter?.requestFrame
        ? (callback) => options.runtimeAdapter!.requestFrame(() => callback())
        : undefined,
      cancelFrame: options.runtimeAdapter?.cancelFrame,
      now: resolveNow,
    });
  }

  /**
   * Ensures runtime plan scheduler exists before scheduling operations.
   */
  function ensureRuntimePlanScheduler(): EngineRenderScheduler {
    if (!runtimePlanScheduler) {
      runtimePlanScheduler = createRuntimePlanScheduler(runtimePlanInteractiveIntervalMs);
    }
    return runtimePlanScheduler;
  }

  /**
   * Requests one scheduled frame from runtime plan scheduler.
   * @param mode Optional scheduler mode token.
   */
  function requestRuntimePlanFrame(
    mode: "interactive" | "normal" = "normal",
  ): { requestId: string; scheduled: boolean } {
    const scheduler = ensureRuntimePlanScheduler();
    runtimePlanRequestCounter += 1;
    const requestId = `runtime-plan-request-${runtimePlanRequestCounter}`;
    runtimePlanPendingRequestIds.add(requestId);
    scheduler.request(mode);
    return {
      requestId,
      scheduled: true,
    };
  }

  /**
   * Cancels one pending scheduled frame request by id.
   * @param requestId Runtime plan scheduler request id.
   */
  function cancelRuntimePlanFrame(requestId: string): { cancelled: boolean } {
    if (!runtimePlanPendingRequestIds.has(requestId)) {
      return {
        cancelled: false,
      };
    }
    runtimePlanPendingRequestIds.delete(requestId);
    runtimePlanScheduler?.cancel();
    return {
      cancelled: true,
    };
  }

  /**
   * Sets runtime plan scheduler interactive throttle interval.
   * @param intervalMs Interactive throttle interval in milliseconds.
   */
  function setRuntimePlanInteractiveInterval(intervalMs: number): { intervalMs: number } {
    const resolvedIntervalMs = Number.isFinite(intervalMs) ? Math.max(1, intervalMs) : runtimePlanInteractiveIntervalMs;
    runtimePlanInteractiveIntervalMs = resolvedIntervalMs;
    runtimePlanScheduler?.dispose();
    runtimePlanScheduler = createRuntimePlanScheduler(runtimePlanInteractiveIntervalMs);
    runtimePlanPendingRequestIds.clear();
    return {
      intervalMs: runtimePlanInteractiveIntervalMs,
    };
  }

  /**
   * Returns runtime plan scheduler diagnostics snapshot.
   */
  function resolveRuntimePlanSchedulerDiagnostics(): EngineRenderSchedulerDiagnostics {
    return ensureRuntimePlanScheduler().getDiagnostics();
  }

  /**
   * Disposes runtime plan scheduler state.
   */
  function disposeRuntimePlanScheduler(): void {
    runtimePlanScheduler?.dispose();
    runtimePlanScheduler = null;
    runtimePlanPendingRequestIds.clear();
  }

  /**
   * Converts one internal runtime resource record to public residency output.
   * @param resource Internal resource registry record.
   */
  function resolveRuntimeResourceResidencyOutput(resource: {
    id: string;
    kind: EngineRuntimeResourceDescriptor["kind"];
    sizeBytes: number;
    pinned: boolean;
    residencyVersion: number;
  }): EngineRuntimeResourceResidencyOutput {
    return {
      id: resource.id,
      residencyVersion: resource.residencyVersion,
      pinned: resource.pinned,
      sizeBytes: resource.sizeBytes,
    };
  }

  /**
   * Registers one runtime resource descriptor and returns residency snapshot.
   * @param descriptor Runtime resource descriptor.
   */
  function registerRuntimeResource(
    descriptor: EngineRuntimeResourceDescriptor,
  ): EngineRuntimeResourceResidencyOutput {
    if (!descriptor || typeof descriptor.id !== "string" || descriptor.id.length === 0) {
      throw new Error("ENGINE_RESOURCE_INVALID_DESCRIPTOR");
    }
    runtimeResourceResidencyVersion += 1;
    const nextRecord = {
      id: descriptor.id,
      kind: descriptor.kind,
      sizeBytes: Math.max(0, descriptor.sizeBytes),
      pinned: false,
      residencyVersion: runtimeResourceResidencyVersion,
    };
    runtimeResourceRegistry.set(descriptor.id, nextRecord);
    return resolveRuntimeResourceResidencyOutput(nextRecord);
  }

  /**
   * Resolves one runtime resource record by id or throws not-found error.
   * @param resourceId Runtime resource id.
   */
  function resolveRuntimeResourceById(resourceId: string): {
    id: string;
    kind: EngineRuntimeResourceDescriptor["kind"];
    sizeBytes: number;
    pinned: boolean;
    residencyVersion: number;
  } {
    const resource = runtimeResourceRegistry.get(resourceId);
    if (!resource) {
      throw new Error("ENGINE_RESOURCE_NOT_FOUND");
    }
    return resource;
  }

  /**
   * Updates one runtime resource descriptor fields and returns residency snapshot.
   * @param resourceId Runtime resource id.
   * @param patch Runtime resource patch payload.
   */
  function updateRuntimeResource(
    resourceId: string,
    patch: EngineRuntimeResourcePatch,
  ): EngineRuntimeResourceResidencyOutput {
    const resource = resolveRuntimeResourceById(resourceId);
    // Update is intentionally patch-based so callers can evolve one field without re-registering.
    const nextSizeBytes = typeof patch.sizeBytes === "number" ? Math.max(0, patch.sizeBytes) : resource.sizeBytes;
    runtimeResourceResidencyVersion += 1;
    const nextRecord = {
      ...resource,
      sizeBytes: nextSizeBytes,
      residencyVersion: runtimeResourceResidencyVersion,
    };
    runtimeResourceRegistry.set(resourceId, nextRecord);
    return resolveRuntimeResourceResidencyOutput(nextRecord);
  }

  /**
   * Releases one runtime resource descriptor.
   * @param resourceId Runtime resource id.
   */
  function releaseRuntimeResource(resourceId: string): { released: boolean } {
    resolveRuntimeResourceById(resourceId);
    runtimeResourceRegistry.delete(resourceId);
    return { released: true };
  }

  /**
   * Pins one runtime resource descriptor and returns residency snapshot.
   * @param resourceId Runtime resource id.
   */
  function pinRuntimeResource(resourceId: string): EngineRuntimeResourceResidencyOutput {
    const resource = resolveRuntimeResourceById(resourceId);
    runtimeResourceResidencyVersion += 1;
    const nextRecord = {
      ...resource,
      pinned: true,
      residencyVersion: runtimeResourceResidencyVersion,
    };
    runtimeResourceRegistry.set(resourceId, nextRecord);
    return resolveRuntimeResourceResidencyOutput(nextRecord);
  }

  /**
   * Unpins one runtime resource descriptor and returns residency snapshot.
   * @param resourceId Runtime resource id.
   */
  function unpinRuntimeResource(resourceId: string): EngineRuntimeResourceResidencyOutput {
    const resource = resolveRuntimeResourceById(resourceId);
    runtimeResourceResidencyVersion += 1;
    const nextRecord = {
      ...resource,
      pinned: false,
      residencyVersion: runtimeResourceResidencyVersion,
    };
    runtimeResourceRegistry.set(resourceId, nextRecord);
    return resolveRuntimeResourceResidencyOutput(nextRecord);
  }

  /**
   * Returns one runtime resource residency snapshot by id.
   * @param resourceId Runtime resource id.
   */
  function getRuntimeResourceResidency(resourceId: string): EngineRuntimeResourceResidencyOutput {
    return resolveRuntimeResourceResidencyOutput(resolveRuntimeResourceById(resourceId));
  }

  /**
   * Executes one budgeted runtime resource garbage-collection cycle.
   * @param options Runtime resource GC options.
   */
  function collectRuntimeResources(
    options: EngineRuntimeResourceCollectGarbageInput,
  ): EngineRuntimeResourceCollectGarbageOutput {
    if (!options || !Number.isFinite(options.budgetBytes) || options.budgetBytes < 0) {
      throw new Error("ENGINE_RESOURCE_INVALID_DESCRIPTOR");
    }
    const releasedResourceIds: string[] = [];
    let releasedBytes = 0;
    for (const [resourceId, resource] of [...runtimeResourceRegistry.entries()].sort(([a], [b]) => a.localeCompare(b))) {
      // Skip pinned resources so caller pin/unpin state is respected by GC.
      if (resource.pinned) {
        continue;
      }
      if (releasedBytes + resource.sizeBytes > options.budgetBytes) {
        continue;
      }
      releasedBytes += resource.sizeBytes;
      releasedResourceIds.push(resourceId);
      runtimeResourceRegistry.delete(resourceId);
    }
    return {
      releasedResourceIds,
      releasedCount: releasedResourceIds.length,
    };
  }

  /**
   * Starts one runtime trace session.
   * @param options Trace start options.
   */
  function startRuntimeTrace(options: EngineRuntimeStartTraceInput): EngineRuntimeStartTraceOutput {
    if (!options || typeof options.name !== "string" || options.name.length === 0) {
      throw new Error("ENGINE_OBSERVABILITY_INVALID_INPUT");
    }
    runtimeTraceCounter += 1;
    const traceId = `trace-${runtimeTraceCounter}`;
    const startedAtMs = resolveNow();
    runtimeTraceRegistry.set(traceId, {
      traceId,
      startedAtMs,
      stoppedAtMs: null,
      events: [
        {
          timestampMs: startedAtMs,
          category: "trace",
          message: `start:${options.name}`,
        },
      ],
    });
    return {
      traceId,
      startedAtMs,
    };
  }

  /**
   * Stops one runtime trace session.
   * @param traceId Runtime trace id.
   */
  function stopRuntimeTrace(traceId: string): EngineRuntimeStopTraceOutput {
    const trace = runtimeTraceRegistry.get(traceId);
    if (!trace) {
      throw new Error("ENGINE_OBSERVABILITY_TRACE_NOT_FOUND");
    }
    const stoppedAtMs = resolveNow();
    trace.stoppedAtMs = stoppedAtMs;
    trace.events.push({
      timestampMs: stoppedAtMs,
      category: "trace",
      message: "stop",
    });
    const output = {
      traceId,
      stoppedAtMs,
      durationMs: Math.max(0, stoppedAtMs - trace.startedAtMs),
    };
    emitEvent("engine.diagnostics.traceReady", output);
    return output;
  }

  /**
   * Returns one runtime trace event stream.
   * @param traceId Runtime trace id.
   */
  function getRuntimeTrace(traceId: string): EngineRuntimeGetTraceOutput {
    const trace = runtimeTraceRegistry.get(traceId);
    if (!trace) {
      throw new Error("ENGINE_OBSERVABILITY_TRACE_NOT_FOUND");
    }
    return {
      traceId,
      events: [...trace.events],
    };
  }

  /**
   * Returns one runtime metrics snapshot from current orchestration counters.
   */
  function getRuntimeMetricsSnapshot(): EngineRuntimeMetricsSnapshot {
    return {
      encodedCommandCount: lastEncodedCommandCount,
      replayedCommandCount: lastReplayEventCount,
      drawCount: latestExecutionSnapshot.drawCount,
    };
  }

  /**
   * Captures one runtime frame diagnostics token with optional label.
   * @param options Optional capture options.
   */
  function captureRuntimeFrame(
    options?: EngineRuntimeCaptureFrameInput,
  ): EngineRuntimeCaptureFrameOutput {
    const output = {
      timestampMs: resolveNow(),
      label: typeof options?.label === "string" ? options.label : null,
    };
    emitEvent("engine.diagnostics.captureReady", output);
    return output;
  }

  /**
   * Creates one deterministic replay token.
   * @param scope Caller-provided replay scope token.
   */
  function createRuntimeReplayToken(scope: string): EngineRuntimeReplayTokenOutput {
    if (typeof scope !== "string" || scope.length === 0) {
      throw new Error("ENGINE_OBSERVABILITY_INVALID_INPUT");
    }
    runtimeReplayCounter += 1;
    return {
      token: `replay-${scope}-${documentSnapshot.revision}-${runtimeReplayCounter}`,
    };
  }

  /**
   * Replays one deterministic replay token.
   * @param token Replay token produced by createReplayToken.
   */
  function replayRuntimeToken(token: string): EngineRuntimeReplayOutput {
    return {
      accepted: typeof token === "string" && token.startsWith("replay-"),
    };
  }

  /**
   * Returns current runtime document snapshot.
   */
  function resolveRuntimeDocumentSnapshot(): EngineDocumentSnapshot {
    return {
      revision: documentSnapshot.revision,
      nodes: documentSnapshot.nodes,
    };
  }

  /**
   * Compiles runtime world from optional document snapshot payload.
   * @param options Optional compile options including document snapshot override.
   */
  function compileRuntimeWorld(options?: { snapshot?: EngineDocumentSnapshot }): EngineRuntimeWorldSnapshotOutput {
    if (options?.snapshot) {
      return compileRuntimeWorldFromDocument({ snapshot: options.snapshot });
    }
    return resolveRuntimeWorldSnapshotOutput();
  }

  /**
   * Schedules one incremental compile trigger.
   * @param options Optional trigger options.
   */
  function scheduleRuntimeIncrementalCompile(
    options?: { reason?: string },
  ): EngineRuntimeCompileTriggerOutput {
    return {
      scheduled: true,
      reason: options?.reason ?? "manual-schedule",
    };
  }

  /**
   * Forces one full compile trigger.
   * @param reason Explicit caller reason token.
   */
  function forceRuntimeFullCompile(reason: string): EngineRuntimeCompileTriggerOutput {
    return {
      scheduled: true,
      reason,
    };
  }

  /**
   * Submits one command buffer and returns deterministic submitted-count summary.
   * @param commandBuffer Runtime command buffer payload.
   */
  function submitRuntimeCommandBuffer(
    commandBuffer: EngineRuntimeCommandValidateInput,
  ): EngineRuntimeSubmitOutput {
    return {
      submittedCount: Array.isArray(commandBuffer?.commands) ? commandBuffer.commands.length : 0,
    };
  }

  /**
   * Submits one command buffer batch and returns aggregate submitted-count summary.
   * @param commandBuffers Runtime command buffer batch payload.
   */
  function submitRuntimeCommandBufferBatch(
    commandBuffers: readonly EngineRuntimeCommandValidateInput[],
  ): EngineRuntimeSubmitOutput {
    let submittedCount = 0;
    for (const buffer of commandBuffers) {
      submittedCount += Array.isArray(buffer?.commands) ? buffer.commands.length : 0;
    }
    return {
      submittedCount,
    };
  }

  /**
   * Creates one runtime GPU resource descriptor record.
   * @param descriptor Runtime GPU resource descriptor payload.
   */
  function createRuntimeGpuResource(
    descriptor: EngineRuntimeGpuResourceDescriptor,
  ): EngineRuntimeGpuResourceOutput {
    runtimeGpuResources.set(descriptor.id, descriptor);
    return {
      id: descriptor.id,
      exists: true,
    };
  }

  /**
   * Updates one runtime GPU resource descriptor record.
   * @param resourceId Runtime GPU resource id.
   * @param patch Runtime GPU resource patch payload.
   */
  function updateRuntimeGpuResource(
    resourceId: string,
    patch: Readonly<Record<string, unknown>>,
  ): EngineRuntimeGpuResourceOutput {
    const current = runtimeGpuResources.get(resourceId);
    if (!current) {
      return {
        id: resourceId,
        exists: false,
      };
    }
    const next: EngineRuntimeGpuResourceDescriptor = {
      ...current,
      kind: typeof patch.kind === "string" ? patch.kind : current.kind,
      sizeBytes:
        typeof patch.sizeBytes === "number" && Number.isFinite(patch.sizeBytes)
          ? patch.sizeBytes
          : current.sizeBytes,
    };
    runtimeGpuResources.set(resourceId, next);
    return {
      id: resourceId,
      exists: true,
    };
  }

  /**
   * Destroys one runtime GPU resource descriptor record.
   * @param resourceId Runtime GPU resource id.
   */
  function destroyRuntimeGpuResource(resourceId: string): EngineRuntimeGpuResourceOutput {
    const exists = runtimeGpuResources.delete(resourceId);
    return {
      id: resourceId,
      exists,
    };
  }

  /**
   * Creates one runtime upload batch.
   * @param request Upload-batch request payload.
   */
  function createRuntimeUploadBatch(request: {
    resourceIds: readonly string[];
  }): EngineRuntimeUploadBatchOutput {
    runtimeUploadBatchCounter += 1;
    const batchId = `upload-${runtimeUploadBatchCounter}`;
    runtimeUploadBatches.set(batchId, [...request.resourceIds]);
    return {
      batchId,
      resourceCount: request.resourceIds.length,
    };
  }

  /**
   * Creates one runtime barrier plan.
   * @param request Barrier-plan request payload.
   */
  function createRuntimeBarrierPlan(request: {
    resourceIds: readonly string[];
  }): EngineRuntimeBarrierPlanOutput {
    runtimeBarrierPlanCounter += 1;
    const planId = `barrier-${runtimeBarrierPlanCounter}`;
    runtimeBarrierPlans.set(planId, [...request.resourceIds]);
    return {
      planId,
      resourceCount: request.resourceIds.length,
    };
  }

  /**
   * Applies one runtime barrier plan.
   * @param plan Barrier-plan payload.
   */
  function applyRuntimeBarrierPlan(plan: { planId: string }): EngineRuntimeBarrierApplyOutput {
    return {
      planId: plan.planId,
      applied: runtimeBarrierPlans.has(plan.planId),
    };
  }

  /**
   * Reads back one runtime resource.
   * @param request Readback request payload.
   */
  function readbackRuntimeResource(request: { resourceId: string }): EngineRuntimeReadbackOutput {
    const resource = runtimeGpuResources.get(request.resourceId);
    return {
      resourceId: request.resourceId,
      byteLength: resource?.sizeBytes ?? 0,
    };
  }

  /**
   * Queries viewport candidates from runtime spatial path.
   * @param query Viewport query bounds payload.
   */
  function queryRuntimeViewportCandidates(query: EngineQueryBoundsInput): EngineRuntimeSpatialQueryOutput {
    return {
      nodeIds: queryGraph(query).nodeIds,
    };
  }

  /**
   * Queries runtime frustum-visible set.
   * @param query Frustum query payload.
   */
  function queryRuntimeFrustumVisibleSet(
    query: Readonly<Record<string, unknown>>,
  ): EngineRuntimeSpatialQueryOutput {
    const queryTag = typeof query.tag === "string" ? query.tag : "frustum";
    return {
      nodeIds: [...graphNodeState.keys()].sort().map((id) => `${queryTag}:${id}`),
    };
  }

  /**
   * Queries runtime spatial index.
   * @param query Spatial index query payload.
   */
  function queryRuntimeSpatialIndex(
    query: Readonly<Record<string, unknown>>,
  ): EngineRuntimeSpatialQueryOutput {
    const queryTag = typeof query.tag === "string" ? query.tag : "spatial";
    return {
      nodeIds: [...graphNodeState.keys()].sort().map((id) => `${queryTag}:${id}`),
    };
  }

  /**
   * Returns runtime backend state.
   */
  function resolveRuntimeBackendState(): EngineRuntimeBackendStateOutput {
    const backendInfo = runtimeShell.getBackendInfo();
    return {
      requested: backendInfo.requested,
      resolved: backendInfo.resolved,
      fallbackReason: backendInfo.fallbackReason,
    };
  }

  /**
   * Switches runtime backend preference and returns resolved state.
   * @param target Requested backend target.
   * @param options Optional backend switch options.
   */
  function switchRuntimeBackend(
    target: "auto" | "webgpu" | "webgl" | "canvas2d" | "headless",
    options?: Readonly<Record<string, unknown>>,
  ): EngineRuntimeBackendStateOutput {
    const selected = selectRuntimeBackend({ preference: target });
    const state = resolveRuntimeBackendState();
    const fallbackRecord: EngineRuntimeBackendFallbackTraceItem = {
      requested: selected.requested,
      resolved: selected.resolved,
      reason: selected.requested === selected.resolved ? null : "manual-switch-fallback",
    };
    runtimeBackendFallbackHistory = [
      ...runtimeBackendFallbackHistory,
      fallbackRecord,
    ];
    return {
      requested: selected.requested,
      resolved: selected.resolved,
      fallbackReason:
        fallbackRecord.reason ??
        state.fallbackReason ??
        (typeof options?.reason === "string" ? options.reason : null),
    };
  }

  /**
   * Returns runtime backend fallback history.
   */
  function resolveRuntimeBackendFallbackHistory(): EngineRuntimeBackendFallbackHistoryOutput {
    return {
      history: [...runtimeBackendFallbackHistory],
    };
  }

  /**
   * Sets runtime backend debug options.
   * @param options Runtime backend debug options payload.
   */
  function setRuntimeBackendDebugOptions(
    options: Readonly<Record<string, unknown>>,
  ): { accepted: boolean } {
    runtimeBackendDebugOptions = options;
    return {
      accepted: true,
    };
  }

  /**
   * Captures runtime command-trace snapshot.
   * @param options Optional trace options payload.
   */
  function captureRuntimeCommandTrace(options?: { label?: string }): EngineRuntimeCommandTraceOutput {
    const trace = startRuntimeTrace({
      name: options?.label ?? "runtime-command-trace",
    });
    const output = {
      traceId: trace.traceId,
      commandCount: lastEncodedCommandCount,
    };
    emitEvent("engine.diagnostics.traceReady", output);
    return output;
  }

  /**
   * Returns public runtime metrics snapshot.
   */
  function resolveRuntimePublicMetrics(): EnginePublicMetricsOutput {
    return {
      encodedCommandCount: lastEncodedCommandCount,
      replayedCommandCount: lastReplayEventCount,
      drawCount: latestExecutionSnapshot.drawCount,
    };
  }

  /**
   * Resolves current tracked graph nodes as spatial-query inputs.
   */
  function resolveSpatialQueryNodes(): EngineSpatialQueryNode[] {
    return Array.from(graphNodeState.values()).map((node) =>
      resolveSpatialQueryNodeFromGraphNode(node),
    );
  }

  /**
   * Resolves current tracked graph nodes as ray-pick candidates.
   */
  function resolveRayPickCandidates(): EngineRayPickCandidate[] {
    return Array.from(graphNodeState.values()).map((node) =>
      resolveRayPickCandidateFromGraphNode(node),
    );
  }

  /**
   * Resolves one deterministic graph query result.
   * @param bounds World-space query bounds.
   */
  function queryGraph(bounds: EngineQueryBoundsInput): EngineQueryResult {
    return {
      nodeIds: spatialQueryModule.queryViewportCandidates(resolveSpatialQueryNodes(), {
        x: bounds.x,
        y: bounds.y,
        width: bounds.width,
        height: bounds.height,
      }),
    };
  }

  /**
   * Resolves one deterministic point-pick result from current graph nodes.
   * @param point World-space point input.
   * @param options Optional pick options.
   */
  function pickGraph(point: EnginePickPointInput, options?: EnginePickOptions): EnginePickResult {
    const tolerance = Math.max(0, options?.tolerance ?? 0);
    const nodeIds = spatialQueryModule.queryPointCandidates(
      resolveSpatialQueryNodes(),
      {
        x: point.x,
        y: point.y,
      },
      tolerance,
    );
    return {
      hits: nodeIds.map((id, rank) => ({ id, rank })),
    };
  }

  /**
   * Resolves nearest graph ray hit from current graph nodes.
   * @param ray World-space ray payload.
   * @param options Optional raycast options.
   */
  function raycastGraph(ray: EngineRayInput, options?: EngineRaycastOptions): EngineRaycastHit | null {
    const hit = hitTestRayModule.hitTestRay(ray, resolveRayPickCandidates());
    if (!hit) {
      return null;
    }
    const maxDistance = options?.maxDistance;
    if (typeof maxDistance === "number" && Number.isFinite(maxDistance) && hit.distance > maxDistance) {
      return null;
    }
    return hit;
  }

  // Seed one bootstrap document so E2 contracts are exercised by default lifecycle flow.
  applyDocumentAndCompile({
    id: "bootstrap-root-shape",
    operations: [
      {
        type: "upsert-node",
        node: {
          id: "root-shape",
          kind: "shape",
          payload: {
            transformRevision: 1,
            geometryRevision: 1,
            materialRevision: 1,
            visibilityRevision: 1,
            pickingRevision: 1,
            gpuUploadRevision: 1,
          },
        },
      },
    ],
  });

  // Prime staged planning resolver so create path already validates orchestration contracts.
  resolveFrameOrchestration(resolveNow());

  backend.resize(options.surface);

  const runtimeShell = createEngineRuntimeShell(
    options,
    backend,
    backendSelection,
    {
      onFrame: (timestampMs) => {
        resolveFrameOrchestration(timestampMs);
      },
    },
  );

  const runtimeFacade = createEngineRuntimeFacade({
    loop: {
      start: () => runtimeShell.start(),
      stop: () => runtimeShell.stop(),
      isRunning: () => runtimeShell.getStats().lifecycleState === "running",
    },
    render: {
      renderFrame: async () => resolveFrameOrchestration(resolveNow()),
      dispose: () => runtimeShell.dispose(),
    },
    diagnostics: {
      getDiagnostics: () => ({
        frame: latestFrameStats,
        viewport: viewportFacade.getViewport(),
      }),
    },
  });

  /**
   * Resolves the listener set for one event type, creating it when requested.
   * @param type Event type token used as listener registry key.
   * @param createWhenMissing Whether to create registry records when absent.
   */
  function resolveEventListenerSet(
    type: string,
    createWhenMissing: boolean,
  ): Set<(payload: unknown) => void> | undefined {
    const existing = eventListeners.get(type);
    if (existing || !createWhenMissing) {
      return existing;
    }
    const created = new Set<(payload: unknown) => void>();
    eventListeners.set(type, created);
    return created;
  }

  /**
   * Validates one event type token and throws canonical error on invalid input.
   * @param type Event type input from events API calls.
   */
  function assertValidEventType(type: string): void {
    if (typeof type !== "string" || type.length === 0) {
      throw new Error("ENGINE_EVENTS_INVALID_TYPE");
    }
  }

  /**
   * Validates one event listener callback and throws canonical error on invalid input.
   * @param listener Event listener callback from events API calls.
   */
  function assertValidEventListener(listener: EngineEventListener): void {
    if (typeof listener !== "function") {
      throw new Error("ENGINE_EVENTS_INVALID_LISTENER");
    }
  }

  /**
   * Registers one event listener with optional scope metadata.
   * @param type Event type token used as listener registry key.
   * @param listener Event listener callback.
   * @param scope Optional listener scope token used by offAll operations.
   */
  function registerEventListener(
    type: string,
    listener: EngineEventListener,
    scope?: "global" | "session" | "trace",
    options?: { sampleRate?: number; throttleMs?: number },
  ): void {
    assertValidEventType(type);
    assertValidEventListener(listener);
    const listeners = resolveEventListenerSet(type, true);
    listeners?.add(listener);
    const metadataMap = eventListenerMetadata.get(type) ?? new Map<(payload: unknown) => void, {
      scope?: "global" | "session" | "trace";
      sampleRate?: number;
      throttleMs?: number;
    }>();
    metadataMap.set(listener, {
      scope,
      sampleRate: options?.sampleRate,
      throttleMs: options?.throttleMs,
    });
    eventListenerMetadata.set(type, metadataMap);
  }

  /**
   * Unregisters one event listener and cleans empty registry records.
   * @param type Event type token used as listener registry key.
   * @param listener Event listener callback.
   */
  function unregisterEventListener(type: string, listener: EngineEventListener): void {
    assertValidEventType(type);
    assertValidEventListener(listener);
    const listeners = eventListeners.get(type);
    listeners?.delete(listener);
    const metadataMap = eventListenerMetadata.get(type);
    metadataMap?.delete(listener);
    if (metadataMap && metadataMap.size === 0) {
      eventListenerMetadata.delete(type);
    }
    const listenerDeliveryMap = eventListenerLastDeliveredAt.get(type);
    listenerDeliveryMap?.delete(listener);
    if (listenerDeliveryMap && listenerDeliveryMap.size === 0) {
      eventListenerLastDeliveredAt.delete(type);
    }
    if (listeners && listeners.size === 0) {
      eventListeners.delete(type);
      eventListenerMetadata.delete(type);
      eventTypeDeliveryCounters.delete(type);
      eventListenerLastDeliveredAt.delete(type);
    }
  }

  /**
   * Removes listeners either globally or by one scope token.
   * @param scope Optional scope token used to filter listener removals.
   */
  function unregisterAllEventListeners(scope?: "global" | "session" | "trace"): void {
    if (!scope) {
      eventListeners.clear();
      eventListenerMetadata.clear();
      pausedEventTypes.clear();
      eventTypeDeliveryCounters.clear();
      eventListenerLastDeliveredAt.clear();
      return;
    }
    for (const [type, listeners] of eventListeners) {
      const metadataMap = eventListenerMetadata.get(type);
      if (!metadataMap) {
        continue;
      }
      for (const [listener, metadata] of metadataMap) {
        if (metadata.scope === scope) {
          listeners.delete(listener);
          metadataMap.delete(listener);
          eventListenerLastDeliveredAt.get(type)?.delete(listener);
        }
      }
      if (metadataMap.size === 0) {
        eventListenerMetadata.delete(type);
      }
      if (listeners.size === 0) {
        eventListeners.delete(type);
        eventTypeDeliveryCounters.delete(type);
        eventListenerLastDeliveredAt.delete(type);
      }
    }
  }

  /**
   * Emits one event envelope to registered listeners with pause/sample/throttle controls.
   * @param type Event type token.
   * @param payload Event payload object.
   */
  function emitEvent(type: string, payload: unknown): void {
    if (pausedEventTypes.has(type)) {
      return;
    }
    const listeners = eventListeners.get(type);
    if (!listeners || listeners.size === 0) {
      return;
    }
    const deliveryCount = (eventTypeDeliveryCounters.get(type) ?? 0) + 1;
    eventTypeDeliveryCounters.set(type, deliveryCount);
    const metadataMap = eventListenerMetadata.get(type);
    const lastDeliveredMap = eventListenerLastDeliveredAt.get(type) ?? new Map<(payload: unknown) => void, number>();
    eventListenerLastDeliveredAt.set(type, lastDeliveredMap);
    const timestamp = resolveNow();
    const envelope = {
      type,
      timestamp,
      engineId,
      revision: String(documentSnapshot.revision),
      payload,
    };
    for (const listener of [...listeners]) {
      const metadata = metadataMap?.get(listener);
      const sampleRate = metadata?.sampleRate;
      if (typeof sampleRate === "number" && sampleRate > 0 && sampleRate < 1) {
        const interval = Math.max(1, Math.floor(1 / sampleRate));
        if (deliveryCount % interval !== 0) {
          continue;
        }
      }
      const throttleMs = metadata?.throttleMs;
      if (typeof throttleMs === "number" && throttleMs > 0) {
        const lastDeliveredAt = lastDeliveredMap.get(listener);
        if (typeof lastDeliveredAt === "number" && timestamp - lastDeliveredAt < throttleMs) {
          continue;
        }
      }
      try {
        listener(envelope);
        lastDeliveredMap.set(listener, timestamp);
      } catch (error) {
        if (type !== "engine.diagnostics.error") {
          emitEvent("engine.diagnostics.error", {
            code: "ENGINE_EVENTS_LISTENER_FAILURE",
            sourceType: type,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }
    }
  }

  /**
   * Resolves one hook-listener set and creates records when requested.
   * @param stage Hook stage token used as listener registry key.
   * @param createWhenMissing Whether to create registry records when absent.
   */
  function resolveHookListenerSet(
    stage: EngineHookStage,
    createWhenMissing: boolean,
  ): Set<EngineHookListener> | undefined {
    const existing = hookListeners.get(stage);
    if (existing || !createWhenMissing) {
      return existing;
    }
    const created = new Set<EngineHookListener>();
    hookListeners.set(stage, created);
    return created;
  }

  /**
   * Validates one hook listener callback.
   * @param listener Hook listener callback from hooks API calls.
   */
  function assertValidHookListener(listener: EngineHookListener): void {
    if (typeof listener !== "function") {
      throw new Error("ENGINE_HOOKS_INVALID_LISTENER");
    }
  }

  /**
   * Registers one hook listener for provided stage token.
   * @param stage Hook stage token used as listener registry key.
   * @param listener Hook listener callback.
   * @param scope Optional listener scope token used by offAll operations.
   */
  function registerHookListener(
    stage: EngineHookStage,
    listener: EngineHookListener,
    scope?: "global" | "session" | "trace",
  ): { dispose: () => void } {
    assertValidHookListener(listener);
    const listeners = resolveHookListenerSet(stage, true);
    listeners?.add(listener);
    const metadataMap = hookListenerMetadata.get(stage) ?? new Map<EngineHookListener, {
      scope?: "global" | "session" | "trace";
    }>();
    metadataMap.set(listener, {
      scope,
    });
    hookListenerMetadata.set(stage, metadataMap);
    return {
      dispose: () => {
        unregisterHookListener(stage, listener);
      },
    };
  }

  /**
   * Unregisters one hook listener for provided stage token.
   * @param stage Hook stage token used as listener registry key.
   * @param listener Hook listener callback.
   */
  function unregisterHookListener(stage: EngineHookStage, listener: EngineHookListener): void {
    assertValidHookListener(listener);
    const listeners = hookListeners.get(stage);
    listeners?.delete(listener);
    const metadataMap = hookListenerMetadata.get(stage);
    metadataMap?.delete(listener);
    if (metadataMap && metadataMap.size === 0) {
      hookListenerMetadata.delete(stage);
    }
    if (listeners && listeners.size === 0) {
      hookListeners.delete(stage);
      hookListenerMetadata.delete(stage);
    }
  }

  /**
   * Removes hook listeners either globally or by one scope token.
   * @param scope Optional scope token used to filter listener removals.
   */
  function unregisterAllHookListeners(scope?: "global" | "session" | "trace"): void {
    if (!scope) {
      hookListeners.clear();
      hookListenerMetadata.clear();
      return;
    }
    for (const stage of hookStages) {
      const listeners = hookListeners.get(stage);
      const metadataMap = hookListenerMetadata.get(stage);
      if (!listeners || !metadataMap) {
        continue;
      }
      for (const [listener, metadata] of metadataMap) {
        if (metadata.scope === scope) {
          listeners.delete(listener);
          metadataMap.delete(listener);
        }
      }
      if (metadataMap.size === 0) {
        hookListenerMetadata.delete(stage);
      }
      if (listeners.size === 0) {
        hookListeners.delete(stage);
      }
    }
  }

  /**
   * Emits one hook-stage envelope to registered listeners.
   * @param stage Hook stage token.
   * @param context Optional stage-specific context payload.
   */
  function emitHook(stage: EngineHookStage, context?: unknown): void {
    const listeners = hookListeners.get(stage);
    if (!listeners || listeners.size === 0) {
      return;
    }
    const envelope = {
      stage,
      timestamp: resolveNow(),
      engineId,
      revision: String(documentSnapshot.revision),
      context,
    };
    for (const listener of [...listeners]) {
      try {
        listener(envelope);
      } catch (error) {
        emitEvent("engine.diagnostics.error", {
          code: "ENGINE_HOOKS_LISTENER_FAILURE",
          stage,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }

  /**
   * Returns deterministic hook-listener stats snapshot.
   */
  function resolveHookListenerStats(): {
    totalListeners: number;
    perStage: Readonly<Record<EngineHookStage, number>>;
  } {
    let totalListeners = 0;
    const perStage = {
      beforeCompile: 0,
      afterCompile: 0,
      beforeRenderPlan: 0,
      afterRenderPlan: 0,
      beforeSubmit: 0,
      afterSubmit: 0,
    } satisfies Record<EngineHookStage, number>;
    for (const stage of hookStages) {
      const count = hookListeners.get(stage)?.size ?? 0;
      perStage[stage] = count;
      totalListeners += count;
    }
    return {
      totalListeners,
      perStage,
    };
  }

  /**
   * Returns deterministic event-listener stats snapshot.
   */
  function resolveEventListenerStats(): {
    totalListeners: number;
    pausedTypes: readonly string[];
    perType: Readonly<Record<string, number>>;
  } {
    const perTypeEntries = [...eventListeners.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([type, listeners]) => [type, listeners.size] as const);
    let totalListeners = 0;
    const perType: Record<string, number> = {};
    for (const [type, count] of perTypeEntries) {
      totalListeners += count;
      perType[type] = count;
    }
    return {
      totalListeners,
      pausedTypes: [...pausedEventTypes].sort(),
      perType,
    };
  }

  /**
   * Records one security audit entry for governance operations.
   * @param type Audit event type token.
   * @param payload Audit payload object.
   */
  function appendSecurityAuditLog(type: string, payload: Readonly<Record<string, unknown>>): void {
    securityAuditCounter += 1;
    securityAuditLog.push({
      id: `audit-${securityAuditCounter}`,
      type,
      timestamp: resolveNow(),
      payload,
    });
  }

  /**
   * Resolves one cache namespace entry map and optional stats records.
   * @param namespace Cache namespace token.
   * @param createWhenMissing Whether to create records when namespace is missing.
   */
  function resolveCacheNamespace(
    namespace: string,
    createWhenMissing: boolean,
  ): {
    entries: Map<string, { value: unknown; tags: readonly string[]; policy: { ttlMs?: number; pinned?: boolean; tags?: readonly string[] } | undefined }>;
    stats: { hitCount: number; missCount: number };
  } {
    if (typeof namespace !== "string" || namespace.length === 0) {
      throw new Error("ENGINE_CACHE_INVALID_NAMESPACE");
    }
    const existingEntries = cacheNamespaces.get(namespace);
    const existingStats = cacheNamespaceStats.get(namespace);
    if (!existingEntries || !existingStats) {
      if (!createWhenMissing) {
        return {
          entries: new Map(),
          stats: { hitCount: 0, missCount: 0 },
        };
      }
      const createdEntries = new Map<string, { value: unknown; tags: readonly string[]; policy: { ttlMs?: number; pinned?: boolean; tags?: readonly string[] } | undefined }>();
      const createdStats = { hitCount: 0, missCount: 0 };
      cacheNamespaces.set(namespace, createdEntries);
      cacheNamespaceStats.set(namespace, createdStats);
      return {
        entries: createdEntries,
        stats: createdStats,
      };
    }
    return {
      entries: existingEntries,
      stats: existingStats,
    };
  }

  return {
    /**
     * Resolves engine readiness and emits lifecycle-ready event payload.
     */
    async ready() {
      emitEvent("engine.lifecycle.ready", {
        mounted: mountTarget !== null,
      });
      return Promise.resolve();
    },
    /**
     * Mounts engine host target and emits lifecycle-mounted event payload.
      * @param target Mount host descriptor consumed by runtime shell.
     */
    mount(target) {
      emitEvent("engine.lifecycle.beforeMount", {
        mounted: mountTarget !== null,
      });
      mountTarget = target;
      emitEvent("engine.lifecycle.mounted", {
        mounted: true,
      });
    },
    /**
     * Unmounts engine host target and emits lifecycle-unmounted event payload.
     */
    unmount() {
      emitEvent("engine.lifecycle.beforeUnmount", {
        mounted: mountTarget !== null,
      });
      mountTarget = null;
      emitEvent("engine.lifecycle.unmounted", {
        mounted: false,
      });
    },
    configure(config) {
      developerConfig = {
        ...developerConfig,
        ...config,
      };
    },
    getConfig() {
      return {
        ...developerConfig,
        mounted: mountTarget !== null,
        viewportLayout,
        interactionState,
        transformPreview,
        annotationCount: annotations.length,
        mediaSourceCount: mediaSources.length,
        mediaTimeMs,
        backendPreference,
        runtimeBackendDebugOptions,
      };
    },
    resetConfig(scope) {
      if (scope && scope in developerConfig) {
        const next = { ...developerConfig };
        delete (next as Record<string, unknown>)[scope];
        developerConfig = next;
        return;
      }
      developerConfig = {
        debug: Boolean(options.debug),
      };
    },
    start() {
      runtimeFacade.start();
    },
    stop() {
      runtimeFacade.stop();
    },
    pause() {
      runtimeShell.pause();
    },
    resume() {
      runtimeShell.resume();
    },
    /**
     * Resizes runtime surface and emits viewport resize + view change events.
     * @param width Next viewport width in pixels.
     * @param height Next viewport height in pixels.
     */
    resize(width, height) {
      lastInteractionAtMs = resolveNow();
      lastInteractionKind = "set";
      viewportFacade.resize(width, height);
      const resized = runtimeShell.resize(width, height);
      emitEvent("engine.view.viewportResized", {
        width,
        height,
      });
      emitEvent("engine.view.changed", {
        viewport: resolveViewSnapshotFromViewportState(viewportFacade.getViewport()),
      });
      return resized;
    },
    /**
     * Applies full graph snapshot and emits deterministic document events.
      * @param graph Complete graph snapshot used to replace document state.
     */
    setGraph(graph) {
      emitHook("beforeCompile", {
        operation: "setGraph",
        inputRevision: graph.revision,
      });
      applyGraphSnapshot(graph);
      emitHook("afterCompile", {
        operation: "setGraph",
        nodeCount: graphNodeState.size,
      });
      emitEvent("engine.document.graphSet", {
        revision: documentSnapshot.revision,
        nodeCount: graphNodeState.size,
      });
      emitEvent("engine.document.revisionChanged", {
        revision: documentSnapshot.revision,
      });
    },
    /**
     * Applies incremental graph patch and emits deterministic document events.
      * @param patch Incremental patch batch merged into existing graph state.
     */
    updateGraph(patch) {
      emitHook("beforeCompile", {
        operation: "updateGraph",
        patchCount: patch.patches.length,
      });
      applyGraphPatchBatch(patch);
      emitHook("afterCompile", {
        operation: "updateGraph",
        patchCount: patch.patches.length,
        nodeCount: graphNodeState.size,
      });
      emitEvent("engine.document.graphPatched", {
        revision: documentSnapshot.revision,
        patchCount: patch.patches.length,
      });
      emitEvent("engine.document.revisionChanged", {
        revision: documentSnapshot.revision,
      });
    },
    batchUpdateGraph(patches) {
      for (const patch of patches) {
        applyGraphPatchBatch(patch);
      }
    },
    getGraph() {
      return {
        revision: documentSnapshot.revision,
        nodes: [...graphNodeState.values()],
      };
    },
    clearGraph() {
      applyGraphSnapshot({ nodes: [] });
    },
    validateGraph(graph) {
      const issues: string[] = [];
      if (!graph || !Array.isArray(graph.nodes)) {
        issues.push("ENGINE_GRAPH_INVALID_INPUT");
      }
      if (Array.isArray(graph?.nodes)) {
        for (const node of graph.nodes) {
          if (typeof node.id !== "string" || node.id.length === 0) {
            issues.push("ENGINE_GRAPH_INVALID_NODE_ID");
            break;
          }
        }
      }
      return {
        valid: issues.length === 0,
        issues,
      };
    },
    normalizeGraph(input) {
      const sortedNodes = [...(input.nodes ?? [])].sort((left, right) => left.id.localeCompare(right.id));
      return {
        revision: input.revision,
        nodes: sortedNodes,
      };
    },
    importGraph(payload) {
      const graph =
        payload && typeof payload === "object" && Array.isArray((payload as { nodes?: unknown }).nodes)
          ? (payload as EngineGraphInput)
          : { nodes: [] as const };
      const normalized = {
        revision: graph.revision,
        nodes: [...graph.nodes],
      };
      applyGraphSnapshot(normalized);
      return normalized;
    },
    exportGraph() {
      return {
        revision: documentSnapshot.revision,
        nodes: [...graphNodeState.values()],
      };
    },
    query(bounds) {
      return queryGraph(bounds);
    },
    /**
     * Resolves point picking result and emits pick completed/failed events.
     * @param point Point payload used by picking.
     * @param pickOptions Optional picking controls.
     */
    pick(point, pickOptions) {
      const result = pickGraph(point, pickOptions);
      if (result.hits.length > 0) {
        emitEvent("engine.interaction.pickCompleted", {
          hitCount: result.hits.length,
          point,
        });
      } else {
        emitEvent("engine.interaction.pickFailed", {
          point,
          reason: "NO_HITS",
        });
      }
      return result;
    },
    /**
     * Resolves raycast result and emits pick completed/failed events.
     * @param ray Ray payload used by raycast.
     * @param raycastOptions Optional raycast controls.
     */
    raycast(ray, raycastOptions) {
      const hit = raycastGraph(ray, raycastOptions);
      if (hit) {
        emitEvent("engine.interaction.pickCompleted", {
          hitCount: 1,
          ray,
        });
      } else {
        emitEvent("engine.interaction.pickFailed", {
          ray,
          reason: "NO_HITS",
        });
      }
      return hit;
    },
    /**
     * Renders one frame and emits frame started/completed/failed events.
     */
    async render(): Promise<EngineRenderResult> {
      emitHook("beforeRenderPlan", {
        interactionKind: lastInteractionKind,
      });
      emitEvent("engine.render.frameStarted", {
        interactionKind: lastInteractionKind,
      });
      try {
        const stats = resolveFrameOrchestration(resolveNow());
        const result = {
          drawCount: latestExecutionSnapshot.drawCount,
          visibleCount: latestExecutionSnapshot.visibleCandidateIds.length,
          frameMs: Math.max(0, stats.timestampMs),
        };
        emitHook("afterRenderPlan", result);
        emitHook("beforeSubmit", {
          drawCount: result.drawCount,
        });
        emitHook("afterSubmit", {
          drawCount: result.drawCount,
        });
        emitEvent("engine.render.frameCompleted", result);
        return result;
      } catch (error) {
        emitEvent("engine.render.frameFailed", {
          error: error instanceof Error ? error.message : String(error),
        });
        throw error;
      }
    },
    async renderNow(): Promise<EngineRenderResult> {
      return this.render();
    },
    /**
     * Applies view patch and emits canonical view-changed event.
     * @param view View patch payload.
     */
    setView(view) {
      const snapshot = applyViewPatch(view);
      emitEvent("engine.view.changed", {
        viewport: snapshot,
      });
      return snapshot;
    },
    getView() {
      return resolveViewSnapshotFromViewportState(viewportFacade.getViewport());
    },
    /**
     * Fits viewport to bounds and emits canonical view-changed event.
     * @param bounds World-space bounds payload.
     */
    fitToBounds(bounds) {
      const snapshot = applyViewPatch({
        offsetX: bounds.x,
        offsetY: bounds.y,
      });
      emitEvent("engine.view.changed", {
        viewport: snapshot,
      });
      return snapshot;
    },
    /**
     * Resets viewport and emits canonical view-changed event.
     */
    resetView() {
      const snapshot = applyViewPatch({
        offsetX: 0,
        offsetY: 0,
        scale: 1,
      });
      emitEvent("engine.view.changed", {
        viewport: snapshot,
      });
      return snapshot;
    },
    setViewportLayout(layout) {
      viewportLayout = layout;
    },
    getViewportLayout() {
      return viewportLayout;
    },
    screenToWorld(point) {
      const viewport = viewportFacade.getViewport();
      return {
        x: point.x / Math.max(viewport.scale, 0.0001) + viewport.offsetX,
        y: point.y / Math.max(viewport.scale, 0.0001) + viewport.offsetY,
      };
    },
    worldToScreen(point) {
      const viewport = viewportFacade.getViewport();
      return {
        x: (point.x - viewport.offsetX) * viewport.scale,
        y: (point.y - viewport.offsetY) * viewport.scale,
      };
    },
    setQuality(profile) {
      qualityProfile = profile;
    },
    getQuality() {
      return qualityProfile;
    },
    setFrameBudget(budget) {
      frameBudgetMs = Number.isFinite(budget) ? Math.max(1, budget) : frameBudgetMs;
    },
    getFrameBudget() {
      return frameBudgetMs;
    },
    setOverlays(overlays) {
      overlayNodes = [...overlays];
    },
    appendOverlays(overlays) {
      overlayNodes = [...overlayNodes, ...overlays];
    },
    updateOverlay(overlayId, patch) {
      overlayNodes = overlayNodes.map((overlay) => {
        if (typeof overlay === "object" && overlay !== null && "id" in overlay && (overlay as { id?: unknown }).id === overlayId) {
          return {
            ...(overlay as Record<string, unknown>),
            ...patch,
          };
        }
        return overlay;
      });
    },
    removeOverlay(overlayId) {
      overlayNodes = overlayNodes.filter(
        (overlay) => !(typeof overlay === "object" && overlay !== null && "id" in overlay && (overlay as { id?: unknown }).id === overlayId),
      );
    },
    clearOverlays() {
      overlayNodes = [];
    },
    setTransformPreview(preview) {
      transformPreview = preview;
    },
    clearTransformPreview() {
      transformPreview = null;
    },
    setAnnotations(nextAnnotations) {
      annotations = [...nextAnnotations];
    },
    clearAnnotations() {
      annotations = [];
    },
    invalidate(input) {
      lastInvalidatePayload = input ?? { reason: "manual-invalidate" };
    },
    pickRect(rect, options) {
      const tolerance = Math.max(0, options?.tolerance ?? 0);
      const queryResult = queryGraph({
        x: rect.x - tolerance,
        y: rect.y - tolerance,
        width: rect.width + tolerance * 2,
        height: rect.height + tolerance * 2,
      });
      return {
        hits: queryResult.nodeIds.map((id, rank) => ({ id, rank })),
      };
    },
    pickLasso(lasso, options) {
      if (!Array.isArray(lasso.points) || lasso.points.length === 0) {
        return { hits: [] };
      }
      const xs = lasso.points.map((point) => point.x);
      const ys = lasso.points.map((point) => point.y);
      return this.pickRect(
        {
          x: Math.min(...xs),
          y: Math.min(...ys),
          width: Math.max(...xs) - Math.min(...xs),
          height: Math.max(...ys) - Math.min(...ys),
        },
        options,
      );
    },
    queryFrustum() {
      return {
        nodeIds: [...graphNodeState.keys()].sort(),
      };
    },
    /**
     * Sets interaction state and emits state-changed event.
     * @param state Interaction state payload.
     */
    setInteractionState(state) {
      interactionState = state;
      lastInteractionAtMs = resolveNow();
      lastInteractionKind = "set";
      emitEvent("engine.interaction.stateChanged", {
        active: true,
        state,
      });
    },
    /**
     * Clears interaction state and emits state-changed event.
     */
    clearInteractionState() {
      interactionState = null;
      emitEvent("engine.interaction.stateChanged", {
        active: false,
      });
    },
    /**
     * Loads assets and emits deterministic resource progress/failure events.
     * @param assets Asset descriptors to load.
     */
    loadAssets(assets) {
      const outcomes: Array<{ assetId: string; state: "loaded" | "missing" }> = [];
      const total = Math.max(1, assets.length);
      let completed = 0;
      for (const asset of assets) {
        if (typeof asset.id !== "string" || asset.id.length === 0) {
          emitEvent("engine.resource.loadFailed", {
            assetId: String(asset.id ?? ""),
            reason: "INVALID_ASSET_ID",
          });
          outcomes.push({
            assetId: String(asset.id ?? ""),
            state: "missing",
          });
          continue;
        }
        assetStates.set(asset.id, "loaded");
        completed += 1;
        emitEvent("engine.resource.loadProgress", {
          assetId: asset.id,
          completed,
          total,
        });
        outcomes.push({
          assetId: asset.id,
          state: "loaded",
        });
      }
      return outcomes;
    },
    /**
     * Preloads assets and emits deterministic resource progress/failure events.
     * @param request Asset descriptors to preload.
     */
    preloadAssets(request) {
      const outcomes: Array<{ assetId: string; state: "preloaded" | "missing" }> = [];
      const total = Math.max(1, request.length);
      let completed = 0;
      for (const asset of request) {
        if (typeof asset.id !== "string" || asset.id.length === 0) {
          emitEvent("engine.resource.loadFailed", {
            assetId: String(asset.id ?? ""),
            reason: "INVALID_ASSET_ID",
          });
          outcomes.push({
            assetId: String(asset.id ?? ""),
            state: "missing",
          });
          continue;
        }
        assetStates.set(asset.id, "preloaded");
        completed += 1;
        emitEvent("engine.resource.loadProgress", {
          assetId: asset.id,
          completed,
          total,
        });
        outcomes.push({
          assetId: asset.id,
          state: "preloaded",
        });
      }
      return outcomes;
    },
    /**
     * Unloads assets and emits deterministic resource failure events for missing ids.
     * @param assetIds Asset ids to unload.
     */
    unloadAssets(assetIds) {
      for (const assetId of assetIds) {
        if (!assetStates.has(assetId)) {
          emitEvent("engine.resource.loadFailed", {
            assetId,
            reason: "ASSET_NOT_FOUND",
          });
        }
        assetStates.set(assetId, "unloaded");
      }
      return assetIds.map((assetId) => ({ assetId, state: "unloaded" as const }));
    },
    getAssetState(assetId) {
      return {
        assetId,
        state: assetStates.get(assetId) ?? "missing",
      };
    },
    getAssetStats() {
      let loadedCount = 0;
      let preloadedCount = 0;
      for (const state of assetStates.values()) {
        if (state === "loaded") {
          loadedCount += 1;
        }
        if (state === "preloaded") {
          preloadedCount += 1;
        }
      }
      return {
        loadedCount,
        preloadedCount,
        totalCount: assetStates.size,
      };
    },
    /**
     * Sets media sources used by streaming controls.
     * @param sources Media source descriptors.
     */
    setMediaSources(sources) {
      mediaSources = [...sources];
    },
    /**
     * Seeks media timeline and emits streaming backpressure when no source is available.
     * @param time Target media timestamp in milliseconds.
     */
    seekMedia(time) {
      if (mediaSources.length === 0) {
        emitEvent("engine.streaming.backpressure", {
          reason: "NO_MEDIA_SOURCE",
        });
      }
      mediaTimeMs = Math.max(0, Number.isFinite(time) ? time : mediaTimeMs);
    },
    captureImage() {
      return {
        mimeType: "image/png",
        dataUrl: "data:image/png;base64,",
      };
    },
    captureVideoFrame() {
      return {
        timestampMs: resolveNow(),
        mimeType: "image/png",
        dataUrl: "data:image/png;base64,",
      };
    },
    setBackendPreference(preference) {
      backendPreference = preference;
    },
    getCapabilities() {
      return {
        schemaVersion: ENGINE_RUNTIME_CAPABILITY_SCHEMA_VERSION,
        runtime: Object.values(ENGINE_RUNTIME_CAPABILITY_MAP),
      };
    },
    createHeadlessSession() {
      headlessSessionCounter += 1;
      const sessionId = `headless-${headlessSessionCounter}`;
      headlessSessions.set(sessionId, { createdAtMs: resolveNow() });
      return { sessionId };
    },
    destroyHeadlessSession(sessionId) {
      const destroyed = headlessSessions.delete(sessionId);
      return { destroyed };
    },
    async renderHeadless() {
      const rendered = await this.render();
      return {
        drawCount: rendered.drawCount,
        visibleCount: rendered.visibleCount,
      };
    },
    events: {
      /**
       * Registers one scoped listener in deterministic insertion order.
       */
      on: (type, listener, options) => {
        registerEventListener(type, listener, options?.scope, options);
      },
      /**
       * Unregisters one listener for one event type.
       */
      off: (type, listener) => {
        unregisterEventListener(type, listener);
      },
      /**
       * Registers one one-shot listener for one event type.
       */
      once: (type, listener, options) => {
        assertValidEventType(type);
        assertValidEventListener(listener);
        const onceListener = (payload: unknown) => {
          listener(payload);
          unregisterEventListener(type, onceListener);
        };
        registerEventListener(type, onceListener, options?.scope, options);
      },
      /**
       * Registers one listener across multiple event types.
       */
      onMany: (types, listener, options) => {
        if (!Array.isArray(types)) {
          throw new Error("ENGINE_EVENTS_INVALID_TYPE");
        }
        for (const type of types) {
          registerEventListener(type, listener, options?.scope, options);
        }
      },
      /**
       * Removes listeners globally or by scope token.
       */
      offAll: (scope) => {
        unregisterAllEventListeners(scope);
      },
      /**
       * Pauses delivery for one event type.
       */
      pause: (type) => {
        assertValidEventType(type);
        pausedEventTypes.add(type);
      },
      /**
       * Resumes delivery for one event type.
       */
      resume: (type) => {
        assertValidEventType(type);
        pausedEventTypes.delete(type);
      },
      /**
       * Returns deterministic listener stats snapshot.
       */
      getListenerStats: () => resolveEventListenerStats(),
    },
    hooks: {
      /**
       * Registers one hook listener before compile stage.
       */
      beforeCompile: (listener, options) => registerHookListener("beforeCompile", listener, options?.scope),
      /**
       * Registers one hook listener after compile stage.
       */
      afterCompile: (listener, options) => registerHookListener("afterCompile", listener, options?.scope),
      /**
       * Registers one hook listener before render-plan stage.
       */
      beforeRenderPlan: (listener, options) => registerHookListener("beforeRenderPlan", listener, options?.scope),
      /**
       * Registers one hook listener after render-plan stage.
       */
      afterRenderPlan: (listener, options) => registerHookListener("afterRenderPlan", listener, options?.scope),
      /**
       * Registers one hook listener before submit stage.
       */
      beforeSubmit: (listener, options) => registerHookListener("beforeSubmit", listener, options?.scope),
      /**
       * Registers one hook listener after submit stage.
       */
      afterSubmit: (listener, options) => registerHookListener("afterSubmit", listener, options?.scope),
      /**
       * Removes hook listeners globally or by scope token.
       */
      offAll: (scope) => {
        unregisterAllHookListeners(scope);
      },
      /**
       * Returns deterministic hook listener stats snapshot.
       */
      getStats: () => resolveHookListenerStats(),
    },
    extension: {
      /**
       * Registers one extension plugin and marks initial registry state.
       */
      register: (plugin) => {
        if (!plugin || typeof plugin.id !== "string" || plugin.id.length === 0) {
          throw new Error("ENGINE_EXTENSION_INVALID_PLUGIN");
        }
        if (extensionRegistry.has(plugin.id)) {
          throw new Error("ENGINE_EXTENSION_DUPLICATE_PLUGIN");
        }
        extensionRegistry.set(plugin.id, {
          pluginId: plugin.id,
          state: "registered",
        });
        return {
          pluginId: plugin.id,
          state: "registered",
        };
      },
      /**
       * Unregisters one extension plugin by id.
       */
      unregister: (pluginId) => {
        const removed = extensionRegistry.delete(pluginId);
        return {
          removed,
        };
      },
      /**
       * Returns deterministic extension registry list in lexical id order.
       */
      list: () => [...extensionRegistry.values()].sort((left, right) => left.pluginId.localeCompare(right.pluginId)),
      /**
       * Returns extension state for one plugin id.
       */
      getState: (pluginId) => {
        const plugin = extensionRegistry.get(pluginId);
        if (!plugin) {
          throw new Error("ENGINE_EXTENSION_NOT_FOUND");
        }
        return {
          pluginId: plugin.pluginId,
          state: plugin.state,
        };
      },
    },
    scheduler: {
      /**
       * Schedules one governance task with deterministic id assignment.
       */
      schedule: (task, options) => {
        if (task === undefined) {
          throw new Error("ENGINE_SCHEDULER_INVALID_TASK");
        }
        const queue = typeof options?.queue === "string" && options.queue.length > 0
          ? options.queue
          : "default";
        if (queue.length === 0) {
          throw new Error("ENGINE_SCHEDULER_INVALID_QUEUE");
        }
        schedulerTaskCounter += 1;
        const taskId = `scheduler-task-${schedulerTaskCounter}`;
        schedulerTaskRegistry.set(taskId, {
          taskId,
          queue,
          priority: options?.priority ?? "normal",
          budgetMs: Number.isFinite(options?.budgetMs) ? Math.max(1, options!.budgetMs as number) : frameBudgetMs,
          task,
        });
        return {
          taskId,
        };
      },
      /**
       * Cancels one scheduled governance task.
       */
      cancel: (taskId) => {
        if (!schedulerTaskRegistry.has(taskId)) {
          return {
            cancelled: false,
          };
        }
        schedulerTaskRegistry.delete(taskId);
        return {
          cancelled: true,
        };
      },
      /**
       * Flushes scheduler tasks for one optional queue.
       */
      flush: (queue) => {
        if (queue !== undefined && (typeof queue !== "string" || queue.length === 0)) {
          throw new Error("ENGINE_SCHEDULER_INVALID_QUEUE");
        }
        let flushed = 0;
        for (const [taskId, taskRecord] of schedulerTaskRegistry) {
          if (queue === undefined || taskRecord.queue === queue) {
            schedulerTaskRegistry.delete(taskId);
            flushed += 1;
          }
        }
        return {
          flushed,
        };
      },
      /**
       * Returns current scheduler queue stats snapshot.
       */
      getQueueStats: () => ({
        pending: schedulerTaskRegistry.size,
        running: 0,
        budgetMs: frameBudgetMs,
      }),
    },
    cache: {
      /**
       * Returns cached value from one namespace and key pair.
       */
      get: (namespace, key) => {
        if (typeof key !== "string" || key.length === 0) {
          throw new Error("ENGINE_CACHE_INVALID_KEY");
        }
        const { entries, stats } = resolveCacheNamespace(namespace, false);
        if (!entries.has(key)) {
          stats.missCount += 1;
          return undefined;
        }
        stats.hitCount += 1;
        return entries.get(key)?.value;
      },
      /**
       * Sets cached value for one namespace and key pair.
       */
      set: (namespace, key, value, policy) => {
        if (typeof key !== "string" || key.length === 0) {
          throw new Error("ENGINE_CACHE_INVALID_KEY");
        }
        const { entries } = resolveCacheNamespace(namespace, true);
        entries.set(key, {
          value,
          tags: Array.isArray(policy?.tags) ? [...policy!.tags] : [],
          policy,
        });
      },
      /**
       * Invalidates cache entries for one namespace with optional key.
       */
      invalidate: (namespace, key) => {
        const { entries } = resolveCacheNamespace(namespace, false);
        if (key === undefined) {
          entries.clear();
          return;
        }
        if (typeof key !== "string" || key.length === 0) {
          throw new Error("ENGINE_CACHE_INVALID_KEY");
        }
        entries.delete(key);
      },
      /**
       * Invalidates cache entries matching one tag token.
       */
      invalidateByTag: (tag) => {
        if (typeof tag !== "string" || tag.length === 0) {
          throw new Error("ENGINE_CACHE_INVALID_TAG");
        }
        for (const entries of cacheNamespaces.values()) {
          for (const [key, entry] of entries) {
            if (entry.tags.includes(tag)) {
              entries.delete(key);
            }
          }
        }
      },
      /**
       * Returns cache stats snapshot for one namespace.
       */
      getStats: (namespace) => {
        const { entries, stats } = resolveCacheNamespace(namespace, false);
        return {
          hitCount: stats.hitCount,
          missCount: stats.missCount,
          entryCount: entries.size,
        };
      },
    },
    policy: {
      /**
       * Sets render policy payload.
       */
      setRenderPolicy: (policy) => {
        if (!policy || typeof policy !== "object") {
          throw new Error("ENGINE_POLICY_INVALID_INPUT");
        }
        policyRenderState = { ...policy };
      },
      /**
       * Sets resource policy payload.
       */
      setResourcePolicy: (policy) => {
        if (!policy || typeof policy !== "object") {
          throw new Error("ENGINE_POLICY_INVALID_INPUT");
        }
        policyResourceState = { ...policy };
      },
      /**
       * Sets fallback policy payload.
       */
      setFallbackPolicy: (policy) => {
        if (!policy || typeof policy !== "object") {
          throw new Error("ENGINE_POLICY_INVALID_INPUT");
        }
        policyFallbackState = { ...policy };
      },
      /**
       * Returns effective policy snapshot.
       */
      getEffectivePolicy: () => ({
        render: policyRenderState,
        resource: policyResourceState,
        fallback: policyFallbackState,
      }),
    },
    security: {
      /**
       * Sets security trust-level token.
       */
      setTrustLevel: (level) => {
        if (level !== "low" && level !== "standard" && level !== "high") {
          throw new Error("ENGINE_SECURITY_INVALID_TRUST_LEVEL");
        }
        securityTrustLevel = level;
        appendSecurityAuditLog("engine.security.setTrustLevel", {
          level,
        });
      },
      /**
       * Sets security resource-access policy.
       */
      setResourceAccessPolicy: (policy) => {
        if (!policy || typeof policy !== "object") {
          throw new Error("ENGINE_SECURITY_INVALID_POLICY");
        }
        const quota = (policy as { quota?: unknown }).quota;
        if (typeof quota === "number" && quota < 0) {
          throw new Error("ENGINE_SECURITY_QUOTA_EXCEEDED");
        }
        securityResourceAccessPolicy = { ...policy };
        appendSecurityAuditLog("engine.security.setResourceAccessPolicy", {
          trustLevel: securityTrustLevel,
          quota,
        });
      },
      /**
       * Returns latest security audit log entries.
       */
      getAuditLog: (options) => {
        const limit = typeof options?.limit === "number" && Number.isFinite(options.limit)
          ? Math.max(0, Math.floor(options.limit))
          : securityAuditLog.length;
        if (limit === 0) {
          return [];
        }
        const start = Math.max(0, securityAuditLog.length - limit);
        return securityAuditLog.slice(start).map((entry) => ({
          ...entry,
          policy: securityResourceAccessPolicy,
        }));
      },
    },
    /**
     * Preserves legacy event registration API by delegating to engine.events.on.
     */
    on(event, listener) {
      registerEventListener(event, listener);
    },
    /**
     * Preserves legacy event unregister API by delegating to engine.events.off.
     */
    off(event, listener) {
      unregisterEventListener(event, listener);
    },
    /**
     * Preserves legacy one-shot listener API by delegating to engine.events.once.
     */
    once(event, listener) {
      this.events.once(event, listener);
    },
    getMetrics() {
      return {
        encodedCommandCount: lastEncodedCommandCount,
        replayedCommandCount: lastReplayEventCount,
        drawCount: latestExecutionSnapshot.drawCount,
      };
    },
    /**
     * Enables/disables diagnostics payload enrichment and emits warning on disable.
     * @param enabled Whether diagnostics payload enrichment remains enabled.
     */
    setDiagnosticsEnabled(enabled) {
      diagnosticsEnabled = enabled;
      if (!enabled) {
        emitEvent("engine.diagnostics.warning", {
          code: "ENGINE_DIAGNOSTICS_DISABLED",
        });
      }
    },
    /**
     * Captures debug frame payload and emits diagnostics capture-ready event.
     */
    captureDebugFrame() {
      const output = {
        mimeType: "image/png",
        dataUrl: "data:image/png;base64,",
      };
      emitEvent("engine.diagnostics.captureReady", output);
      return output;
    },
    /**
     * Creates replay token and emits replay-started event payload.
      * @param scope Optional replay token scope object.
     */
    createReplayToken(scope) {
      const token = createRuntimeReplayToken(scope);
      emitEvent("engine.replay.started", {
        scope,
        token: token.token,
      });
      return token;
    },
    /**
     * Replays one token and emits replay completion/failure event payloads.
      * @param token Replay token string accepted by runtime replay subsystem.
     */
    replay(token) {
      try {
        const replayResult = replayRuntimeToken(token);
        // Emits failed event for rejected tokens to keep replay outcome observability explicit.
        if (!replayResult.accepted) {
          emitEvent("engine.replay.failed", {
            token,
            error: "ENGINE_REPLAY_REJECTED_TOKEN",
          });
          return replayResult;
        }
        emitEvent("engine.replay.completed", {
          token,
          accepted: replayResult.accepted,
        });
        return replayResult;
      } catch (error) {
        emitEvent("engine.replay.failed", {
          token,
          error: error instanceof Error ? error.message : String(error),
        });
        throw error;
      }
    },
    getDiagnostics() {
      const diagnostics = resolvePublicDiagnostics();
      if (!diagnosticsEnabled) {
        return {
          ...diagnostics,
          framePlan: undefined,
          hitPlan: undefined,
        };
      }
      return {
        ...diagnostics,
        overlays: {
          count: overlayNodes.length,
        },
      };
    },
    /**
     * Captures one runtime frame token and emits diagnostics capture-ready event.
     */
    captureFrame() {
      const output = runtimeShell.captureFrame();
      emitEvent("engine.diagnostics.captureReady", output);
      return output;
    },
    getStats() {
      return {
        ...runtimeShell.getStats(),
        runtimeProfileId: runtimeProfile.id,
        runtimeCapabilityCount: profileRuntime.capabilityIds.length,
        lastFramePressureReason: latestFrameStats.pressureReason,
        lastFramePressureSignals: latestFrameStats.pressureSignals,
        lastDocumentRevision: documentSnapshot.revision,
        lastCompileChangeSetId: latestCompileOutput.changeSetId,
        lastCompileChangedNodeCount: latestCompileOutput.changedNodeIds.length,
        lastExecutionDrawCount: latestExecutionSnapshot.drawCount,
        lastRuntimeWorldRevision: latestRuntimeWorldRevision,
        lastDirtyDomainCount: latestDirtyState.dirtyDomains.length,
        lastEncodedCommandCount,
        lastReplayEventCount,
        lastReplayFirstCommandId,
        lastBoundaryViolationCount: boundaryValidation.violations.length,
        lastPublicApiViolationCount: publicApiSurfaceViolations.length,
      };
    },
    getBackendInfo() {
      return runtimeShell.getBackendInfo();
    },
    runtime: {
      getDocumentSnapshot: () => resolveRuntimeDocumentSnapshot(),
      getDocumentRevision: () => resolveRuntimeDocumentRevision(),
      applyChangeSet: (input) => applyRuntimeDocumentChangeSet(input),
      compileWorld: (options) => compileRuntimeWorld(options),
      getRuntimeWorld: () => resolveRuntimeWorldSnapshotOutput(),
      getRuntimeWorldStats: () => resolveRuntimeWorldGraphStatsOutput(),
      getDirtyState: () => resolveRuntimeDirtyStateOutput(),
      markDirty: (domain, token) => markRuntimeDirtyDomain({ domain, token }),
      flushDirtyState: (domains) => flushRuntimeDirtyDomains({ domains }),
      scheduleIncrementalCompile: (options) => scheduleRuntimeIncrementalCompile(options),
      forceFullCompile: (reason) => forceRuntimeFullCompile(reason),
      createRenderPlan: (request) => createRuntimeFramePlan(request),
      inspectRenderPlan: (plan) => inspectRuntimePlan(plan),
      encodeCommandBuffer: (plan) => encodeRuntimeCommandPlan(plan),
      validateCommandBuffer: (buffer) => validateRuntimeCommandBuffer(buffer),
      submit: (commandBuffer) => submitRuntimeCommandBuffer(commandBuffer),
      submitBatch: (commandBuffers) => submitRuntimeCommandBufferBatch(commandBuffers),
      createGpuResource: (descriptor) => createRuntimeGpuResource(descriptor),
      updateGpuResource: (resourceId, patch) => updateRuntimeGpuResource(resourceId, patch),
      destroyGpuResource: (resourceId) => destroyRuntimeGpuResource(resourceId),
      createUploadBatch: (request) => createRuntimeUploadBatch(request),
      createBarrierPlan: (request) => createRuntimeBarrierPlan(request),
      applyBarrierPlan: (plan) => applyRuntimeBarrierPlan(plan),
      readbackResource: (request) => readbackRuntimeResource(request),
      queryViewportCandidates: (query) => queryRuntimeViewportCandidates(query),
      queryFrustumVisibleSet: (query) => queryRuntimeFrustumVisibleSet(query),
      hitTestPlanar: (point, pickOptions) => pickGraph(point, pickOptions),
      hitTestRay: (ray, raycastOptions) => raycastGraph(ray, raycastOptions),
      querySpatialIndex: (query) => queryRuntimeSpatialIndex(query),
      getBackendState: () => resolveRuntimeBackendState(),
      switchBackend: (target, switchOptions) => switchRuntimeBackend(target, switchOptions),
      getBackendFallbackHistory: () => resolveRuntimeBackendFallbackHistory(),
      setBackendDebugOptions: (debugOptions) => setRuntimeBackendDebugOptions(debugOptions),
      captureFrame: (captureOptions) => captureRuntimeFrame(captureOptions),
      captureCommandTrace: (options) => captureRuntimeCommandTrace(options),
      createReplayToken: (scope) => createRuntimeReplayToken(scope),
      replay: (token) => replayRuntimeToken(token),
      getMetrics: () => resolveRuntimePublicMetrics(),
      getTrace: (traceId) => getRuntimeTrace(traceId),
      document: {
        createSnapshot: (input) => createRuntimeDocumentSnapshot(input),
        validateSnapshot: (input) => validateRuntimeDocumentSnapshot(input),
        getRevision: () => resolveRuntimeDocumentRevision(),
        getSchemaVersion: () => resolveRuntimeDocumentSchemaVersion(),
        applyChangeSet: (input) => applyRuntimeDocumentChangeSet(input),
        diffSnapshots: (input) => diffRuntimeDocumentSnapshots(input),
        rebaseChangeSet: (input) => rebaseRuntimeDocumentChangeSet(input),
        serializeSnapshot: (input) => serializeRuntimeDocumentSnapshot(input),
        deserializeSnapshot: (input) => deserializeRuntimeDocumentSnapshot(input),
      },
      world: {
        compileFromDocument: (input) => compileRuntimeWorldFromDocument(input),
        getWorldSnapshot: () => resolveRuntimeWorldSnapshotOutput(),
        queryEntity: (input) => queryRuntimeWorldEntity(input),
        queryComponent: (input) => queryRuntimeWorldComponent(input),
        getGraphStats: () => resolveRuntimeWorldGraphStatsOutput(),
        queryNodeTransform: (source) => queryRuntimeNodeTransform(source),
        formatNodeSvgTransform: (transform) => formatRuntimeNodeSvgTransform(transform),
        clear: () => clearRuntimeWorldSnapshot(),
      },
      dirty: {
        getState: () => resolveRuntimeDirtyStateOutput(),
        mark: (input) => markRuntimeDirtyDomain(input),
        markBatch: (input) => markRuntimeDirtyDomainsBatch(input),
        getPendingDomains: () => resolveRuntimePendingDirtyDomains(),
        flush: (input) => flushRuntimeDirtyDomains(input),
        reset: () => resetRuntimeDirtyState(),
      },
      command: {
        createEncoder: (input) => createRuntimeCommandEncoder(input),
        encode: (plan) => encodeRuntimeCommandPlan(plan),
        validate: (buffer) => validateRuntimeCommandBuffer(buffer),
        optimize: (input) => optimizeRuntimeCommandBuffer(input),
        inspect: (buffer) => inspectRuntimeCommandBuffer(buffer),
        replay: (buffer) => replayRuntimeCommandBuffer(buffer),
      },
      backend: {
        listAvailable: () => resolveRuntimeBackendListAvailableOutput(),
        select: (input) => selectRuntimeBackend(input),
        getActive: () => resolveRuntimeBackendGetActiveOutput(),
        getCapabilities: () => resolveRuntimeBackendCapabilities(),
        getLimits: () => resolveRuntimeBackendLimits(),
        getFallbackTrace: () => resolveRuntimeBackendGetFallbackTraceOutput(),
        probeHeadless: () => probeRuntimeHeadlessBackend(),
      },
      plan: {
        createFramePlan: (request) => createRuntimeFramePlan(request),
        createVisibilityPlan: (request) => createRuntimeVisibilityPlan(request),
        createLodPlan: (request) => createRuntimeLodPlan(request),
        createRoiPlan: (request) => createRuntimeRoiPlan(request),
        createBudgetPlan: (request) => createRuntimeBudgetPlan(request),
        createHitGeometryPayload: (request) => createRuntimeHitGeometryPayload(request),
        resolveHitTolerance: (options) => resolveRuntimeHitTolerance(options),
        requestFrame: (mode) => requestRuntimePlanFrame(mode),
        cancelFrame: (requestId) => cancelRuntimePlanFrame(requestId),
        setInteractiveInterval: (intervalMs) => setRuntimePlanInteractiveInterval(intervalMs),
        getSchedulerDiagnostics: () => resolveRuntimePlanSchedulerDiagnostics(),
        inspect: (plan) => inspectRuntimePlan(plan),
      },
      resource: {
        register: (descriptor) => registerRuntimeResource(descriptor),
        update: (resourceId, patch) => updateRuntimeResource(resourceId, patch),
        release: (resourceId) => releaseRuntimeResource(resourceId),
        pin: (resourceId) => pinRuntimeResource(resourceId),
        unpin: (resourceId) => unpinRuntimeResource(resourceId),
        getResidency: (resourceId) => getRuntimeResourceResidency(resourceId),
        collectGarbage: (options) => collectRuntimeResources(options),
      },
      observability: {
        startTrace: (options) => startRuntimeTrace(options),
        stopTrace: (traceId) => stopRuntimeTrace(traceId),
        getTrace: (traceId) => getRuntimeTrace(traceId),
        getMetricsSnapshot: () => getRuntimeMetricsSnapshot(),
        captureFrame: (options) => captureRuntimeFrame(options),
        createReplayToken: (scope) => createRuntimeReplayToken(scope),
        replay: (token) => replayRuntimeToken(token),
      },
    },
    capability: {
      geometry: {
        computeNodeTransform: (source) => queryRuntimeNodeTransform(source),
        formatNodeSvgTransform: (transform) => formatRuntimeNodeSvgTransform(transform),
      },
      spatial: {
        query: (query) => queryGraph(query),
        createHitGeometryPayload: (request) => createRuntimeHitGeometryPayload(request),
      },
      picking: {
        pick: (point, pickOptions) => pickGraph(point, pickOptions),
        raycast: (ray, raycastOptions) => raycastGraph(ray, raycastOptions),
        getAdaptiveTolerance: (options) => resolveRuntimeHitTolerance(options),
      },
      diagnostics: {
        getSummary: () => resolvePublicDiagnostics(),
      },
      replay: {
        createToken: (scope) => createRuntimeReplayToken(scope),
        validateToken: (token) => ({
          valid: typeof token === "string" && token.startsWith("replay-"),
        }),
        run: (token) => replayRuntimeToken(token),
        export: (token) => ({
          token,
          accepted: typeof token === "string" && token.startsWith("replay-"),
        }),
      },
    },
    /**
     * Disposes runtime resources and emits lifecycle-disposed event payload.
     */
    dispose() {
      disposeRuntimePlanScheduler();
      runtimeFacade.dispose();
      emitEvent("engine.lifecycle.disposed", {
        mounted: mountTarget !== null,
      });
    },
  };
}

/**
 * Returns a monotonic timestamp in milliseconds in browser and node hosts.
 */
function performanceNow(): number {
  if (typeof performance !== "undefined" && typeof performance.now === "function") {
    return performance.now();
  }
  return Date.now();
}

/**
 * Resolves dirty domains from compiler invalidation summary.
 * @param compileOutput Incremental compiler output for one applied change-set.
 */
function resolveDirtyDomainsFromCompileOutput(
  compileOutput: EngineIncrementalCompileOutput,
): readonly EngineDirtyDomain[] {
  const domains: EngineDirtyDomain[] = [];
  if (compileOutput.invalidation.transform) {
    domains.push("transform");
  }
  if (compileOutput.invalidation.geometry) {
    domains.push("geometry");
  }
  if (compileOutput.invalidation.material) {
    domains.push("material");
  }
  if (compileOutput.invalidation.visibility) {
    domains.push("visibility");
  }
  if (compileOutput.invalidation.picking) {
    domains.push("picking");
  }
  if (compileOutput.invalidation.gpuUpload) {
    domains.push("resource");
  }
  return domains;
}
