export interface CreateEngineRenderSchedulerOptions {
  render: () => Promise<unknown>
  interactiveIntervalMs?: number
  onError?: (error: unknown) => void
}

export interface EngineRenderSchedulerDiagnostics {
  lastQueueWaitMs: number
  lastInteractiveThrottleDelayMs: number
  coalescedRequestCount: number
  inFlight: boolean
  pendingRaf: boolean
}

export interface EngineRenderScheduler {
  request(mode?: 'interactive' | 'normal'): void
  getDiagnostics(): EngineRenderSchedulerDiagnostics
  cancel(): void
  dispose(): void
}

/**
 * Engine-owned render scheduler that keeps render submission single-flight,
 * coalesces burst requests, and optionally rate-limits interactive mode.
 */
export function createEngineRenderScheduler(
  options: CreateEngineRenderSchedulerOptions,
): EngineRenderScheduler {
  const interactiveIntervalMs = Math.max(0, options.interactiveIntervalMs ?? 0)
  let rafHandle: number | null = null
  let interactiveTimerHandle: number | null = null
  let inFlight = false
  let queued = false
  let lastRenderStartAt = 0
  let rafScheduledAt = 0
  const diagnostics: EngineRenderSchedulerDiagnostics = {
    lastQueueWaitMs: 0,
    lastInteractiveThrottleDelayMs: 0,
    coalescedRequestCount: 0,
    inFlight: false,
    pendingRaf: false,
  }

  const clearInteractiveTimer = () => {
    if (interactiveTimerHandle === null) {
      return
    }
    clearTimeout(interactiveTimerHandle)
    interactiveTimerHandle = null
  }

  const flush = () => {
    rafHandle = null
    diagnostics.pendingRaf = false

    // Track scheduler queue wait to surface request->flush delay in diagnostics.
    diagnostics.lastQueueWaitMs = rafScheduledAt > 0
      ? Math.max(0, performance.now() - rafScheduledAt)
      : 0
    rafScheduledAt = 0

    if (inFlight) {
      queued = true
      return
    }

    inFlight = true
    diagnostics.inFlight = true
    lastRenderStartAt = performance.now()
    void options.render()
      .catch((error) => {
        options.onError?.(error)
      })
      .finally(() => {
        inFlight = false
        diagnostics.inFlight = false
        if (queued) {
          queued = false
          request('normal')
        }
      })
  }

  const request = (mode: 'interactive' | 'normal' = 'normal') => {
    if (mode === 'interactive' && interactiveIntervalMs > 0) {
      const elapsed = performance.now() - lastRenderStartAt
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

    if (rafHandle !== null) {
      diagnostics.coalescedRequestCount += 1
      return
    }

    rafScheduledAt = performance.now()
    diagnostics.pendingRaf = true
    rafHandle = requestAnimationFrame(flush)
  }

  const cancel = () => {
    if (rafHandle !== null) {
      cancelAnimationFrame(rafHandle)
      rafHandle = null
    }
    rafScheduledAt = 0
    diagnostics.pendingRaf = false
    clearInteractiveTimer()
    queued = false
  }

  const dispose = () => {
    cancel()
    inFlight = false
    diagnostics.inFlight = false
    lastRenderStartAt = 0
  }

  return {
    request,
    getDiagnostics: () => ({...diagnostics}),
    cancel,
    dispose,
  }
}