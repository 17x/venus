/**
 * Defines the priority mode used by the single-flight scheduler.
 */
export type SchedulerMode = 'interactive' | 'normal'

/**
 * Defines externally visible single-flight scheduler diagnostics.
 */
export interface SingleFlightSchedulerDiagnostics {
  /** Stores the observed delay between request and frame flush. */
  lastQueueWaitMs: number
  /** Stores the active interactive throttle delay in milliseconds. */
  lastInteractiveThrottleDelayMs: number
  /** Stores the number of coalesced in-frame requests. */
  coalescedRequestCount: number
  /** Stores whether task execution is currently in flight. */
  inFlight: boolean
  /** Stores whether a frame callback is currently pending. */
  pendingFrame: boolean
}

/**
 * Defines scheduler lifecycle operations used by runtime integrations.
 */
export interface SingleFlightScheduler {
  /** Requests one queued run of the task. */
  request(mode?: SchedulerMode): void
  /** Returns a diagnostics snapshot for instrumentation. */
  getDiagnostics(): SingleFlightSchedulerDiagnostics
  /** Cancels all queued frame and timer work. */
  cancel(): void
  /** Cancels pending work and marks scheduler as disposed. */
  dispose(): void
}

/**
 * Defines one frame scheduling function compatible with requestAnimationFrame.
 */
export type ScheduleFrame = (callback: () => void) => number

/**
 * Defines one frame cancel function compatible with cancelAnimationFrame.
 */
export type CancelFrame = (handle: number) => void

/**
 * Defines options that configure task scheduling and throttle behavior.
 */
export interface CreateSingleFlightSchedulerOptions {
  /** Executes one unit of asynchronous work. */
  run: () => Promise<unknown>
  /** Sets interactive throttle interval in milliseconds. */
  interactiveIntervalMs?: number
  /** Reports asynchronous task errors to the owner. */
  onError?: (error: unknown) => void
  /** Provides the high-resolution time source. */
  now?: () => number
  /** Provides the frame scheduler implementation. */
  scheduleFrame?: ScheduleFrame
  /** Provides the frame cancellation implementation. */
  cancelFrame?: CancelFrame
}

/**
 * Creates one single-flight scheduler that coalesces bursts and throttles interactive work.
 * @param options Scheduler behavior configuration.
 */
export function createSingleFlightScheduler(
  options: CreateSingleFlightSchedulerOptions,
): SingleFlightScheduler {
  const now = options.now ?? (() => performance.now())
  const scheduleFrame = options.scheduleFrame ?? ((callback) => requestAnimationFrame(callback))
  const cancelFrame = options.cancelFrame ?? ((handle) => cancelAnimationFrame(handle))
  const interactiveIntervalMs = Math.max(0, options.interactiveIntervalMs ?? 0)

  let frameHandle: number | null = null
  let interactiveTimerHandle: number | null = null
  let inFlight = false
  let queued = false
  let queuedMode: SchedulerMode = 'normal'
  let lastRunStartAt = 0
  let frameScheduledAt = 0

  const diagnostics: SingleFlightSchedulerDiagnostics = {
    lastQueueWaitMs: 0,
    lastInteractiveThrottleDelayMs: 0,
    coalescedRequestCount: 0,
    inFlight: false,
    pendingFrame: false,
  }

  /**
   * Clears one queued interactive timer to avoid delayed handle leaks.
   */
  const clearInteractiveTimer = (): void => {
    if (interactiveTimerHandle === null) {
      return
    }

    clearTimeout(interactiveTimerHandle)
    interactiveTimerHandle = null
  }

  /**
   * Resolves highest-priority mode so interactive requests are never downgraded.
   * @param previous Previous queued mode.
   * @param next Incoming requested mode.
   */
  const resolveHigherPriorityMode = (
    previous: SchedulerMode,
    next: SchedulerMode,
  ): SchedulerMode => {
    return previous === 'interactive' || next === 'interactive'
      ? 'interactive'
      : 'normal'
  }

  /**
   * Flushes one queued frame callback and starts one async run if possible.
   */
  const flush = (): void => {
    frameHandle = null
    diagnostics.pendingFrame = false
    diagnostics.lastQueueWaitMs = frameScheduledAt > 0
      ? Math.max(0, now() - frameScheduledAt)
      : 0
    frameScheduledAt = 0

    if (inFlight) {
      queued = true
      queuedMode = resolveHigherPriorityMode(queuedMode, 'normal')
      return
    }

    inFlight = true
    diagnostics.inFlight = true
    lastRunStartAt = now()

    void options.run()
      .catch((error) => {
        options.onError?.(error)
      })
      .finally(() => {
        inFlight = false
        diagnostics.inFlight = false
        if (queued) {
          const nextMode = queuedMode
          queued = false
          queuedMode = 'normal'
          request(nextMode)
        }
      })
  }

  /**
   * Requests one run and applies interactive throttling when configured.
   * @param mode Requested scheduler mode.
   */
  const request = (mode: SchedulerMode = 'normal'): void => {
    if (mode === 'interactive' && interactiveIntervalMs > 0) {
      const elapsed = now() - lastRunStartAt
      if (elapsed < interactiveIntervalMs) {
        const throttleDelayMs = Math.max(0, interactiveIntervalMs - elapsed)
        diagnostics.lastInteractiveThrottleDelayMs = throttleDelayMs

        if (interactiveTimerHandle === null) {
          interactiveTimerHandle = setTimeout(() => {
            interactiveTimerHandle = null
            request('interactive')
          }, throttleDelayMs) as unknown as number
        }

        return
      }
    }

    if (inFlight) {
      queued = true
      queuedMode = resolveHigherPriorityMode(queuedMode, mode)
      return
    }

    if (frameHandle !== null) {
      queuedMode = resolveHigherPriorityMode(queuedMode, mode)
      diagnostics.coalescedRequestCount += 1
      return
    }

    queuedMode = mode
    frameScheduledAt = now()
    diagnostics.pendingFrame = true
    frameHandle = scheduleFrame(flush)
  }

  /**
   * Cancels queued frame work and resets queue state.
   */
  const cancel = (): void => {
    if (frameHandle !== null) {
      cancelFrame(frameHandle)
      frameHandle = null
    }

    frameScheduledAt = 0
    diagnostics.pendingFrame = false
    clearInteractiveTimer()
    queued = false
    queuedMode = 'normal'
  }

  /**
   * Disposes scheduler state and leaves diagnostics in settled state.
   */
  const dispose = (): void => {
    cancel()
    inFlight = false
    diagnostics.inFlight = false
    lastRunStartAt = 0
  }

  return {
    request,
    getDiagnostics: () => ({ ...diagnostics }),
    cancel,
    dispose,
  }
}
