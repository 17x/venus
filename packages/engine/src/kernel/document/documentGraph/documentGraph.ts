import {
  applyDocumentChangeSet,
  createDocumentSnapshot,
} from "../document-store";
import type { EngineDocumentGraphModule } from "./documentGraph.contract";

/**
 * Creates the canonical document-graph module that wraps normalized snapshot operations.
 */
export function createEngineDocumentGraphModule(): EngineDocumentGraphModule {
  return {
    createSnapshot: (options) => createDocumentSnapshot(options),
    applyChangeSet: (currentSnapshot, changeSet) =>
      applyDocumentChangeSet(currentSnapshot, changeSet),
  };
}
