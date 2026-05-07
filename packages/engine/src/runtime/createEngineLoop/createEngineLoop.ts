import type { EngineRenderFrame, EngineRenderStats, EngineRenderer } from '../../renderer/types/index.ts'
import type { EngineClock, EngineFrameHandle, EngineFrameInfo } from '../../time/index.ts'
import { createEngineRenderScheduler } from '../renderScheduler/renderScheduler.ts'

interface EngineLoopOptions {
  clock: EngineClock
  renderer: EngineRenderer
  resolveFrame: () => EngineRenderFrame
  beforeRender?: (frame: EngineFrameInfo) => void
  onStats?: (stats: EngineRenderStats) => void
}

export interface EngineLoopController {
  start(): void
  stop(): void
  isRunning(): boolean
  renderOnce(): Promise<EngineRenderStats>
}

/**
 * Shared render loop helper for standalone engine usage.
 *
 * The loop is intentionally small:
 * - pull latest frame inputs from `resolveFrame`
 * - render once per clock frame
 * - surface render stats back to callers
  * @param options Options object for this operation.
*/
export function createEngineLoop(options: EngineLoopOptions): EngineLoopController {
  // Wrap engine clock handles with numeric scheduler handles so one scheduler
  // implementation can drive both browser and test clocks.
  let nextSchedulerFrameHandle = 1
  const clockFrameHandleBySchedulerId = new Map<number, EngineFrameHandle>()
  // Keep the latest clock frame info so render callbacks can preserve beforeRender timing.
  let latestFrameInfo: EngineFrameInfo = {
    now: options.clock.now(),
    dt: 0,
  }
  let running = false

  // Adapt engine clock requestFrame to the scheduler's numeric frame contract.
  const scheduleFrame = (callback: () => void) => {
    const schedulerHandle = nextSchedulerFrameHandle
    nextSchedulerFrameHandle += 1
    const clockHandle = options.clock.requestFrame((frame) => {
      latestFrameInfo = frame
      callback()
    })
    clockFrameHandleBySchedulerId.set(schedulerHandle, clockHandle)
    return schedulerHandle
  }

  // Cancel both scheduler-id bookkeeping and the backing engine clock frame.
  const cancelFrame = (handle: number) => {
    const clockHandle = clockFrameHandleBySchedulerId.get(handle)
    if (clockHandle === undefined) {
      return
    }

    clockFrameHandleBySchedulerId.delete(handle)
    options.clock.cancelFrame(clockHandle)
  }

  // Reuse the shared single-flight scheduler path so loop and explicit scheduler
  // callers follow one coalescing/throttling behavior model.
  const scheduler = createEngineRenderScheduler({
    render: async () => {
      if (!running) {
        return
      }

      options.beforeRender?.(latestFrameInfo)
      const stats = await options.renderer.render(options.resolveFrame())
      options.onStats?.(stats)
      // Keep continuous loop behavior by re-queueing after each settled frame.
      if (running) {
        scheduler.request('normal')
      }
    },
    now: () => options.clock.now(),
    scheduleFrame,
    cancelFrame,
  })

  return {
    start: () => {
      if (running) {
        return
      }

      running = true
      // Prime one render request; subsequent frames self-schedule in render callback.
      scheduler.request('normal')
    },
    stop: () => {
      running = false
      scheduler.cancel()
    },
    isRunning: () => running,
    renderOnce: async () => {
      // Keep one-shot render independent from loop state for diagnostics/manual rendering.
      const stats = await options.renderer.render(options.resolveFrame())
      options.onStats?.(stats)
      return stats
    },
  }
}
