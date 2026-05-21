import {
  createDefaultEngineBackendProbes,
  resolveBackendSelection,
} from "../backendSelector";
import type { EngineBackendSelectorModule } from "./backendSelector.contract";

/**
 * Creates backend-selector module backed by canonical selector behavior.
 */
export function createEngineBackendSelectorModule(): EngineBackendSelectorModule {
  return {
    resolveSelection: (options, probes) =>
      resolveBackendSelection(options, probes ?? createDefaultEngineBackendProbes()),
    getDefaultProbes: () => createDefaultEngineBackendProbes(),
  };
}
