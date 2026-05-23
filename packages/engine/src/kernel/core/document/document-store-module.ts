import {
  applyDocumentChangeSet,
  createDocumentSnapshot,
} from "../../document/document-store";
import type { EngineDocumentStoreModule } from "./document-module-contracts";

/**
 * Creates one core document-store module that wraps canonical document-store behavior.
 */
export function createEngineDocumentStoreModule(): EngineDocumentStoreModule {
  return {
    /**
     * Creates one normalized immutable document snapshot through canonical store implementation.
     * @param options Optional initial revision and nodes for the snapshot.
     */
    createSnapshot(options) {
      return createDocumentSnapshot(options);
    },
    /**
     * Applies one ordered change-set through canonical store implementation.
     * @param currentSnapshot Current immutable document snapshot.
     * @param changeSet Ordered document mutations to apply.
     */
    applyChangeSet(currentSnapshot, changeSet) {
      return applyDocumentChangeSet(currentSnapshot, changeSet);
    },
  };
}
