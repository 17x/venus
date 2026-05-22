import type {
  EngineGraphInput,
  EngineGraphNodeInput,
  EngineGraphPatchInput,
  EngineHandle,
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
  EngineRuntimeLodPlanOutput,
  EngineRuntimeLodPlanRequest,
  EngineRuntimeMetricsSnapshot,
  EngineRuntimePlanFrameRequest,
  EngineRuntimePlanInspectOutput,
  EngineRuntimeSubmitOutput,
  EngineRuntimeGpuResourceDescriptor,
  EngineRuntimeGpuResourceOutput,
  EngineRuntimeUploadBatchOutput,
  EngineRuntimeBarrierPlanOutput,
  EngineRuntimeBarrierApplyOutput,
  EngineRuntimeReadbackOutput,
  EngineRuntimeSpatialQueryOutput,
  EnginePublicCapabilitiesOutput,
  EnginePublicMetricsOutput,
  EngineRuntimeResourceDescriptor,
  EngineRuntimeRoiPlanOutput,
  EngineRuntimeRoiPlanRequest,
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
import { createEngineCapabilityFacade } from "./createEngine.capability.facade";
import { createEngineRuntimeFacadeNamespace } from "./createEngine.runtime.facade";
import { createEngineMediaOverlayFacade } from "./createEngine.media-overlay.facade";
import { createEngineDiagnosticsReplayFacade } from "./createEngine.diagnostics-replay.facade";
import { createEngineLifecycleViewFacade } from "./createEngine.lifecycle-view.facade";
import { createEngineGraphRenderFacade } from "./createEngine.graph-render.facade";
import { createEngineEventsHooksCacheFoundation } from "./createEngine.events-hooks-cache.foundation";
import { createRuntimeResourceObservabilityFoundation } from "./createEngine.runtime-resource-observability.foundation";

const ENGINE_RUNTIME_DOCUMENT_SCHEMA_VERSION = 1;

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

  /**
   * Allocates one deterministic scheduler task id.
   */
  function createSchedulerTaskId(): string {
    schedulerTaskCounter += 1;
    return `scheduler-task-${schedulerTaskCounter}`;
  }

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

  /**
   * Allocates one deterministic headless session id.
   */
  function createHeadlessSessionId(): string {
    headlessSessionCounter += 1;
    return `headless-${headlessSessionCounter}`;
  }

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

  // Moves runtime resource residency + observability internals out of the top-level assembly body.
  const {
    registerRuntimeResource,
    updateRuntimeResource,
    releaseRuntimeResource,
    pinRuntimeResource,
    unpinRuntimeResource,
    getRuntimeResourceResidency,
    collectRuntimeResources,
    startRuntimeTrace,
    stopRuntimeTrace,
    getRuntimeTrace,
    createRuntimeReplayToken,
    replayRuntimeToken,
  } = createRuntimeResourceObservabilityFoundation({
    runtimeResourceRegistry,
    runtimeTraceRegistry,
    getRuntimeResourceResidencyVersion: () => runtimeResourceResidencyVersion,
    setRuntimeResourceResidencyVersion: (nextVersion) => {
      runtimeResourceResidencyVersion = nextVersion;
    },
    getRuntimeTraceCounter: () => runtimeTraceCounter,
    setRuntimeTraceCounter: (nextCounter) => {
      runtimeTraceCounter = nextCounter;
    },
    getRuntimeReplayCounter: () => runtimeReplayCounter,
    setRuntimeReplayCounter: (nextCounter) => {
      runtimeReplayCounter = nextCounter;
    },
    resolveNow,
    resolveRevision: () => documentSnapshot.revision,
    emitEvent: (type, payload) => {
      emitEvent(type, payload);
    },
  });

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

  // Centralizes event/hook/cache orchestration helpers to keep createEngine focused on top-level assembly.
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
      emitEvent,
      isMounted: () => mountTarget !== null,
      setMountTarget: (target) => {
        mountTarget = target;
      },
      getDeveloperConfig: () => developerConfig,
      setDeveloperConfig: (config) => {
        developerConfig = config;
      },
      getViewportLayout: () => viewportLayout,
      setViewportLayout: (layout) => {
        viewportLayout = layout;
      },
      getInteractionState: () => interactionState,
      getTransformPreview: () => transformPreview,
      getAnnotationCount: () => annotations.length,
      getMediaSourceCount: () => mediaSources.length,
      getMediaTimeMs: () => mediaTimeMs,
      getBackendPreference: () => backendPreference,
      getRuntimeBackendDebugOptions: () => runtimeBackendDebugOptions,
      runtimeStart: () => runtimeFacade.start(),
      runtimeStop: () => runtimeFacade.stop(),
      runtimePause: () => runtimeShell.pause(),
      runtimeResume: () => runtimeShell.resume(),
      markInteractionSet: () => {
        lastInteractionAtMs = resolveNow();
        lastInteractionKind = "set";
      },
      resizeRuntime: (width, height) => runtimeShell.resize(width, height),
      resizeViewport: (width, height) => {
        viewportFacade.resize(width, height);
      },
      resolveViewportSnapshot: () => resolveViewSnapshotFromViewportState(viewportFacade.getViewport()),
      applyViewPatch,
      getViewportState: () => viewportFacade.getViewport(),
      getQuality: () => qualityProfile,
      setQuality: (profile) => {
        qualityProfile = profile;
      },
      getFrameBudget: () => frameBudgetMs,
      setFrameBudget: (budget) => {
        frameBudgetMs = Number.isFinite(budget) ? Math.max(1, budget) : frameBudgetMs;
      },
      defaultDebugEnabled: Boolean(options.debug),
    }),
    ...createEngineGraphRenderFacade({
      emitHook,
      emitEvent,
      applyGraphSnapshot,
      applyGraphPatchBatch,
      getGraphRevision: () => documentSnapshot.revision,
      getGraphNodes: () => [...graphNodeState.values()],
      getGraphNodeCount: () => graphNodeState.size,
      queryGraph,
      pickGraph,
      raycastGraph,
      resolveFrameOrchestration,
      resolveNow,
      getLastInteractionKind: () => lastInteractionKind,
      getLatestExecutionSnapshot: () => latestExecutionSnapshot,
    }),
    ...createEngineMediaOverlayFacade({
      getOverlayNodes: () => overlayNodes,
      setOverlayNodes: (nodes) => {
        overlayNodes = nodes;
      },
      setTransformPreview: (preview) => {
        transformPreview = preview;
      },
      getTransformPreview: () => transformPreview,
      setAnnotations: (nextAnnotations) => {
        annotations = nextAnnotations;
      },
      getAnnotations: () => annotations,
      setInvalidatePayload: (payload) => {
        lastInvalidatePayload = payload as EngineInvalidateInput;
      },
      queryGraph,
      getGraphNodeIds: () => [...graphNodeState.keys()],
      setInteractionState: (state) => {
        interactionState = state;
      },
      markInteractionSet: () => {
        lastInteractionAtMs = resolveNow();
        lastInteractionKind = "set";
      },
      emitEvent,
      assetStates,
      setMediaSources: (sources) => {
        mediaSources = sources;
      },
      getMediaSources: () => mediaSources,
      setMediaTimeMs: (timeMs) => {
        mediaTimeMs = timeMs;
      },
      getMediaTimeMs: () => mediaTimeMs,
      resolveNow,
      getBackendPreference: () => backendPreference,
      setBackendPreference: (preference) => {
        backendPreference = preference;
      },
      getRuntimeCapabilitySnapshot: (): EnginePublicCapabilitiesOutput => ({
        schemaVersion: ENGINE_RUNTIME_CAPABILITY_SCHEMA_VERSION,
        runtime: Object.values(ENGINE_RUNTIME_CAPABILITY_MAP),
      }),
      createHeadlessSessionId,
      headlessSessions,
    }),
    /**
     * Keeps headless render parity by reusing the primary render path output counters.
     */
    async renderHeadless() {
      const rendered = await this.render();
      return {
        drawCount: rendered.drawCount,
        visibleCount: rendered.visibleCount,
      };
    },
    ...createEngineEventsAndHooksFacade({
      registerEventListener,
      unregisterEventListener,
      unregisterAllEventListeners,
      assertValidEventType,
      assertValidEventListener,
      pausedEventTypes,
      resolveEventListenerStats,
      registerHookListener,
      unregisterAllHookListeners,
      resolveHookListenerStats,
    }),
    ...createEngineExtensionAndSchedulerFacade({
      extensionRegistry,
      schedulerTaskRegistry,
      getFrameBudgetMs: () => frameBudgetMs,
      createSchedulerTaskId,
    }),
    ...createEngineCachePolicySecurityFacade({
      cacheNamespaces,
      resolveCacheNamespace,
      getPolicyRenderState: () => policyRenderState,
      setPolicyRenderState: (state) => {
        policyRenderState = state;
      },
      getPolicyResourceState: () => policyResourceState,
      setPolicyResourceState: (state) => {
        policyResourceState = state;
      },
      getPolicyFallbackState: () => policyFallbackState,
      setPolicyFallbackState: (state) => {
        policyFallbackState = state;
      },
      getSecurityTrustLevel: () => securityTrustLevel,
      setSecurityTrustLevel: (level) => {
        securityTrustLevel = level;
      },
      getSecurityResourceAccessPolicy: () => securityResourceAccessPolicy,
      setSecurityResourceAccessPolicy: (policy) => {
        securityResourceAccessPolicy = policy;
      },
      getSecurityAuditLog: () => securityAuditLog,
      appendSecurityAuditLog,
    }),
    /**
     * Preserves legacy event registration API by delegating to engine.events.on.
     * @param event Event type token used as listener registry key.
     * @param listener Event listener callback.
     */
    on(event, listener) {
      registerEventListener(event, listener);
    },
    /**
     * Preserves legacy event unregister API by delegating to engine.events.off.
     * @param event Event type token used as listener registry key.
     * @param listener Event listener callback.
     */
    off(event, listener) {
      unregisterEventListener(event, listener);
    },
    /**
     * Preserves legacy one-shot listener API by delegating to engine.events.once.
     * @param event Event type token used as listener registry key.
     * @param listener Event listener callback.
     */
    once(event, listener) {
      this.events.once(event, listener);
    },
    ...createEngineDiagnosticsReplayFacade({
      resolveMetrics: () => ({
        encodedCommandCount: lastEncodedCommandCount,
        replayedCommandCount: lastReplayEventCount,
        drawCount: latestExecutionSnapshot.drawCount,
      }),
      setDiagnosticsEnabledFlag: (enabled) => {
        diagnosticsEnabled = enabled;
      },
      emitEvent,
      captureDebugFrameOutput: () => ({
        mimeType: "image/png",
        dataUrl: "data:image/png;base64,",
      }),
      createRuntimeReplayToken,
      replayRuntimeToken,
      resolvePublicDiagnostics,
      isDiagnosticsEnabled: () => diagnosticsEnabled,
      getOverlayCount: () => overlayNodes.length,
      captureFrame: () => runtimeShell.captureFrame(),
      resolveStats: () => ({
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
      }),
      getBackendInfo: () => runtimeShell.getBackendInfo(),
    }),
    runtime: createEngineRuntimeFacadeNamespace({
      resolveRuntimeDocumentSnapshot,
      resolveRuntimeDocumentRevision,
      applyRuntimeDocumentChangeSet,
      compileRuntimeWorld,
      resolveRuntimeWorldSnapshotOutput,
      resolveRuntimeWorldGraphStatsOutput,
      resolveRuntimeDirtyStateOutput,
      markRuntimeDirtyDomain,
      flushRuntimeDirtyDomains,
      scheduleRuntimeIncrementalCompile,
      forceRuntimeFullCompile,
      createRuntimeFramePlan,
      inspectRuntimePlan,
      encodeRuntimeCommandPlan,
      validateRuntimeCommandBuffer,
      submitRuntimeCommandBuffer,
      submitRuntimeCommandBufferBatch,
      createRuntimeGpuResource,
      updateRuntimeGpuResource,
      destroyRuntimeGpuResource,
      createRuntimeUploadBatch,
      createRuntimeBarrierPlan,
      applyRuntimeBarrierPlan,
      readbackRuntimeResource,
      queryRuntimeViewportCandidates,
      queryRuntimeFrustumVisibleSet,
      pickGraph,
      raycastGraph,
      queryRuntimeSpatialIndex,
      resolveRuntimeBackendState,
      switchRuntimeBackend,
      resolveRuntimeBackendFallbackHistory,
      setRuntimeBackendDebugOptions,
      captureRuntimeFrame,
      captureRuntimeCommandTrace,
      createRuntimeReplayToken,
      replayRuntimeToken,
      resolveRuntimePublicMetrics,
      getRuntimeTrace,
      createRuntimeDocumentSnapshot,
      validateRuntimeDocumentSnapshot,
      resolveRuntimeDocumentSchemaVersion,
      diffRuntimeDocumentSnapshots,
      rebaseRuntimeDocumentChangeSet,
      serializeRuntimeDocumentSnapshot,
      deserializeRuntimeDocumentSnapshot,
      compileRuntimeWorldFromDocument,
      queryRuntimeWorldEntity,
      queryRuntimeWorldComponent,
      queryRuntimeNodeTransform,
      formatRuntimeNodeSvgTransform,
      clearRuntimeWorldSnapshot,
      markRuntimeDirtyDomainsBatch,
      resolveRuntimePendingDirtyDomains,
      resetRuntimeDirtyState,
      createRuntimeCommandEncoder,
      optimizeRuntimeCommandBuffer,
      inspectRuntimeCommandBuffer,
      replayRuntimeCommandBuffer,
      resolveRuntimeBackendListAvailableOutput,
      selectRuntimeBackend,
      resolveRuntimeBackendGetActiveOutput,
      resolveRuntimeBackendCapabilities,
      resolveRuntimeBackendLimits,
      resolveRuntimeBackendGetFallbackTraceOutput,
      probeRuntimeHeadlessBackend,
      createRuntimeVisibilityPlan,
      createRuntimeLodPlan,
      createRuntimeRoiPlan,
      createRuntimeBudgetPlan,
      createRuntimeHitGeometryPayload,
      resolveRuntimeHitTolerance,
      requestRuntimePlanFrame,
      cancelRuntimePlanFrame,
      setRuntimePlanInteractiveInterval,
      resolveRuntimePlanSchedulerDiagnostics,
      registerRuntimeResource,
      updateRuntimeResource,
      releaseRuntimeResource,
      pinRuntimeResource,
      unpinRuntimeResource,
      getRuntimeResourceResidency,
      collectRuntimeResources,
      startRuntimeTrace,
      stopRuntimeTrace,
      getRuntimeMetricsSnapshot,
    }),
    capability: createEngineCapabilityFacade({
      queryRuntimeNodeTransform,
      formatRuntimeNodeSvgTransform,
      queryGraph,
      createRuntimeHitGeometryPayload,
      pickGraph,
      raycastGraph,
      resolveRuntimeHitTolerance,
      resolvePublicDiagnostics,
      createRuntimeReplayToken,
      replayRuntimeToken,
    }),
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

