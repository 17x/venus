import type { EngineDocumentSnapshot } from "../../document/document-contracts";
import type { EngineRuntimeWorldSnapshot } from "../../ecs/runtimeWorld";

/**
 * Declares one core-owned runtime world module contract.
 */
export interface EngineWorldModule {
  /**
   * Creates one runtime world snapshot from persistent document state.
   */
  createWorldFromDocument: (
    snapshot: EngineDocumentSnapshot,
  ) => EngineRuntimeWorldSnapshot;
}
