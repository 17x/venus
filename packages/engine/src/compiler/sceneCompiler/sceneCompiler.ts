import { compileDocumentChangeSet } from "../incrementalCompiler";
import type { EngineSceneCompilerModule } from "./sceneCompiler.contract";

/**
 * Creates the scene-compiler module backed by canonical incremental compiler logic.
 */
export function createEngineSceneCompilerModule(): EngineSceneCompilerModule {
  return {
    compileChangeSet: (input) => compileDocumentChangeSet(input),
  };
}
