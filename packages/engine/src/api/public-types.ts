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
 * Minimal surface contract for canonical staging and deterministic tests.
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
   * Optional debug flag for staging diagnostics.
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

/**
 * Graph validation output payload exposed by developer-level graph APIs.
 */
export interface EngineGraphValidationOutput {
  /** True when graph input satisfies minimal runtime constraints. */
  valid: boolean;
  /** Deterministic issue list for invalid graph payloads. */
  issues: readonly string[];
}

/**
 * Viewport/world point payload used by projection helper APIs.
 */
export interface EnginePoint2 {
  /** Point x coordinate. */
  x: number;
  /** Point y coordinate. */
  y: number;
}

/**
 * Rectangle payload used by rect-pick helper APIs.
 */
export interface EngineRectInput {
  /** Rectangle x coordinate. */
  x: number;
  /** Rectangle y coordinate. */
  y: number;
  /** Rectangle width. */
  width: number;
  /** Rectangle height. */
  height: number;
}

/**
 * Lasso path payload used by lasso-pick helper APIs.
 */
export interface EngineLassoInput {
  /** Ordered lasso points in screen/world space. */
  points: readonly EnginePoint2[];
}

/**
 * Engine-level event listener function contract.
 */
export interface EngineEventListener {
  /**
   * Handles one emitted event payload.
   * @param payload Event payload object.
   */
  (payload: unknown): void;
}

/**
 * Asset state payload returned by developer-level asset APIs.
 */
export interface EngineAssetStateOutput {
  /** Stable asset identifier. */
  assetId: string;
  /** Canonical asset lifecycle state token. */
  state: "loaded" | "preloaded" | "unloaded" | "missing";
}

/**
 * Asset aggregate stats payload returned by developer-level asset APIs.
 */
export interface EngineAssetStatsOutput {
  /** Number of assets currently in loaded state. */
  loadedCount: number;
  /** Number of assets currently in preloaded state. */
  preloadedCount: number;
  /** Total assets tracked by current engine session. */
  totalCount: number;
}

/**
 * Image capture output payload for developer-level capture APIs.
 */
export interface EngineCaptureImageOutput {
  /** MIME type of encoded payload. */
  mimeType: string;
  /** Encoded data URL payload. */
  dataUrl: string;
}

/**
 * Video-frame capture output payload for developer-level capture APIs.
 */
export interface EngineCaptureVideoFrameOutput {
  /** Timestamp in milliseconds associated with captured frame. */
  timestampMs: number;
  /** MIME type of encoded payload. */
  mimeType: string;
  /** Encoded data URL payload. */
  dataUrl: string;
}

/**
 * Public capability snapshot exposed by developer-level getCapabilities API.
 */
export interface EnginePublicCapabilitiesOutput {
  /** Capability schema version for compatibility checks. */
  schemaVersion: number;
  /** Runtime capability descriptors available in current handle session. */
  runtime: readonly EngineDiagnosticsRuntimeCapability[];
}

/**
 * Headless-session create output payload exposed by developer APIs.
 */
export interface EngineHeadlessSessionOutput {
  /** Stable headless session id. */
  sessionId: string;
}

/**
 * Headless-session destroy output payload exposed by developer APIs.
 */
export interface EngineHeadlessSessionDestroyOutput {
  /** True when requested headless session was removed. */
  destroyed: boolean;
}

/**
 * Headless render output payload exposed by developer APIs.
 */
export interface EngineHeadlessRenderOutput {
  /** Number of draw calls represented by headless render. */
  drawCount: number;
  /** Number of visible nodes represented by headless render. */
  visibleCount: number;
}

/**
 * Public metrics snapshot exposed by developer-level metrics APIs.
 */
export interface EnginePublicMetricsOutput {
  /** Last encoded command count tracked by runtime orchestration. */
  encodedCommandCount: number;
  /** Last replayed command count tracked by runtime orchestration. */
  replayedCommandCount: number;
  /** Last draw-count tracked by runtime orchestration. */
  drawCount: number;
}

import type { EngineDocumentChangeSet } from "../document/document-contracts";

/**
 * Runtime document apply input contract exposed on engine.runtime.document API.
 */
export interface EngineRuntimeDocumentApplyChangeSetInput {
  /** Deterministic change-set payload to apply. */
  changeSet: EngineDocumentChangeSet;
  /** Optional expected base revision before apply. */
  baseRevision?: number;
  /** Optional caller-provided schema version for compatibility checks. */
  schemaVersion?: number;
}

/**
 * Runtime document apply result contract exposed on engine.runtime.document API.
 */
export interface EngineRuntimeDocumentApplyChangeSetResult {
  /** Next document revision after successful apply. */
  nextRevision: number;
  /** Number of operations applied from input change-set. */
  appliedOps: number;
  /** Deterministic warning list for non-fatal conditions. */
  warnings: readonly string[];
}

/**
 * Runtime document diff request contract exposed on engine.runtime.document API.
 */
export interface EngineRuntimeDocumentDiffSnapshotsInput {
  /** Base snapshot used as the left side of comparison. */
  base: import("../document/document-contracts").EngineDocumentSnapshot;
  /** Target snapshot used as the right side of comparison. */
  target: import("../document/document-contracts").EngineDocumentSnapshot;
}

/**
 * Runtime document diff result contract exposed on engine.runtime.document API.
 */
export interface EngineRuntimeDocumentDiffSnapshotsOutput {
  /** Deterministic added node id list in lexical order. */
  addedNodeIds: readonly string[];
  /** Deterministic removed node id list in lexical order. */
  removedNodeIds: readonly string[];
  /** Deterministic updated node id list in lexical order. */
  updatedNodeIds: readonly string[];
}

/**
 * Runtime document rebase request contract exposed on engine.runtime.document API.
 */
export interface EngineRuntimeDocumentRebaseChangeSetInput {
  /** Target base revision used for rebasing output change-set. */
  baseRevision: number;
  /** Change-set payload to rebase onto baseRevision. */
  changeSet: import("../document/document-contracts").EngineDocumentChangeSet;
}

/**
 * Runtime document serialize request contract exposed on engine.runtime.document API.
 */
export interface EngineRuntimeDocumentSerializeSnapshotInput {
  /** Snapshot payload to serialize. */
  snapshot: import("../document/document-contracts").EngineDocumentSnapshot;
}

/**
 * Runtime document serialize result contract exposed on engine.runtime.document API.
 */
export interface EngineRuntimeDocumentSerializeSnapshotOutput {
  /** Serialized snapshot payload string. */
  payload: string;
}

/**
 * Runtime document deserialize request contract exposed on engine.runtime.document API.
 */
