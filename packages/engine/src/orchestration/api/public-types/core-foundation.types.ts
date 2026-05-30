import type { EngineBackendCacheFallbackReason } from "../../../backend/fallbackTaxonomy";
/**
 * Engine backend selection mode requested by API consumers.
 */
export type EngineBackendMode = "auto" | "webgpu" | "webgl" | "canvas2d" | "headless";

/**
 * Engine runtime lifecycle state.
 */
export type EngineLifecycleState = "created" | "running" | "paused" | "stopped" | "disposed";

/**
 * Frame callback signature used by runtime adapters in all hosts.
 */
export type EngineFrameCallback = (timestampMs: number) => void;

/**
 * Platform/runtime adapter contract for frame scheduling and timing.
 */
export interface EngineRuntimeAdapter {
  /**
   * Requests the next frame callback.
   */
  requestFrame: (callback: EngineFrameCallback) => number;
  /**
   * Cancels a previously requested frame callback.
   */
  cancelFrame: (handle: number) => void;
  /**
   * Returns a monotonic timestamp in milliseconds.
   */
  now: () => number;
}

/**
 * Minimal surface contract for canonical runtime and deterministic tests.
 */
export interface EngineSurface {
  /**
   * Surface width in CSS pixels.
   */
  width: number;
  /**
   * Surface height in CSS pixels.
   */
  height: number;
  /**
   * Optional host canvas-like target used by native canvas2d backend.
   */
  canvas?: {
    /**
     * Canvas width in device pixels.
     */
    width: number;
    /**
     * Canvas height in device pixels.
     */
    height: number;
    /**
     * Resolves a rendering context for the requested context id.
     */
    getContext: (
      contextId: "2d" | "webgl" | "webgl2",
    ) => CanvasRenderingContext2D | WebGLRenderingContext | WebGL2RenderingContext | null;
  };
}

/**
 * Engine creation options exposed by the public facade.
 */
export interface EngineCreateOptions {
  /**
   * Rendering surface owned by the host environment.
   */
  surface: EngineSurface;
  /**
   * Requested backend mode. Defaults to "auto".
   */
  backend?: EngineBackendMode;
  /**
   * Optional runtime adapter override for headless/testing hosts.
   */
  runtimeAdapter?: EngineRuntimeAdapter;
  /**
  * Optional debug flag for runtime diagnostics.
   */
  debug?: boolean;
  /**
   * Enables strict 3D mode.
   *
   * When enabled, engine skips all 2D shape packet fallbacks and renders
   * only explicit mesh primitives supplied by graph nodes.
   */
  strict3d?: boolean;
}

/**
 * Resolved backend selection after policy and capability checks.
 */
export interface BackendSelectionResult {
  /**
   * Backend requested by the caller.
   */
  requested: EngineBackendMode;
  /**
   * Backend actually selected for execution.
   */
  resolved: EngineBackendMode;
  /**
   * Human-readable fallback reason when requested differs from resolved.
   */
  fallbackReason: string | null;
  /**
   * Whether the selected path is considered native execution.
   */
  nativeEligible: boolean;
}

/**
 * Stable runtime stats snapshot returned by getStats().
 */
