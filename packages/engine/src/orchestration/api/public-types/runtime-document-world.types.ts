import type { EngineDocumentChangeSet } from "../../../kernel/document/document-contracts";
import type { EngineBackendMode } from "./core-foundation.types";

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
  base: import("../../../kernel/document/document-contracts").EngineDocumentSnapshot;
  /** Target snapshot used as the right side of comparison. */
  target: import("../../../kernel/document/document-contracts").EngineDocumentSnapshot;
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
  changeSet: import("../../../kernel/document/document-contracts").EngineDocumentChangeSet;
}

/**
 * Runtime document serialize request contract exposed on engine.runtime.document API.
 */
export interface EngineRuntimeDocumentSerializeSnapshotInput {
  /** Snapshot payload to serialize. */
  snapshot: import("../../../kernel/document/document-contracts").EngineDocumentSnapshot;
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
  nodes: import("../../../kernel/document/document-contracts").EngineDocumentSnapshot["nodes"];
}

/**
 * Runtime document validate-snapshot request contract exposed on engine.runtime.document API.
 */
export interface EngineRuntimeDocumentValidateSnapshotInput {
  /** Snapshot payload to validate. */
  snapshot: import("../../../kernel/document/document-contracts").EngineDocumentSnapshot;
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
  snapshot: import("../../../kernel/document/document-contracts").EngineDocumentSnapshot;
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