export interface EngineRuntimeDocumentDeserializeSnapshotInput {
  /** Serialized snapshot payload string. */
  payload: string;
}

/**
 * Runtime document create-snapshot request contract exposed on engine.runtime.document API.
 */
export interface EngineRuntimeDocumentCreateSnapshotInput {
  /** Target revision carried by the created snapshot. */
  revision: number;
  /** Node table payload copied into the created snapshot. */
  nodes: import("../document/document-contracts").EngineDocumentSnapshot["nodes"];
}

/**
 * Runtime document validate-snapshot request contract exposed on engine.runtime.document API.
 */
export interface EngineRuntimeDocumentValidateSnapshotInput {
  /** Snapshot payload to validate. */
  snapshot: import("../document/document-contracts").EngineDocumentSnapshot;
}

/**
 * Runtime document validate-snapshot output contract exposed on engine.runtime.document API.
 */
export interface EngineRuntimeDocumentValidateSnapshotOutput {
  /** Whether snapshot passes minimal document contract validation. */
  valid: boolean;
  /** Deterministic issue list for invalid snapshots. */
  issues: readonly string[];
}

/**
 * Runtime world entity contract exposed by engine.runtime.world snapshot APIs.
 */
export interface EngineRuntimeWorldEntity {
  /** Stable entity id aligned to source graph/document node id. */
  id: string;
  /** Coarse deterministic world-space bounds for this runtime entity. */
  bounds: {
    /** Left coordinate in world space. */
    x: number;
    /** Top coordinate in world space. */
    y: number;
    /** Width in world space. */
    width: number;
    /** Height in world space. */
    height: number;
  };
}

/**
 * Runtime world snapshot contract exposed on engine.runtime.world API.
 */
export interface EngineRuntimeWorldSnapshotOutput {
  /** Runtime world revision aligned to latest compiled document revision. */
  worldRevision: number;
  /** Deterministic runtime entities in id order. */
  entities: readonly EngineRuntimeWorldEntity[];
}

/**
 * Runtime world graph stats contract exposed on engine.runtime.world API.
 */
export interface EngineRuntimeWorldGraphStatsOutput {
  /** Runtime world revision aligned to latest compiled snapshot. */
  worldRevision: number;
  /** Number of runtime entities currently materialized. */
  entityCount: number;
}

/**
 * Runtime world compile-from-document input contract exposed on engine.runtime.world API.
 */
export interface EngineRuntimeWorldCompileFromDocumentInput {
  /** Document snapshot source used for world compilation. */
  snapshot: import("../document/document-contracts").EngineDocumentSnapshot;
}

/**
 * Runtime world query-entity input contract exposed on engine.runtime.world API.
 */
export interface EngineRuntimeWorldQueryEntityInput {
  /** Runtime entity id to resolve from current world snapshot. */
  entityId: string;
}

/**
 * Runtime world query-entity output contract exposed on engine.runtime.world API.
 */
export interface EngineRuntimeWorldQueryEntityOutput {
  /** True when entity is found in current world snapshot. */
  found: boolean;
  /** Matching entity payload when found, otherwise null. */
  entity: EngineRuntimeWorldEntity | null;
}

/**
 * Runtime world query-component input contract exposed on engine.runtime.world API.
 */
export interface EngineRuntimeWorldQueryComponentInput {
  /** Component key used for deterministic world filtering. */
  component: "transform" | "geometry" | "material" | "visibility" | "picking";
}

/**
 * Runtime world query-component output contract exposed on engine.runtime.world API.
 */
export interface EngineRuntimeWorldQueryComponentOutput {
  /** Entity ids carrying requested component in deterministic order. */
  entityIds: readonly string[];
}

/**
 * Runtime world clear output contract exposed on engine.runtime.world API.
 */
export interface EngineRuntimeWorldClearOutput {
  /** Number of entities removed from current world snapshot. */
  clearedEntityCount: number;
}

/**
 * Runtime dirty mark input contract exposed on engine.runtime.dirty API.
 */
export interface EngineRuntimeDirtyMarkInput {
  /** Dirty domain to mark for incremental runtime processing. */
  domain: "transform" | "geometry" | "material" | "visibility" | "picking" | "resource";
  /** Deterministic caller token used for diagnostics traceability. */
  token: string;
}

/**
 * Runtime dirty state contract exposed on engine.runtime.dirty API.
 */
export interface EngineRuntimeDirtyStateOutput {
  /** Deterministic sorted dirty-domain list. */
  pendingDomains: readonly EngineRuntimeDirtyMarkInput["domain"][];
  /** Epoch milliseconds for the latest mark operation. */
  lastMarkedAt: number;
}

/**
 * Runtime dirty mark-batch input contract exposed on engine.runtime.dirty API.
 */
export interface EngineRuntimeDirtyMarkBatchInput {
  /** Dirty domains to mark in one deterministic batch operation. */
  domains: readonly EngineRuntimeDirtyMarkInput["domain"][];
  /** Deterministic caller token used for diagnostics traceability. */
  token: string;
}

/**
 * Runtime dirty flush input contract exposed on engine.runtime.dirty API.
 */
export interface EngineRuntimeDirtyFlushInput {
  /** Dirty domains to flush from current pending set. */
  domains: readonly EngineRuntimeDirtyMarkInput["domain"][];
}

/**
 * Runtime dirty flush output contract exposed on engine.runtime.dirty API.
 */
export interface EngineRuntimeDirtyFlushOutput {
  /** Number of dirty domains removed by this flush call. */
  flushedCount: number;
  /** Remaining dirty state after flush operation. */
  state: EngineRuntimeDirtyStateOutput;
}

/**
 * Runtime dirty reset output contract exposed on engine.runtime.dirty API.
 */
export interface EngineRuntimeDirtyResetOutput {
  /** True when dirty state was reset to empty set. */
  reset: boolean;
}

/**
 * Runtime command kinds accepted by engine.runtime.command APIs.
 */
export type EngineRuntimeCommandKind =
  | "set-state"
  | "bind-resource"
  | "draw"
  | "dispatch"
  | "readback";

/**
 * Runtime command payload item accepted by engine.runtime.command APIs.
 */
export interface EngineRuntimeCommand {
  /** Stable command id used for deterministic ordering. */
  id: string;
  /** Command kind consumed by runtime command modules. */
  kind: EngineRuntimeCommandKind;
  /** Command payload owned by caller contract. */
  payload: Readonly<Record<string, unknown>>;
}

/**
 * Runtime command encode input contract exposed on engine.runtime.command API.
 */
export interface EngineRuntimeCommandEncodeInput {
  /** Ordered command plan to encode. */
  commands: readonly EngineRuntimeCommand[];
}

