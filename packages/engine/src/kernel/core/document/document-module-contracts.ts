import type {
  EngineDocumentChangeSet,
  EngineDocumentSnapshot,
} from "../../document/document-contracts";

/**
 * Declares one core-owned document store module contract.
 */
export interface EngineDocumentStoreModule {
  /**
   * Creates one normalized immutable document snapshot.
   */
  createSnapshot: (options?: {
    /** Initial revision used by the snapshot. */
    revision?: number;
    /** Initial node table keyed by node id. */
    nodes?: Readonly<EngineDocumentSnapshot["nodes"]>;
  }) => EngineDocumentSnapshot;
  /**
   * Applies one ordered change-set and returns the next immutable snapshot.
   */
  applyChangeSet: (
    currentSnapshot: EngineDocumentSnapshot,
    changeSet: EngineDocumentChangeSet,
  ) => EngineDocumentSnapshot;
}