export interface EngineStatsSnapshot {
  /**
   * Current lifecycle state.
   */
  lifecycleState: EngineLifecycleState;
  /**
   * Last backend selection outcome.
   */
  backendSelection: BackendSelectionResult;
  /**
   * Last known surface width.
   */
  width: number;
  /**
   * Last known surface height.
   */
  height: number;
  /**
   * Last presented frame time in milliseconds.
   */
  lastFrameTimeMs: number;
  /**
   * Runtime profile id selected by profile-backed assembly.
   */
  runtimeProfileId?: string;
  /**
   * Number of active runtime capabilities exposed by the assembled profile.
   */
  runtimeCapabilityCount?: number;
  /**
   * Last pressure reason resolved by frame orchestration diagnostics.
   */
  lastFramePressureReason?: string;
  /**
   * Last pressure tier resolved by frame orchestration diagnostics.
   */
  lastFramePressure?: "low" | "medium" | "high";
  /**
   * Last strategy phase resolved by frame orchestration diagnostics.
   */
  lastFramePhase?: "static" | "pan" | "zoom" | "camera" | "settling";
  /**
   * Last QoS degradation level derived from frame pressure for diagnostics parity.
   */
  lastQosDegradationLevel?: "none" | "light" | "heavy";
  /**
   * Last QoS fallback reason derived from cache fallback taxonomy.
   */
  lastQosFallbackReason?: string | null;
  /**
   * Last QoS guard triggers derived from phase/pressure/fallback diagnostics.
   */
  lastQosGuardTriggers?: string[];
  /**
   * Last QoS trace id used for frame-level diagnostics correlation.
   */
  lastQosTrace?: string;
  /**
   * Last pressure-threshold signals resolved by frame orchestration diagnostics.
   */
  lastFramePressureSignals?: {
    /** True when scene nodes exceeded high threshold. */
    sceneNodeCountHigh: boolean;
    /** True when tile queue exceeded high threshold. */
    tileQueuePendingHigh: boolean;
    /** True when dirty regions exceeded high threshold. */
    dirtyRegionCountHigh: boolean;
    /** True when scene nodes exceeded medium threshold. */
    sceneNodeCountMedium: boolean;
    /** True when tile queue exceeded medium threshold. */
    tileQueuePendingMedium: boolean;
    /** True when dirty regions exceeded medium threshold. */
    dirtyRegionCountMedium: boolean;
  };
  /**
   * Last document revision consumed by staged document/compiler orchestration.
   */
  lastDocumentRevision?: number;
  /**
   * Last applied change-set id consumed by staged compiler.
   */
  lastCompileChangeSetId?: string;
  /**
   * Number of changed node ids emitted by last staged compiler output.
   */
  lastCompileChangedNodeCount?: number;
  /**
   * Number of draw candidates executed by staged software execution chain.
   */
  lastExecutionDrawCount?: number;
  /**
   * Last runtime-world revision produced by scene-runtime runtimeWorld module.
   */
  lastRuntimeWorldRevision?: number;
  /**
   * Number of dirty domains remaining after latest orchestration cycle.
   */
  lastDirtyDomainCount?: number;
  /**
   * Number of encoded commands produced in the latest frame orchestration cycle.
   */
  lastEncodedCommandCount?: number;
  /**
   * Number of replay events emitted by command replay during latest frame orchestration.
   */
  lastReplayEventCount?: number;
  /**
   * First replayed command id from latest replay batch, or null for empty batches.
   */
  lastReplayFirstCommandId?: string | null;
  /**
   * Number of product-adapter boundary violations detected for current engine options.
   */
  lastBoundaryViolationCount?: number;
  /**
   * Number of public API surface violations detected in runtime governance checks.
   */
  lastPublicApiViolationCount?: number;
}

/**
 * Public mesh primitive topology tokens accepted by graph nodes.
 */
export type EngineMeshPrimitiveTopology = "triangles" | "lines" | "points";

/**
 * Public mesh primitive payload accepted by graph nodes for native mesh submission paths.
 */
export interface EngineMeshPrimitiveInput {
  /** Optional primitive topology token. Defaults to triangles when omitted. */
  topology?: EngineMeshPrimitiveTopology;
  /** Packed xyz vertex positions in world coordinates. */
  positions: readonly number[];
  /** Optional packed triangle indices into positions array. */
  indices?: readonly number[];
  /** Optional mesh color token in CSS notation. */
  color?: string;
}

/**
 * Public graph node payload accepted by setGraph/updateGraph APIs.
 */