/**
 * Runtime command encode output contract exposed on engine.runtime.command API.
 */
export interface EngineRuntimeCommandEncodeOutput {
  /** Stable command buffer identifier. */
  bufferId: string;
  /** Deterministic encoded command list. */
  commands: readonly EngineRuntimeCommand[];
  /** Number of encoded commands. */
  commandCount: number;
}

/**
 * Runtime command validate input contract exposed on engine.runtime.command API.
 */
export interface EngineRuntimeCommandValidateInput {
  /** Encoded command list to validate. */
  commands: readonly EngineRuntimeCommand[];
}

/**
 * Runtime command validate output contract exposed on engine.runtime.command API.
 */
export interface EngineRuntimeCommandValidateOutput {
  /** True when command buffer passes validation checks. */
  valid: boolean;
  /** Deterministic validation issue list. */
  validationIssues: readonly string[];
}

/**
 * Runtime command create-encoder input contract exposed on engine.runtime.command API.
 */
export interface EngineRuntimeCommandCreateEncoderInput {
  /** Stable profile label used for deterministic encoder id generation. */
  profile: string;
}

/**
 * Runtime command create-encoder output contract exposed on engine.runtime.command API.
 */
export interface EngineRuntimeCommandCreateEncoderOutput {
  /** Stable encoder id assigned to this encoder session. */
  encoderId: string;
}

/**
 * Runtime command optimize input contract exposed on engine.runtime.command API.
 */
export interface EngineRuntimeCommandOptimizeInput {
  /** Encoded command list to optimize deterministically. */
  commands: readonly EngineRuntimeCommand[];
  /** Optimization profile token applied during normalization. */
  profile: "balanced" | "latency" | "throughput";
}

/**
 * Runtime command optimize output contract exposed on engine.runtime.command API.
 */
export interface EngineRuntimeCommandOptimizeOutput {
  /** Deterministically optimized command list. */
  commands: readonly EngineRuntimeCommand[];
  /** Number of commands kept after optimization. */
  commandCount: number;
}

/**
 * Runtime command inspect output contract exposed on engine.runtime.command API.
 */
export interface EngineRuntimeCommandInspectOutput {
  /** True when command buffer keeps minimal inspectable shape. */
  valid: boolean;
  /** Canonical inspect summary for diagnostics/logging. */
  summary: string;
}

/**
 * Runtime command replay output contract exposed on engine.runtime.command API.
 */
export interface EngineRuntimeCommandReplayOutput {
  /** Number of commands replayed in this invocation. */
  replayedCount: number;
}

/**
 * Runtime backend fallback trace item exposed on engine.runtime.backend API.
 */
export interface EngineRuntimeBackendFallbackTraceItem {
  /** Requested backend mode. */
  requested: EngineBackendMode;
  /** Resolved backend mode used by runtime. */
  resolved: EngineBackendMode;
  /** Optional human-readable fallback reason. */
  reason: string | null;
}

/**
 * Runtime backend listAvailable output contract exposed on engine.runtime.backend API.
 */
export interface EngineRuntimeBackendListAvailableOutput {
  /** Deterministic backend mode list in probe-priority order. */
  available: readonly EngineBackendMode[];
}

/**
 * Runtime backend getActive output contract exposed on engine.runtime.backend API.
 */
export interface EngineRuntimeBackendGetActiveOutput {
  /** Active backend mode for current runtime session. */
  active: EngineBackendMode;
}

/**
 * Runtime backend getFallbackTrace output contract exposed on engine.runtime.backend API.
 */
export interface EngineRuntimeBackendGetFallbackTraceOutput {
  /** Deterministic fallback trace list from current runtime session. */
  fallbackTrace: readonly EngineRuntimeBackendFallbackTraceItem[];
}

/**
 * Runtime backend select input contract exposed on engine.runtime.backend API.
 */
export interface EngineRuntimeBackendSelectInput {
  /** Requested backend mode preference. */
  preference: EngineBackendMode | "auto";
}

/**
 * Runtime backend select output contract exposed on engine.runtime.backend API.
 */
export interface EngineRuntimeBackendSelectOutput {
  /** Requested backend preference provided by caller. */
  requested: EngineBackendMode | "auto";
  /** Resolved backend mode selected by runtime. */
  resolved: EngineBackendMode;
}

/**
 * Runtime backend capabilities output contract exposed on engine.runtime.backend API.
 */
export interface EngineRuntimeBackendCapabilitiesOutput {
  /** Whether current backend supports compute workloads. */
  compute: boolean;
  /** Whether current backend supports readback workflows. */
  readback: boolean;
}

/**
 * Runtime backend limits output contract exposed on engine.runtime.backend API.
 */
export interface EngineRuntimeBackendLimitsOutput {
  /** Runtime texture size upper bound. */
  maxTextureSize: number;
  /** Runtime command count upper bound for one submit. */
  maxCommandsPerSubmit: number;
}

/**
 * Runtime backend probe-headless output contract exposed on engine.runtime.backend API.
 */
export interface EngineRuntimeBackendProbeHeadlessOutput {
  /** True when headless backend mode is available in current host. */
  supported: boolean;
}

/**
 * Runtime plan request payload for frame-plan synthesis.
 */
export interface EngineRuntimePlanFrameRequest {
  /** Candidate node count used by pressure heuristics. */
  nodeCount: number;
  /** Viewport width in CSS pixels. */
  viewportWidth: number;
  /** Viewport height in CSS pixels. */
  viewportHeight: number;
  /** Whether user interaction is currently active. */
  interactionActive: boolean;
}

/**
 * Runtime frame-plan output payload returned by plan APIs.
 */
export interface EngineRuntimeFramePlanOutput {
  /** Deterministic plan id derived from current runtime state. */
  planId: string;
  /** Runtime phase selected by strategy resolver. */
  phase: "static" | "interactive";
  /** Runtime pressure level selected by budget resolver. */
  pressure: "low" | "medium" | "high";
  /** Overscan border chosen for visibility planning. */
  overscanBorderPx: number;
  /** Estimated shortlist ratio in range [0, 1]. */
  shortlistCandidateRatio: number;
}

/**
 * Runtime visibility-plan request payload.
 */
export interface EngineRuntimeVisibilityPlanRequest {
  /** Candidate node ids available for visibility filtering. */
  candidateNodeIds: readonly string[];
}

/**
 * Runtime visibility-plan output payload.
 */
export interface EngineRuntimeVisibilityPlanOutput {
  /** Deterministic visible node ids in stable order. */
  visibleNodeIds: readonly string[];
  /** Number of visible node ids returned. */
  visibleCount: number;
}

