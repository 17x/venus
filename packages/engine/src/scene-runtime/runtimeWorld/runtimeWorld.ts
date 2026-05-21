import { createRuntimeWorldFromDocument } from "../../ecs/runtimeWorld";
import type { EngineRuntimeWorldModule } from "./runtimeWorld.contract";

/**
 * Creates the runtime-world module backed by canonical ECS world construction.
 */
export function createEngineRuntimeWorldModule(): EngineRuntimeWorldModule {
  return {
    buildFromDocument: (snapshot) => createRuntimeWorldFromDocument(snapshot),
  };
}
