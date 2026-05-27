import type {
  BackendSelectionResult,
  EngineCreateOptions,
  EngineFrameCallback,
  EngineLifecycleState,
  EngineStatsSnapshot,
  EngineSurface,
} from "../../orchestration/api/public-types";
import type { EngineBackend } from "../../backend/backend";

/**
 * Internal runtime-shell contract consumed by createEngine orchestration.
 */
export interface EngineRuntimeShell {
  /** Starts frame scheduling and backend execution. */
  start: () => void;
  /** Stops frame scheduling while keeping runtime resources. */
  stop: () => void;
  /** Pauses frame scheduling without disposing runtime resources. */
  pause: () => void;
  /** Resumes frame scheduling after pause. */
  resume: () => void;
  /** Resizes runtime surface and backend target. */
  resize: (width: number, height: number) => void;
  /** Captures current timestamp token used by diagnostics and tests. */
  captureFrame: () => { timestampMs: number };
  /** Returns lifecycle + backend stats snapshot. */
  getStats: () => EngineStatsSnapshot;
  /** Returns resolved backend selection metadata. */
  getBackendInfo: () => BackendSelectionResult;
  /** Disposes runtime shell and backend resources. */
  dispose: () => void;
}

/**
 * Creates the runtime shell that owns lifecycle state and frame scheduling.
 * @param options Engine creation options used to initialize runtime state.
 * @param backend Selected backend implementation for frame execution.
 * @param backendSelection Backend metadata exposed through API diagnostics.
 * @param hooks Optional frame hooks executed before backend render calls.
 */
export function createEngineRuntimeShell(
  options: EngineCreateOptions,
  backend: EngineBackend,
  backendSelection: BackendSelectionResult,
  hooks?: {
    /**
     * Runs once per scheduled frame before backend rendering.
     */
    onFrame?: (timestampMs: number) => void;
  },
): EngineRuntimeShell {
  const adapter = options.runtimeAdapter ?? {
    requestFrame: (callback: EngineFrameCallback) => globalThis.requestAnimationFrame(callback),
    cancelFrame: (handle: number) => globalThis.cancelAnimationFrame(handle),
    now: () => performance.now(),
  };

  let lifecycleState: EngineLifecycleState = "created";
  let frameHandle: number | null = null;
  let surface: EngineSurface = options.surface.canvas
    ? {
        width: options.surface.width,
        height: options.surface.height,
        canvas: options.surface.canvas,
      }
    : {
        width: options.surface.width,
        height: options.surface.height,
      };
  let lastFrameTimeMs = 0;

  /**
   * Schedules the next frame only while the runtime is running.
   */
  function scheduleNextFrame(): void {
    if (lifecycleState !== "running") {
      return;
    }
    frameHandle = adapter.requestFrame((timestamp) => {
      lastFrameTimeMs = timestamp;
      hooks?.onFrame?.(timestamp);
      backend.renderFrame(timestamp);
      scheduleNextFrame();
    });
  }

  /**
   * Cancels a pending frame request if it exists.
   */
  function cancelPendingFrame(): void {
    if (frameHandle === null) {
      return;
    }
    adapter.cancelFrame(frameHandle);
    frameHandle = null;
  }

  return {
    start() {
      if (lifecycleState === "disposed" || lifecycleState === "running") {
        return;
      }
      lifecycleState = "running";
      scheduleNextFrame();
    },
    stop() {
      if (lifecycleState === "disposed") {
        return;
      }
      cancelPendingFrame();
      lifecycleState = "stopped";
    },
    pause() {
      if (lifecycleState !== "running") {
        return;
      }
      cancelPendingFrame();
      lifecycleState = "paused";
    },
    resume() {
      if (lifecycleState !== "paused") {
        return;
      }
      lifecycleState = "running";
      scheduleNextFrame();
    },
    /**
     * Preserves existing surface metadata (for example canvas context hooks)
     * so backend present paths remain connected after viewport-only resizes.
      * @param width Next surface width in CSS pixels.
      * @param height Next surface height in CSS pixels.
     */
    resize(width, height) {
      surface = {
        ...surface,
        width,
        height,
      };
      backend.resize(surface);
    },
    captureFrame() {
      return { timestampMs: adapter.now() };
    },
    getStats(): EngineStatsSnapshot {
      return {
        lifecycleState,
        backendSelection,
        width: surface.width,
        height: surface.height,
        lastFrameTimeMs,
      };
    },
    getBackendInfo() {
      return backendSelection;
    },
    dispose() {
      if (lifecycleState === "disposed") {
        return;
      }
      cancelPendingFrame();
      backend.dispose();
      lifecycleState = "disposed";
    },
  };
}
