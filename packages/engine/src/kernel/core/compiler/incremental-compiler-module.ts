import {
  compileDocumentChangeSet,
} from "../../compiler/incrementalCompiler";
import type { EngineCompilerModule } from "./compiler-module-contracts";

/**
 * Creates one core compiler module wrapper around canonical incremental compiler behavior.
 */
export function createEngineCompilerModule(): EngineCompilerModule {
  return {
    /**
     * Compiles one change-set through canonical incremental compiler implementation.
     * @param options Previous/current snapshots and the applied change-set.
     */
    compileChangeSet(options) {
      return compileDocumentChangeSet(options);
    },
  };
}
