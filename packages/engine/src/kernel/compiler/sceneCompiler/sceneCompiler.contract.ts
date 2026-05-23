import type {
  EngineIncrementalCompileOutput,
} from "../incrementalCompiler";
import type {
  EngineDocumentChangeSet,
  EngineDocumentSnapshot,
} from "../../document/document-contracts";

/**
 * Input payload consumed by the scene-compiler module contract.
 */
export interface EngineSceneCompileInput {
  /** Snapshot before applying the change-set. */
  previousSnapshot: EngineDocumentSnapshot;
  /** Snapshot after applying the change-set. */
  currentSnapshot: EngineDocumentSnapshot;
  /** Applied deterministic change-set. */
  changeSet: EngineDocumentChangeSet;
}

/**
 * Contract for one scene-compiler module producing deterministic invalidation outputs.
 */
export interface EngineSceneCompilerModule {
  /**
   * Compiles one applied change-set into invalidation categories and changed-node metadata.
   */
  compileChangeSet: (input: EngineSceneCompileInput) => EngineIncrementalCompileOutput;
}
