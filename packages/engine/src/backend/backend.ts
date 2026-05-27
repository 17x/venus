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
   * Executes one backend frame step asynchronously.
   * AI-TEMP: made async for WebGPU device initialization support.
   * Remove async when all backends support sync init; ref DEX-113.
   */
  renderFrame: (timestampMs: number) => Promise<void>;
  /**
   * Releases backend-owned resources.
   */
  dispose: () => void;
}
