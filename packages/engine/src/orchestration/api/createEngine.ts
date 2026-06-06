import type {
  EngineGraphNodeInput,
  EngineHandle,
  EngineInvalidateInput,
  EngineLightCollection,
  EngineLightEntity,
  EngineMaterialEntity,
  EngineRenderChainDiagnostics,
  EngineRenderWarningPayload,
  EngineRuntimeLightingProfile,
  EngineRuntimeLightingEnvironmentInput,
  EngineRuntimeLightingEnvironmentOutput,
  EngineRuntimeBackendFallbackTraceItem,
  EnginePublicCapabilitiesOutput,
  EngineRuntimeWorldSnapshotOutput,
  EngineRuntimeOpenWorldMap,
  EngineRuntimeWorldObstacle,
  EngineRuntimeWorldAgentState,
  EngineRuntimeWorldStepInput,
  EngineRuntimeWorldResolveCollisionInput,
  EngineRuntimeWorldResolveCollisionOutput,
  EngineRuntimeCollisionQueryAabbInput,
  EngineRuntimeCollisionQueryAabbOutput,
  EngineRuntimeCollisionUnregisterOutput,
  EngineRuntimeCollisionEvaluateTriggersInput,
  EngineRuntimeCollisionEvaluateTriggersOutput,
  EngineRuntimeCollisionTriggerEvent,
  EngineRuntimeCollisionSweepCircleInput,
  EngineRuntimeCollisionSweepCircleOutput,
  EngineRuntimeNavigationPath,
  EngineRuntimeNavigationPathConstraints,
  EngineRuntimeNavigationStepPathAgentsInput,
  EngineRuntimeNavigationUnregisterPathOutput,
} from "./public-types";
import {
  resolveEnginePerformanceOptions,
  type CreateEngineOptions,
} from "./createEngineContracts";
import { resolveCreateEnginePolicyBootstrap } from "../../optimization/createEnginePolicyBootstrap";
import { resolveCreateEngineFrame } from "../../orchestration/render-planning/createEngineFrameResolver";
import {
  type EngineViewportState,
} from "../../kernel/view/viewportFacade";
import type { EngineRenderFrameStats } from "../../orchestration/render-runtime/runtimeFacade";
import {
  type EngineIncrementalCompileOutput,
} from "../../kernel/compiler/incrementalCompiler";
import {
  resolveStagedExecutionSnapshot,
  type EngineExecutionSnapshot,
} from "../../orchestration/render-execution/stagedExecutionChain";
import {
  ENGINE_RUNTIME_CAPABILITY_MAP,
  ENGINE_RUNTIME_CAPABILITY_SCHEMA_VERSION,
} from "./runtimeCapabilityMap";
import { createEngineRuntimeFromProfile } from "../../kernel/runtime-builder";
import { createEngineDocumentGraphModule } from "../../kernel/document/documentGraph/documentGraph";
import { createEngineSceneCompilerModule } from "../../kernel/compiler/sceneCompiler/sceneCompiler";
import { createEngineRuntimeWorldModule } from "../../kernel/scene-runtime/runtimeWorld/runtimeWorld";
import { createEngineDirtyPropagationModule } from "../../kernel/dirty/dirtyPropagation/dirtyPropagation";
import { createEngineCommandEncoderModule } from "../../kernel/command-buffer/commandEncoder/commandEncoder";
import { createEngineCommandReplayModule } from "../../kernel/command-buffer/commandReplay/commandReplay";
import { createEngineBackendSelectorModule } from "../../backend/backendSelector/backendSelector";
import { createEngineProductAdapterBoundaryModule } from "./productAdapterBoundary/productAdapterBoundary";
import { createEnginePublicApiSurfaceModule } from "./publicApiSurface/publicApiSurface";
import { createEngineViewModule } from "../../kernel/core/view/viewport-module";
import { createEngineSpatialQueryModule } from "../../kernel/spatial/spatialQuery/spatialQuery";
import { createEngineHitTestRayModule } from "../../kernel/picking/hitTestRay/hitTestRay";
import {
  type EngineRenderScheduler,
} from "../../orchestration/renderScheduler";
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
import { createRuntimeAuthoringFoundation } from "./createEngine.runtime-authoring.foundation";
import { createRuntimeModelFoundation } from "./createEngine.runtime-model.foundation";
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
import type { EngineBackendFrameDiagnostics } from "../../backend/adapters/noopBackendAdapter";
import { ENGINE_BACKEND_CACHE_FALLBACK_REASON } from "../../backend/fallbackTaxonomy";
import type { EngineRuntimeDocumentWarningCode } from "../../kernel/document/document-warning-codes";
import { resolveEngineConstraintSet } from "../../kernel/constraint/constraintSolver";
const ENGINE_RUNTIME_DOCUMENT_SCHEMA_VERSION = 1;
const TOPOLOGY_TRIANGLE_MIN_POSITION_COUNT = 9;
const TOPOLOGY_LINE_MIN_POSITION_COUNT = 6;
const TOPOLOGY_POINT_MIN_POSITION_COUNT = 3;
const TOPOLOGY_TRIANGLE_MIN_INDEX_COUNT = 3;
const TOPOLOGY_LINE_MIN_INDEX_COUNT = 2;
const TOPOLOGY_POINT_MIN_INDEX_COUNT = 1;
const CAMERA_FOV_Y_DEFAULT_DEGREES = 50;
const CAMERA_NEAR_DEFAULT = 0.1;
const CAMERA_FAR_DEFAULT = 5000;
const RUNTIME_COLLISION_SWEEP_SAFE_BACKOFF = 0.000001;

type EngineNativeCamera3dPayload = {
  yaw: number;
  pitch: number;
  distance: number;
  targetX: number;
  targetY: number;
  targetZ: number;
  perspectiveFovY: number;
  near: number;
  far: number;
  projectionMode: "perspective" | "orthographic";
};
const TRIANGLE_INDEX_ZERO = 0;
const TRIANGLE_INDEX_ONE = 1;
const TRIANGLE_INDEX_TWO = 2;
const QUAD_INDEX_THREE = 3;
const DEFAULT_RUNTIME_PLAN_INTERVAL_MS = 8;
const DEFAULT_FRAME_BUDGET_MS = 16;
const MAX_RUNTIME_LIGHT_COUNT = 32;
const MAX_RUNTIME_OPEN_WORLD_OBSTACLE_COUNT = 4096;
const MAX_RUNTIME_WORLD_AGENT_COUNT = 1024;
const TRIANGLE_FALLBACK_INDICES: readonly number[] = [
  TRIANGLE_INDEX_ZERO,
  TRIANGLE_INDEX_ONE,
  TRIANGLE_INDEX_TWO,
];
const QUAD_FALLBACK_INDICES: readonly number[] = [
  TRIANGLE_INDEX_ZERO,
  TRIANGLE_INDEX_ONE,
  TRIANGLE_INDEX_TWO,
  TRIANGLE_INDEX_TWO,
  TRIANGLE_INDEX_ONE,
  QUAD_INDEX_THREE,
];

/**
 * Creates one default backend diagnostics snapshot for engine bootstrap and reset paths.
 */
