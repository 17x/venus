import type { EngineBackend } from "../../backend/backend";
import type { EngineBackendSurface } from "../backend-contracts";

/**
 * Declares one draw hook invoked by canvas2d adapter backend on each frame.
 */
export interface Canvas2DBackendAdapterHooks {
  /**
   * Draws one frame to the provided 2d context and returns draw count.
   */
  drawFrame?: (context: CanvasRenderingContext2D, timestampMs: number) => number;
  /**
   * Emits when canvas2d present path is entered for one frame.
   */
  onPresentAttempt?: (timestampMs: number) => void;
  /**
   * Emits when canvas2d present path is skipped before draw due to missing prerequisites.
   */
  onPresentSkipped?: (reason: "missing-context", timestampMs: number) => void;
  /**
   * Emits when canvas2d present path completes one frame.
   */
  onPresentCommitted?: (timestampMs: number) => void;
}

/**
 * Creates one Canvas2D backend owned by adapter layer.
 * @param surface Initial surface state including optional canvas handle.
 * @param hooks Optional draw hooks used by compatibility adapters.
 */
export function createCanvas2DBackendAdapter(
  surface: EngineBackendSurface,
  hooks?: Canvas2DBackendAdapterHooks,
): EngineBackend {
  let currentSurface = surface;
  let currentContext = resolveContext(currentSurface);

  /**
   * Narrows an unknown rendering context to Canvas2D by required method shape.
   * @param context Candidate rendering context returned by host canvas.
   */
  function isCanvas2DContext(context: unknown): context is CanvasRenderingContext2D {
    if (!context || typeof context !== "object") {
      return false;
    }
    return "clearRect" in context && "setTransform" in context;
  }

  /**
   * Resolves a 2d context from one surface payload.
   * @param nextSurface Surface payload that may carry a canvas handle.
   */
  function resolveContext(nextSurface: EngineBackendSurface): CanvasRenderingContext2D | null {
    const canvas = nextSurface.canvas;
    if (!canvas) {
      return null;
    }
    const context = canvas.getContext("2d");
    return isCanvas2DContext(context) ? context : null;
  }

  return {
    mode: "canvas2d",
    resize(nextSurface) {
      currentSurface = nextSurface;
      currentContext = resolveContext(nextSurface);
    },
    /**
     * Presents one frame on canvas2d and retries context resolution for late-bound canvas hosts.
      * @param timestampMs Frame timestamp used for telemetry and draw hooks.
     */
    async renderFrame(timestampMs) {
      hooks?.onPresentAttempt?.(timestampMs);
      // Retry context resolution per frame so hosts that attach 2d context after
      // engine bootstrap can recover from blank-canvas without requiring resize.
      if (!currentContext) {
        currentContext = resolveContext(currentSurface);
      }
      if (!currentContext) {
        hooks?.onPresentSkipped?.("missing-context", timestampMs);
        return;
      }

      // Keep a deterministic clear baseline so every frame presents a coherent
      // surface even when no custom draw hook is currently configured.
      currentContext.save();
      currentContext.setTransform(1, 0, 0, 1, 0, 0);
      currentContext.clearRect(0, 0, currentSurface.width, currentSurface.height);
      hooks?.drawFrame?.(currentContext, timestampMs);
      currentContext.restore();
      hooks?.onPresentCommitted?.(timestampMs);
    },
    dispose() {
      currentContext = null;
    },
  };
}