/**
 * Runtime LOD-plan request payload.
 */
export interface EngineRuntimeLodPlanRequest {
  /** Active viewport scale used by LOD thresholding. */
  scale: number;
  /** Optional caller-defined base threshold. */
  baseThreshold?: number;
}

/**
 * Runtime LOD-plan output payload.
 */
export interface EngineRuntimeLodPlanOutput {
  /** LOD tier selected from request scale and threshold. */
  lodLevel: "coarse" | "balanced" | "fine";
  /** Effective threshold used to resolve current LOD tier. */
  threshold: number;
}

/**
 * Runtime ROI-plan request payload.
 */
export interface EngineRuntimeRoiPlanRequest {
  /** Left coordinate of requested ROI bounds. */
  x: number;
  /** Top coordinate of requested ROI bounds. */
  y: number;
  /** Width of requested ROI bounds. */
  width: number;
  /** Height of requested ROI bounds. */
  height: number;
  /** Optional expansion margin applied symmetrically. */
  margin?: number;
}

/**
 * Runtime ROI-plan output payload.
 */
export interface EngineRuntimeRoiPlanOutput {
  /** Left coordinate of resolved ROI bounds. */
  x: number;
  /** Top coordinate of resolved ROI bounds. */
  y: number;
  /** Width of resolved ROI bounds. */
  width: number;
  /** Height of resolved ROI bounds. */
  height: number;
}

/**
 * Runtime budget-plan request payload.
 */
export interface EngineRuntimeBudgetPlanRequest {
  /** Candidate node count used by pressure resolver. */
  nodeCount: number;
  /** Pending tile queue count used by pressure resolver. */
  tileQueuePendingCount: number;
  /** Dirty region count used by pressure resolver. */
  dirtyRegionCount: number;
}

/**
 * Runtime budget-plan output payload.
 */
export interface EngineRuntimeBudgetPlanOutput {
  /** Pressure tier resolved by budget broker. */
  pressure: "low" | "medium" | "high";
  /** Deterministic pressure reason token. */
  reason: string;
}

/**
 * Runtime plan inspect output payload.
 */
export interface EngineRuntimePlanInspectOutput {
  /** True when plan payload contains minimal inspectable fields. */
  valid: boolean;
  /** Canonical summary text for diagnostics and logs. */
  summary: string;
}

/**
 * Runtime resource descriptor used by register API.
 */
export interface EngineRuntimeResourceDescriptor {
  /** Stable resource id. */
  id: string;
  /** Resource kind classification. */
  kind: "texture" | "buffer" | "mesh" | "material";
  /** Resource size in bytes. */
  sizeBytes: number;
}

/**
 * Runtime resource patch payload used by update API.
 */
export interface EngineRuntimeResourcePatch {
  /** Optional next resource size in bytes. */
  sizeBytes?: number;
}

/**
 * Runtime resource residency snapshot payload.
 */
export interface EngineRuntimeResourceResidencyOutput {
  /** Stable resource id. */
  id: string;
  /** Resource residency version incremented on mutations. */
  residencyVersion: number;
  /** Whether resource is pinned against GC. */
  pinned: boolean;
  /** Current resource size in bytes. */
  sizeBytes: number;
}

/**
 * Runtime resource collect-garbage input payload.
 */
export interface EngineRuntimeResourceCollectGarbageInput {
  /** Maximum removable bytes for this GC cycle. */
  budgetBytes: number;
}

/**
 * Runtime resource collect-garbage output payload.
 */
export interface EngineRuntimeResourceCollectGarbageOutput {
  /** Released resource ids in deterministic order. */
  releasedResourceIds: readonly string[];
  /** Number of released resources. */
  releasedCount: number;
}

/**
 * Runtime observability start-trace input payload.
 */
export interface EngineRuntimeStartTraceInput {
  /** Human-readable trace name. */
  name: string;
  /** Optional caller tags associated with the trace. */
  tags?: readonly string[];
}

/**
 * Runtime observability start-trace output payload.
 */
export interface EngineRuntimeStartTraceOutput {
  /** Stable trace id for subsequent trace APIs. */
  traceId: string;
  /** Trace start timestamp in milliseconds. */
  startedAtMs: number;
}

/**
 * Runtime observability stop-trace output payload.
 */
export interface EngineRuntimeStopTraceOutput {
  /** Stable trace id that was stopped. */
  traceId: string;
  /** Trace stop timestamp in milliseconds. */
  stoppedAtMs: number;
  /** Total trace duration in milliseconds. */
  durationMs: number;
}

/**
 * Runtime observability trace-event payload.
 */
export interface EngineRuntimeTraceEvent {
  /** Event timestamp in milliseconds. */
  timestampMs: number;
  /** Event category token for diagnostics grouping. */
  category: string;
  /** Event message payload. */
  message: string;
}

/**
 * Runtime observability get-trace output payload.
 */
export interface EngineRuntimeGetTraceOutput {
  /** Stable trace id. */
  traceId: string;
  /** Deterministic event sequence for this trace. */
  events: readonly EngineRuntimeTraceEvent[];
}

/**
 * Runtime observability metrics snapshot payload.
 */
export interface EngineRuntimeMetricsSnapshot {
  /** Last encoded command count tracked by runtime pipeline. */
  encodedCommandCount: number;
  /** Last replayed command count tracked by runtime pipeline. */
  replayedCommandCount: number;
  /** Last render draw count tracked by runtime pipeline. */
  drawCount: number;
}

/**
 * Runtime observability capture-frame input payload.
 */
export interface EngineRuntimeCaptureFrameInput {
  /** Optional label attached to capture result. */
  label?: string;
}

/**
 * Runtime observability capture-frame output payload.
 */
export interface EngineRuntimeCaptureFrameOutput {
  /** Capture timestamp in milliseconds. */
  timestampMs: number;
  /** Optional caller-provided label. */
  label: string | null;
}

/**
 * Runtime observability replay-token output payload.
 */
export interface EngineRuntimeReplayTokenOutput {
  /** Stable replay token string. */
  token: string;
}

/**
 * Runtime observability replay output payload.
 */
export interface EngineRuntimeReplayOutput {
  /** True when replay token was accepted by runtime. */
  accepted: boolean;
}

/**
 * Runtime document namespace API contract exposed under engine.runtime.document.
 */
