/**
 * Defines frame handle union for environments where setTimeout does not return a number.
 */
export type EngineFrameHandle = number | ReturnType<typeof setTimeout>

export interface EngineFrameInfo {
  now: number
  dt: number
}

export interface EngineClock {
  now(): number
  requestFrame(cb: (frame: EngineFrameInfo) => void): EngineFrameHandle
  cancelFrame(handle: EngineFrameHandle): void
}

interface EngineClockOptions {
  now?: () => number
}

/**
 * Create the default engine clock abstraction.
 *
 * Keeps browser frame globals behind one contract so runtime and adapters can
 * reuse one scheduling API and tests can override time.
 */
export function createSystemEngineClock(options?: EngineClockOptions): EngineClock {
  const resolveNow = options?.now ?? defaultNow
  let previousNow: number | null = null

  return {
    now: resolveNow,
    requestFrame: (cb) => {
      return requestSystemFrame((timestamp) => {
        const nextNow = Number.isFinite(timestamp) ? timestamp : resolveNow()
        // First frame uses dt=0 to avoid a synthetic jump on subscription.
        const dt = previousNow === null ? 0 : Math.max(0, nextNow - previousNow)
        previousNow = nextNow

        cb({
          now: nextNow,
          dt,
        })
      })
    },
    cancelFrame: (handle) => {
      cancelSystemFrame(handle)
    },
  }
}

function defaultNow() {
  if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
    return performance.now()
  }

  return Date.now()
}

function requestSystemFrame(cb: (timestamp: number) => void): EngineFrameHandle {
  if (typeof requestAnimationFrame === 'function') {
    return requestAnimationFrame(cb)
  }

  return setTimeout(() => cb(defaultNow()), 16)
}

/**
 * Cancels either rAF or timeout handles while respecting mixed runtime handle types.
 */
function cancelSystemFrame(handle: EngineFrameHandle) {
  // Only numeric handles are valid for rAF cancellation in mixed Node/browser typing contexts.
  if (typeof cancelAnimationFrame === 'function' && typeof handle === 'number') {
    cancelAnimationFrame(handle)
    return
  }

  clearTimeout(handle)
}
