import { createRuntimeWorldFromDocument } from "../../ecs/runtimeWorld";
import type { EngineWorldModule } from "./world-module-contracts";

/**
 * Creates one core world module wrapper around canonical runtime-world projection behavior.
 */
export function createEngineWorldModule(): EngineWorldModule {
  return {
    /**
     * Creates one runtime world snapshot from document through canonical world projection.
     * @param snapshot Document snapshot used as runtime source of truth.
     */
    createWorldFromDocument(snapshot) {
      return createRuntimeWorldFromDocument(snapshot);
    },
  };
}
