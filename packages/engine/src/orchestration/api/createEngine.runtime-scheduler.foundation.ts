import {
  createEngineRenderScheduler,
  type EngineRenderScheduler,
  type EngineRenderSchedulerDiagnostics,
} from "../../orchestration/renderScheduler";

/**
 * Defines dependencies required by runtime scheduler helper assembly.
 */
type RuntimeSchedulerFoundationDependencies = {
  /** Resolves one render result for scheduler-driven render callbacks. */
  renderFrame: () => Promise<{ drawCount: number; visibleCount: number; frameMs: number }>;
  /** Reads current interactive scheduler interval in milliseconds. */
  getInteractiveIntervalMs: () => number;
  /** Updates interactive scheduler interval in milliseconds. */
  setInteractiveIntervalMs: (nextIntervalMs: number) => void;
  /** Reads current scheduler instance. */
  getRuntimePlanScheduler: () => EngineRenderScheduler | null;
  /** Writes current scheduler instance. */
  setRuntimePlanScheduler: (scheduler: EngineRenderScheduler | null) => void;
  /** Reads pending scheduler request id set. */
  getPendingRequestIds: () => Set<string>;
  /** Reads runtime scheduler request counter. */
  getRuntimePlanRequestCounter: () => number;
  /** Updates runtime scheduler request counter. */
  setRuntimePlanRequestCounter: (nextCounter: number) => void;
  /** Resolves monotonic timestamp in milliseconds. */
  resolveNow: () => number;
  /** Optional host frame request hook. */
  requestFrame?: (callback: () => void) => number;
  /** Optional host frame cancel hook. */
  cancelFrame?: (handle: number) => void;
};

/**
 * Assembles runtime plan scheduler helper functions used by runtime namespace APIs.
 * @param deps Shared scheduler state and render callbacks from createEngine closure.
 */
export function createRuntimeSchedulerFoundation(
  deps: RuntimeSchedulerFoundationDependencies,
): {
  requestRuntimePlanFrame: (mode?: "interactive" | "normal") => { requestId: string; scheduled: boolean };
  cancelRuntimePlanFrame: (requestId: string) => { cancelled: boolean };
  setRuntimePlanInteractiveInterval: (intervalMs: number) => { intervalMs: number };
  resolveRuntimePlanSchedulerDiagnostics: () => EngineRenderSchedulerDiagnostics;
  disposeRuntimePlanScheduler: () => void;
} {
  /**
   * Creates one runtime plan scheduler instance bound to current render pipeline.
   * @param interactiveIntervalMs Interactive throttle interval in milliseconds.
   */
  function createRuntimePlanScheduler(interactiveIntervalMs: number): EngineRenderScheduler {
    return createEngineRenderScheduler({
      render: async () => deps.renderFrame(),
      interactiveIntervalMs,
      scheduleFrame: deps.requestFrame
        ? (callback) => deps.requestFrame!(() => callback())
        : undefined,
      cancelFrame: deps.cancelFrame,
      now: deps.resolveNow,
    });
  }

  /**
   * Ensures runtime plan scheduler exists before scheduling operations.
   */
  function ensureRuntimePlanScheduler(): EngineRenderScheduler {
    const existing = deps.getRuntimePlanScheduler();
    if (existing) {
      return existing;
    }
    const created = createRuntimePlanScheduler(deps.getInteractiveIntervalMs());
    deps.setRuntimePlanScheduler(created);
    return created;
  }

  /**
   * Requests one scheduled frame from runtime plan scheduler.
   * @param mode Optional scheduler mode token.
   */
  function requestRuntimePlanFrame(
    mode: "interactive" | "normal" = "normal",
  ): { requestId: string; scheduled: boolean } {
    const scheduler = ensureRuntimePlanScheduler();
    const nextCounter = deps.getRuntimePlanRequestCounter() + 1;
    deps.setRuntimePlanRequestCounter(nextCounter);
    const requestId = `runtime-plan-request-${nextCounter}`;
    deps.getPendingRequestIds().add(requestId);
    scheduler.request(mode);
    return {
      requestId,
      scheduled: true,
    };
  }

  /**
   * Cancels one pending scheduled frame request by id.
   * @param requestId Runtime plan scheduler request id.
   */
  function cancelRuntimePlanFrame(requestId: string): { cancelled: boolean } {
    const pendingIds = deps.getPendingRequestIds();
    if (!pendingIds.has(requestId)) {
      return {
        cancelled: false,
      };
    }
    pendingIds.delete(requestId);
    deps.getRuntimePlanScheduler()?.cancel();
    return {
      cancelled: true,
    };
  }

  /**
   * Sets runtime plan scheduler interactive throttle interval.
   * @param intervalMs Interactive throttle interval in milliseconds.
   */
  function setRuntimePlanInteractiveInterval(intervalMs: number): { intervalMs: number } {
    const resolvedIntervalMs = Number.isFinite(intervalMs) ? Math.max(1, intervalMs) : deps.getInteractiveIntervalMs();
    deps.setInteractiveIntervalMs(resolvedIntervalMs);
    deps.getRuntimePlanScheduler()?.dispose();
    deps.setRuntimePlanScheduler(createRuntimePlanScheduler(resolvedIntervalMs));
    deps.getPendingRequestIds().clear();
    return {
      intervalMs: resolvedIntervalMs,
    };
  }

  /**
   * Returns runtime plan scheduler diagnostics snapshot.
   */
  function resolveRuntimePlanSchedulerDiagnostics(): EngineRenderSchedulerDiagnostics {
    return ensureRuntimePlanScheduler().getDiagnostics();
  }

  /**
   * Disposes runtime plan scheduler state.
   */
  function disposeRuntimePlanScheduler(): void {
    deps.getRuntimePlanScheduler()?.dispose();
    deps.setRuntimePlanScheduler(null);
    deps.getPendingRequestIds().clear();
  }

  return {
    requestRuntimePlanFrame,
    cancelRuntimePlanFrame,
    setRuntimePlanInteractiveInterval,
    resolveRuntimePlanSchedulerDiagnostics,
    disposeRuntimePlanScheduler,
  };
}