export interface EngineRuntimeDocumentApi {
  /** Creates one document snapshot from explicit revision and node-table payload. */
  createSnapshot: (
    input: EngineRuntimeDocumentCreateSnapshotInput,
  ) => import("../document/document-contracts").EngineDocumentSnapshot;
  /** Validates one document snapshot and returns deterministic issue list. */
  validateSnapshot: (
    input: EngineRuntimeDocumentValidateSnapshotInput,
  ) => EngineRuntimeDocumentValidateSnapshotOutput;
  /** Returns current document revision. */
  getRevision: () => number;
  /** Returns runtime document schema version. */
  getSchemaVersion: () => number;
  /** Applies one deterministic change-set through runtime document layer. */
  applyChangeSet: (
    input: EngineRuntimeDocumentApplyChangeSetInput,
  ) => EngineRuntimeDocumentApplyChangeSetResult;
  /** Diffs two document snapshots and returns deterministic node id deltas. */
  diffSnapshots: (
    input: EngineRuntimeDocumentDiffSnapshotsInput,
  ) => EngineRuntimeDocumentDiffSnapshotsOutput;
  /** Rebases one document change-set to provided base revision. */
  rebaseChangeSet: (
    input: EngineRuntimeDocumentRebaseChangeSetInput,
  ) => import("../document/document-contracts").EngineDocumentChangeSet;
  /** Serializes one document snapshot into stable JSON payload. */
  serializeSnapshot: (
    input: EngineRuntimeDocumentSerializeSnapshotInput,
  ) => EngineRuntimeDocumentSerializeSnapshotOutput;
  /** Deserializes one document snapshot payload into runtime snapshot object. */
  deserializeSnapshot: (
    input: EngineRuntimeDocumentDeserializeSnapshotInput,
  ) => import("../document/document-contracts").EngineDocumentSnapshot;
}

/**
 * Runtime world namespace API contract exposed under engine.runtime.world.
 */
export interface EngineRuntimeWorldApi {
  /** Compiles one runtime-world snapshot from provided document snapshot. */
  compileFromDocument: (
    input: EngineRuntimeWorldCompileFromDocumentInput,
  ) => EngineRuntimeWorldSnapshotOutput;
  /** Returns runtime-world snapshot aligned to latest compiled document state. */
  getWorldSnapshot: () => EngineRuntimeWorldSnapshotOutput;
  /** Queries one runtime entity by id. */
  queryEntity: (input: EngineRuntimeWorldQueryEntityInput) => EngineRuntimeWorldQueryEntityOutput;
  /** Queries runtime world entities by component label. */
  queryComponent: (
    input: EngineRuntimeWorldQueryComponentInput,
  ) => EngineRuntimeWorldQueryComponentOutput;
  /** Returns lightweight runtime-world graph statistics. */
  getGraphStats: () => EngineRuntimeWorldGraphStatsOutput;
  /** Resolves one matrix-based node transform metadata payload. */
  queryNodeTransform: (
    source: import("../interaction/shapeTransform").BoxTransformSource,
  ) => import("../interaction/shapeTransform").ResolvedNodeTransform;
  /** Serializes one resolved node transform into SVG transform syntax. */
  formatNodeSvgTransform: (
    transform: import("../interaction/shapeTransform").ResolvedNodeTransform,
  ) => string | undefined;
  /** Clears current runtime-world entity snapshot. */
  clear: () => EngineRuntimeWorldClearOutput;
}

/**
 * Runtime dirty namespace API contract exposed under engine.runtime.dirty.
 */
export interface EngineRuntimeDirtyApi {
  /** Returns current runtime dirty state snapshot. */
  getState: () => EngineRuntimeDirtyStateOutput;
  /** Marks one dirty domain and returns updated dirty state snapshot. */
  mark: (input: EngineRuntimeDirtyMarkInput) => EngineRuntimeDirtyStateOutput;
  /** Marks multiple dirty domains in one deterministic batch call. */
  markBatch: (input: EngineRuntimeDirtyMarkBatchInput) => EngineRuntimeDirtyStateOutput;
  /** Returns pending dirty domains in deterministic sorted order. */
  getPendingDomains: () => readonly EngineRuntimeDirtyMarkInput["domain"][];
  /** Flushes requested dirty domains and returns post-flush dirty state. */
  flush: (input: EngineRuntimeDirtyFlushInput) => EngineRuntimeDirtyFlushOutput;
  /** Resets dirty state to empty set. */
  reset: () => EngineRuntimeDirtyResetOutput;
}

/**
 * Runtime command namespace API contract exposed under engine.runtime.command.
 */
export interface EngineRuntimeCommandApi {
  /** Creates one command encoder session from caller profile token. */
  createEncoder: (input: EngineRuntimeCommandCreateEncoderInput) => EngineRuntimeCommandCreateEncoderOutput;
  /** Encodes one deterministic runtime command plan. */
  encode: (plan: EngineRuntimeCommandEncodeInput) => EngineRuntimeCommandEncodeOutput;
  /** Validates one runtime command buffer. */
  validate: (buffer: EngineRuntimeCommandValidateInput) => EngineRuntimeCommandValidateOutput;
  /** Optimizes one command buffer using deterministic profile rules. */
  optimize: (input: EngineRuntimeCommandOptimizeInput) => EngineRuntimeCommandOptimizeOutput;
  /** Inspects one command buffer and returns stable summary metadata. */
  inspect: (buffer: EngineRuntimeCommandValidateInput) => EngineRuntimeCommandInspectOutput;
  /** Replays one command buffer and returns replay count summary. */
  replay: (buffer: EngineRuntimeCommandValidateInput) => EngineRuntimeCommandReplayOutput;
}

/**
 * Runtime backend namespace API contract exposed under engine.runtime.backend.
 */
export interface EngineRuntimeBackendApi {
  /** Returns available backend modes in probe-priority order. */
  listAvailable: () => EngineRuntimeBackendListAvailableOutput;
  /** Selects one backend preference and returns resolved mode. */
  select: (input: EngineRuntimeBackendSelectInput) => EngineRuntimeBackendSelectOutput;
  /** Returns active backend mode in current runtime session. */
  getActive: () => EngineRuntimeBackendGetActiveOutput;
  /** Returns capability switches for active backend. */
  getCapabilities: () => EngineRuntimeBackendCapabilitiesOutput;
  /** Returns operational limits for active backend. */
  getLimits: () => EngineRuntimeBackendLimitsOutput;
  /** Returns deterministic fallback trace for current backend selection state. */
  getFallbackTrace: () => EngineRuntimeBackendGetFallbackTraceOutput;
  /** Probes whether headless backend mode is supported in current host. */
  probeHeadless: () => EngineRuntimeBackendProbeHeadlessOutput;
}

/**
 * Runtime plan namespace API contract exposed under engine.runtime.plan.
 */
