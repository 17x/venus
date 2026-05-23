import type {
  EngineBackendMode,
} from "./core-foundation.types";
import type {
  EngineRuntimeBackendFallbackTraceItem,
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
  EngineRuntimeCommandCreateEncoderInput,
  EngineRuntimeCommandCreateEncoderOutput,
  EngineRuntimeCommandEncodeInput,
  EngineRuntimeCommandEncodeOutput,
  EngineRuntimeCommandInspectOutput,
  EngineRuntimeCommandOptimizeInput,
  EngineRuntimeCommandOptimizeOutput,
  EngineRuntimeCommandReplayOutput,
  EngineRuntimeCommandValidateInput,
  EngineRuntimeCommandValidateOutput,
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
  EngineRuntimeLodPlanOutput,
  EngineRuntimeLodPlanRequest,
  EngineRuntimePlanFrameRequest,
  EngineRuntimeRoiPlanOutput,
  EngineRuntimeRoiPlanRequest,
  EngineRuntimeVisibilityPlanOutput,
  EngineRuntimeVisibilityPlanRequest,
  EngineRuntimeWorldClearOutput,
  EngineRuntimeWorldCompileFromDocumentInput,
  EngineRuntimeWorldGraphStatsOutput,
  EngineRuntimeWorldQueryComponentInput,
  EngineRuntimeWorldQueryComponentOutput,
  EngineRuntimeWorldQueryEntityInput,
  EngineRuntimeWorldQueryEntityOutput,
  EngineRuntimeWorldSnapshotOutput,
} from "./runtime-document-world.types";

export interface EngineRuntimePlanInspectOutput {
  /** True when plan payload contains minimal inspectable fields. */
  valid: boolean;
  /** Canonical summary text for diagnostics and logs. */
  summary: string;
}

/**
 * Runtime compression codec tokens accepted by resource descriptor contracts.
 */
export type EngineRuntimeCompressionCodec =
  | "none"
  | "basisu"
  | "ktx2"
  | "draco"
  | "meshopt";

/**
 * Runtime payload categories that can opt into compression policy planning.
 */
export type EngineRuntimeCompressionPayloadKind =
  | "texture"
  | "geometry"
  | "animation";

/**
 * Runtime chunking policy used for streaming and decode-budget partitioning.
 */
export type EngineRuntimeCompressionChunkPolicy =
  | "none"
  | "fixed"
  | "streaming";

/**
 * Runtime delta policy used for geometry/animation differential payload decoding.
 */
export type EngineRuntimeCompressionDeltaPolicy =
  | "none"
  | "frame"
  | "keyframe";

/**
 * Runtime decode precision policy token selected from interaction/zoom/LOD context.
 */
export type EngineRuntimeDecodePrecisionPolicy =
  | "full"
  | "balanced"
  | "interaction";

/**
 * Runtime deterministic checkpoint mode used for replay-safe decode restoration.
 */
export type EngineRuntimeDecodeCheckpointMode =
  | "none"
  | "frame"
  | "revision";

/**
 * Runtime decode context snapshot used to pick deterministic precision policy.
 */
export interface EngineRuntimeResourceDecodeContext {
  /** Whether interaction-sensitive decoding is currently active. */
  interactionActive: boolean;
  /** Stable zoom bucket token used by precision policy resolver. */
  zoomBucket: "near" | "mid" | "far";
  /** Stable LOD tier token used by precision policy resolver. */
  lodTier: "high" | "medium" | "low";
}

/**
 * Runtime compression policy descriptor for geometry/animation decode planning.
 */
export interface EngineRuntimeResourceCompressionPolicyDescriptor {
  /** Payload category used to separate texture/geometry/animation policy defaults. */
  payloadKind: EngineRuntimeCompressionPayloadKind;
  /** Optional quantization bit count used for deterministic decode precision bounds. */
  quantizationBits?: number;
  /** Delta policy token used by compressed payload decode path. */
  deltaPolicy: EngineRuntimeCompressionDeltaPolicy;
  /** Chunking policy token used by streaming/decode budget planner. */
  chunkPolicy: EngineRuntimeCompressionChunkPolicy;
  /** Replay-safe checkpoint mode token used by decode resume pipeline. */
  checkpointMode: EngineRuntimeDecodeCheckpointMode;
  /** Decode context snapshot used to resolve precision policy deterministically. */
  decodeContext: EngineRuntimeResourceDecodeContext;
}

/**
 * Runtime decode stage tokens used by compressed-resource residency contracts.
 */
export type EngineRuntimeResourceDecodeStage =
  | "registered"
  | "queued"
  | "decoding"
  | "ready"
  | "failed";

/**
 * Compression descriptor payload attached to runtime resource contracts.
 */
export interface EngineRuntimeResourceCompressionDescriptor {
  /** Compression codec used by source payload. */
  codec: EngineRuntimeCompressionCodec;
  /** Optional runtime transcode target format token. */
  transcodeTarget?: string;
  /** Compressed payload size in bytes before decode/transcode. */
  payloadBytes: number;
  /** Optional decoded-size estimate in bytes for budget planning. */
  decodedBytesEstimate?: number;
  /** Optional runtime policy descriptor for geometry/animation decode planning. */
  policy?: EngineRuntimeResourceCompressionPolicyDescriptor;
}

