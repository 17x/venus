import {createSingleFlightScheduler, type SchedulerMode} from '@venus/lib/scheduler'

/**
 * Defines input options used by the engine render scheduler facade.
 */
export interface CreateEngineRenderSchedulerOptions {
  /** Stores the render callback executed by each scheduled frame. */
  render: () => Promise<unknown>
  /** Stores interactive throttle interval in milliseconds. */
  interactiveIntervalMs?: number
  /** Stores asynchronous error callback from the render task. */
  onError?: (error: unknown) => void
}

/**
 * Defines diagnostics emitted by the engine scheduler surface.
 */
export interface EngineRenderSchedulerDiagnostics {
  /** Stores request-to-flush wait time in milliseconds. */
  lastQueueWaitMs: number
  /** Stores current interactive throttle delay in milliseconds. */
  lastInteractiveThrottleDelayMs: number
  /** Stores count of coalesced requests while one frame is pending. */
  coalescedRequestCount: number
  /** Stores whether render execution is currently in flight. */
  inFlight: boolean
  /** Stores whether a requestAnimationFrame callback is pending. */
  pendingRaf: boolean
}

/**
 * Defines scheduler lifecycle operations exposed to the engine runtime.
 */
export interface EngineRenderScheduler {
  /** Requests one scheduled render in interactive or normal mode. */
  request(mode?: SchedulerMode): void
  /** Returns the latest diagnostics snapshot. */
  getDiagnostics(): EngineRenderSchedulerDiagnostics
  /** Cancels queued work. */
  cancel(): void
  /** Cancels queued work and disposes scheduler state. */
  dispose(): void
}

/**
 * Creates an engine scheduler facade backed by the shared lib single-flight scheduler.
 */
export function createEngineRenderScheduler(
  options: CreateEngineRenderSchedulerOptions,
): EngineRenderScheduler {
  const scheduler = createSingleFlightScheduler({
    run: options.render,
    interactiveIntervalMs: options.interactiveIntervalMs,
    onError: options.onError,
  })

  /**
   * Maps shared diagnostics to the engine field names for backward compatibility.
   */
  const getDiagnostics = (): EngineRenderSchedulerDiagnostics => {
    const diagnostics = scheduler.getDiagnostics()
    return {
      lastQueueWaitMs: diagnostics.lastQueueWaitMs,
      lastInteractiveThrottleDelayMs: diagnostics.lastInteractiveThrottleDelayMs,
      coalescedRequestCount: diagnostics.coalescedRequestCount,
      inFlight: diagnostics.inFlight,
      pendingRaf: diagnostics.pendingFrame,
    }
  }

  return {
    request: scheduler.request,
    getDiagnostics,
    cancel: scheduler.cancel,
    dispose: scheduler.dispose,
  }
}