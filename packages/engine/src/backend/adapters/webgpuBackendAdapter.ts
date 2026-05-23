import type { EngineBackend } from "../../backend/backend";
import { createNoopBackendAdapter, type NoopBackendAdapterHooks } from "./noopBackendAdapter";
import type { EngineBackendSurface } from "../backend-contracts";
import {
  createCanvas2DBackendAdapter,
  type Canvas2DBackendAdapterHooks,
} from "./canvas2dBackendAdapter";

/**
 * Resolves whether current host reports WebGPU availability.
 * @param _surface Engine surface payload (unused for WebGPU global probe).
 */
export function canUseWebGPUBackendAdapter(_surface: EngineBackendSurface): boolean {
  if (typeof navigator === "undefined") {
    return false;
  }
  return "gpu" in navigator && Boolean((navigator as { gpu?: unknown }).gpu);
}

/**
 * Resolves whether the provided surface can expose a Canvas2D context.
 * @param surface Engine surface payload used by compatibility present fallback.
 */
function canUseCanvas2DCompatibility(surface: EngineBackendSurface): boolean {
  const canvas = surface.canvas;
  if (!canvas || typeof canvas.getContext !== "function") {
    return false;
  }
  return Boolean(canvas.getContext("2d"));
}

/**
 * Wraps one backend to preserve requested mode metadata while delegating execution.
 * @param mode Backend mode to report from wrapper.
 * @param delegate Backend implementation that executes resize/render/dispose.
 */
function createModeWrappedBackend(
  mode: "webgpu" | "webgl",
  delegate: EngineBackend,
): EngineBackend {
  return {
    mode,
    resize(surface) {
      delegate.resize(surface);
    },
    renderFrame(timestampMs) {
      delegate.renderFrame(timestampMs);
    },
    dispose() {
      delegate.dispose();
    },
  };
}

/**
 * Creates one deterministic WebGPU adapter stub backend.
 * Falls back to Canvas2D present compatibility when 2d context is available,
 * so auto-selected WebGPU does not regress to blank output before native pipeline lands.
 * @param surface Engine surface payload used to detect 2d compatibility support.
 * @param hooks Optional no-op present telemetry hooks.
 * @param canvas2dHooks Optional canvas2d draw/present hooks used by compatibility path.
 */
export function createWebGPUBackendAdapter(
  surface?: EngineBackendSurface,
  hooks?: NoopBackendAdapterHooks,
  canvas2dHooks?: Canvas2DBackendAdapterHooks,
): EngineBackend {
  // AI-TEMP: WebGPU adapter is currently stubbed; remove when native WebGPU present path is implemented; ref DEX-065.
  if (surface && canUseCanvas2DCompatibility(surface)) {
    return createModeWrappedBackend(
      "webgpu",
      createCanvas2DBackendAdapter(surface, canvas2dHooks),
    );
  }
  return createNoopBackendAdapter("webgpu", hooks);
}