export interface EngineRuntimePlanApi {
  /** Creates one frame-plan payload from explicit planning request. */
  createFramePlan: (request: EngineRuntimePlanFrameRequest) => EngineRuntimeFramePlanOutput;
  /** Creates one visibility-plan payload from candidate ids. */
  createVisibilityPlan: (
    request: EngineRuntimeVisibilityPlanRequest,
  ) => EngineRuntimeVisibilityPlanOutput;
  /** Creates one LOD-plan payload from viewport scale. */
  createLodPlan: (request: EngineRuntimeLodPlanRequest) => EngineRuntimeLodPlanOutput;
  /** Creates one ROI-plan payload from bounds request. */
  createRoiPlan: (request: EngineRuntimeRoiPlanRequest) => EngineRuntimeRoiPlanOutput;
  /** Creates one budget-plan payload from pressure signals. */
  createBudgetPlan: (request: EngineRuntimeBudgetPlanRequest) => EngineRuntimeBudgetPlanOutput;
  /** Creates unified hit geometry payload for pointer/selection/marquee strategy. */
  createHitGeometryPayload: (
    request: import("../interaction/geometryPayload").ResolveEngineGeometryPayloadOptions,
  ) => import("../interaction/geometryPayload").EngineGeometryPayload;
  /** Resolves adaptive hit tolerance from viewport/tuning options. */
  resolveHitTolerance: (
    options?: import("../interaction/hitTolerance").ResolveEngineAdaptiveHitToleranceOptions,
  ) => import("../interaction/hitTolerance").EngineAdaptiveHitTolerance;
  /** Requests one scheduled render frame and returns deterministic request id. */
  requestFrame: (mode?: "interactive" | "normal") => { requestId: string; scheduled: boolean };
  /** Cancels one scheduled render frame by request id. */
  cancelFrame: (requestId: string) => { cancelled: boolean };
  /** Sets scheduler interactive throttle interval in milliseconds. */
  setInteractiveInterval: (intervalMs: number) => { intervalMs: number };
  /** Returns scheduler diagnostics snapshot for queue/throttle monitoring. */
  getSchedulerDiagnostics: () => import("../scheduler/renderScheduler").EngineRenderSchedulerDiagnostics;
  /** Inspects one runtime plan payload and returns summary metadata. */
  inspect: (plan: unknown) => EngineRuntimePlanInspectOutput;
}

/**
 * Runtime resource namespace API contract exposed under engine.runtime.resource.
 */
export interface EngineRuntimeResourceApi {
  /** Registers one runtime resource descriptor. */
  register: (descriptor: EngineRuntimeResourceDescriptor) => EngineRuntimeResourceResidencyOutput;
  /** Updates one runtime resource descriptor fields. */
  update: (
    resourceId: string,
    patch: EngineRuntimeResourcePatch,
  ) => EngineRuntimeResourceResidencyOutput;
  /** Releases one runtime resource descriptor. */
  release: (resourceId: string) => { released: boolean };
  /** Pins one runtime resource to protect from GC. */
  pin: (resourceId: string) => EngineRuntimeResourceResidencyOutput;
  /** Unpins one runtime resource to allow GC. */
  unpin: (resourceId: string) => EngineRuntimeResourceResidencyOutput;
  /** Returns residency snapshot for one runtime resource. */
  getResidency: (resourceId: string) => EngineRuntimeResourceResidencyOutput;
  /** Executes one budgeted runtime resource garbage-collection cycle. */
  collectGarbage: (
    options: EngineRuntimeResourceCollectGarbageInput,
  ) => EngineRuntimeResourceCollectGarbageOutput;
}

/**
 * Runtime observability namespace API contract exposed under engine.runtime.observability.
 */
export interface EngineRuntimeObservabilityApi {
  /** Starts one runtime trace session. */
  startTrace: (options: EngineRuntimeStartTraceInput) => EngineRuntimeStartTraceOutput;
  /** Stops one runtime trace session. */
  stopTrace: (traceId: string) => EngineRuntimeStopTraceOutput;
  /** Returns one runtime trace event stream. */
  getTrace: (traceId: string) => EngineRuntimeGetTraceOutput;
  /** Returns current runtime metrics snapshot. */
  getMetricsSnapshot: () => EngineRuntimeMetricsSnapshot;
  /** Captures one runtime frame diagnostics token. */
  captureFrame: (options?: EngineRuntimeCaptureFrameInput) => EngineRuntimeCaptureFrameOutput;
  /** Creates one deterministic replay token. */
  createReplayToken: (scope: string) => EngineRuntimeReplayTokenOutput;
  /** Replays one deterministic replay token. */
  replay: (token: string) => EngineRuntimeReplayOutput;
}

/**
 * Runtime compile trigger output contract exposed on engine.runtime direct APIs.
 */
export interface EngineRuntimeCompileTriggerOutput {
  /** True when compile trigger was accepted by runtime. */
  scheduled: boolean;
  /** Deterministic trigger reason token. */
  reason: string;
}

/**
 * Runtime submit output contract exposed on engine.runtime direct APIs.
 */
export interface EngineRuntimeSubmitOutput {
  /** Number of commands submitted in this call. */
  submittedCount: number;
}

/**
 * Runtime GPU resource descriptor contract exposed on engine.runtime direct APIs.
 */
export interface EngineRuntimeGpuResourceDescriptor {
  /** Stable resource id. */
  id: string;
  /** GPU resource kind token. */
  kind: string;
  /** Resource byte-size hint. */
  sizeBytes: number;
}

/**
 * Runtime GPU resource update output contract exposed on engine.runtime direct APIs.
 */
export interface EngineRuntimeGpuResourceOutput {
  /** Stable resource id. */
  id: string;
  /** True when resource exists after update operation. */
  exists: boolean;
}

/**
 * Runtime upload-batch output contract exposed on engine.runtime direct APIs.
 */
export interface EngineRuntimeUploadBatchOutput {
  /** Stable upload batch id. */
  batchId: string;
  /** Number of resource ids included in this batch. */
  resourceCount: number;
}

/**
 * Runtime barrier-plan output contract exposed on engine.runtime direct APIs.
 */
export interface EngineRuntimeBarrierPlanOutput {
  /** Stable barrier plan id. */
  planId: string;
  /** Number of resources included in this barrier plan. */
  resourceCount: number;
}

/**
 * Runtime barrier-apply output contract exposed on engine.runtime direct APIs.
 */
export interface EngineRuntimeBarrierApplyOutput {
  /** Barrier plan id requested for apply. */
  planId: string;
  /** True when barrier plan application succeeded. */
  applied: boolean;
}

/**
 * Runtime readback output contract exposed on engine.runtime direct APIs.
 */
export interface EngineRuntimeReadbackOutput {
  /** Resource id requested for readback. */
  resourceId: string;
  /** Readback byte length resolved by runtime. */
  byteLength: number;
}