export interface EngineGraphNodeInput {
  /** Stable node id used by runtime-world projection. */
  id: string;
  /** Optional semantic node kind hint. */
  kind?: string;
  /** Optional parent node id for hierarchy reconstruction. */
  parentId?: string;
  /** Optional world-space x coordinate used by 2D/3D scene ingestion. */
  x?: number;
  /** Optional world-space y coordinate used by 2D/3D scene ingestion. */
  y?: number;
  /** Optional world-space z coordinate used by 3D scene ingestion. */
  z?: number;
  /** Optional world-space width used by 2D/3D scene ingestion. */
  width?: number;
  /** Optional world-space height used by 2D/3D scene ingestion. */
  height?: number;
  /** Optional world-space depth used by 3D scene ingestion. */
  depth?: number;
  /** Optional rotation degrees around X axis used by 3D semantics. */
  rotationX?: number;
  /** Optional rotation degrees around Y axis used by 3D semantics. */
  rotationY?: number;
  /** Optional rotation degrees around Z axis used by 3D semantics. */
  rotationZ?: number;
  /** Optional scale factor on X axis used by 3D semantics. */
  scaleX?: number;
  /** Optional scale factor on Y axis used by 3D semantics. */
  scaleY?: number;
  /** Optional scale factor on Z axis used by 3D semantics. */
  scaleZ?: number;
  /** Optional render order token used by scene sorting/picking. */
  renderOrder?: number;
  /** Optional visibility bit used by scene filtering pipelines. */
  visible?: boolean;
  /** Optional lighting mode hint for backend shading decisions. */
  lightingMode?: "inherit" | "unlit" | "lit";
  /** Optional material id hint for backend material binding. */
  materialId?: string;
  /** Optional mesh primitive payload for native mesh rendering paths. */
  mesh?: EngineMeshPrimitiveInput;
  /** Canonical 3D semantic envelope (bounds, transform, render hints). */
  semantic3d?: {
    /** Canonical 3D bounds projected from document semantics. */
    bounds: { x: number; y: number; z: number; width: number; height: number; depth: number };
    /** Canonical 3D transform projected from document semantics. */
    transform: {
      x: number; y: number; z: number;
      rotationX: number; rotationY: number; rotationZ: number;
      scaleX: number; scaleY: number; scaleZ: number;
    };
    /** Optional semantic hints for renderer/picking ordering. */
    sourceType?: string;
    renderOrder?: number;
    visible?: boolean;
    lightingMode?: "inherit" | "unlit" | "lit";
    materialId?: string;
  };
  /** Optional payload object carrying revision counters and metadata. */
  payload?: Record<string, unknown>;
  /** Additional node fields forwarded from app adapters. */
  [key: string]: unknown;
}

/**
 * Full graph payload used by setGraph/loadScene APIs.
 */
export interface EngineGraphInput {
  /** Optional caller-owned revision marker. */
  revision?: string | number;
  /** Ordered graph node list for current scene state. */
  nodes: readonly EngineGraphNodeInput[];
}

/**
 * Incremental patch payload used by updateGraph/applyScenePatchBatch APIs.
 */
export interface EngineGraphPatchInput {
  /** Ordered patch list applied in sequence. */
  patches: ReadonlyArray<{
    /** Optional patch revision marker from adapter layer. */
    revision?: string | number;
    /** Whether this patch replaces all previous graph nodes. */
    replaceAll?: boolean;
    /** Optional upsert node list for this patch. */
    upsertNodes?: readonly EngineGraphNodeInput[];
    /** Optional node-id removal list for this patch. */
    removeNodeIds?: readonly string[];
  }>;
}

/**
 * Public viewport payload accepted by setView/setViewport/updateCameraAnimation.
 */
export interface EngineViewInput {
  /** Optional viewport width in CSS pixels. */
  viewportWidth?: number;
  /** Optional viewport height in CSS pixels. */
  viewportHeight?: number;
  /** Optional viewport x offset in world coordinates. */
  offsetX?: number;
  /** Optional viewport y offset in world coordinates. */
  offsetY?: number;
  /** Optional viewport scale factor. */
  scale?: number;
}

