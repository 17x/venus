import type { EngineBackend } from "../../backend/backend";
import type { NoopBackendAdapterHooks } from "./noopBackendAdapter";
import type { EngineBackendSurface } from "../backend-contracts";

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
 * Creates one native WebGPU backend adapter with lazy async device bootstrap.
 * @param surface Engine surface payload used to acquire WebGPU canvas context.
 * @param hooks Optional no-op present telemetry hooks.
 */
export function createWebGPUBackendAdapter(
  surface?: EngineBackendSurface,
  hooks?: NoopBackendAdapterHooks,
): EngineBackend {
  let currentSurface = surface ?? { width: 1, height: 1 };
  let disposed = false;
  let configuredContext: unknown | null = null;
  let device: unknown | null = null;
  let initPromise: Promise<void> | null = null;

  /**
   * Ensures one WebGPU device/context pair is initialized and configured.
   */
  function ensureWebGPUInitialized(): Promise<void> {
    if (initPromise) {
      return initPromise;
    }

    initPromise = (async () => {
      if (disposed) {
        return;
      }
      const canvas = currentSurface.canvas;
      if (!canvas || typeof canvas.getContext !== "function") {
        return;
      }

      const navigatorGpu = (globalThis as { navigator?: { gpu?: unknown } }).navigator?.gpu as
        | {
            requestAdapter: () => Promise<unknown | null>;
            getPreferredCanvasFormat: () => string;
          }
        | undefined;
      if (!navigatorGpu) {
        return;
      }

      const context = (canvas as unknown as { getContext: (id: string) => unknown | null }).getContext("webgpu");
      if (!context) {
        return;
      }

      const adapter = await navigatorGpu.requestAdapter();
      if (!adapter || disposed) {
        return;
      }

      const adapterWithDevice = adapter as { requestDevice: () => Promise<unknown> };
      const nextDevice = await adapterWithDevice.requestDevice();
      if (!nextDevice || disposed) {
        return;
      }

      const contextWithConfigure = context as { configure: (input: { device: unknown; format: string; alphaMode: "opaque" | "premultiplied" }) => void };
      contextWithConfigure.configure({
        device: nextDevice,
        format: navigatorGpu.getPreferredCanvasFormat(),
        alphaMode: "premultiplied",
      });

      configuredContext = context;
      device = nextDevice;
    })();

    return initPromise;
  }

  return {
    mode: "webgpu",
    resize(nextSurface) {
      currentSurface = nextSurface;
      configuredContext = null;
      device = null;
      initPromise = null;
    },
    renderFrame(timestampMs) {
      hooks?.onPresentAttempt?.(timestampMs);
      void ensureWebGPUInitialized();
      if (!configuredContext || !device) {
        return;
      }

      const context = configuredContext as {
        getCurrentTexture: () => { createView: () => unknown };
      };
      const gpuDevice = device as {
        createCommandEncoder: () => {
          beginRenderPass: (input: {
            colorAttachments: Array<{
              view: unknown;
              clearValue: { r: number; g: number; b: number; a: number };
              loadOp: "clear" | "load";
              storeOp: "store" | "discard";
            }>;
          }) => { end: () => void };
          finish: () => unknown;
        };
        queue: {
          submit: (commands: unknown[]) => void;
        };
      };
      const encoder = gpuDevice.createCommandEncoder();
      const pass = encoder.beginRenderPass({
        colorAttachments: [
          {
            view: context.getCurrentTexture().createView(),
            clearValue: { r: 1, g: 1, b: 1, a: 1 },
            loadOp: "clear",
            storeOp: "store",
          },
        ],
      });
      pass.end();
      gpuDevice.queue.submit([encoder.finish()]);
      hooks?.onPresentCommitted?.(timestampMs);
    },
    dispose() {
      disposed = true;
      configuredContext = null;
      device = null;
      initPromise = null;
    },
  };
}
