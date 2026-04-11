import type { EngineRenderFrame, EngineRenderStats, EngineRenderer } from '../renderer/types.ts'
import type { EngineClock, EngineFrameHandle, EngineFrameInfo } from '../time/index.ts'

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
 */
export function createEngineLoop(options: EngineLoopOptions): EngineLoopController {
  let running = false
  let frameHandle: EngineFrameHandle | null = null

  const scheduleNextFrame = () => {
    frameHandle = options.clock.requestFrame(async (frame) => {
      if (!running) {
        return
      }

      options.beforeRender?.(frame)
      const stats = await options.renderer.render(options.resolveFrame())
      options.onStats?.(stats)
      scheduleNextFrame()
    })
  }

  return {
    start: () => {
      if (running) {
        return
      }

      running = true
      scheduleNextFrame()
    },
    stop: () => {
      running = false
      if (frameHandle !== null) {
        options.clock.cancelFrame(frameHandle)
        frameHandle = null
      }
    },
    isRunning: () => running,
    renderOnce: async () => {
      const stats = await options.renderer.render(options.resolveFrame())
      options.onStats?.(stats)
      return stats
    },
  }
}