/**
 * Resolved viewport snapshot returned by public view mutation APIs.
 */
export interface EngineViewSnapshot {
  /** Viewport width in CSS pixels. */
  viewportWidth: number;
  /** Viewport height in CSS pixels. */
  viewportHeight: number;
  /** Viewport x offset in world coordinates. */
  offsetX: number;
  /** Viewport y offset in world coordinates. */
  offsetY: number;
  /** Viewport scale factor. */
  scale: number;
}

/**
 * Axis-aligned world-space bounds used by query APIs.
 */
export interface EngineQueryBoundsInput {
  /** Left coordinate in world space. */
  x: number;
  /** Top coordinate in world space. */
  y: number;
  /** Width in world space. */
  width: number;
  /** Height in world space. */
  height: number;
}

/**
 * Point input used by pick APIs.
 */
export interface EnginePickPointInput {
  /** Point x in world space. */
  x: number;
  /** Point y in world space. */
  y: number;
}

/**
 * Optional pick tuning payload.
 */
export interface EnginePickOptions {
  /** Optional candidate-expansion tolerance in world units. */
  tolerance?: number;
}

/**
 * One ordered pick hit item.
 */
export interface EnginePickHit {
  /** Hit node id. */
  id: string;
  /** Deterministic hit rank where lower values are higher priority. */
  rank: number;
}

/**
 * Pick result payload returned by pick().
 */
export interface EnginePickResult {
  /** Ordered hit list from highest to lowest priority. */
  hits: readonly EnginePickHit[];
}

/**
 * 3D ray payload used by raycast().
 */
export interface EngineRayInput {
  /** Ray origin x in world space. */
  originX: number;
  /** Ray origin y in world space. */
  originY: number;
  /** Ray origin z in world space. */
  originZ: number;
  /** Ray direction x in world space. */
  directionX: number;
  /** Ray direction y in world space. */
  directionY: number;
  /** Ray direction z in world space. */
  directionZ: number;
}

/**
 * Optional raycast tuning payload.
 */
export interface EngineRaycastOptions {
  /** Optional distance cap; hits beyond this distance are ignored. */
  maxDistance?: number;
}

/**
 * Raycast hit payload returned by raycast().
 */
export interface EngineRaycastHit {
  /** Hit node id. */
  id: string;
  /** Distance from ray origin to entry intersection point. */
  distance: number;
}

/**
 * Query result payload returned by query().
 */
export interface EngineQueryResult {
  /** Deterministically sorted node ids intersecting query bounds. */
  nodeIds: readonly string[];
}

/**
 * Invalidation payload used by invalidate/markDirtyBounds APIs.
 */
export interface EngineInvalidateInput {
  /** Optional human-readable invalidation reason. */
  reason?: string;
  /** Optional world-space dirty region. */
  region?: {
    /** Region x offset in world coordinates. */
    x: number;
    /** Region y offset in world coordinates. */
    y: number;
    /** Region width in world coordinates. */
    width: number;
    /** Region height in world coordinates. */
    height: number;
  };
}

/**
 * Render result returned by public single-frame render APIs.
 */
export interface EngineRenderResult {
  /** Number of draw candidates in the rendered frame. */
  drawCount: number;
  /** Number of visible candidates in the rendered frame. */
  visibleCount: number;
  /** Frame time in milliseconds. */
  frameMs: number;
  /** Optional render-chain stage diagnostics for backend/browser troubleshooting. */
  renderChain?: EngineRenderChainDiagnostics;
}

/**
 * Render-chain stage diagnostics used to pinpoint backend/browser flow failures.
 */
