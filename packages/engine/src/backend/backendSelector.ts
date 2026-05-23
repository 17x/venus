import type {
  EngineBackendCreateOptions,
  EngineBackendSelectionResult,
} from "./backend-contracts";
import {
  createDefaultEngineBackendProbes,
  resolveAutoBackendMode,
  resolveBackendSelection as resolveBackendSelectionFromProtocol,
  type EngineBackendProbe,
} from "../platform/protocol/backend/backend-selection";

/**
 * Resolves backend selection with explicit fallback metadata and probe registry.
 * @param options Engine creation options provided by caller.
 * @param probes Optional ordered backend probe registry override for deterministic tests.
 */
export function resolveBackendSelection(
  options: EngineBackendCreateOptions,
  probes: readonly EngineBackendProbe[] = createDefaultEngineBackendProbes(),
): EngineBackendSelectionResult {
  return resolveBackendSelectionFromProtocol(options, probes);
}

export {
  createDefaultEngineBackendProbes,
  resolveAutoBackendMode,
  type EngineBackendProbe,
};
