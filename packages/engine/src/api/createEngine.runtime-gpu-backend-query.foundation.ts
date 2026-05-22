import type {
  EngineGraphNodeInput,
  EnginePickOptions,
  EnginePickPointInput,
  EnginePickResult,
  EnginePublicMetricsOutput,
  EngineQueryBoundsInput,
  EngineQueryResult,
  EngineRayInput,
  EngineRaycastHit,
  EngineRaycastOptions,
  EngineRuntimeBackendFallbackHistoryOutput,
  EngineRuntimeBackendFallbackTraceItem,
  EngineRuntimeBackendStateOutput,
  EngineRuntimeCommandTraceOutput,
  EngineRuntimeGpuResourceDescriptor,
  EngineRuntimeGpuResourceOutput,
  EngineRuntimeReadbackOutput,
  EngineRuntimeSpatialQueryOutput,
  EngineRuntimeUploadBatchOutput,
  EngineRuntimeBarrierPlanOutput,
  EngineRuntimeBarrierApplyOutput,
  EngineRuntimeStartTraceOutput,
} from "./public-types";
import type { EngineSpatialQueryNode } from "../spatial/spatialQuery/spatialQuery.contract";
import type { EngineRayPickCandidate } from "../picking/hitTestRay/hitTestRay.contract";

/**
 * Defines dependencies required by runtime GPU/backend/query helper assembly.
 */
type RuntimeGpuBackendQueryDependencies = {
  /** Runtime GPU resource descriptors keyed by resource id. */
  runtimeGpuResources: Map<string, EngineRuntimeGpuResourceDescriptor>;
  /** Runtime upload-batch registry keyed by batch id. */
  runtimeUploadBatches: Map<string, readonly string[]>;
  /** Runtime barrier-plan registry keyed by plan id. */
  runtimeBarrierPlans: Map<string, readonly string[]>;
  /** Reads current upload-batch sequence counter. */
  getRuntimeUploadBatchCounter: () => number;
  /** Updates upload-batch sequence counter. */
  setRuntimeUploadBatchCounter: (nextCounter: number) => void;
  /** Reads current barrier-plan sequence counter. */
  getRuntimeBarrierPlanCounter: () => number;
  /** Updates barrier-plan sequence counter. */
  setRuntimeBarrierPlanCounter: (nextCounter: number) => void;
  /** Graph node registry keyed by graph node id. */
  graphNodeState: Map<string, EngineGraphNodeInput>;
  /** Converts graph node into spatial-query input record. */
  resolveSpatialQueryNodeFromGraphNode: (node: EngineGraphNodeInput) => EngineSpatialQueryNode;
  /** Converts graph node into ray-pick candidate record. */
  resolveRayPickCandidateFromGraphNode: (node: EngineGraphNodeInput) => EngineRayPickCandidate;
  /** Queries spatial module for viewport/point candidates. */
  spatialQueryViewportCandidates: (
    nodes: readonly EngineSpatialQueryNode[],
    bounds: { x: number; y: number; width: number; height: number },
  ) => readonly string[];
  /** Queries spatial module for point candidates. */
  spatialQueryPointCandidates: (
    nodes: readonly EngineSpatialQueryNode[],
    point: { x: number; y: number },
    tolerance: number,
  ) => readonly string[];
  /** Resolves ray hit against candidate set. */
  hitTestRay: (
    ray: EngineRayInput,
    candidates: readonly EngineRayPickCandidate[],
  ) => EngineRaycastHit | null;
  /** Selects runtime backend preference and resolution. */
  selectRuntimeBackend: (
    input: { preference?: "auto" | "webgpu" | "webgl" | "canvas2d" | "headless" },
  ) => { requested: "auto" | "webgpu" | "webgl" | "canvas2d" | "headless"; resolved: "auto" | "webgpu" | "webgl" | "canvas2d" | "headless" };
  /** Resolves runtime backend state snapshot. */
  resolveRuntimeBackendState: () => EngineRuntimeBackendStateOutput;
  /** Reads runtime backend fallback history. */
  getRuntimeBackendFallbackHistory: () => readonly EngineRuntimeBackendFallbackTraceItem[];
  /** Updates runtime backend fallback history. */
  setRuntimeBackendFallbackHistory: (history: readonly EngineRuntimeBackendFallbackTraceItem[]) => void;
  /** Sets runtime backend debug options payload. */
  setRuntimeBackendDebugOptionsState: (options: Readonly<Record<string, unknown>>) => void;
  /** Starts runtime trace session. */
  startRuntimeTrace: (options: { name: string }) => EngineRuntimeStartTraceOutput;
  /** Emits diagnostics events. */
  emitEvent: (type: string, payload: unknown) => void;
  /** Reads encoded command counter. */
  getLastEncodedCommandCount: () => number;
  /** Reads replay event counter. */
  getLastReplayEventCount: () => number;
  /** Reads latest draw count from execution snapshot. */
  getLatestDrawCount: () => number;
};

