import type { EngineBackend } from "../../backend/backend";
import type { EngineBackendSurface, EngineResolvedBackendMode } from "../backend-contracts";

/**
 * Declares telemetry hooks for no-op adapter present lifecycle.
 */
export interface NoopBackendAdapterHooks {
  /** Emits when no-op present path is entered for one frame. */
  onPresentAttempt?: (timestampMs: number) => void;
  /** Emits when no-op present path completes for one frame. */
  onPresentCommitted?: (timestampMs: number) => void;
}

/**
 * Creates one deterministic no-op backend owned by adapter layer.
 * @param mode Backend mode reported by the no-op backend.
 * @param hooks Optional telemetry hooks emitted around no-op present path.
 */
export function createNoopBackendAdapter(
  mode: EngineResolvedBackendMode,
  hooks?: NoopBackendAdapterHooks,
): EngineBackend {
  let currentSurface: EngineBackendSurface | null = null;

  return {
    mode,
    resize(surface) {
      // Keep the latest surface snapshot so tests can verify resize calls.
      currentSurface = surface;
    },
    renderFrame(_timestampMs) {
      hooks?.onPresentAttempt?.(_timestampMs);
      // Intentionally no-op while adapter contracts stabilize.
      void currentSurface;
      hooks?.onPresentCommitted?.(_timestampMs);
    },
    dispose() {
      // Release stored references to make disposal behavior explicit for tests.
      currentSurface = null;
    },
  };
}
