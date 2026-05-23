import type {
  EngineIncrementalCompileOutput,
} from "../../compiler/incrementalCompiler";
import type {
  EngineDocumentChangeSet,
  EngineDocumentSnapshot,
} from "../../document/document-contracts";

/**
 * Declares one core-owned incremental compiler module contract.
 */
export interface EngineCompilerModule {
  /**
   * Compiles one change-set into deterministic invalidation output.
   */
  compileChangeSet: (options: {
    /** Snapshot before change-set application. */
    previousSnapshot: EngineDocumentSnapshot;
    /** Snapshot after change-set application. */
    currentSnapshot: EngineDocumentSnapshot;
    /** Applied deterministic change-set. */
    changeSet: EngineDocumentChangeSet;
  }) => EngineIncrementalCompileOutput;
}