function createDefaultBackendDiagnostics() {
  const diagnostics: EngineBackendFrameDiagnostics = {
    webglRenderPath: "none" as const,
    webgpuRenderPath: "hybrid-webgl" as const,
    webgpuNativeSubmissionAttemptedCount: 0,
    webgpuNativeSubmissionSuccessCount: 0,
    webgpuNativeSubmissionFailureCount: 0,
    webgpuNativeSubmissionTotalCount: 0,
    webgpuNativeSubmissionTotalFailureCount: 0,
    webgpuNativeRectBatchEligibleCount: 0,
    webgpuNativeRectBatchRejectedReason: "none" as const,
    webglNativeMeshAttemptedCount: 0,
    webglNativeMeshSubmittedCount: 0,
    webglNativeMeshPipelineCompileCount: 0,
    webglNativeMeshPipelineReuseCount: 0,
    webglNativeMeshRejectedCount: 0,
    webglNativeMeshRejectedInvalidPositionCount: 0,
    webglNativeMeshRejectedInvalidIndexCount: 0,
    webglNativeMeshRejectedInsufficientStreamCount: 0,
    webglNativeMeshRejectedUnsupportedTopologyCount: 0,
    webglNativeMeshSupportedTopologies: ["triangles"],
    webglNativeMeshRejectedTopologies: [],
    webglNativeMeshLineTopologyPlannedCount: 0,
    webglNativeMeshLineTopologyPreflightAttemptedCount: 0,
    webglNativeMeshLineTopologyPreflightPassedCount: 0,
    webglNativeMeshLineTopologyPreflightRejectedCount: 0,
    webglNativeMeshLineTopologyPreflightRejectedInvalidPositionCount: 0,
    webglNativeMeshLineTopologyPreflightRejectedInvalidIndexCount: 0,
    webglNativeMeshLineTopologyPreflightRejectedInsufficientStreamCount: 0,
    webglNativeMeshLineTopologyDrawPlanAttemptedCount: 0,
    webglNativeMeshLineTopologyDrawPlanCommandCount: 0,
    webglNativeMeshLineTopologySubmissionDeferredCount: 0,
    webglNativeMeshLineTopologySubmissionAttemptedCount: 0,
    webglNativeMeshLineTopologySubmissionAttemptedCommandCount: 0,
    webglNativeMeshLineTopologySubmissionSucceededCount: 0,
    webglNativeMeshLineTopologySubmissionSucceededCommandCount: 0,
    webglNativeMeshLineTopologySubmissionCommandSuccessRate: 0,
    webglNativeMeshLineTopologySubmissionPlanCoverageRate: 0,
    webglNativeMeshLineTopologySubmissionDrawPlanWastedCommandCount: 0,
    webglNativeMeshLineTopologySubmissionFailedCount: 0,
    webglNativeMeshLineTopologySubmissionFailedCommandCount: 0,
    webglNativeMeshLineTopologySubmissionGateBlockedCount: 0,
    webglNativeMeshLineTopologySubmissionGateState: "disabled",
    webglNativeMeshLineTopologySubmissionOutcome: "none",
    webglNativeMeshLineTopologySubmissionFailedMissingLinesPrimitiveCount: 0,
    webglNativeMeshLineTopologySubmissionFailedMissingLinesPrimitiveCommandCount: 0,
    webglNativeMeshLineTopologySubmissionFailedInsufficientStreamCount: 0,
    webglNativeMeshLineTopologySubmissionFailedInsufficientStreamCommandCount: 0,
    webglNativeMeshLineTopologySubmissionFailureReason: "none",
    webglNativeMeshLineTopologySubmissionFailureSummary: {
      failedCount: 0,
      latestReason: "none",
      missingLinesPrimitiveCount: 0,
      insufficientStreamCount: 0,
    },
    webglNativeMeshLineTopologySubmissionEfficiencySummary: {
      commandSuccessRate: 0,
      planCoverageRate: 0,
      drawPlanWastedCommandCount: 0,
    },
    webglNativeMeshCapabilityGateCount: 0,
    activeLightCount: 0,
    meshDrawCallCount: 0,
    webglNativeMaterialTextureCandidateCount: 0,
    webglNativeMaterialTextureUvReadyCount: 0,
    webglNativeMaterialTextureBindingCount: 0,
    webglNativeMaterialTextureUploadBytes: 0,
    webglNativeMaterialTextureCacheHitCount: 0,
    webglNativeMaterialTextureCacheMissCount: 0,
    webglNativeMaterialTextureDecodeFailureCount: 0,
    webglNativeMaterialTextureDecodeFailureReason: "none",
    webglNativeMaterialTextureFallbackReason: "none",
    webgpuNativeMaterialTextureCandidateCount: 0,
    webgpuNativeMaterialTextureUvReadyCount: 0,
    webgpuNativeMaterialTextureBindingCount: 0,
    webgpuNativeMaterialTextureUploadBytes: 0,
    webgpuNativeMaterialTextureCacheHitCount: 0,
    webgpuNativeMaterialTextureCacheMissCount: 0,
    webgpuNativeMaterialTextureDecodeFailureCount: 0,
    webgpuNativeMaterialTextureDecodeFailureReason: "none",
    webgpuNativeMaterialTextureFallbackReason: "none",
    shadowMapCount: 0,
    shadowDrawCallCount: 0,
    shadowTextureBytes: 0,
    instancedDrawAttemptedCount: 0,
    instancedDrawSucceededCount: 0,
    instancedDrawRejectedCount: 0,
    cacheHits: 0,
    cacheMisses: 0,
    frameReuseHits: 0,
    frameReuseMisses: 0,
    l0PreviewHitCount: 0,
    l0PreviewMissCount: 0,
    l1CompositeHitCount: 0,
    l1CompositeMissCount: 0,
    l2TileHitCount: 0,
    l2TileMissCount: 0,
    cacheFallbackReason: ENGINE_BACKEND_CACHE_FALLBACK_REASON.NONE,
    tileCacheSize: 0,
    tileDirtyCount: 0,
    tileCacheTotalBytes: 0,
    tileUploadCount: 0,
    tileRenderCount: 0,
    visibleTileCount: 0,
    tileSchedulerPendingCount: 0,
    gpuTextureBytes: 0,
    imageTextureBytes: 0,
    webglPreviewReuseMs: 0,
    webglPlanBuildMs: 0,
    webglTextureUploadMs: 0,
    webglDrawSubmitMs: 0,
    webglSnapshotCaptureMs: 0,
    webglModelRenderMs: 0,
    webglPreviewExecutionMode: "affine-snapshot",
    webglPreviewExecutionSource: "backend-native",
    webglBudgetPressure: "low",
    webglBudgetPressureReason: "within-low-thresholds",
    webglBudgetPressureSource: "backend-native",
    webglDrawSubmitBudgetMs: 0,
    webglTextureUploadBudgetBytes: 0,
    webglTextureUploadTotalBudgetBytes: 0,
    webglImageTextureUploadBudgetCount: 0,
    webglTextTextureUploadBudgetCount: 0,
    webglTilePreloadBudgetMs: 0,
    webglTilePreloadBudgetUploads: 0,
    webglOverlayPassBudgetMs: 0,
    webglDrawSubmitBudgetExceeded: false,
    webglTextureUploadBudgetExceeded: false,
    webglOverlayBudgetExceeded: false,
    webglPredictorDirectionX: 0,
    webglPredictorDirectionY: 0,
    webglPredictorSpeedPxPerSec: 0,
    webglPredictorConfidence: 0,
    webglPredictorPreloadRing: 0,
    webglPredictorOverscanCssPx: 0,
    webglPredictivePreloadEnqueueCount: 0,
    webglPredictivePreloadProcessedCount: 0,
    webglPredictivePreloadPrunedCount: 0,
    webglHighZoomTextSlaChecked: false,
    webglHighZoomTextSlaScale: 0,
    webglHighZoomTextSlaViolationCount: 0,
    webglDeferredTextTextureCount: 0,
    panScheduleRequestCount: 0,
    tileSynchronousRebuildCount: 0,
  };
  return diagnostics;
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
  let graphMaterials: readonly EngineMaterialEntity[] = [];
  let runtimeLightingCollection: EngineLightCollection = {
    lights: [],
  };
  let runtimeOpenWorldMap: EngineRuntimeOpenWorldMap = {
    mapSize: 600,
    obstacles: [],
  };
  let runtimeWorldAgents: readonly EngineRuntimeWorldAgentState[] = [];
  let runtimeNavigationPaths: readonly EngineRuntimeNavigationPath[] = [];
  let runtimeCollisionTriggerPairs: readonly string[] = [];
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
    budget: {
      drawSubmitBudgetMs: 0,
      textureUploadBudgetBytes: 0,
      tilePreloadBudgetMs: 0,
      tilePreloadMaxUploads: 0,
      overlayPassBudgetMs: 0,
    },
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
  let latestRenderChainDiagnostics: EngineRenderChainDiagnostics = {
    planReached: false,
    composeReached: false,
    submitReached: false,
    backendPresentReached: false,
    backendPresentCompleted: false,
    backendPresentSkippedReason: null,
    browserBridgeReachable: false,
    mountConnected: false,
    backendMode: "headless",
    failedStage: null,
  };
  let latestRenderWarning: EngineRenderWarningPayload | null = null;
  let latestBackendPresentTelemetry: {
    attempted: boolean;
    committed: boolean;
    skippedReason: "missing-context" | null;
  } = {
    attempted: false,
    committed: false,
    skippedReason: null,
  };
  let latestBackendDiagnostics = createDefaultBackendDiagnostics();
  let latestRuntimeWorldRevision = 0,
    runtimeWorldSnapshotOverride: EngineRuntimeWorldSnapshotOutput | null = null;
  let latestDirtyState = dirtyPropagationModule.createEmptyState(),
    lastRuntimeDirtyMarkedAt = 0;
  let lastEncodedCommandCount = 0,
    lastReplayEventCount = 0,
    lastReplayFirstCommandId: string | null = null;
  let runtimeCommandEncoderCounter = 0,
    overlayNodes: readonly unknown[] = [],
    mountTarget: unknown = null;
  let developerConfig: Readonly<Record<string, unknown>> = { debug: Boolean(options.debug) };
  let viewportLayout: unknown = null, qualityProfile = "balanced", frameBudgetMs = DEFAULT_FRAME_BUDGET_MS;
  let interactionState: Readonly<Record<string, unknown>> | null = null, transformPreview: unknown = null;
  let annotations: readonly unknown[] = [],
    mediaSources: readonly unknown[] = [],
    mediaTimeMs = 0,
    diagnosticsEnabled = true;
  let backendPreference: "auto" | "webgpu" | "webgl" | "canvas2d" | "headless" = options.backend ?? "auto";
  let runtimeBackendFallbackHistory: EngineRuntimeBackendFallbackTraceItem[] = [];
  let runtimeBackendDebugOptions: Readonly<Record<string, unknown>> = {};
  let runtimePlanInteractiveIntervalMs = DEFAULT_RUNTIME_PLAN_INTERVAL_MS, runtimePlanRequestCounter = 0;
  const runtimePlanPendingRequestIds = new Set<string>();
  let runtimePlanScheduler: EngineRenderScheduler | null = null;
  const {
    eventListeners, eventListenerMetadata, pausedEventTypes, eventTypeDeliveryCounters, eventListenerLastDeliveredAt,
    hookStages, hookListeners, hookListenerMetadata, extensionRegistry, schedulerTaskRegistry, createSchedulerTaskId,
    cacheNamespaces, cacheNamespaceStats, assetStates, headlessSessions, createHeadlessSessionId,
    runtimeGpuResources, runtimeUploadBatches, runtimeBarrierPlans, runtimeAuthoringSnapshots,
    getLastRuntimeAuthoringComparison, setLastRuntimeAuthoringComparison,
    getRuntimeAuthoringPreviewTokenCounter, setRuntimeAuthoringPreviewTokenCounter, runtimeResourceRegistry,
    runtimeModelAssets, runtimeModelInstances, runtimeTraceRegistry,
  } = createEngineRuntimeRegistriesFoundation();
  let policyRenderState: Readonly<Record<string, unknown>> = {};
  let policyResourceState: Readonly<Record<string, unknown>> = {};
  let policyFallbackState: Readonly<Record<string, unknown>> = {};
  let securityTrustLevel: "low" | "standard" | "high" = "standard";
  let securityResourceAccessPolicy: Readonly<Record<string, unknown>> = {};
  let reportRuntimeContractWarning: (warning: {
    code: EngineRuntimeDocumentWarningCode;
    message: string;
    details?: Readonly<Record<string, unknown>>;
  }) => void = () => {};
  const securityAuditLog: Array<Readonly<Record<string, unknown>>> = [];
  let securityAuditCounter = 0,
    runtimeUploadBatchCounter = 0,
    runtimeBarrierPlanCounter = 0;
  let lastInvalidatePayload: EngineInvalidateInput | null = null,
    runtimeResourceResidencyVersion = 0,
    runtimeTraceCounter = 0,
    runtimeReplayCounter = 0;
  const { boundaryValidation, publicApiSurfaceViolations } = createEngineValidationFoundation(
    { productAdapterBoundaryModule, publicApiSurfaceModule },
    options,
  );
  const resolveNow = options.runtimeAdapter?.now ?? (() => performanceNow());
  const engineId = `engine-${Math.max(0, Math.floor(resolveNow()))}`;
  const strict3dEnabled = options.strict3d === true;

  /**
   * Determines whether one graph node is eligible for native mesh submission.
   *
   * Mesh-eligible nodes are simple filled rects without any style-rich features
   * that would require canvas2d model-complete composition for correct rendering.
   *
   * @param node Graph node payload from current frame.
   * @returns True when the node can be safely rendered via GPU mesh path alone.
   */
  function isMeshEligible(node: EngineGraphNodeInput): boolean {
    if (strict3dEnabled) {
      return Boolean(node.mesh && typeof node.mesh === "object");
    }

    // Explicit mesh contracts are always mesh-eligible — the adapter authored
    // the geometry explicitly for GPU submission.
    if (node.mesh && typeof node.mesh === "object") {
      return true;
    }

    // Text, image, and group nodes carry semantic rendering requirements that
    // the mesh path cannot satisfy (glyph layout, texture sampling, hierarchy).
    const nodeType = typeof node.type === "string" ? node.type : "shape";
    if (nodeType === "text" || nodeType === "image" || nodeType === "group") {
      return false;
    }

    // Visible stroke requires model-complete for line-width / stroke-style rendering.
    // Only block mesh eligibility when stroke is explicitly visible and carries
    // non-trivial weight. The default stroke (#1f2937, weight 1) is always present
    // on vector editor shapes but the mesh path's fill-only rendering is an
    // acceptable baseline fallback for simple rects.
    const stroke = typeof node.stroke === "string" ? node.stroke.trim() : "";
    const strokeWidth = typeof node.strokeWidth === "number" && Number.isFinite(node.strokeWidth)
      ? node.strokeWidth
      : 0;
    const hasVisibleStroke =
      stroke.length > 0 &&
      stroke !== "transparent" &&
      stroke !== "none" &&
      strokeWidth > 1;  // Default weight 1 is trivial; mesh fallback is acceptable.
    // Any visible stroke (weight > 1) requires model-complete for proper
    // line-width rendering. Advanced stroke properties (dash, align, cap, join)
    // are a subset that also require model-complete.
    if (hasVisibleStroke) {
      return false;
    }
    // Also block when stroke carries advanced properties even at weight 1.
    const hasAdvancedStroke =
      stroke.length > 0 &&
      stroke !== "transparent" &&
      stroke !== "none" &&
      (
        typeof (node as Record<string, unknown>).dashPattern === "string" ||
        typeof (node as Record<string, unknown>).customDash !== "undefined" ||
        typeof (node as Record<string, unknown>).strokeAlign === "string" ||
        typeof (node as Record<string, unknown>).strokeCap === "string" ||
        typeof (node as Record<string, unknown>).strokeJoin === "string"
      );
    if (hasAdvancedStroke) {
      return false;
    }

    // Non-rect shapes (ellipse, polygon, star, line, path) require model-complete
    // for their geometry-specific canvas2d path construction.
    const shape = typeof node.shape === "string" ? node.shape : "rect";
    if (shape !== "rect") {
      return false;
    }

    // Shadow effect requires model-complete for blur / offset compositing.
    if (node.shadow != null && typeof node.shadow === "object") {
      // Guard against empty shadow payloads that carry no visible properties.
      const shadowObj = node.shadow as Record<string, unknown>;
      const hasVisibleShadow =
        (typeof shadowObj.color === "string" && shadowObj.color.length > 0) ||
        (typeof shadowObj.offsetX === "number" && shadowObj.offsetX !== 0) ||
        (typeof shadowObj.offsetY === "number" && shadowObj.offsetY !== 0) ||
        (typeof shadowObj.blur === "number" && (shadowObj.blur as number) > 0);
      if (hasVisibleShadow) {
        return false;
      }
    }

    // Gradient fill/stroke requires model-complete for gradient interpolation.
    const fill = typeof node.fill === "string" ? node.fill.trim().toLowerCase() : "";
    if (fill.includes("gradient(")) {
      return false;
    }

    // Corner radius requires model-complete for rounded-rect path construction.
    if (typeof node.cornerRadius === "number" && node.cornerRadius > 0) {
      return false;
    }
    if (
      node.cornerRadii &&
      typeof node.cornerRadii === "object" &&
      (
        (typeof (node.cornerRadii as Record<string, unknown>).topLeft === "number" && ((node.cornerRadii as Record<string, unknown>).topLeft as number) > 0) ||
        (typeof (node.cornerRadii as Record<string, unknown>).topRight === "number" && ((node.cornerRadii as Record<string, unknown>).topRight as number) > 0) ||
        (typeof (node.cornerRadii as Record<string, unknown>).bottomRight === "number" && ((node.cornerRadii as Record<string, unknown>).bottomRight as number) > 0) ||
        (typeof (node.cornerRadii as Record<string, unknown>).bottomLeft === "number" && ((node.cornerRadii as Record<string, unknown>).bottomLeft as number) > 0)
      )
    ) {
      return false;
    }

    // Point/bezier geometry requires model-complete for path-based rendering.
    if (Array.isArray(node.points) && node.points.length > 0) {
      return false;
    }
    if (Array.isArray(node.bezierPoints) && node.bezierPoints.length > 0) {
      return false;
    }

    // Clip/mask requires model-complete for save/restore + clip() composition.
    if (typeof node.clipPathId === "string" || typeof node.clipId === "string") {
      return false;
    }

    return true;
  }

  /**
   * Normalizes runtime light collection into deterministic engine-safe shape.
   * @param collection Caller-provided light collection payload.
   */
  function normalizeRuntimeLightingCollection(collection: EngineLightCollection): EngineLightCollection {
    const normalizedLights = (collection?.lights ?? [])
      .filter((light): light is EngineLightEntity => Boolean(light) && typeof light.id === "string" && light.id.length > 0)
      .slice(0, MAX_RUNTIME_LIGHT_COUNT);
    return {
      lights: normalizedLights,
    };
  }

  /**
   * Clamps one numeric scalar into [min, max] with deterministic fallback.
   * @param value Source numeric value.
   * @param min Lower bound.
   * @param max Upper bound.
   */
  function clampScalar(value: number, min: number, max: number): number {
    if (!Number.isFinite(value)) {
      return min;
    }
    return Math.min(max, Math.max(min, value));
  }

  /**
   * Resolves one deterministic built-in runtime lighting profile.
   * @param profile Profile token.
   */
  function resolveRuntimeLightingProfile(profile: EngineRuntimeLightingProfile): EngineLightCollection {
    if (profile === "studio") {
      return {
        lights: [
          { id: "studio-key", type: "directional", color: "#ffffff", intensity: 1.25, targetX: 0, targetY: 0, targetZ: 0 },
          { id: "studio-fill", type: "hemisphere", color: "#dbeafe", groundColor: "#1e293b", intensity: 0.45 },
          { id: "studio-ambient", type: "ambient", color: "#f8fafc", intensity: 0.2 },
        ],
      };
    }
    if (profile === "gameplay") {
      return {
        lights: [
          { id: "game-sun", type: "directional", color: "#fff7d6", intensity: 1.1, targetX: 120, targetY: 0, targetZ: -80 },
          { id: "game-bounce", type: "hemisphere", color: "#bfdbfe", groundColor: "#0f172a", intensity: 0.35 },
          { id: "game-ambient", type: "ambient", color: "#e2e8f0", intensity: 0.16 },
        ],
      };
    }
    return {
      lights: [
        { id: "editor-key", type: "directional", color: "#ffffff", intensity: 1, targetX: 0, targetY: 0, targetZ: 0 },
        { id: "editor-hemi", type: "hemisphere", color: "#dbeafe", groundColor: "#1f2937", intensity: 0.3 },
      ],
    };
  }

  /**
   * Resolves one deterministic environment-driven lighting rig and atmosphere payload.
   * @param input Environment-lighting input payload.
   */
  function resolveRuntimeLightingEnvironment(
    input: EngineRuntimeLightingEnvironmentInput,
  ): EngineRuntimeLightingEnvironmentOutput {
    const timeOfDayHours = clampScalar(input.timeOfDayHours, 0, 23.999);
    const directionDeg = Number.isFinite(input.directionDeg) ? input.directionDeg : 0;
    const cloudCover = clampScalar(input.cloudCover, 0, 1);
    const precipitation = clampScalar(input.precipitation, 0, 1);
    const fogDensity = clampScalar(input.fogDensity, 0, 1);
    const directionalIntensity = Math.max(0, Number.isFinite(input.directionalIntensity) ? input.directionalIntensity : 1);
    const ambientIntensity = Math.max(0, Number.isFinite(input.ambientIntensity) ? input.ambientIntensity : 0.2);
    const additionalLights = Array.isArray(input.additionalLights) ? input.additionalLights : [];

    const sunOrbit = ((timeOfDayHours - 6) / 24) * Math.PI * 2;
    const sunHeight = Math.sin(sunOrbit);
    const dayFactor = Math.max(0.05, Math.min(1.15, (sunHeight + 0.15) / 1.15));
    const moonFactor = Math.max(0, Math.min(1, (-sunHeight - 0.05) / 0.95));
    const sunAzimuthDeg = directionDeg + (timeOfDayHours / 24) * 360;
    const sunAzimuthRad = (sunAzimuthDeg * Math.PI) / 180;
    const weatherDirFactor = Math.max(0.25, 1 - cloudCover * 0.45 - precipitation * 0.35 - fogDensity * 0.3);
    const weatherAmbBoost = 1 + cloudCover * 0.35 + precipitation * 0.2 + fogDensity * 0.55;

    const collection = normalizeRuntimeLightingCollection({
      lights: [
        {
          id: "env-key-light",
          type: "directional",
          color: precipitation > 0.25 ? "#dbeafe" : dayFactor >= moonFactor ? "#fff7d6" : "#dbeafe",
          intensity: directionalIntensity * Math.max(dayFactor, moonFactor * 0.62) * weatherDirFactor,
          targetX: Math.sin(sunAzimuthRad) * 180,
          targetY: -30 - sunHeight * 120,
          targetZ: Math.cos(sunAzimuthRad) * 180,
        },
        {
          id: "env-ambient-light",
          type: "ambient",
          color: fogDensity > 0.4 ? "#e5e7eb" : dayFactor >= moonFactor ? "#e2e8f0" : "#bfdbfe",
          intensity: ambientIntensity * (0.18 + dayFactor * 0.75 + moonFactor * 0.35) * weatherAmbBoost,
        },
        {
          id: "env-hemi-light",
          type: "hemisphere",
          color: precipitation > 0.25 ? "#93c5fd" : "#bfdbfe",
          groundColor: "#0f172a",
          intensity: Math.max(0, ambientIntensity * (0.25 + dayFactor * 0.7)),
        },
        ...additionalLights,
      ],
    });

    return {
      environment: {
        timeOfDayHours,
        directionDeg,
        cloudCover,
        precipitation,
        fogDensity,
        directionalIntensity,
        ambientIntensity,
        additionalLights,
      },
      collection,
      atmosphere: {
        skyColor: precipitation > 0.25 ? "#1e293b" : cloudCover > 0.5 ? "#334155" : "#0f172a",
        hazeColor: fogDensity > 0.4 ? "#e2e8f0" : precipitation > 0.25 ? "#60a5fa" : "#94a3b8",
        hazeOpacity: clampScalar(0.04 + cloudCover * 0.12 + precipitation * 0.16 + fogDensity * 0.32, 0, 0.7),
      },
    };
  }

  /**
   * Normalizes runtime open-world map payload into deterministic engine-safe shape.
   * @param map Caller-provided open-world map payload.
   */
  function normalizeRuntimeOpenWorldMap(map: EngineRuntimeOpenWorldMap): EngineRuntimeOpenWorldMap {
    const mapSize = Number.isFinite(map.mapSize) ? Math.max(1, Math.abs(map.mapSize)) : 600;
    const obstacles = (map.obstacles ?? [])
      .filter((item): item is EngineRuntimeOpenWorldMap["obstacles"][number] =>
        Boolean(item) && typeof item.id === "string" && item.id.length > 0,
      )
      .slice(0, MAX_RUNTIME_OPEN_WORLD_OBSTACLE_COUNT)
      .map((item) => ({
        id: item.id,
        x: Number.isFinite(item.x) ? item.x : 0,
        z: Number.isFinite(item.z) ? item.z : 0,
        width: Math.max(0, Number.isFinite(item.width) ? Math.abs(item.width) : 0),
        depth: Math.max(0, Number.isFinite(item.depth) ? Math.abs(item.depth) : 0),
      }));
    return { mapSize, obstacles };
  }

  /**
   * Normalizes one runtime collision obstacle into deterministic engine-safe shape.
   * @param obstacle Caller-provided collider/obstacle payload.
   */
  function normalizeRuntimeWorldObstacle(obstacle: EngineRuntimeWorldObstacle): EngineRuntimeWorldObstacle {
    return {
      id: typeof obstacle.id === "string" && obstacle.id.length > 0 ? obstacle.id : "collider",
      x: Number.isFinite(obstacle.x) ? obstacle.x : 0,
      z: Number.isFinite(obstacle.z) ? obstacle.z : 0,
      width: Math.max(0, Number.isFinite(obstacle.width) ? Math.abs(obstacle.width) : 0),
      depth: Math.max(0, Number.isFinite(obstacle.depth) ? Math.abs(obstacle.depth) : 0),
    };
  }

  /**
   * Normalizes runtime world agents payload into deterministic engine-safe shape.
   * @param agents Caller-provided world agents.
   */
  function normalizeRuntimeWorldAgents(
    agents: readonly EngineRuntimeWorldAgentState[],
  ): readonly EngineRuntimeWorldAgentState[] {
    return (agents ?? [])
      .filter((agent): agent is EngineRuntimeWorldAgentState =>
        Boolean(agent) && typeof agent.id === "string" && agent.id.length > 0,
      )
      .slice(0, MAX_RUNTIME_WORLD_AGENT_COUNT)
      .map((agent) => ({
        id: agent.id,
        kind: agent.kind === "pedestrian" ? "pedestrian" : "car",
        x: Number.isFinite(agent.x) ? agent.x : 0,
        z: Number.isFinite(agent.z) ? agent.z : 0,
        yaw: Number.isFinite(agent.yaw) ? agent.yaw : 0,
        pathIndex: Number.isFinite(agent.pathIndex) ? Math.max(0, Math.floor(agent.pathIndex)) : 0,
        speed: Number.isFinite(agent.speed) ? Math.max(0, agent.speed) : 0,
        pathId: typeof agent.pathId === "string" && agent.pathId.length > 0 ? agent.pathId : undefined,
      }));
  }

  /**
   * Normalizes graph-level material registry into deterministic engine-safe shape.
   * @param materials Caller-provided graph material registry.
   */
  function normalizeGraphMaterials(materials: readonly EngineMaterialEntity[]): readonly EngineMaterialEntity[] {
    return (materials ?? [])
      .filter((material): material is EngineMaterialEntity =>
        Boolean(material) && typeof material.id === "string" && material.id.length > 0,
      );
  }

  /**
   * Normalizes one runtime navigation path into deterministic engine-safe shape.
   * @param path Caller-provided path payload.
   */
  function normalizeRuntimeNavigationPath(path: EngineRuntimeNavigationPath): EngineRuntimeNavigationPath {
    const constraints = normalizeRuntimeNavigationPathConstraints(path.constraints);
    return {
      id: typeof path.id === "string" && path.id.length > 0 ? path.id : "path",
      loop: path.loop !== false,
      nodes: (Array.isArray(path.nodes) ? path.nodes : [])
        .map((node) => ({
          x: Number.isFinite(node.x) ? node.x : 0,
          z: Number.isFinite(node.z) ? node.z : 0,
        })),
      ...(constraints ? { constraints } : {}),
    };
  }

  /**
   * Normalizes optional path constraints while preserving absent defaults.
   * @param constraints Caller-provided constraints payload.
   */
  function normalizeRuntimeNavigationPathConstraints(
    constraints: EngineRuntimeNavigationPathConstraints | undefined,
  ): EngineRuntimeNavigationPathConstraints | undefined {
    if (!constraints) {
      return undefined;
    }
    const normalized: EngineRuntimeNavigationPathConstraints = {};
    if (Number.isFinite(constraints.arrivalTolerance) && constraints.arrivalTolerance !== undefined) {
      normalized.arrivalTolerance = Math.max(0, constraints.arrivalTolerance);
    }
    if (Number.isFinite(constraints.maxStepDistance) && constraints.maxStepDistance !== undefined) {
      normalized.maxStepDistance = Math.max(0, constraints.maxStepDistance);
    }
    return Object.keys(normalized).length > 0 ? normalized : undefined;
  }

  /**
   * Steps one agent along one path.
   * @param agent Current agent state.
   * @param path Waypoint path.
   * @param deltaSeconds Step delta time.
   * @param options Optional path-following constraints.
   */
  function stepRuntimeAgentAlongPath(
    agent: EngineRuntimeWorldAgentState,
    path: readonly { x: number; z: number }[],
    deltaSeconds: number,
    options: EngineRuntimeNavigationPathConstraints & { loop?: boolean } = {},
  ): EngineRuntimeWorldAgentState {
    if (path.length < 2 || deltaSeconds <= 0 || agent.speed <= 0) {
      return agent;
    }
    const currentIndex = Math.min(Math.max(0, Math.floor(agent.pathIndex)), path.length - 1);
    if (options.loop === false && currentIndex >= path.length - 1) {
      return { ...agent, pathIndex: currentIndex };
    }
    const nextIndex = currentIndex + 1 < path.length ? currentIndex + 1 : 0;
    const target = path[nextIndex];
    const dx = target.x - agent.x;
    const dz = target.z - agent.z;
    const dist = Math.hypot(dx, dz);
    const arrivalTolerance = Number.isFinite(options.arrivalTolerance)
      ? Math.max(0, options.arrivalTolerance ?? 0)
      : agent.kind === "pedestrian" ? 1.1 : 2.2;
    if (dist <= arrivalTolerance) {
      return { ...agent, pathIndex: nextIndex };
    }
    const nx = dx / Math.max(0.0001, dist);
    const nz = dz / Math.max(0.0001, dist);
    const rawStepDistance = agent.speed * deltaSeconds;
    const constrainedStepDistance = Number.isFinite(options.maxStepDistance)
      ? Math.min(rawStepDistance, Math.max(0, options.maxStepDistance ?? rawStepDistance))
      : rawStepDistance;
    const stepDistance = Math.min(dist, constrainedStepDistance);
    const proposedPosition = {
      x: agent.x + nx * stepDistance,
      y: 0,
      z: agent.z + nz * stepDistance,
    };
    const constrained = resolveEngineConstraintSet({
      id: "runtime-navigation-path",
      rules: [{
        constraint: {
          id: "active-path-segment",
          kind: "segment",
          start: { x: path[currentIndex].x, y: 0, z: path[currentIndex].z },
          end: { x: target.x, y: 0, z: target.z },
        },
      }],
    }, { position: proposedPosition });
    return {
      ...agent,
      pathIndex: currentIndex,
      x: constrained.pose.position.x,
      z: constrained.pose.position.z,
      yaw: (Math.atan2(nx, nz) * 180) / Math.PI,
    };
  }

  /**
   * Steps current runtime world agents by deterministic waypoint path follow.
   * @param input Step payload with delta time and path nodes.
   */
  function stepRuntimeWorldAgents(
    input: EngineRuntimeWorldStepInput,
  ): readonly EngineRuntimeWorldAgentState[] {
    const deltaSeconds = Number.isFinite(input.deltaSeconds) ? Math.max(0, input.deltaSeconds) : 0;
    runtimeWorldAgents = runtimeWorldAgents.map((agent) => {
      const path = agent.kind === "pedestrian" ? input.pedestrianPath : input.carPath;
      return stepRuntimeAgentAlongPath(agent, path, deltaSeconds);
    });
    return runtimeWorldAgents;
  }

  /**
   * Advances agents using registered path ids and optional per-step bindings.
   * @param input Registered path step input.
   */
  function stepRuntimeNavigationPathAgents(
    input: EngineRuntimeNavigationStepPathAgentsInput,
  ): readonly EngineRuntimeWorldAgentState[] {
    const deltaSeconds = Number.isFinite(input.deltaSeconds) ? Math.max(0, input.deltaSeconds) : 0;
    const bindingMap = new Map<string, string>();
    for (const binding of input.pathBindings ?? []) {
      if (binding.agentId.length > 0 && binding.pathId.length > 0) {
        bindingMap.set(binding.agentId, binding.pathId);
      }
    }
    const pathMap = new Map(runtimeNavigationPaths.map((path) => [path.id, path]));
    runtimeWorldAgents = runtimeWorldAgents.map((agent) => {
      const pathId = bindingMap.get(agent.id) ?? agent.pathId;
      if (!pathId) {
        return agent;
      }
      const path = pathMap.get(pathId);
      if (!path) {
        return agent;
      }
      const stepped = stepRuntimeAgentAlongPath(agent, path.nodes, deltaSeconds, {
        ...path.constraints,
        loop: path.loop,
      });
      return { ...stepped, pathId };
    });
    return runtimeWorldAgents;
  }

  /**
   * Resolves one circle-vs-aabb collision against runtime open-world obstacles.
   * @param input Collision resolve input payload.
   */
  function resolveRuntimeWorldCollision(
    input: EngineRuntimeWorldResolveCollisionInput,
  ): EngineRuntimeWorldResolveCollisionOutput {
    let x = Number.isFinite(input.x) ? input.x : 0;
    let z = Number.isFinite(input.z) ? input.z : 0;
    let velocityX = Number.isFinite(input.velocityX) ? (input.velocityX as number) : 0;
    let velocityZ = Number.isFinite(input.velocityZ) ? (input.velocityZ as number) : 0;
    const radius = Number.isFinite(input.radius) ? Math.max(0, input.radius) : 0;
    let collided = false;
    for (const obstacle of runtimeOpenWorldMap.obstacles) {
      const minX = obstacle.x - obstacle.width * 0.5;
      const maxX = obstacle.x + obstacle.width * 0.5;
      const minZ = obstacle.z - obstacle.depth * 0.5;
      const maxZ = obstacle.z + obstacle.depth * 0.5;
      if (x + radius < minX || x - radius > maxX || z + radius < minZ || z - radius > maxZ) {
        continue;
      }
      const dxMin = Math.abs((x + radius) - minX);
      const dxMax = Math.abs(maxX - (x - radius));
      const dzMin = Math.abs((z + radius) - minZ);
      const dzMax = Math.abs(maxZ - (z - radius));
      const minPenetration = Math.min(dxMin, dxMax, dzMin, dzMax);
      if (minPenetration === dxMin) x = minX - radius;
      else if (minPenetration === dxMax) x = maxX + radius;
      else if (minPenetration === dzMin) z = minZ - radius;
      else z = maxZ + radius;
      velocityX *= 0.35;
      velocityZ *= 0.35;
      collided = true;
    }
    return { x, z, velocityX, velocityZ, collided };
  }

  /**
   * Registers or replaces one runtime collider.
   * @param collider Caller-provided collider payload.
   */
  function registerRuntimeCollider(collider: EngineRuntimeWorldObstacle): EngineRuntimeWorldObstacle {
    const normalized = normalizeRuntimeWorldObstacle(collider);
    if (normalized.id.length === 0) {
      return normalized;
    }
    const nextObstacles = runtimeOpenWorldMap.obstacles.filter((item) => item.id !== normalized.id);
    runtimeOpenWorldMap = {
      ...runtimeOpenWorldMap,
      obstacles: [...nextObstacles, normalized].slice(0, MAX_RUNTIME_OPEN_WORLD_OBSTACLE_COUNT),
    };
    return normalized;
  }

  /**
   * Unregisters one runtime collider by id.
   * @param colliderId Collider id.
   */
  function unregisterRuntimeCollider(colliderId: string): EngineRuntimeCollisionUnregisterOutput {
    const beforeCount = runtimeOpenWorldMap.obstacles.length;
    runtimeOpenWorldMap = {
      ...runtimeOpenWorldMap,
      obstacles: runtimeOpenWorldMap.obstacles.filter((item) => item.id !== colliderId),
    };
    return {
      removed: runtimeOpenWorldMap.obstacles.length !== beforeCount,
      colliderCount: runtimeOpenWorldMap.obstacles.length,
    };
  }

  /**
   * Queries runtime broadphase AABB candidates against active colliders.
   * @param input Query AABB input.
   */
  function queryRuntimeCollisionAabb(
    input: EngineRuntimeCollisionQueryAabbInput,
  ): EngineRuntimeCollisionQueryAabbOutput {
    const query = normalizeRuntimeWorldObstacle({
      id: "query",
      x: input.x,
      z: input.z,
      width: input.width,
      depth: input.depth,
    });
    const queryMinX = query.x - query.width * 0.5;
    const queryMaxX = query.x + query.width * 0.5;
    const queryMinZ = query.z - query.depth * 0.5;
    const queryMaxZ = query.z + query.depth * 0.5;
    const colliders = runtimeOpenWorldMap.obstacles.filter((obstacle) => {
      const minX = obstacle.x - obstacle.width * 0.5;
      const maxX = obstacle.x + obstacle.width * 0.5;
      const minZ = obstacle.z - obstacle.depth * 0.5;
      const maxZ = obstacle.z + obstacle.depth * 0.5;
      return queryMinX <= maxX && queryMaxX >= minX && queryMinZ <= maxZ && queryMaxZ >= minZ;
    });
    return {
      colliderIds: colliders.map((collider) => collider.id),
      colliders,
    };
  }

  /**
   * Evaluates collision trigger enter/stay/exit events for one subject.
   * @param input Trigger evaluation input.
   */
  function evaluateRuntimeCollisionTriggers(
    input: EngineRuntimeCollisionEvaluateTriggersInput,
  ): EngineRuntimeCollisionEvaluateTriggersOutput {
    const subjectId = typeof input.subjectId === "string" && input.subjectId.length > 0
      ? input.subjectId
      : "subject";
    const radius = Number.isFinite(input.radius) ? Math.max(0, input.radius) : 0;
    const candidates = queryRuntimeCollisionAabb({
      x: input.x,
      z: input.z,
      width: radius * 2,
      depth: radius * 2,
    }).colliders;
    const previousPairs = new Set(runtimeCollisionTriggerPairs);
    const nextPairs = new Set<string>();
    const events: EngineRuntimeCollisionTriggerEvent[] = [];

    for (const collider of candidates) {
      const minX = collider.x - collider.width * 0.5;
      const maxX = collider.x + collider.width * 0.5;
      const minZ = collider.z - collider.depth * 0.5;
      const maxZ = collider.z + collider.depth * 0.5;
      const overlaps =
        input.x + radius >= minX &&
        input.x - radius <= maxX &&
        input.z + radius >= minZ &&
        input.z - radius <= maxZ;
      if (!overlaps) {
        continue;
      }
      const pair = `${subjectId}:${collider.id}`;
      nextPairs.add(pair);
      events.push({
        type: previousPairs.has(pair) ? "stay" : "enter",
        subjectId,
        colliderId: collider.id,
      });
    }

    for (const pair of previousPairs) {
      const [pairSubjectId, colliderId] = pair.split(":");
      if (pairSubjectId === subjectId && !nextPairs.has(pair)) {
        events.push({
          type: "exit",
          subjectId,
          colliderId: colliderId ?? "",
        });
      } else if (pairSubjectId !== subjectId) {
        nextPairs.add(pair);
      }
    }

    runtimeCollisionTriggerPairs = [...nextPairs].sort();
    const output = {
      events,
      activePairs: runtimeCollisionTriggerPairs,
    };
    if (events.length > 0) {
      emitEvent("engine.collision.trigger", output);
    }
    return output;
  }

  /**
   * Sweeps one moving circle against active runtime colliders.
   * @param input Swept circle input payload.
   */
  function sweepRuntimeCollisionCircle(
    input: EngineRuntimeCollisionSweepCircleInput,
  ): EngineRuntimeCollisionSweepCircleOutput {
    const startX = Number.isFinite(input.startX) ? input.startX : 0;
    const startZ = Number.isFinite(input.startZ) ? input.startZ : 0;
    const endX = Number.isFinite(input.endX) ? input.endX : startX;
    const endZ = Number.isFinite(input.endZ) ? input.endZ : startZ;
    const radius = Number.isFinite(input.radius) ? Math.max(0, input.radius) : 0;
    const deltaX = endX - startX;
    const deltaZ = endZ - startZ;
    let earliestImpact = 1;
    let hitColliderId: string | null = null;
    let hitNormalX = 0;
    let hitNormalZ = 0;

    for (const collider of runtimeOpenWorldMap.obstacles) {
      const expandedMinX = collider.x - collider.width * 0.5 - radius;
      const expandedMaxX = collider.x + collider.width * 0.5 + radius;
      const expandedMinZ = collider.z - collider.depth * 0.5 - radius;
      const expandedMaxZ = collider.z + collider.depth * 0.5 + radius;
      const startsInside =
        startX >= expandedMinX &&
        startX <= expandedMaxX &&
        startZ >= expandedMinZ &&
        startZ <= expandedMaxZ;
      let entryTime = 0;
      let exitTime = 1;
      let normalX = 0;
      let normalZ = 0;

      if (startsInside) {
        const leftPenetration = Math.abs(startX - expandedMinX);
        const rightPenetration = Math.abs(expandedMaxX - startX);
        const bottomPenetration = Math.abs(startZ - expandedMinZ);
        const topPenetration = Math.abs(expandedMaxZ - startZ);
        const minimumPenetration = Math.min(
          leftPenetration,
          rightPenetration,
          bottomPenetration,
          topPenetration,
        );
        if (minimumPenetration === leftPenetration) normalX = -1;
        else if (minimumPenetration === rightPenetration) normalX = 1;
        else if (minimumPenetration === bottomPenetration) normalZ = -1;
        else normalZ = 1;
      } else {
        if (deltaX === 0) {
          if (startX < expandedMinX || startX > expandedMaxX) {
            continue;
          }
        } else {
          const inverseDeltaX = 1 / deltaX;
          let axisEntryTime = (expandedMinX - startX) * inverseDeltaX;
          let axisExitTime = (expandedMaxX - startX) * inverseDeltaX;
          let axisNormalX = -1;
          if (axisEntryTime > axisExitTime) {
            const swapTime = axisEntryTime;
            axisEntryTime = axisExitTime;
            axisExitTime = swapTime;
            axisNormalX = 1;
          }
          if (axisEntryTime > entryTime) {
            entryTime = axisEntryTime;
            normalX = axisNormalX;
            normalZ = 0;
          }
          exitTime = Math.min(exitTime, axisExitTime);
        }

        if (deltaZ === 0) {
          if (startZ < expandedMinZ || startZ > expandedMaxZ) {
            continue;
          }
        } else {
          const inverseDeltaZ = 1 / deltaZ;
          let axisEntryTime = (expandedMinZ - startZ) * inverseDeltaZ;
          let axisExitTime = (expandedMaxZ - startZ) * inverseDeltaZ;
          let axisNormalZ = -1;
          if (axisEntryTime > axisExitTime) {
            const swapTime = axisEntryTime;
            axisEntryTime = axisExitTime;
            axisExitTime = swapTime;
            axisNormalZ = 1;
          }
          if (axisEntryTime > entryTime) {
            entryTime = axisEntryTime;
            normalX = 0;
            normalZ = axisNormalZ;
          }
          exitTime = Math.min(exitTime, axisExitTime);
        }
      }

      if (entryTime > exitTime || entryTime < 0 || entryTime > 1) {
        continue;
      }
      if (entryTime < earliestImpact) {
        earliestImpact = entryTime;
        hitColliderId = collider.id;
        hitNormalX = normalX;
        hitNormalZ = normalZ;
      }
    }

    if (hitColliderId === null) {
      return {
        x: endX,
        z: endZ,
        collided: false,
        colliderId: null,
        timeOfImpact: 1,
        impactX: endX,
        impactZ: endZ,
        normalX: 0,
        normalZ: 0,
      };
    }

    const safeImpact = Math.max(0, earliestImpact - RUNTIME_COLLISION_SWEEP_SAFE_BACKOFF);
    return {
      x: startX + deltaX * safeImpact,
      z: startZ + deltaZ * safeImpact,
      collided: true,
      colliderId: hitColliderId,
      timeOfImpact: earliestImpact,
      impactX: startX + deltaX * earliestImpact,
      impactZ: startZ + deltaZ * earliestImpact,
      normalX: hitNormalX,
      normalZ: hitNormalZ,
    };
  }

  /**
   * Resolves one optional shared camera packet from graph nodes.
   * In strict3d mode, callers can provide a helper node with `camera3d` payload.
   */
  function resolveNativeCamera3dPayload(nodes: readonly EngineGraphNodeInput[]): EngineNativeCamera3dPayload | undefined {
    const cameraNode = nodes.find((node) => node && typeof (node as { camera3d?: unknown }).camera3d === "object");
    if (!cameraNode) {
      return undefined;
    }
    const raw = (cameraNode as { camera3d?: Record<string, unknown> }).camera3d;
    if (!raw) {
      return undefined;
    }
    const asFinite = (value: unknown, fallback: number): number =>
      typeof value === "number" && Number.isFinite(value) ? value : fallback;
    const projectionMode = raw.projectionMode === "orthographic" ? "orthographic" : "perspective";
    return {
      yaw: asFinite(raw.yaw, 0),
      pitch: asFinite(raw.pitch, -35),
      distance: Math.max(1, asFinite(raw.distance, 720)),
      targetX: asFinite(raw.targetX, 0),
      targetY: asFinite(raw.targetY, 0),
      targetZ: asFinite(raw.targetZ, 0),
      perspectiveFovY: Math.max(10, Math.min(120, asFinite(raw.perspectiveFovY, CAMERA_FOV_Y_DEFAULT_DEGREES))),
      near: Math.max(0.001, asFinite(raw.near, CAMERA_NEAR_DEFAULT)),
      far: Math.max(CAMERA_NEAR_DEFAULT + 1, asFinite(raw.far, CAMERA_FAR_DEFAULT)),
      projectionMode,
    };
  }

  /**
   * Resolves one lightweight native frame payload from latest visible graph nodes.
   * @param _timestampMs Current frame timestamp in milliseconds.
   */
  function resolveNativeFramePayload(_timestampMs: number) {
    const viewport = viewportFacade.getViewport();
    // AI-TEMP: visibleCandidateIds come from ECS world entity IDs which may
    // drift from graph node IDs during document updates; always validate at
    // least one candidate resolves to a graph node before trusting the list.
    // Remove when entity→graph ID mapping is guaranteed stable; ref DEX-112.
    const rawCandidateIds = strict3dEnabled
      ? [...graphNodeState.keys()]
      : latestExecutionSnapshot.visibleCandidateIds.length > 0
        ? latestExecutionSnapshot.visibleCandidateIds
        : [...graphNodeState.keys()];
    const candidateIds = strict3dEnabled
      ? rawCandidateIds
      : rawCandidateIds.some((id) => graphNodeState.has(id))
        ? rawCandidateIds
        : [...graphNodeState.keys()];
    const candidateNodes = candidateIds
      .map((nodeId) => graphNodeState.get(nodeId))
      .filter((node): node is EngineGraphNodeInput => Boolean(node));
    const camera3d = resolveNativeCamera3dPayload(candidateNodes);
    const renderableNodes = candidateNodes.filter((node) => typeof (node as { camera3d?: unknown }).camera3d === "undefined");
    const rects = strict3dEnabled
      ? []
      : renderableNodes
        .map((node) => {
          const x = typeof node.x === "number" && Number.isFinite(node.x) ? node.x : 0;
          const y = typeof node.y === "number" && Number.isFinite(node.y) ? node.y : 0;
          const widthRaw = typeof node.width === "number" && Number.isFinite(node.width) ? node.width : 0;
          const heightRaw = typeof node.height === "number" && Number.isFinite(node.height) ? node.height : 0;
          const fill = typeof node.fill === "string"
            ? node.fill
            : typeof node.stroke === "string"
              ? node.stroke
              : "#334155";
          return {
            x,
            y,
            width: Math.abs(widthRaw),
            height: Math.abs(heightRaw),
            fill,
          };
        })
        .filter((rect) => rect.width > 0 && rect.height > 0);
    const meshes: Array<{
      id: string;
      topology: "triangles" | "lines" | "points";
      positions: readonly number[];
      indices?: readonly number[];
      uvs?: readonly number[];
      color: string;
      materialId?: string;
    }> = [];
    let needsComposition = false;
    renderableNodes.forEach((node) => {
      // Prefer explicit mesh contracts so runtime adapters can submit authored geometry directly.
      const meshInput =
        node.mesh && typeof node.mesh === "object" && Array.isArray((node.mesh as { positions?: unknown }).positions)
          ? (node.mesh as {
            topology?: "triangles" | "lines" | "points";
            positions: readonly number[];
            indices?: readonly number[];
            uvs?: readonly number[];
            color?: string;
            materialId?: string;
          })
          : null;
      if (meshInput) {
        const topology = meshInput.topology ?? "triangles";
        const minimumPositionCount = topology === "triangles"
          ? TOPOLOGY_TRIANGLE_MIN_POSITION_COUNT
          : topology === "lines"
            ? TOPOLOGY_LINE_MIN_POSITION_COUNT
            : TOPOLOGY_POINT_MIN_POSITION_COUNT;
        if (meshInput.positions.length < minimumPositionCount) {
          return;
        }
        const minimumIndexCount = topology === "triangles"
          ? TOPOLOGY_TRIANGLE_MIN_INDEX_COUNT
          : topology === "lines"
            ? TOPOLOGY_LINE_MIN_INDEX_COUNT
            : TOPOLOGY_POINT_MIN_INDEX_COUNT;
        const normalizedIndices =
          Array.isArray(meshInput.indices) && meshInput.indices.length >= minimumIndexCount
            ? meshInput.indices
                .filter((value): value is number => typeof value === "number" && Number.isFinite(value))
                .map((value) => Math.max(0, Math.floor(value)))
            : [];
        const color = typeof meshInput.color === "string"
          ? meshInput.color
          : typeof node.fill === "string"
            ? node.fill
            : typeof node.stroke === "string"
              ? node.stroke
              : "#334155";
        const fallbackIndices = topology === "triangles" ? TRIANGLE_FALLBACK_INDICES : [];
        const vertexCount = Math.floor(meshInput.positions.length / 3);
        const normalizedUvs =
          Array.isArray(meshInput.uvs) && meshInput.uvs.length >= vertexCount * 2
            ? meshInput.uvs
                .slice(0, vertexCount * 2)
                .filter((value): value is number => typeof value === "number" && Number.isFinite(value))
            : [];
        const materialId = typeof meshInput.materialId === "string" && meshInput.materialId.length > 0
          ? meshInput.materialId
          : typeof node.materialId === "string" && node.materialId.length > 0
            ? node.materialId
            : typeof node.semantic3d?.materialId === "string" && node.semantic3d.materialId.length > 0
              ? node.semantic3d.materialId
              : undefined;
        meshes.push({
          id: String(node.id),
          topology,
          positions: [...meshInput.positions],
          indices: normalizedIndices.length >= minimumIndexCount ? normalizedIndices : fallbackIndices,
          ...(normalizedUvs.length >= vertexCount * 2 ? { uvs: normalizedUvs } : {}),
          color,
          ...(materialId ? { materialId } : {}),
        });
        return;
      }

      // Track whether any node needs composition so backends can decide
      // between model-complete and mesh-only render paths.
      if (!isMeshEligible(node)) {
        if (!strict3dEnabled) {
          needsComposition = true;
        }
        return;
      }

      // Keep rect-derived triangles as compatibility fallback while graph migration is in progress.
      const width = typeof node.width === "number" && Number.isFinite(node.width) ? Math.abs(node.width) : 0;
      const height = typeof node.height === "number" && Number.isFinite(node.height) ? Math.abs(node.height) : 0;
      if (width <= 0 || height <= 0) {
        return;
      }
      const x = typeof node.x === "number" && Number.isFinite(node.x) ? node.x : 0;
      const y = typeof node.y === "number" && Number.isFinite(node.y) ? node.y : 0;
      const z = typeof node.z === "number" && Number.isFinite(node.z) ? node.z : 0;
      const color = typeof node.fill === "string"
        ? node.fill
        : typeof node.stroke === "string"
          ? node.stroke
          : "#334155";

      // Emit one deterministic quad as two triangles for baseline mesh submission.
      meshes.push({
        id: String(node.id),
        topology: "triangles",
        positions: [
          x, y, z,
          x + width, y, z,
          x, y + height, z,
          x + width, y + height, z,
        ],
        indices: QUAD_FALLBACK_INDICES,
        uvs: [0, 0, 1, 0, 0, 1, 1, 1],
        color,
        ...(typeof node.materialId === "string" && node.materialId.length > 0 ? { materialId: node.materialId } : {}),
      });
    });

    return {
      translateX: viewport.offsetX,
      translateY: viewport.offsetY,
      scale: viewport.scale,
      rects,
      nodes: renderableNodes
        .map((node) => ({
          ...node,
          id: String(node.id),
          type: typeof node.type === "string" ? node.type : "shape",
      })),
      meshes,
      materials: graphMaterials,
      lights: runtimeLightingCollection.lights,
      camera3d,
      needsComposition,
      images: imageRegistry.size > 0 ? imageRegistry : undefined,
      overlays: overlayInstructions.length > 0 ? overlayInstructions : undefined,
      lineTopologySubmissionEnabled: strict3dEnabled,
    };
  }

  // Image registry populated by the host app for model-complete image node rendering.
  const imageRegistry = new Map<string, HTMLImageElement>();

  // Overlay instructions populated by the host app for marquee/hover/selection rendering.
  let overlayInstructions: ReadonlyArray<{
    id: string;
    primitive: string;
    points?: ReadonlyArray<{ x: number; y: number }>;
    bounds?: { minX: number; minY: number; maxX: number; maxY: number };
    strokeColor?: string;
    strokeWidth?: number;
    strokeDash?: number[];
    fillColor?: string;
    fillOpacity?: number;
    zIndex?: number;
  }> = [];

  const { backend, backendSelection } = resolveEngineBackend(options, backendSelectorModule, {
    canvas2d: {
      onPresentAttempt: () => {
        latestBackendPresentTelemetry.attempted = true;
      },
      onPresentSkipped: (reason) => {
        latestBackendPresentTelemetry.attempted = true;
        latestBackendPresentTelemetry.committed = false;
        latestBackendPresentTelemetry.skippedReason = reason;
      },
      onPresentCommitted: () => {
        latestBackendPresentTelemetry.attempted = true;
        latestBackendPresentTelemetry.committed = true;
        latestBackendPresentTelemetry.skippedReason = null;
      },
    },
    noop: {
      onPresentAttempt: () => {
        latestBackendPresentTelemetry.attempted = true;
      },
      onPresentCommitted: () => {
        latestBackendPresentTelemetry.attempted = true;
        latestBackendPresentTelemetry.committed = true;
        latestBackendPresentTelemetry.skippedReason = null;
      },
      onBackendDiagnostics: (diagnostics) => {
        latestBackendDiagnostics = diagnostics;
      },
      resolveNativeFramePayload,
    },
  });
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
    setGraphMaterials: (materials) => {
      graphMaterials = normalizeGraphMaterials(materials);
    },
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
    getSurface: () => options.surface,
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
      renderChain: latestRenderChainDiagnostics,
      lastRenderWarning: latestRenderWarning,
      // Keep backend diagnostics pressure semantics aligned with frame-budget
      // broker output so runtime consumers read one canonical pressure source.
      backendDiagnostics: {
        ...latestBackendDiagnostics,
        webglPreviewExecutionMode:
          latestBackendDiagnostics.cacheFallbackReason === ENGINE_BACKEND_CACHE_FALLBACK_REASON.NONE
            ? "affine-snapshot"
            : "temporal-reprojection-required",
        webglPreviewExecutionSource: "engine-cache-fallback-taxonomy",
        webglBudgetPressure:
          latestFrameStats.pressure === "high" || latestFrameStats.pressure === "medium"
            ? latestFrameStats.pressure
            : "low",
        webglBudgetPressureReason: latestFrameStats.pressureReason,
        webglBudgetPressureSource: "engine-frame-budget",
      },
      capabilities: {
        schemaVersion: ENGINE_RUNTIME_CAPABILITY_SCHEMA_VERSION,
        runtime: Object.values(ENGINE_RUNTIME_CAPABILITY_MAP),
      },
    }),
  });
  const {
    resolveRuntimeDocumentRevision, resolveRuntimeDocumentSchemaVersion, applyRuntimeDocumentChangeSet,
    preflightRuntimeDocumentChangeSetApply,
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
    allocateRuntimeCommandEncoderId: (profile) => {
      runtimeCommandEncoderCounter += 1;
      return `encoder-${profile}-${runtimeCommandEncoderCounter}`;
    },
    replayCommands: (commands) => commandReplayModule.replay(commands),
    getBackendProbeModes: () => backendSelectorModule.getDefaultProbes().map((probe) => probe.mode),
    reportRuntimeContractWarning: (warning) => {
      reportRuntimeContractWarning(warning);
    },
  });
  const {
    createRuntimeFramePlan,
    createRuntimeVisibilityPlan,
    createRuntimeLodPlan,
    createRuntimeRoiPlan,
    createRuntimeBudgetPlan,
    inspectRuntimePlan,
  } = createRuntimePlanFoundation({
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
  const {
    requestRuntimePlanFrame,
    cancelRuntimePlanFrame,
    setRuntimePlanInteractiveInterval,
    resolveRuntimePlanSchedulerDiagnostics,
    disposeRuntimePlanScheduler,
  } = createRuntimeSchedulerFoundation({
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
    createRuntimeAuthoringGraphSnapshot,
    compareRuntimeAuthoringGraphSnapshots,
    createRuntimeAuthoringPreviewToken,
    resolveRuntimeAuthoringDiagnostics,
  } = createRuntimeAuthoringFoundation({
    runtimeAuthoringSnapshots,
    getLastRuntimeAuthoringComparison,
    setLastRuntimeAuthoringComparison,
    getRuntimeAuthoringPreviewTokenCounter,
    setRuntimeAuthoringPreviewTokenCounter,
    emitEvent: (type, payload) => {
      emitEvent(type, payload);
    },
  });
  const {
    registerRuntimeModelAsset,
    unregisterRuntimeModelAsset,
    setRuntimeModelInstances,
    getRuntimeModelInstances,
    resolveRuntimeModelDiagnostics,
  } = createRuntimeModelFoundation({
    runtimeModelAssets,
    runtimeModelInstances,
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

  reportRuntimeContractWarning = (warning) => {
    emitEvent("engine.diagnostics.warning", {
      ...warning,
      domain: "runtime.document",
      revision: documentSnapshot.revision,
      timestampMs: resolveNow(),
    });
  };

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
        resolveViewportSnapshot: () =>
          resolveViewSnapshotFromViewportState(viewportFacade.getViewport()),
        applyViewPatch,
        getViewportState: () => viewportFacade.getViewport(),
        getQuality: () => qualityProfile,
        setQuality: (profile) => {
          qualityProfile = profile;
        },
        getFrameBudget: () => frameBudgetMs,
        setFrameBudget: (budget) => {
          frameBudgetMs = Number.isFinite(budget)
            ? Math.max(1, budget)
            : frameBudgetMs;
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
        getGraphMaterials: () => graphMaterials,
        getGraphNodeCount: () => graphNodeState.size,
      queryGraph, pickGraph, raycastGraph, resolveFrameOrchestration, resolveNow,
      getLastInteractionKind: () => lastInteractionKind,
      getLatestExecutionSnapshot: () => latestExecutionSnapshot,
      getIsMounted: () => mountTarget !== null,
      presentBackendFrame: async (timestampMs) => {
        latestBackendPresentTelemetry = {
          attempted: false,
          committed: false,
          skippedReason: null,
        };
        await backend.renderFrame(timestampMs);
        if (!latestBackendPresentTelemetry.attempted) {
          latestBackendPresentTelemetry = {
            attempted: true,
            committed: true,
            skippedReason: null,
          };
        }
        return {
          attempted: latestBackendPresentTelemetry.attempted,
          completed: latestBackendPresentTelemetry.committed,
          skippedReason: latestBackendPresentTelemetry.skippedReason,
        };
      },
      getResolvedBackendMode: () => {
        const resolved = runtimeShell.getBackendInfo().resolved;
        return resolved === "auto" ? "canvas2d" : resolved;
      },
      setLatestRenderChainDiagnostics: (diagnostics) => {
        latestRenderChainDiagnostics = diagnostics;
      },
      setLatestRenderWarning: (warning) => {
        latestRenderWarning = warning;
      },
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
    ...createEngineRuntimeCapabilityDisposeFacade({
      runtimeFacade, registerEventListener, unregisterEventListener, emitEvent,
      lastEncodedCommandCount, lastReplayEventCount, latestExecutionSnapshot,
      setDiagnosticsEnabled: (enabled: boolean) => {
        diagnosticsEnabled = enabled;
      },
      createRuntimeReplayToken, replayRuntimeToken, resolvePublicDiagnostics,
      getDiagnosticsEnabled: () => diagnosticsEnabled, getOverlayCount: () => overlayNodes.length,
      captureFrame: () => runtimeShell.captureFrame(), getRuntimeStats: () => runtimeShell.getStats(),
      runtimeProfileId: runtimeProfile.id, runtimeCapabilityCount: profileRuntime.capabilityIds.length,
      lastFramePressureReason: latestFrameStats.pressureReason,
      lastFramePressure: latestFrameStats.pressure,
      lastFramePhase: latestFrameStats.phase,
      lastQosDegradationLevel:
        latestFrameStats.pressure === "high"
          ? "heavy"
          : latestFrameStats.pressure === "medium"
            ? "light"
            : "none",
      lastQosFallbackReason:
        latestBackendDiagnostics.cacheFallbackReason === ENGINE_BACKEND_CACHE_FALLBACK_REASON.NONE
          ? null
          : latestBackendDiagnostics.cacheFallbackReason,
      lastQosGuardTriggers: [
        latestFrameStats.phase === "camera" ? "camera-animation-priority" : null,
        latestFrameStats.pressure === "high"
          ? "frame-budget-pressure-high"
          : latestFrameStats.pressure === "medium"
            ? "frame-budget-pressure-medium"
            : null,
        latestBackendDiagnostics.cacheFallbackReason !== ENGINE_BACKEND_CACHE_FALLBACK_REASON.NONE
          ? `cache-fallback:${latestBackendDiagnostics.cacheFallbackReason}`
          : null,
      ].filter((trigger): trigger is string => trigger !== null),
      lastQosTrace: `qos:${latestFrameStats.timestampMs}:${latestFrameStats.phase}:${latestFrameStats.pressure}`,
      lastFramePressureSignals: latestFrameStats.pressureSignals,
      lastDocumentRevision: documentSnapshot.revision,
      lastCompileChangeSetId: latestCompileOutput.changeSetId,
      lastCompileChangedNodeCount: latestCompileOutput.changedNodeIds.length,
      lastExecutionDrawCount: latestExecutionSnapshot.drawCount,
      lastRuntimeWorldRevision: latestRuntimeWorldRevision,
      lastDirtyDomainCount: latestDirtyState.dirtyDomains.length,
      lastReplayFirstCommandId,
      lastBoundaryViolationCount: boundaryValidation.violations.length,
      lastPublicApiViolationCount: publicApiSurfaceViolations.length,
      getBackendInfo: () => runtimeShell.getBackendInfo(),
      resolveRuntimeDocumentSnapshot,
      resolveRuntimeDocumentRevision,
      applyRuntimeDocumentChangeSet,
      preflightRuntimeDocumentChangeSetApply,
      compileRuntimeWorld,
      resolveRuntimeWorldSnapshotOutput,
      resolveRuntimeWorldGraphStatsOutput,
      resolveRuntimeDirtyStateOutput,
      markRuntimeDirtyDomain,
      flushRuntimeDirtyDomains, scheduleRuntimeIncrementalCompile, forceRuntimeFullCompile, createRuntimeFramePlan,
      inspectRuntimePlan, encodeRuntimeCommandPlan, validateRuntimeCommandBuffer, submitRuntimeCommandBuffer,
      submitRuntimeCommandBufferBatch, createRuntimeGpuResource, updateRuntimeGpuResource, destroyRuntimeGpuResource,
      createRuntimeUploadBatch, createRuntimeBarrierPlan, applyRuntimeBarrierPlan, readbackRuntimeResource,
      queryRuntimeViewportCandidates, queryRuntimeFrustumVisibleSet, pickGraph, raycastGraph, queryRuntimeSpatialIndex,
      switchRuntimeBackend, resolveRuntimeBackendFallbackHistory, setRuntimeBackendDebugOptions, captureRuntimeFrame,
      captureRuntimeCommandTrace, resolveRuntimePublicMetrics, getRuntimeTrace, createRuntimeDocumentSnapshot,
      validateRuntimeDocumentSnapshot,
      resolveRuntimeDocumentSchemaVersion,
      diffRuntimeDocumentSnapshots,
      rebaseRuntimeDocumentChangeSet,
      serializeRuntimeDocumentSnapshot,
      deserializeRuntimeDocumentSnapshot,
      compileRuntimeWorldFromDocument, queryRuntimeWorldEntity, queryRuntimeWorldComponent, queryRuntimeNodeTransform,
      formatRuntimeNodeSvgTransform,
      setRuntimeOpenWorldMap: (map: EngineRuntimeOpenWorldMap) => {
        runtimeOpenWorldMap = normalizeRuntimeOpenWorldMap(map);
        return runtimeOpenWorldMap;
      },
      getRuntimeOpenWorldMap: () => runtimeOpenWorldMap,
      setRuntimeCollisionObstacles: (obstacles: readonly EngineRuntimeWorldObstacle[]) => {
        runtimeOpenWorldMap = normalizeRuntimeOpenWorldMap({
          ...runtimeOpenWorldMap,
          obstacles,
        });
        return runtimeOpenWorldMap.obstacles;
      },
      getRuntimeCollisionObstacles: () => runtimeOpenWorldMap.obstacles,
      registerRuntimeCollider,
      unregisterRuntimeCollider,
      queryRuntimeCollisionAabb,
      evaluateRuntimeCollisionTriggers,
      sweepRuntimeCollisionCircle,
      setRuntimeWorldAgents: (agents: readonly EngineRuntimeWorldAgentState[]) => {
        runtimeWorldAgents = normalizeRuntimeWorldAgents(agents);
        return runtimeWorldAgents;
      },
      getRuntimeWorldAgents: () => runtimeWorldAgents,
      registerRuntimeNavigationPath: (path: EngineRuntimeNavigationPath) => {
        const normalized = normalizeRuntimeNavigationPath(path);
        runtimeNavigationPaths = [
          ...runtimeNavigationPaths.filter((item) => item.id !== normalized.id),
          normalized,
        ];
        return normalized;
      },
      unregisterRuntimeNavigationPath: (pathId: string): EngineRuntimeNavigationUnregisterPathOutput => {
        const beforeCount = runtimeNavigationPaths.length;
        runtimeNavigationPaths = runtimeNavigationPaths.filter((path) => path.id !== pathId);
        return {
          removed: runtimeNavigationPaths.length !== beforeCount,
          pathCount: runtimeNavigationPaths.length,
        };
      },
      getRuntimeNavigationPaths: () => runtimeNavigationPaths,
      stepRuntimeWorldAgents,
      stepRuntimeNavigationPathAgents,
      resolveRuntimeWorldCollision,
      clearRuntimeWorldSnapshot,
      createRuntimeAuthoringGraphSnapshot,
      compareRuntimeAuthoringGraphSnapshots,
      createRuntimeAuthoringPreviewToken,
      resolveRuntimeAuthoringDiagnostics,
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
      createRuntimeVisibilityPlan, createRuntimeLodPlan, createRuntimeRoiPlan, createRuntimeBudgetPlan,
      createRuntimeHitGeometryPayload, resolveRuntimeHitTolerance, requestRuntimePlanFrame, cancelRuntimePlanFrame,
      setRuntimePlanInteractiveInterval,
      resolveRuntimePlanSchedulerDiagnostics,
      setRuntimeLightingCollection: (collection: EngineLightCollection) => {
        runtimeLightingCollection = normalizeRuntimeLightingCollection(collection);
        return runtimeLightingCollection;
      },
      getRuntimeLightingCollection: () => runtimeLightingCollection,
      clearRuntimeLightingCollection: () => {
        runtimeLightingCollection = { lights: [] };
        return runtimeLightingCollection;
      },
      applyRuntimeLightingProfile: (profile: EngineRuntimeLightingProfile) => {
        runtimeLightingCollection = normalizeRuntimeLightingCollection(
          resolveRuntimeLightingProfile(profile),
        );
        return runtimeLightingCollection;
      },
      resolveRuntimeLightingEnvironment,
      applyRuntimeLightingEnvironment: (input: EngineRuntimeLightingEnvironmentInput) => {
        const resolved = resolveRuntimeLightingEnvironment(input);
        runtimeLightingCollection = resolved.collection;
        return resolved;
      },
      registerRuntimeModelAsset,
      unregisterRuntimeModelAsset,
      setRuntimeModelInstances,
      getRuntimeModelInstances,
      resolveRuntimeModelDiagnostics,
      registerRuntimeResource,
      updateRuntimeResource,
      releaseRuntimeResource,
      pinRuntimeResource,
      unpinRuntimeResource,
      getRuntimeResourceResidency,
      collectRuntimeResources, startRuntimeTrace, stopRuntimeTrace, getRuntimeMetricsSnapshot,
      queryGraph, resolvePublicDiagnosticsForCapability: resolvePublicDiagnostics,
      disposeRuntimePlanScheduler, isMounted: () => mountTarget !== null,
    }),
    /**
     * Registers loaded images for model-complete image node rendering.
     * Host apps call this to provide image element references keyed by asset id.
     * @param images Map of asset id to loaded HTMLImageElement.
     */
    setImageRegistry(images: ReadonlyMap<string, HTMLImageElement>) {
      imageRegistry.clear();
      for (const [assetId, image] of images) {
        imageRegistry.set(assetId, image);
      }
    },
    /**
     * Registers overlay draw instructions for the current frame.
     * Host apps call this to provide marquee/hover/selection/handler overlays
     * in a backend-compatible format (primitive + geometry + style).
     * @param instructions Backend-compatible overlay draw instructions.
     */
    setOverlayInstructions(instructions: ReadonlyArray<{
      id: string;
      primitive: string;
      points?: ReadonlyArray<{ x: number; y: number }>;
      bounds?: { minX: number; minY: number; maxX: number; maxY: number };
      strokeColor?: string;
      strokeWidth?: number;
      strokeDash?: number[];
      fillColor?: string;
      fillOpacity?: number;
      zIndex?: number;
    }>) {
      overlayInstructions = instructions;
    },
  };
}
