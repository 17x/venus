/**
 * Supported document node kinds used by staged document/compiler contracts.
 */
export type EngineDocumentNodeKind = "group" | "shape" | "text" | "image" | "custom";

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
