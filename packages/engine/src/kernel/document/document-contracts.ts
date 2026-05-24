/**
 * Supported document node kinds used by staged document/compiler contracts.
 */
export type EngineDocumentNodeKind = "group" | "shape" | "text" | "image" | "custom";

/**
 * Canonical 3D box bounds owned by document semantic payloads.
 */
export interface EngineDocumentNodeBounds3D {
  /** Left position in world coordinates. */
  x: number;
  /** Top position in world coordinates. */
  y: number;
  /** Front position in world coordinates. */
  z: number;
  /** Width in world coordinates. */
  width: number;
  /** Height in world coordinates. */
  height: number;
  /** Depth in world coordinates. */
  depth: number;
}

/**
 * Canonical 3D transform payload aligned to document semantic ownership.
 */
export interface EngineDocumentNodeTransform3D {
  /** Translation in world X axis. */
  x: number;
  /** Translation in world Y axis. */
  y: number;
  /** Translation in world Z axis. */
  z: number;
  /** Rotation in degrees around X axis. */
  rotationX: number;
  /** Rotation in degrees around Y axis. */
  rotationY: number;
  /** Rotation in degrees around Z axis. */
  rotationZ: number;
  /** Scale factor on X axis. */
  scaleX: number;
  /** Scale factor on Y axis. */
  scaleY: number;
  /** Scale factor on Z axis. */
  scaleZ: number;
}

/**
 * Optional semantic envelope that carries graph-level 3D scene meaning.
 */
export interface EngineDocumentNodeSemantic3D {
  /** Canonical 3D bounds used by world projection and picking systems. */
  bounds: EngineDocumentNodeBounds3D;
  /** Canonical 3D transform used by runtime world composition. */
  transform: EngineDocumentNodeTransform3D;
  /** Optional source node type from product/runtime adapters. */
  sourceType?: string;
  /** Optional render ordering token propagated from graph adapters. */
  renderOrder?: number;
  /** Optional visibility bit mirrored from graph adapters. */
  visible?: boolean;
  /** Optional lighting mode hint for renderer/backends. */
  lightingMode?: "inherit" | "unlit" | "lit";
  /** Optional material binding id used by backend material systems. */
  materialId?: string;
}

/**
 * Version counters that let the compiler map node updates to invalidation categories.
 */
export interface EngineDocumentNodePayload {
  /** Optional transform revision counter for position/scale/rotation updates. */
  transformRevision?: number;
  /** Optional geometry revision counter for shape/path topology updates. */
  geometryRevision?: number;
  /** Optional material revision counter for fill/stroke/shader updates. */
  materialRevision?: number;
  /** Optional text revision counter for glyph/layout updates. */
  textRevision?: number;
  /** Optional visibility revision counter for hidden/locked/layer updates. */
  visibilityRevision?: number;
  /** Optional picking revision counter for hit-test related updates. */
  pickingRevision?: number;
  /** Optional upload revision counter for GPU upload lifecycle updates. */
  gpuUploadRevision?: number;
}

/**
 * Persistent document node contract owned by the document layer.
 */
export interface EngineDocumentNode {
  /** Stable node identifier. */
  id: string;
  /** Semantic node kind used by compiler and extraction layers. */
  kind: EngineDocumentNodeKind;
  /** Optional parent node id for hierarchy reconstruction. */
  parentId?: string;
  /** Explicit payload revision counters consumed by incremental compiler. */
  payload: EngineDocumentNodePayload;
  /** Optional 3D semantic envelope carried across document->world pipeline. */
  semantic3d?: EngineDocumentNodeSemantic3D;
}

/**
 * Immutable document snapshot used as the source of truth for compiler input.
 */
export interface EngineDocumentSnapshot {
  /** Monotonic document revision that increases after every change-set application. */
  revision: number;
  /** Node table keyed by stable node id. */
  nodes: Readonly<Record<string, EngineDocumentNode>>;
}

/**
 * Upsert operation inserts a new node or replaces an existing node by id.
 */
