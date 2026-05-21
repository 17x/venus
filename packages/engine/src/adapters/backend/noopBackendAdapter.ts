import type { EngineBackend } from "../../backend/backend";
import type { EngineBackendMode, EngineSurface } from "../../api/public-types";

/**
 * Creates one deterministic no-op backend owned by adapter layer.
 * @param mode Backend mode reported by the no-op backend.
 */
export function createNoopBackendAdapter(mode: EngineBackendMode): EngineBackend {
  let currentSurface: EngineSurface | null = null;

  return {
    mode,
    resize(surface) {
      // Keep the latest surface snapshot so tests can verify resize calls.
      currentSurface = surface;
    },
    renderFrame(_timestampMs) {
      // Intentionally no-op while adapter contracts stabilize.
      void currentSurface;
    },
    dispose() {
      // Release stored references to make disposal behavior explicit for tests.
      currentSurface = null;
    },
  };
}
