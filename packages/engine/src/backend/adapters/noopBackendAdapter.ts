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
  /**
   * Resolves one optional native frame payload used by WebGL/WebGPU adapters.
   */
  resolveNativeFramePayload?: (timestampMs: number) => {
    /** Viewport translation X in world-to-screen transform space. */
    translateX: number;
    /** Viewport translation Y in world-to-screen transform space. */
    translateY: number;
    /** Viewport scale in world-to-screen transform space. */
    scale: number;
    /** Ordered rectangular primitives emitted for the current frame. */
    rects: ReadonlyArray<{
      /** Rectangle origin X in world coordinates. */
      x: number;
      /** Rectangle origin Y in world coordinates. */
      y: number;
      /** Rectangle width in world coordinates. */
      width: number;
      /** Rectangle height in world coordinates. */
      height: number;
      /** Rectangle fill color token in CSS color notation. */
      fill: string;
    }>;
  } | null;
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
