import type {
  EngineDocumentChangeSet,
  EngineDocumentNode,
  EngineDocumentSnapshot,
} from "../document-contracts";

/**
 * Optional bootstrap payload when creating a document-graph snapshot.
 */
export interface EngineDocumentGraphCreateSnapshotOptions {
  /** Initial revision used by the immutable snapshot. */
  revision?: number;
  /** Initial node table keyed by stable node id. */
  nodes?: Readonly<Record<string, EngineDocumentNode>>;
}

/**
 * Contract for document-graph module owned by the normalized document layer.
 */
export interface EngineDocumentGraphModule {
  /**
   * Creates one deterministic immutable snapshot from optional bootstrap input.
   */
  createSnapshot: (
    options?: EngineDocumentGraphCreateSnapshotOptions,
  ) => EngineDocumentSnapshot;
  /**
   * Applies one ordered change-set and returns the next immutable snapshot.
   */
  applyChangeSet: (
    currentSnapshot: EngineDocumentSnapshot,
    changeSet: EngineDocumentChangeSet,
  ) => EngineDocumentSnapshot;
}