export interface EngineDocumentUpsertNodeOperation {
  /** Discriminant used by replay and compiler logic. */
  type: "upsert-node";
  /** Full node payload written into document state. */
  node: EngineDocumentNode;
}

/**
 * Remove operation deletes one node by id if it exists.
 */
export interface EngineDocumentRemoveNodeOperation {
  /** Discriminant used by replay and compiler logic. */
  type: "remove-node";
  /** Node id to remove from document state. */
  nodeId: string;
}

/**
 * Change operation union used by deterministic replay and compiler inputs.
 */
export type EngineDocumentChangeOperation =
  | EngineDocumentUpsertNodeOperation
  | EngineDocumentRemoveNodeOperation;

/**
 * Ordered change-set applied atomically to one document snapshot.
 */
export interface EngineDocumentChangeSet {
  /** Caller-defined deterministic change-set id for traceability. */
  id: string;
  /** Optional explicit target revision expected after application. */
  targetRevision?: number;
  /** Ordered operations that mutate the document snapshot. */
  operations: readonly EngineDocumentChangeOperation[];
}

/**
 * Adapter-submitted envelope that proves document deltas were linearized before engine ingestion.
 */
export interface EngineDocumentLinearizedDeltaEnvelope {
  /** Stable envelope id used for deterministic diagnostics and replay traceability. */
  id: string;
  /** Source adapter identifier that produced the linearized payload. */
  sourceAdapter: string;
  /** Revision the adapter observed before producing this delta payload. */
  baseRevision: number;
  /** Revision expected after applying the enclosed change-set. */
  targetRevision: number;
  /** Monotonic sequence generated by adapter per sourceAdapter stream. */
  sequence: number;
  /** Optional adapter-produced timestamp in epoch milliseconds. */
  producedAtMs?: number;
  /** Deterministic document mutations carried by this linearized envelope. */
  changeSet: EngineDocumentChangeSet;
}

/**
 * Pixel format labels accepted by engine runtime decoded-frame ingestion guards.
 */
export type EngineDecodedFramePixelFormat =
  | "rgba8-unorm"
  | "bgra8-unorm"
  | "r8-unorm"
  | "rgba16-float";

/**
 * Color-space labels accepted by engine runtime decoded-frame ingestion guards.
 */
export type EngineDecodedFrameColorSpace = "srgb" | "display-p3" | "rec709" | "rec2020";

/**
 * Transport/storage kinds for decoded-frame payloads submitted by product adapters.
 */
export type EngineDecodedFrameStorageKind =
  | "typed-array"
  | "image-bitmap"
  | "external-texture";

/**
 * Adapter-submitted decoded frame descriptor consumed by engine timeline/render ingestion paths.
 */
export interface EngineDecodedFramePayloadDescriptor {
  /** Stable frame payload id used for deterministic diagnostics traceability. */
  id: string;
  /** Stable adapter identifier that produced this decoded frame payload. */
  sourceAdapter: string;
  /** Track id used by timeline composition and clip routing. */
  trackId: string;
  /** Clip id used by timeline composition and clip lifecycle telemetry. */
  clipId: string;
  /** Decoded frame timestamp in milliseconds on media timeline. */
  timestampMs: number;
  /** Decoded frame duration in milliseconds. */
  durationMs: number;
  /** Decoded frame width in pixels. */
  width: number;
  /** Decoded frame height in pixels. */
  height: number;
  /** Decoded frame pixel format consumed by render upload paths. */
  pixelFormat: EngineDecodedFramePixelFormat;
  /** Decoded frame color-space metadata consumed by shader/render transforms. */
  colorSpace: EngineDecodedFrameColorSpace;
  /** Decoded frame storage transport kind consumed by runtime ingestion. */
  storageKind: EngineDecodedFrameStorageKind;
  /** Total decoded payload byte-length for guardrails and diagnostics. */
  byteLength: number;
  /** Optional key-frame marker propagated from adapter decode pipeline. */
  keyFrame?: boolean;
}