export interface EngineRenderChainDiagnostics {
  /** Whether frame planning stage completed for this render request. */
  planReached: boolean;
  /** Whether compose stage completed and render result payload was assembled. */
  composeReached: boolean;
  /** Whether submit stage hooks completed for this render request. */
  submitReached: boolean;
  /** Whether backend-present handoff stage was attempted. */
  backendPresentReached: boolean;
  /** Whether backend-present call completed at adapter level for this render request. */
  backendPresentCompleted: boolean;
  /** Adapter-level present skip reason when backend-present could not commit. */
  backendPresentSkippedReason: "missing-context" | null;
  /** Whether browser bridge was reachable for non-headless backends. */
  browserBridgeReachable: boolean;
  /** Whether render target was mounted when frame was produced. */
  mountConnected: boolean;
  /** Resolved backend mode used by this render request. */
  backendMode: "webgpu" | "webgl" | "canvas2d" | "headless";
  /** Failing stage token for hard/soft render-chain failures; null when no stage failure is observed. */
  failedStage: "plan" | "compose" | "submit" | "backend-present" | "browser-bridge" | null;
}

/**
 * Structured render-chain warning payload emitted for backend/browser presentation failures.
 */
export interface EngineRenderWarningPayload {
  /** Stable warning code consumed by tooling and contracts. */
  code: "ENGINE_RENDER_BACKEND_PRESENT_SKIPPED" | "ENGINE_RENDER_BROWSER_BRIDGE_DISCONNECTED";
  /** Render stage where warning was produced. */
  stage: "backend-present" | "browser-bridge";
  /** Stable warning reason token for remediation routing. */
  reason: "missing-context" | "mount-disconnected" | "unknown";
  /** Resolved backend mode active when warning was emitted. */
  backendMode: "webgpu" | "webgl" | "canvas2d" | "headless";
  /** Stable telemetry source describing how warning evidence was resolved. */
  telemetrySource: "adapter-present" | "mount-bridge-check";
  /** Human-readable remediation hint surfaced to diagnostics tooling. */
  remediationHint: string;
  /** Optional backend-present skip reason when adapter could not commit. */
  skippedReason?: "missing-context" | null;
  /** Optional mount connectivity state used by browser-bridge warnings. */
  mountConnected?: boolean;
  /** Optional draw count at warning emission time for triage context. */
  drawCount?: number;
}

/**
 * Diagnostics view of one runtime capability contract entry.
 */
export interface EngineDiagnosticsRuntimeCapability {
  /** Canonical runtime method name. */
  name: string;
  /** Public method entry path consumed by integrators. */
  entry: string;
  /** Stability level surfaced to runtime consumers. */
  stability: "stable" | "experimental";
  /** Responsibility layer; runtime capability map only allows runtime here. */
  layer: "runtime";
}

/**
 * Public diagnostics payload consumed by runtime bridge and tooling.
 */
