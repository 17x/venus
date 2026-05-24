import type { EngineFrameBudgetPressureSignals } from "../../optimization/frameBudgetBroker";
import type { EngineFrameBudget } from "../../optimization/frameBudgetBroker";

/**
 * Render-frame stats snapshot returned by staged runtime facade.
 */
export interface EngineRenderFrameStats {
  /** Frame timestamp in milliseconds. */
  timestampMs: number;
  /** Strategy phase label for diagnostics. */
  phase: string;
  /** Budget pressure tier for diagnostics. */
  pressure: "low" | "medium" | "high";
  /** Human-readable reason describing the pressure-tier decision. */
  pressureReason: string;
  /** Effective frame budget selected by scheduler for current frame. */
  budget: EngineFrameBudget;
  /** Structured threshold signals used to derive pressure tier. */
  pressureSignals: EngineFrameBudgetPressureSignals;
}

/**
 * Runtime lifecycle adapter consumed by staged runtime facade.
 */
export interface EngineRuntimeLoopAdapter {
  /** Starts the runtime loop. */
  start: () => void;
  /** Stops the runtime loop. */
  stop: () => void;
  /** Returns current running state. */
  isRunning: () => boolean;
}

/**
 * Runtime render adapter consumed by staged runtime facade.
 */
export interface EngineRuntimeRenderAdapter {
  /** Executes one frame and returns frame stats. */
  renderFrame: () => Promise<EngineRenderFrameStats>;
  /** Releases renderer and render-context resources. */
  dispose: () => void;
}

/**
 * Runtime diagnostics adapter consumed by staged runtime facade.
 */
export interface EngineRuntimeDiagnosticsAdapter<TDiagnostics> {
  /** Returns runtime diagnostics snapshot. */
  getDiagnostics: () => TDiagnostics;
}

/**
 * Public runtime facade built from runtime/render/diagnostics adapters.
 */
export interface EngineRuntimeFacade<TDiagnostics> {
  /** Executes one frame and returns frame stats. */
  renderFrame: () => Promise<EngineRenderFrameStats>;
  /** Starts runtime loop. */
  start: () => void;
  /** Stops runtime loop. */
  stop: () => void;
  /** Returns current runtime loop state. */
  isRunning: () => boolean;
  /** Returns diagnostics snapshot. */
  getDiagnostics: () => TDiagnostics;
  /** Disposes runtime and render resources. */
  dispose: () => void;
}

/**
 * Creates staged runtime facade for deterministic engine lifecycle wiring.
 * @param options Runtime, render, and diagnostics adapters.
 */
export function createEngineRuntimeFacade<TDiagnostics>(options: {
  /** Runtime loop adapter. */
  loop: EngineRuntimeLoopAdapter;
  /** Runtime render adapter. */
  render: EngineRuntimeRenderAdapter;
  /** Runtime diagnostics adapter. */
  diagnostics: EngineRuntimeDiagnosticsAdapter<TDiagnostics>;
}): EngineRuntimeFacade<TDiagnostics> {
  return {
    renderFrame() {
      return options.render.renderFrame();
    },
    start() {
      options.loop.start();
    },
    stop() {
      options.loop.stop();
    },
    isRunning() {
      return options.loop.isRunning();
    },
    getDiagnostics() {
      return options.diagnostics.getDiagnostics();
    },
    dispose() {
      options.loop.stop();
      options.render.dispose();
    },
  };
}
