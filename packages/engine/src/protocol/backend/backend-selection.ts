import type {
  BackendSelectionResult,
  EngineCreateOptions,
} from "../../api/public-types";
import {
  createDefaultEngineBackendProbes,
  resolveAutoBackendMode,
  resolveBackendSelection,
  type EngineBackendProbe,
} from "../../backend/backendSelector";

/**
 * Resolves backend selection through protocol/backend boundary while preserving canonical selector behavior.
 * @param options Engine creation options provided by caller.
 * @param probes Optional ordered backend probe registry override.
 */
export function resolveBackendSelectionFromProtocol(
  options: EngineCreateOptions,
  probes: readonly EngineBackendProbe[] = createDefaultEngineBackendProbes(),
): BackendSelectionResult {
  return resolveBackendSelection(options, probes);
}

export {
  createDefaultEngineBackendProbes,
  resolveAutoBackendMode,
  resolveBackendSelection,
  type EngineBackendProbe,
};
