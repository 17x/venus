import type { EngineBackend } from "../../backend/backend";
import type { NoopBackendAdapterHooks } from "./noopBackendAdapter";
import type { EngineBackendSurface } from "../backend-contracts";

/**
 * Parses a CSS-like hex/rgb color token into normalized RGBA channels.
 * @param color Raw color token from frame payload.
 */
function resolveNormalizedColor(color: string): [number, number, number, number] {
  const normalized = color.trim().toLowerCase();
  if (normalized.startsWith("#")) {
    const hex = normalized.slice(1);
    if (hex.length === 3) {
      const r = Number.parseInt(hex[0] + hex[0], 16);
      const g = Number.parseInt(hex[1] + hex[1], 16);
      const b = Number.parseInt(hex[2] + hex[2], 16);
      return [r / 255, g / 255, b / 255, 1];
    }
    if (hex.length === 6) {
      const r = Number.parseInt(hex.slice(0, 2), 16);
      const g = Number.parseInt(hex.slice(2, 4), 16);
      const b = Number.parseInt(hex.slice(4, 6), 16);
      return [r / 255, g / 255, b / 255, 1];
    }
  }
  const rgbMatch = normalized.match(/rgba?\(([^)]+)\)/);
  if (rgbMatch) {
    const channels = rgbMatch[1].split(",").map((entry) => Number.parseFloat(entry.trim()));
    if (channels.length >= 3 && channels.every((entry, index) => index > 2 || Number.isFinite(entry))) {
      const alpha = Number.isFinite(channels[3]) ? Math.max(0, Math.min(1, channels[3])) : 1;
      return [
        Math.max(0, Math.min(255, channels[0])) / 255,
        Math.max(0, Math.min(255, channels[1])) / 255,
        Math.max(0, Math.min(255, channels[2])) / 255,
        alpha,
      ];
    }
  }
  return [0.1, 0.16, 0.25, 1];
}

/**
 * Resolves whether one surface can provide a WebGL context.
 * @param surface Engine surface that may carry a canvas-like target.
 */
export function canUseWebGLBackendAdapter(surface: EngineBackendSurface): boolean {
  const canvas = surface.canvas;
  if (!canvas || typeof canvas.getContext !== "function") {
    return false;
  }

  return Boolean(canvas.getContext("webgl2") ?? canvas.getContext("webgl"));
}

/**
 * Creates one native WebGL backend adapter.
 * @param surface Engine surface payload used by WebGL context setup.
 * @param hooks Optional no-op present telemetry hooks.
 */
export function createWebGLBackendAdapter(
  surface?: EngineBackendSurface,
  hooks?: NoopBackendAdapterHooks,
): EngineBackend {
  let currentSurface = surface ?? { width: 1, height: 1 };
  let currentContext: WebGL2RenderingContext | WebGLRenderingContext | null = null;

  /**
   * Resolves WebGL rendering context from the active surface.
   */
  function resolveContext(nextSurface: EngineBackendSurface) {
    const canvas = nextSurface.canvas;
    if (!canvas || typeof canvas.getContext !== "function") {
      return null;
    }
    return (canvas.getContext("webgl2") ?? canvas.getContext("webgl")) as
      | WebGL2RenderingContext
      | WebGLRenderingContext
      | null;
  }

  return {
    mode: "webgl",
    resize(nextSurface) {
      currentSurface = nextSurface;
      currentContext = resolveContext(nextSurface);
    },
    renderFrame(timestampMs) {
      hooks?.onPresentAttempt?.(timestampMs);
      if (!currentContext) {
        currentContext = resolveContext(currentSurface);
      }
      if (!currentContext) {
        return;
      }

      if (
        typeof currentContext.viewport !== "function" ||
        typeof currentContext.clearColor !== "function" ||
        typeof currentContext.clear !== "function"
      ) {
        return;
      }

      const surfaceCanvas = currentSurface.canvas;
      const deviceWidth = surfaceCanvas?.width ?? currentSurface.width;
      const deviceHeight = surfaceCanvas?.height ?? currentSurface.height;
      const dpr = currentSurface.width > 0
        ? Math.max(1, deviceWidth / currentSurface.width)
        : 1;

      currentContext.viewport(0, 0, deviceWidth, deviceHeight);
      currentContext.clearColor(1, 1, 1, 1);
      currentContext.clear(currentContext.COLOR_BUFFER_BIT);

      const payload = hooks?.resolveNativeFramePayload?.(timestampMs);
      if (
        payload &&
        payload.rects.length > 0 &&
        typeof currentContext.enable === "function" &&
        typeof currentContext.disable === "function" &&
        typeof currentContext.scissor === "function"
      ) {
        currentContext.enable(currentContext.SCISSOR_TEST);
        for (const rect of payload.rects) {
          const screenX = (rect.x * payload.scale + payload.translateX) * dpr;
          const screenY = (rect.y * payload.scale + payload.translateY) * dpr;
          const screenW = Math.max(0, rect.width * payload.scale * dpr);
          const screenH = Math.max(0, rect.height * payload.scale * dpr);
          if (screenW <= 0 || screenH <= 0) {
            continue;
          }

          const x = Math.floor(screenX);
          const y = Math.floor(deviceHeight - (screenY + screenH));
          const width = Math.floor(screenW);
          const height = Math.floor(screenH);
          if (width <= 0 || height <= 0) {
            continue;
          }

          const [r, g, b, a] = resolveNormalizedColor(rect.fill);
          currentContext.scissor(x, y, width, height);
          currentContext.clearColor(r, g, b, a);
          currentContext.clear(currentContext.COLOR_BUFFER_BIT);
        }
        currentContext.disable(currentContext.SCISSOR_TEST);
      }

      hooks?.onPresentCommitted?.(timestampMs);
    },
    dispose() {
      currentContext = null;
    },
  };
}
