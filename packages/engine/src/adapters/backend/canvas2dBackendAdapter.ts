import type { EngineSurface } from "../../api/public-types";
import type { EngineBackend } from "../../backend/backend";

/**
 * Declares one draw hook invoked by canvas2d adapter backend on each frame.
 */
export interface Canvas2DBackendAdapterHooks {
  /**
   * Draws one frame to the provided 2d context and returns draw count.
   */
  drawFrame?: (context: CanvasRenderingContext2D, timestampMs: number) => number;
}

/**
 * Creates one Canvas2D backend owned by adapter layer.
 * @param surface Initial surface state including optional canvas handle.
 * @param hooks Optional draw hooks used by compatibility adapters.
 */
export function createCanvas2DBackendAdapter(
  surface: EngineSurface,
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
  function resolveContext(nextSurface: EngineSurface): CanvasRenderingContext2D | null {
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
    renderFrame(timestampMs) {
      if (!currentContext) {
        return;
      }

      // Keep a deterministic clear baseline so every frame presents a coherent
      // surface even when no custom draw hook is currently configured.
      currentContext.save();
      currentContext.setTransform(1, 0, 0, 1, 0, 0);
      currentContext.clearRect(0, 0, currentSurface.width, currentSurface.height);
      hooks?.drawFrame?.(currentContext, timestampMs);
      currentContext.restore();
    },
    dispose() {
      currentContext = null;
    },
  };
}