/**
 * Assembles runtime GPU, backend, and spatial query helper functions.
 * @param deps Shared state registries and delegates from createEngine closure.
 */
export function createRuntimeGpuBackendQueryFoundation(
  deps: RuntimeGpuBackendQueryDependencies,
): {
  destroyRuntimeGpuResource: (resourceId: string) => EngineRuntimeGpuResourceOutput;
  createRuntimeUploadBatch: (request: { resourceIds: readonly string[] }) => EngineRuntimeUploadBatchOutput;
  createRuntimeBarrierPlan: (request: { resourceIds: readonly string[] }) => EngineRuntimeBarrierPlanOutput;
  applyRuntimeBarrierPlan: (plan: { planId: string }) => EngineRuntimeBarrierApplyOutput;
  readbackRuntimeResource: (request: { resourceId: string }) => EngineRuntimeReadbackOutput;
  queryRuntimeViewportCandidates: (query: EngineQueryBoundsInput) => EngineRuntimeSpatialQueryOutput;
  queryRuntimeFrustumVisibleSet: (query: Readonly<Record<string, unknown>>) => EngineRuntimeSpatialQueryOutput;
  queryRuntimeSpatialIndex: (query: Readonly<Record<string, unknown>>) => EngineRuntimeSpatialQueryOutput;
  switchRuntimeBackend: (
    target: "auto" | "webgpu" | "webgl" | "canvas2d" | "headless",
    options?: Readonly<Record<string, unknown>>,
  ) => EngineRuntimeBackendStateOutput;
  resolveRuntimeBackendFallbackHistory: () => EngineRuntimeBackendFallbackHistoryOutput;
  setRuntimeBackendDebugOptions: (options: Readonly<Record<string, unknown>>) => { accepted: boolean };
  captureRuntimeCommandTrace: (options?: { label?: string }) => EngineRuntimeCommandTraceOutput;
  resolveRuntimePublicMetrics: () => EnginePublicMetricsOutput;
  queryGraph: (bounds: EngineQueryBoundsInput) => EngineQueryResult;
  pickGraph: (point: EnginePickPointInput, options?: EnginePickOptions) => EnginePickResult;
  raycastGraph: (ray: EngineRayInput, options?: EngineRaycastOptions) => EngineRaycastHit | null;
} {
  /**
   * Resolves current tracked graph nodes as spatial-query inputs.
   */
  function resolveSpatialQueryNodes(): EngineSpatialQueryNode[] {
    return Array.from(deps.graphNodeState.values()).map((node) =>
      deps.resolveSpatialQueryNodeFromGraphNode(node),
    );
  }

  /**
   * Resolves current tracked graph nodes as ray-pick candidates.
   */
  function resolveRayPickCandidates(): EngineRayPickCandidate[] {
    return Array.from(deps.graphNodeState.values()).map((node) =>
      deps.resolveRayPickCandidateFromGraphNode(node),
    );
  }

  /**
   * Destroys one runtime GPU resource descriptor record.
   * @param resourceId Runtime GPU resource id.
   */
  function destroyRuntimeGpuResource(resourceId: string): EngineRuntimeGpuResourceOutput {
    const exists = deps.runtimeGpuResources.delete(resourceId);
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
    const nextCounter = deps.getRuntimeUploadBatchCounter() + 1;
    deps.setRuntimeUploadBatchCounter(nextCounter);
    const batchId = `upload-${nextCounter}`;
    deps.runtimeUploadBatches.set(batchId, [...request.resourceIds]);
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
    const nextCounter = deps.getRuntimeBarrierPlanCounter() + 1;
    deps.setRuntimeBarrierPlanCounter(nextCounter);
    const planId = `barrier-${nextCounter}`;
    deps.runtimeBarrierPlans.set(planId, [...request.resourceIds]);
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
      applied: deps.runtimeBarrierPlans.has(plan.planId),
    };
  }

  /**
   * Reads back one runtime resource.
   * @param request Readback request payload.
   */
  function readbackRuntimeResource(request: { resourceId: string }): EngineRuntimeReadbackOutput {
    const resource = deps.runtimeGpuResources.get(request.resourceId);
    return {
      resourceId: request.resourceId,
      byteLength: resource?.sizeBytes ?? 0,
    };
  }

  /**
   * Resolves one deterministic graph query result.
   * @param bounds World-space query bounds.
   */
  function queryGraph(bounds: EngineQueryBoundsInput): EngineQueryResult {
    return {
      nodeIds: deps.spatialQueryViewportCandidates(resolveSpatialQueryNodes(), {
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
    const nodeIds = deps.spatialQueryPointCandidates(
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
    const hit = deps.hitTestRay(ray, resolveRayPickCandidates());
    if (!hit) {
      return null;
    }
    const maxDistance = options?.maxDistance;
    if (typeof maxDistance === "number" && Number.isFinite(maxDistance) && hit.distance > maxDistance) {
      return null;
    }
    return hit;
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
      nodeIds: [...deps.graphNodeState.keys()].sort().map((id) => `${queryTag}:${id}`),
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
      nodeIds: [...deps.graphNodeState.keys()].sort().map((id) => `${queryTag}:${id}`),
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
    const selected = deps.selectRuntimeBackend({ preference: target });
    const state = deps.resolveRuntimeBackendState();
    const fallbackRecord: EngineRuntimeBackendFallbackTraceItem = {
      requested: selected.requested,
      resolved: selected.resolved,
      reason: selected.requested === selected.resolved ? null : "manual-switch-fallback",
    };
    deps.setRuntimeBackendFallbackHistory([
      ...deps.getRuntimeBackendFallbackHistory(),
      fallbackRecord,
    ]);
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
      history: [...deps.getRuntimeBackendFallbackHistory()],
    };
  }

  /**
   * Sets runtime backend debug options.
   * @param options Runtime backend debug options payload.
   */
  function setRuntimeBackendDebugOptions(
    options: Readonly<Record<string, unknown>>,
  ): { accepted: boolean } {
    deps.setRuntimeBackendDebugOptionsState(options);
    return {
      accepted: true,
    };
  }

  /**
   * Captures runtime command-trace snapshot.
   * @param options Optional trace options payload.
   */
  function captureRuntimeCommandTrace(options?: { label?: string }): EngineRuntimeCommandTraceOutput {
    const trace = deps.startRuntimeTrace({
      name: options?.label ?? "runtime-command-trace",
    });
    const output = {
      traceId: trace.traceId,
      commandCount: deps.getLastEncodedCommandCount(),
    };
    deps.emitEvent("engine.diagnostics.traceReady", output);
    return output;
  }

  /**
   * Returns public runtime metrics snapshot.
   */
  function resolveRuntimePublicMetrics(): EnginePublicMetricsOutput {
    return {
      encodedCommandCount: deps.getLastEncodedCommandCount(),
      replayedCommandCount: deps.getLastReplayEventCount(),
      drawCount: deps.getLatestDrawCount(),
    };
  }

  return {
    destroyRuntimeGpuResource,
    createRuntimeUploadBatch,
    createRuntimeBarrierPlan,
    applyRuntimeBarrierPlan,
    readbackRuntimeResource,
    queryRuntimeViewportCandidates,
    queryRuntimeFrustumVisibleSet,
    queryRuntimeSpatialIndex,
    switchRuntimeBackend,
    resolveRuntimeBackendFallbackHistory,
    setRuntimeBackendDebugOptions,
    captureRuntimeCommandTrace,
    resolveRuntimePublicMetrics,
    queryGraph,
    pickGraph,
    raycastGraph,
  };
}
