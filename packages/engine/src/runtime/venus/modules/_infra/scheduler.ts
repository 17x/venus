/**
 * Venus Scheduler Service — coalesced frame scheduling for modules.
 *
 * Wraps a microtask-based coalescing scheduler so that multiple render requests
 * within the same synchronous block result in a single render execution.
 * Used by animate, interaction, and debug modules to request frames without
 * triggering redundant renders.
 */
import type { VenusSchedulerService } from '../../Venus.ts'

/**
 * Creates a scheduler service that coalesces render requests via microtask.
 */
export function createVenusSchedulerService(): VenusSchedulerService {
  let pending = false
  // The render callback is set by the base module after mount.
  let renderCallback: (() => void) | null = null

  return {
    requestRender() {
      if (pending) {
        return
      }
      pending = true
      queueMicrotask(() => {
        pending = false
        renderCallback?.()
      })
    },

    cancelRender() {
      pending = false
    },

    isPending() {
      return pending
    },

    // Internal: allows the base module to register its callback.
    _setRenderCallback(callback: () => void) {
      renderCallback = callback
    },
  } as VenusSchedulerService & { _setRenderCallback(callback: () => void): void }
}