/**
 * Runtime backend-state output contract exposed on engine.runtime direct APIs.
 */
export interface EngineRuntimeBackendStateOutput {
  /** Requested backend mode. */
  requested: EngineBackendMode | "auto";
  /** Resolved active backend mode. */
  resolved: EngineBackendMode;
  /** Optional fallback reason when requested and resolved differ. */
  fallbackReason: string | null;
}

/**
 * Runtime backend-fallback-history output contract exposed on engine.runtime direct APIs.
 */
export interface EngineRuntimeBackendFallbackHistoryOutput {
  /** Deterministic backend fallback history list. */
  history: readonly EngineRuntimeBackendFallbackTraceItem[];
}

/**
 * Runtime command-trace output contract exposed on engine.runtime direct APIs.
 */
export interface EngineRuntimeCommandTraceOutput {
  /** Stable command trace id. */
  traceId: string;
  /** Command count associated with this trace snapshot. */
  commandCount: number;
}

/**
 * Runtime spatial query output contract exposed on engine.runtime direct APIs.
 */
export interface EngineRuntimeSpatialQueryOutput {
  /** Deterministic node id list resolved by spatial query operation. */
  nodeIds: readonly string[];
}

/**
 * Runtime namespace API contract exposed under engine.runtime.
 */
export interface EngineRuntimeApi {
  /** Returns current runtime document snapshot. */
  getDocumentSnapshot: () => import("../document/document-contracts").EngineDocumentSnapshot;
  /** Returns current runtime document revision. */
  getDocumentRevision: () => number;
  /** Applies one runtime change-set through document execution path. */
  applyChangeSet: (input: EngineRuntimeDocumentApplyChangeSetInput) => EngineRuntimeDocumentApplyChangeSetResult;
  /** Compiles runtime world from optional document snapshot. */
  compileWorld: (options?: { snapshot?: import("../document/document-contracts").EngineDocumentSnapshot }) => EngineRuntimeWorldSnapshotOutput;
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
  /** Dirty foundation API namespace. */
  dirty: EngineRuntimeDirtyApi;
  /** Command foundation API namespace. */
  command: EngineRuntimeCommandApi;
  /** Backend foundation API namespace. */
  backend: EngineRuntimeBackendApi;
  /** Render-planning foundation API namespace. */
  plan: EngineRuntimePlanApi;
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
    request: import("../interaction/geometryPayload").ResolveEngineGeometryPayloadOptions,
  ) => import("../interaction/geometryPayload").EngineGeometryPayload;
}

/**
 * Capability geometry pack contract exposed under engine.capability.geometry.
 */
