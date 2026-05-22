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
 * Public graph node payload accepted by setGraph/updateGraph APIs.
 */
export interface EngineGraphNodeInput {
  /** Stable node id used by runtime-world projection. */
  id: string;
  /** Optional semantic node kind hint. */
  kind?: string;
  /** Optional parent node id for hierarchy reconstruction. */
  parentId?: string;
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
  /** Machine-readable runtime capability snapshot for adapter/tooling checks. */
  capabilities?: {
    /** Payload schema version for capability snapshot compatibility checks. */
    schemaVersion: number;
    /** Runtime capability descriptors exposed by canonical handle methods. */
    runtime: readonly EngineDiagnosticsRuntimeCapability[];
  };
}

