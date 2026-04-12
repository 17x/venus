export interface CreateEngineRenderSchedulerOptions {
  render: () => Promise<unknown>
  interactiveIntervalMs?: number
  onError?: (error: unknown) => void
}

export interface EngineRenderScheduler {
  request(mode?: 'interactive' | 'normal'): void
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

  const clearInteractiveTimer = () => {
    if (interactiveTimerHandle === null) {
      return
    }
    clearTimeout(interactiveTimerHandle)
    interactiveTimerHandle = null
  }

  const flush = () => {
    rafHandle = null

    if (inFlight) {
      queued = true
      return
    }

    inFlight = true
    lastRenderStartAt = performance.now()
    void options.render()
      .catch((error) => {
        options.onError?.(error)
      })
      .finally(() => {
        inFlight = false
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
        if (interactiveTimerHandle === null) {
          interactiveTimerHandle = setTimeout(() => {
            interactiveTimerHandle = null
            request('interactive')
          }, Math.max(0, interactiveIntervalMs - elapsed)) as unknown as number
        }
        return
      }
    }

    if (rafHandle !== null) {
      return
    }

    rafHandle = requestAnimationFrame(flush)
  }

  const cancel = () => {
    if (rafHandle !== null) {
      cancelAnimationFrame(rafHandle)
      rafHandle = null
    }
    clearInteractiveTimer()
    queued = false
  }

  const dispose = () => {
    cancel()
    inFlight = false
    lastRenderStartAt = 0
  }

  return {
    request,
    cancel,
    dispose,
  }
}