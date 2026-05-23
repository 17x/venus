import type {
  EngineBackendMode,
  EngineBackendSurface,
} from "./backend-contracts";
export {
  createDefaultEngineBackendProbes,
  resolveAutoBackendMode,
  resolveBackendSelection,
  type EngineBackendProbe,
} from "./backendSelector";

/**
 * Backend implementation contract consumed by the canonical runtime shell.
 */
export interface EngineBackend {
  /**
   * The selected backend mode.
   */
  mode: EngineBackendMode;
  /**
   * Applies resize to backend-owned resources.
   */
  resize: (surface: EngineBackendSurface) => void;
  /**
   * Executes one backend frame step.
   */
  renderFrame: (timestampMs: number) => void;
  /**
   * Releases backend-owned resources.
   */
  dispose: () => void;
}
