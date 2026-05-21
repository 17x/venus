import type { EngineDocumentSnapshot } from "../../document/document-contracts";
import type { EngineRuntimeWorldSnapshot } from "../../ecs/runtimeWorld";

/**
 * Contract for runtime-world module that converts normalized document state into runtime entities.
 */
export interface EngineRuntimeWorldModule {
  /**
   * Builds one deterministic runtime-world snapshot from document snapshot input.
   */
  buildFromDocument: (snapshot: EngineDocumentSnapshot) => EngineRuntimeWorldSnapshot;
}