export interface EngineCapabilityGeometryApi {
  /**
   * Resolves matrix-based transform metadata from source box transform fields.
   */
  computeNodeTransform: (
    source: import("../interaction/shapeTransform").BoxTransformSource,
  ) => import("../interaction/shapeTransform").ResolvedNodeTransform;
  /**
   * Serializes one resolved node transform into SVG transform syntax.
   */
  formatNodeSvgTransform: (
    transform: import("../interaction/shapeTransform").ResolvedNodeTransform,
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
    options?: import("../interaction/hitTolerance").ResolveEngineAdaptiveHitToleranceOptions,
  ) => import("../interaction/hitTolerance").EngineAdaptiveHitTolerance;
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
export interface EngineHandle {
  /** Waits until engine runtime is ready for external API calls. */
  ready: () => Promise<void>;
  /** Mounts engine output to one host target. */
  mount: (target: unknown) => void;
  /** Unmounts engine output from current host target. */
  unmount: () => void;
  /** Applies developer-level config overrides. */
  configure: (options: Readonly<Record<string, unknown>>) => void;
  /** Returns current developer-level config snapshot. */
  getConfig: () => Readonly<Record<string, unknown>>;
  /** Resets developer-level config state for one optional scope token. */
  resetConfig: (scope?: string) => void;
  /**
   * Starts frame processing.
   */
  start: () => void;
  /**
   * Stops frame processing.
   */
  stop: () => void;
  /**
   * Pauses frame processing without disposing resources.
   */
  pause: () => void;
  /**
   * Resumes frame processing from paused state.
   */
  resume: () => void;
  /**
   * Resizes the engine surface.
   */
  resize: (width: number, height: number) => void;
  /**
   * Sets a full graph snapshot as runtime document source.
   */
  setGraph: (graph: EngineGraphInput) => void;
  /**
   * Applies an incremental graph patch batch.
   */
  updateGraph: (patch: EngineGraphPatchInput) => void;
  /** Applies a batch of incremental graph patches. */
  batchUpdateGraph: (patches: readonly EngineGraphPatchInput[]) => void;
  /** Returns current graph snapshot tracked by engine facade. */
  getGraph: () => EngineGraphInput;
  /** Clears all graph nodes from current engine session. */
  clearGraph: () => void;
  /** Validates graph payload against minimal runtime contract checks. */
  validateGraph: (graph: EngineGraphInput) => EngineGraphValidationOutput;
  /** Normalizes graph payload to deterministic node ordering. */
  normalizeGraph: (input: EngineGraphInput) => EngineGraphInput;
  /** Imports graph payload and applies it to current engine session. */
  importGraph: (payload: unknown, options?: Readonly<Record<string, unknown>>) => EngineGraphInput;
  /** Exports current graph payload with optional export options. */
  exportGraph: (options?: Readonly<Record<string, unknown>>) => EngineGraphInput;
  /**
   * Queries graph nodes intersecting one world-space bounds payload.
   */
  query: (bounds: EngineQueryBoundsInput) => EngineQueryResult;
  /**
   * Resolves deterministic point hits against current graph bounds.
   */
  pick: (point: EnginePickPointInput, options?: EnginePickOptions) => EnginePickResult;
  /**
   * Resolves nearest 3D ray hit against current graph bounds.
   */
  raycast: (ray: EngineRayInput, options?: EngineRaycastOptions) => EngineRaycastHit | null;
  /**
   * Renders one frame on demand and returns stable frame metrics.
   */
  render: () => Promise<EngineRenderResult>;
  /** Renders one frame immediately with optional request payload. */
  renderNow: (request?: Readonly<Record<string, unknown>>) => Promise<EngineRenderResult>;
  /**
   * Applies viewport state updates.
   */
  setView: (view: EngineViewInput) => EngineViewSnapshot;
  /** Returns current viewport state snapshot. */
  getView: () => EngineViewSnapshot;
  /** Fits viewport to one world-space bounds payload. */
  fitToBounds: (
    bounds: EngineQueryBoundsInput,
    options?: Readonly<Record<string, unknown>>,
  ) => EngineViewSnapshot;
  /** Resets viewport state to deterministic defaults. */
  resetView: (options?: Readonly<Record<string, unknown>>) => EngineViewSnapshot;
  /** Sets current multi-viewport layout payload. */
  setViewportLayout: (layout: unknown) => void;
  /** Returns current multi-viewport layout payload. */
  getViewportLayout: () => unknown;
  /** Converts one screen point to world point using current viewport transform. */
  screenToWorld: (point: EnginePoint2, options?: Readonly<Record<string, unknown>>) => EnginePoint2;
  /** Converts one world point to screen point using current viewport transform. */
  worldToScreen: (point: EnginePoint2, options?: Readonly<Record<string, unknown>>) => EnginePoint2;
  /** Sets quality profile token consumed by runtime orchestration. */
  setQuality: (profile: string) => void;
  /** Returns current quality profile token. */
  getQuality: () => string;
  /** Sets frame budget in milliseconds. */
  setFrameBudget: (budget: number) => void;
  /** Returns current frame budget in milliseconds. */
  getFrameBudget: () => number;
  /**
   * Sets overlay nodes consumed by overlay runtime channels.
   */
  setOverlays: (overlays: readonly unknown[]) => void;
  /** Appends overlay nodes to current overlay set. */
  appendOverlays: (overlays: readonly unknown[]) => void;
  /** Updates one overlay by id with patch payload. */
  updateOverlay: (overlayId: string, patch: Readonly<Record<string, unknown>>) => void;
  /** Removes one overlay by id. */
  removeOverlay: (overlayId: string) => void;
  /** Clears overlays for one optional scope token. */
  clearOverlays: (scope?: string) => void;
  /** Sets transform preview payload consumed by interaction tooling. */
  setTransformPreview: (preview: unknown) => void;
  /** Clears transform preview payload. */
  clearTransformPreview: () => void;
  /** Sets annotation payload collection. */
  setAnnotations: (annotations: readonly unknown[]) => void;
  /** Clears annotation payload collection for one optional scope token. */
  clearAnnotations: (scope?: string) => void;
  /**
   * Marks runtime state dirty for one optional reason/region payload.
   */
  invalidate: (input?: EngineInvalidateInput) => void;
  /** Resolves deterministic rect-pick hits for current graph state. */
  pickRect: (rect: EngineRectInput, options?: EnginePickOptions) => EnginePickResult;
  /** Resolves deterministic lasso-pick hits for current graph state. */
  pickLasso: (lasso: EngineLassoInput, options?: EnginePickOptions) => EnginePickResult;
  /** Resolves deterministic frustum query for current graph state. */
  queryFrustum: (
    frustum: Readonly<Record<string, unknown>>,
    options?: Readonly<Record<string, unknown>>,
  ) => EngineQueryResult;
  /** Sets interaction state payload consumed by runtime planner. */
  setInteractionState: (state: Readonly<Record<string, unknown>>) => void;
  /** Clears interaction state for one optional scope token. */
  clearInteractionState: (scope?: string) => void;
  /** Loads assets into current engine session. */
  loadAssets: (assets: readonly { id: string }[]) => readonly EngineAssetStateOutput[];
  /** Preloads assets into current engine session. */
  preloadAssets: (request: readonly { id: string }[]) => readonly EngineAssetStateOutput[];
  /** Unloads assets from current engine session. */
  unloadAssets: (assetIds: readonly string[]) => readonly EngineAssetStateOutput[];
  /** Returns state for one asset id. */
  getAssetState: (assetId: string) => EngineAssetStateOutput;
  /** Returns aggregate asset stats. */
  getAssetStats: () => EngineAssetStatsOutput;
  /** Sets media source payload list for runtime consumption. */
  setMediaSources: (sources: readonly unknown[]) => void;
  /** Seeks active media timeline to one timestamp. */
  seekMedia: (time: number) => void;
  /** Captures one image payload from current frame state. */
  captureImage: (options?: Readonly<Record<string, unknown>>) => EngineCaptureImageOutput;
  /** Captures one video-frame payload from current frame state. */
  captureVideoFrame: (
    options?: Readonly<Record<string, unknown>>,
  ) => EngineCaptureVideoFrameOutput;
  /** Sets preferred backend mode token for future backend selection operations. */
  setBackendPreference: (preference: EngineBackendMode) => void;
  /** Returns public capability snapshot. */
  getCapabilities: () => EnginePublicCapabilitiesOutput;
  /** Creates one headless render session. */
  createHeadlessSession: (
    options?: Readonly<Record<string, unknown>>,
  ) => EngineHeadlessSessionOutput;
  /** Destroys one headless render session by id. */
  destroyHeadlessSession: (sessionId: string) => EngineHeadlessSessionDestroyOutput;
  /** Executes one headless render and returns deterministic summary. */
  renderHeadless: (request?: Readonly<Record<string, unknown>>) => Promise<EngineHeadlessRenderOutput>;
  /** Registers one event listener for provided event type. */
  on: (event: string, listener: EngineEventListener) => void;
  /** Unregisters one event listener for provided event type. */
  off: (event: string, listener: EngineEventListener) => void;
  /** Registers one one-shot event listener for provided event type. */
  once: (event: string, listener: EngineEventListener) => void;
  /** Returns public metrics snapshot. */
  getMetrics: () => EnginePublicMetricsOutput;
  /** Enables or disables diagnostics capture paths. */
  setDiagnosticsEnabled: (enabled: boolean) => void;
  /** Captures one debug frame payload with optional metadata options. */
  captureDebugFrame: (options?: Readonly<Record<string, unknown>>) => EngineCaptureImageOutput;
  /** Creates one replay token from provided scope string. */
  createReplayToken: (scope: string) => EngineRuntimeReplayTokenOutput;
  /** Replays one token through runtime replay pipeline. */
  replay: (token: string) => EngineRuntimeReplayOutput;
  /**
   * Returns public diagnostics payload for runtime bridge and tooling.
   */
  getDiagnostics: () => EngineDiagnosticsSnapshot;
  /**
   * Captures a frame token for diagnostics.
   */
  captureFrame: () => { timestampMs: number };
  /**
   * Returns a stable stats snapshot.
   */
  getStats: () => EngineStatsSnapshot;
  /**
   * Returns backend selection metadata.
   */
  getBackendInfo: () => BackendSelectionResult;
  /**
   * Returns runtime foundation API namespaces.
   */
  runtime: EngineRuntimeApi;
  /**
   * Returns capability-oriented public API namespaces.
   */
  capability: EngineCapabilityApi;
  /**
   * Releases runtime resources and terminally stops execution.
   */
  dispose: () => void;
}