/**
 * Runtime decode-status payload for compressed resource descriptors.
 */
export interface EngineRuntimeResourceDecodeStatusOutput {
  /** Stable resource id associated with this decode status snapshot. */
  resourceId: string;
  /** Current decode lifecycle stage for this resource. */
  stage: EngineRuntimeResourceDecodeStage;
  /** Compression codec used by this resource. */
  codec: EngineRuntimeCompressionCodec;
  /** Optional runtime transcode target format token. */
  transcodeTarget: string | null;
  /** Optional deterministic decode/transcode error code when stage is failed. */
  errorCode: string | null;
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
  /** Optional compression descriptor for compressed payload lifecycles. */
  compression?: EngineRuntimeResourceCompressionDescriptor;
}

/**
 * Runtime resource patch payload used by update API.
 */
export interface EngineRuntimeResourcePatch {
  /** Optional next resource size in bytes. */
  sizeBytes?: number;
  /** Optional next compression descriptor; null clears compression metadata. */
  compression?: EngineRuntimeResourceCompressionDescriptor | null;
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
  /** Compression descriptor for this resource; null when uncompressed. */
  compression: EngineRuntimeResourceCompressionDescriptor | null;
  /** Current decode lifecycle stage for this resource. */
  decodeStatus: EngineRuntimeResourceDecodeStage;
  /** Current decode precision policy selected for this resource. */
  decodePrecisionPolicy: EngineRuntimeDecodePrecisionPolicy;
  /** Current deterministic decode checkpoint mode for this resource. */
  decodeCheckpointMode: EngineRuntimeDecodeCheckpointMode;
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
  ) => import("../../../kernel/document/document-contracts").EngineDocumentSnapshot;
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
  ) => import("../../../kernel/document/document-contracts").EngineDocumentChangeSet;
  /** Serializes one document snapshot into stable JSON payload. */
  serializeSnapshot: (
    input: EngineRuntimeDocumentSerializeSnapshotInput,
  ) => EngineRuntimeDocumentSerializeSnapshotOutput;
  /** Deserializes one document snapshot payload into runtime snapshot object. */
  deserializeSnapshot: (
    input: EngineRuntimeDocumentDeserializeSnapshotInput,
  ) => import("../../../kernel/document/document-contracts").EngineDocumentSnapshot;
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
    source: import("../../../kernel/interaction/shapeTransform").BoxTransformSource,
  ) => import("../../../kernel/interaction/shapeTransform").ResolvedNodeTransform;
  /** Serializes one resolved node transform into SVG transform syntax. */
  formatNodeSvgTransform: (
    transform: import("../../../kernel/interaction/shapeTransform").ResolvedNodeTransform,
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
    request: import("../../../kernel/interaction/geometryPayload").ResolveEngineGeometryPayloadOptions,
  ) => import("../../../kernel/interaction/geometryPayload").EngineGeometryPayload;
  /** Resolves adaptive hit tolerance from viewport/tuning options. */
  resolveHitTolerance: (
    options?: import("../../../kernel/interaction/hitTolerance").ResolveEngineAdaptiveHitToleranceOptions,
  ) => import("../../../kernel/interaction/hitTolerance").EngineAdaptiveHitTolerance;
  /** Requests one scheduled render frame and returns deterministic request id. */
  requestFrame: (mode?: "interactive" | "normal") => { requestId: string; scheduled: boolean };
  /** Cancels one scheduled render frame by request id. */
  cancelFrame: (requestId: string) => { cancelled: boolean };
  /** Sets scheduler interactive throttle interval in milliseconds. */
  setInteractiveInterval: (intervalMs: number) => { intervalMs: number };
  /** Returns scheduler diagnostics snapshot for queue/throttle monitoring. */
  getSchedulerDiagnostics: () => import("../../renderScheduler").EngineRenderSchedulerDiagnostics;
  /** Inspects one runtime plan payload and returns summary metadata. */
  inspect: (plan: unknown) => EngineRuntimePlanInspectOutput;
}

/**
 * Runtime volume slice-axis tokens used by canonical slice-planning contracts.
 */
export type EngineRuntimeVolumeSliceAxis =
  | "axial"
  | "coronal"
  | "sagittal"
  | "oblique";

/**
 * Runtime volume slice-plan request contract.
 */
export interface EngineRuntimeVolumeSlicePlanInput {
  /** Runtime resource id for the source volume payload. */
  volumeResourceId: string;
  /** Canonical slice axis used by the runtime planner. */
  axis: EngineRuntimeVolumeSliceAxis;
  /** Zero-based slice index requested by caller. */
  sliceIndex: number;
  /** Optional slab thickness in voxel units. */
  slabThicknessVoxels?: number;
  /** Optional spacing in millimeters for deterministic sample-step hints. */
  spacingMm?: {
    /** Source payload spacing on x axis. */
    x: number;
    /** Source payload spacing on y axis. */
    y: number;
    /** Source payload spacing on z axis. */
    z: number;
  };
}