export interface EngineDiagnosticsSnapshot {
  /** Requested pixel ratio for current runtime path. */
  pixelRatio: number;
  /** Effective output pixel ratio for current surface path. */
  outputPixelRatio: number;
  /** Frame-plan diagnostics for latest orchestration pass. */
  framePlan?: {
    /** Candidate node ids selected by latest frame plan. */
    candidateNodeIds?: readonly string[];
    /** Candidate node count selected by latest frame plan. */
    candidateCount?: number;
    /** Scene node count observed by latest frame plan. */
    sceneNodeCount?: number;
    /** Plan version marker. */
    planVersion?: number;
  };
  /** Hit-plan diagnostics for latest picking pass. */
  hitPlan?: {
    /** Hit plan version marker. */
    planVersion?: number;
    /** Candidate count inspected by latest hit plan. */
    candidateCount?: number;
    /** Hit count resolved by latest hit plan. */
    hitCount?: number;
    /** Exact-check count resolved by latest hit plan. */
    exactCheckCount?: number;
  };
  /** Overlay diagnostics payload for debug tooling. */
  overlays?: {
    /** Overlay node count currently staged on engine handle. */
    count: number;
  };
  /** Last invalidate payload captured by invalidate calls. */
  invalidate?: EngineInvalidateInput | null;
  /** Render-chain stage diagnostics snapshot from latest render attempt. */
  renderChain?: EngineRenderChainDiagnostics;
  /** Latest structured render warning snapshot for diagnostics polling workflows. */
  lastRenderWarning?: EngineRenderWarningPayload | null;
  /** Backend-native diagnostics snapshot used to compare WebGL/WebGPU render paths. */
  backendDiagnostics?: {
    /** WebGL render path classification for the latest submitted frame. */
    webglRenderPath: "model-complete" | "packet" | "none";
    /** WebGPU render path classification for the latest submitted frame. */
    webgpuRenderPath: "hybrid-webgl" | "native-clear-only" | "native-rect-batch" | "native-model-complete";
    /** Native WebGPU submissions attempted in the latest frame. */
    webgpuNativeSubmissionAttemptedCount: number;
    /** Native WebGPU submissions that completed in the latest frame. */
    webgpuNativeSubmissionSuccessCount: number;
    /** Native WebGPU submissions that failed in the latest frame. */
    webgpuNativeSubmissionFailureCount: number;
    /** Cumulative native WebGPU submissions completed since engine boot. */
    webgpuNativeSubmissionTotalCount: number;
    /** Cumulative native WebGPU submissions failed since engine boot. */
    webgpuNativeSubmissionTotalFailureCount: number;
    /** Native rect-batch eligible primitive count observed in the latest frame. */
    webgpuNativeRectBatchEligibleCount: number;
    /** Native rect-batch rejection reason for the latest frame. */
    webgpuNativeRectBatchRejectedReason:
      | "none"
      | "scene-empty"
      | "group-node-unsupported"
      | "non-shape-node-unsupported"
      | "non-rect-shape-unsupported"
      | "shape-style-unsupported"
      | "shape-transform-unsupported";
    /** Cache-hit count for the latest frame emitted by backend-local reuse logic. */
    cacheHits: number;
    /** Cache-miss count for the latest frame emitted by backend-local reuse logic. */
    cacheMisses: number;
    /** Frame-reuse hit count for the latest frame emitted by backend-local reuse logic. */
    frameReuseHits: number;
    /** Frame-reuse miss count for the latest frame emitted by backend-local reuse logic. */
    frameReuseMisses: number;
    /** L0 preview hit count for the latest frame. */
    l0PreviewHitCount: number;
    /** L0 preview miss count for the latest frame. */
    l0PreviewMissCount: number;
    /** L1 composite hit count for the latest frame. */
    l1CompositeHitCount: number;
    /** L1 composite miss count for the latest frame. */
    l1CompositeMissCount: number;
    /** L2 tile-cache hit count for the latest frame. */
    l2TileHitCount: number;
    /** L2 tile-cache miss count for the latest frame. */
    l2TileMissCount: number;
    /** Cache fallback reason token for the latest frame. */
    cacheFallbackReason: EngineBackendCacheFallbackReason;
    /** Tile-cache entry count tracked for the latest frame. */
    tileCacheSize: number;
    /** Dirty tile count tracked for the latest frame. */
    tileDirtyCount: number;
    /** Total bytes estimated for tile cache footprint. */
    tileCacheTotalBytes: number;
    /** Tile upload count tracked for the latest frame. */
    tileUploadCount: number;
    /** Tile render count tracked for the latest frame. */
    tileRenderCount: number;
    /** Visible tile count tracked for the latest frame. */
    visibleTileCount: number;
    /** Pending tile scheduler task count at frame completion. */
    tileSchedulerPendingCount: number;
    /** Estimated total GPU texture bytes tracked by backend. */
    gpuTextureBytes: number;
    /** Estimated image texture bytes tracked by backend. */
    imageTextureBytes: number;
    /** Preview reuse timing in milliseconds for the latest frame. */
    webglPreviewReuseMs: number;
    /** Plan build timing in milliseconds for the latest frame. */
    webglPlanBuildMs: number;
    /** Texture upload timing in milliseconds for the latest frame. */
    webglTextureUploadMs: number;
    /** Draw submit timing in milliseconds for the latest frame. */
    webglDrawSubmitMs: number;
    /** Snapshot capture timing in milliseconds for the latest frame. */
    webglSnapshotCaptureMs: number;
    /** Model render fallback timing in milliseconds for the latest frame. */
    webglModelRenderMs: number;
    /** Preview execution mode from old-engine reuse path semantics. */
    webglPreviewExecutionMode: "affine-snapshot" | "temporal-reprojection-required";
    /** Source marker for preview execution mode diagnostics. */
    webglPreviewExecutionSource: "backend-native" | "engine-cache-fallback-taxonomy";
    /** Budget pressure bucket for the latest frame. */
    webglBudgetPressure: "low" | "medium" | "high";
    /** Human-readable pressure reason derived from budget-threshold signals. */
    webglBudgetPressureReason: string;
    /** Source marker for budget pressure diagnostics. */
    webglBudgetPressureSource: "backend-native" | "engine-frame-budget";
    /** Draw submit budget in milliseconds. */
    webglDrawSubmitBudgetMs: number;
    /** Texture upload budget in bytes per frame. */
    webglTextureUploadBudgetBytes: number;
    /** Texture upload total budget in bytes. */
    webglTextureUploadTotalBudgetBytes: number;
    /** Image texture upload count budget per frame. */
    webglImageTextureUploadBudgetCount: number;
    /** Text texture upload count budget per frame. */
    webglTextTextureUploadBudgetCount: number;
    /** Tile preload budget in milliseconds per frame. */
    webglTilePreloadBudgetMs: number;
    /** Tile preload upload budget per frame. */
    webglTilePreloadBudgetUploads: number;
    /** Overlay pass budget in milliseconds per frame. */
    webglOverlayPassBudgetMs: number;
    /** Whether draw submit budget was exceeded. */
    webglDrawSubmitBudgetExceeded: boolean;
    /** Whether texture upload budget was exceeded. */
    webglTextureUploadBudgetExceeded: boolean;
    /** Whether overlay budget was exceeded. */
    webglOverlayBudgetExceeded: boolean;
    /** Predictor direction X component for current frame. */
    webglPredictorDirectionX: number;
    /** Predictor direction Y component for current frame. */
    webglPredictorDirectionY: number;
    /** Predictor speed in pixels per second. */
    webglPredictorSpeedPxPerSec: number;
    /** Predictor confidence in range [0, 1]. */
    webglPredictorConfidence: number;
    /** Predictor preload ring size for current frame. */
    webglPredictorPreloadRing: number;
    /** Predictor overscan in CSS pixels. */
    webglPredictorOverscanCssPx: number;
    /** Predictive preload enqueue count for current frame. */
    webglPredictivePreloadEnqueueCount: number;
    /** Predictive preload processed count for current frame. */
    webglPredictivePreloadProcessedCount: number;
    /** Predictive preload pruned count for current frame. */
    webglPredictivePreloadPrunedCount: number;
    /** Whether high-zoom text SLA check executed for current frame. */
    webglHighZoomTextSlaChecked: boolean;
    /** High-zoom text SLA scale threshold. */
    webglHighZoomTextSlaScale: number;
    /** High-zoom text SLA violation count for current frame. */
    webglHighZoomTextSlaViolationCount: number;
    /** Deferred text texture count for current frame. */
    webglDeferredTextTextureCount: number;
    /** Number of pan predictive schedule requests issued this frame. */
    panScheduleRequestCount: number;
    /** Number of synchronous tile rebuild operations issued this frame. */
    tileSynchronousRebuildCount: number;
  };
  /** Machine-readable runtime capability snapshot for adapter/tooling checks. */
  capabilities?: {
    /** Payload schema version for capability snapshot compatibility checks. */
    schemaVersion: number;
    /** Runtime capability descriptors exposed by canonical handle methods. */
    runtime: readonly EngineDiagnosticsRuntimeCapability[];
  };
}

