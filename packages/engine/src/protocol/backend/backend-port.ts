import type { EngineProtocolResolvedBackendMode } from "./backend-mode";
import type { EngineProtocolSurfaceSnapshot } from "../surface/surface-port";

/**
 * Backend execution boundary consumed by runtime orchestration.
 */
export interface EngineBackendPort {
  /** Resolved backend mode represented by this backend instance. */
  mode: EngineProtocolResolvedBackendMode;
  /** Applies one surface resize mutation to backend-owned resources. */
  resize: (surface: EngineProtocolSurfaceSnapshot) => void;
  /** Executes one backend frame for the provided timestamp. */
  renderFrame: (timestampMs: number) => void;
  /** Releases backend-owned resources. */
  dispose: () => void;
}
