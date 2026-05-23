import type {
  BackendSelectionResult,
  EngineCreateOptions,
} from "../../orchestration/api/public-types";
import type { EngineBackendProbe } from "../backendSelector";

/**
 * Contract for backend-selector module that resolves backend mode with explicit metadata.
 */
export interface EngineBackendSelectorModule {
  /**
   * Resolves backend selection from create-engine options and optional probe override.
   */
  resolveSelection: (
    options: EngineCreateOptions,
    probes?: readonly EngineBackendProbe[],
  ) => BackendSelectionResult;
  /**
   * Returns default probe registry in architecture-priority order.
   */
  getDefaultProbes: () => readonly EngineBackendProbe[];
}
