import type {
  EngineBackendCreateOptions,
  EngineBackendSelectionResult,
} from "../backend-contracts";
import type { EngineBackendProbe } from "../backendSelector";

/**
 * Contract for backend-selector module that resolves backend mode with explicit metadata.
 */
export interface EngineBackendSelectorModule {
  /**
   * Resolves backend selection from create-engine options and optional probe override.
   */
  resolveSelection: (
    options: EngineBackendCreateOptions,
    probes?: readonly EngineBackendProbe[],
  ) => EngineBackendSelectionResult;
  /**
   * Returns default probe registry in architecture-priority order.
   */
  getDefaultProbes: () => readonly EngineBackendProbe[];
}