/**
 * Runtime volume slice-plan output contract.
 */
export interface EngineRuntimeVolumeSlicePlanOutput {
  /** Stable deterministic plan id derived from planner inputs. */
  planId: string;
  /** Runtime resource id for the source volume payload. */
  volumeResourceId: string;
  /** Canonical slice axis used by planner output. */
  axis: EngineRuntimeVolumeSliceAxis;
  /** Clamped non-negative slice index used by runtime. */
  sliceIndex: number;
  /** Inclusive slab-start slice index. */
  slabStartIndex: number;
  /** Inclusive slab-end slice index. */
  slabEndIndex: number;
  /** Deterministic sample-step hint in millimeters. */
  sampleStepMm: number;
}

/**
 * One transfer-function opacity stop contract used by volume mapping hooks.
 */
export interface EngineRuntimeTransferOpacityStop {
  /** Normalized transfer position in [0, 1]. */
  position: number;
  /** Opacity value in [0, 1]. */
  opacity: number;
}

/**
 * One transfer-function color stop contract used by volume mapping hooks.
 */
export interface EngineRuntimeTransferColorStop {
  /** Normalized transfer position in [0, 1]. */
  position: number;
  /** Hex-like color token accepted by renderer adapters. */
  color: string;
}

/**
 * Runtime transfer-function resolve request contract.
 */
export interface EngineRuntimeVolumeTransferFunctionInput {
  /** Window center used by deterministic transfer-window normalization. */
  windowCenter: number;
  /** Window width used by deterministic transfer-window normalization. */
  windowWidth: number;
  /** Optional inversion flag for luminance mapping. */
  invert?: boolean;
  /** Optional caller-provided opacity stops. */
  opacityStops?: readonly EngineRuntimeTransferOpacityStop[];
  /** Optional caller-provided color stops. */
  colorStops?: readonly EngineRuntimeTransferColorStop[];
}

/**
 * Runtime transfer-function resolve output contract.
 */
export interface EngineRuntimeVolumeTransferFunctionOutput {
  /** Stable deterministic transfer id derived from normalized input. */
  transferId: string;
  /** Resolved window minimum. */
  windowMin: number;
  /** Resolved window maximum. */
  windowMax: number;
  /** Resolved inversion flag after normalization. */
  invert: boolean;
  /** Deterministic opacity-stop sequence sorted by position. */
  opacityStops: readonly EngineRuntimeTransferOpacityStop[];
  /** Deterministic color-stop sequence sorted by position. */
  colorStops: readonly EngineRuntimeTransferColorStop[];
}

/**
 * Runtime residency-budget request contract for volume-oriented planning hooks.
 */
export interface EngineRuntimeVolumeResidencyBudgetInput {
  /** Resource ids participating in residency-budget planning. */
  volumeResourceIds: readonly string[];
  /** Planner quality target used by deterministic budget fallback policy. */
  target: "interaction" | "preview" | "quality";
  /** Optional explicit budget override in bytes. */
  maxBytes?: number;
}

/**
 * One residency-budget resource-state output item.
 */
export interface EngineRuntimeVolumeResidencyBudgetResourceState {
  /** Stable resource id. */
  resourceId: string;
  /** Resource size in bytes from residency snapshot. */
  sizeBytes: number;
  /** Pinning state from residency snapshot. */
  pinned: boolean;
  /** Decode lifecycle stage from residency snapshot. */
  decodeStatus: EngineRuntimeResourceDecodeStage;
}

/**
 * Runtime residency-budget output contract.
 */
export interface EngineRuntimeVolumeResidencyBudgetOutput {
  /** Effective budget in bytes after fallback/override resolution. */
  budgetBytes: number;
  /** Estimated resident bytes across known resources. */
  estimatedResidentBytes: number;
  /** True when estimated bytes exceed effective budget. */
  overBudget: boolean;
  /** Resource ids missing from residency registry lookups. */
  missingResourceIds: readonly string[];
  /** Deterministic resource-state sequence aligned to input order. */
  resourceStates: readonly EngineRuntimeVolumeResidencyBudgetResourceState[];
}

/**
 * Runtime volume namespace API contract exposed under engine.runtime.volume.
 */
export interface EngineRuntimeVolumeApi {
  /** Creates one deterministic slice plan from volume resource and axis inputs. */
  createSlicePlan: (input: EngineRuntimeVolumeSlicePlanInput) => EngineRuntimeVolumeSlicePlanOutput;
  /** Resolves one deterministic transfer-function payload from window/stops input. */
  resolveTransferFunction: (
    input: EngineRuntimeVolumeTransferFunctionInput,
  ) => EngineRuntimeVolumeTransferFunctionOutput;
  /** Resolves one deterministic residency-budget summary from resource residency snapshots. */
  resolveResidencyBudget: (
    input: EngineRuntimeVolumeResidencyBudgetInput,
  ) => EngineRuntimeVolumeResidencyBudgetOutput;
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
